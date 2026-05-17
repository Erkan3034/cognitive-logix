"""
Data Ingestion API - CSV yukleme, kolon eslestirme ve kalici veri kaydi.
"""
from __future__ import annotations

from io import StringIO
from typing import Any

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.services.mapping_engine import map_columns
from app.services.supabase_ops import (
    SupabaseNotConfigured,
    delete_history_record,
    delete_rows_by_batch,
    insert_row,
    insert_rows,
    is_configured,
    select_rows,
)
from app.routers.metrics import invalidate_tenant_cache


router = APIRouter(prefix="/api/v1/ingest", tags=["ingestion"])


def _standardize_rows(rows: list[dict[str, Any]], final_mapping: dict[str, str]) -> list[dict[str, Any]]:
    return [
        {standard_col: row.get(original_col) for original_col, standard_col in final_mapping.items()}
        for row in rows
    ]


def _non_empty_columns(rows: list[dict[str, Any]]) -> set[str]:
    present: set[str] = set()
    for row in rows:
        for key, value in row.items():
            if value is not None and str(value).strip() != "":
                present.add(str(key))
    return present


def _data_quality_report(df: pd.DataFrame) -> dict[str, Any]:
    total_cells = max(1, int(df.shape[0] * df.shape[1]))
    missing_cells = int(df.isna().sum().sum())
    duplicate_rows = int(df.duplicated().sum())
    empty_columns = [str(col) for col in df.columns if int(df[col].isna().sum()) == len(df)]
    missing_pct = missing_cells / total_cells
    duplicate_pct = duplicate_rows / max(1, len(df))
    score = max(0, round(100 - (missing_pct * 55) - (duplicate_pct * 30) - (len(empty_columns) * 5)))
    return {
        "score": score,
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "missing_cells": missing_cells,
        "missing_pct": missing_pct,
        "duplicate_rows": duplicate_rows,
        "duplicate_pct": duplicate_pct,
        "empty_columns": empty_columns,
    }


def _model_feed_report(rows: list[dict[str, Any]]) -> dict[str, Any]:
    present = _non_empty_columns(rows)
    domains = [
        {
            "key": "logistics",
            "label": "Gecikme riski",
            "required": ["Order_Date", "Expected_Delivery_Date", "Destination", "Shipping_Mode"],
            "recommended": ["Actual_Delivery_Date", "Order_ID"],
        },
        {
            "key": "demand",
            "label": "Talep tahmini",
            "required": ["Order_Date", "Product_ID", "Category", "Quantity"],
            "recommended": ["Destination", "Sales"],
        },
        {
            "key": "financial",
            "label": "Finansal risk",
            "required": ["Sales", "Profit"],
            "recommended": ["Customer_Type", "Payment_Type", "Discount_Rate"],
        },
    ]

    domain_reports = []
    ready_count = 0
    for domain in domains:
        required = set(domain["required"])
        recommended = set(domain["recommended"])
        missing_required = sorted(required - present)
        missing_recommended = sorted(recommended - present)
        status = "ready" if not missing_required else "blocked"
        if status == "ready":
            ready_count += 1
        domain_reports.append(
            {
                "key": domain["key"],
                "label": domain["label"],
                "status": status,
                "required_columns": domain["required"],
                "missing_required": missing_required,
                "missing_recommended": missing_recommended,
            }
        )

    status = "ready" if ready_count == len(domains) else "partial" if ready_count else "blocked"
    return {
        "status": status,
        "row_count": len(rows),
        "ready_domain_count": ready_count,
        "total_domain_count": len(domains),
        "columns_present": sorted(present),
        "domains": domain_reports,
    }


def _summary_payload(
    *,
    tenant_id: str | None,
    user_id: str | None,
    source: str,
    filename: str | None,
    row_count: int,
    mapping: dict[str, str],
    preview: list[dict[str, Any]],
    status: str,
    quality_report: dict[str, Any],
    model_feed_report: dict[str, Any],
    persisted_record_count: int,
) -> dict[str, Any]:
    return {
        "tenant_id": tenant_id,
        "user_id": user_id,
        "source": source,
        "filename": filename,
        "row_count": row_count,
        "column_mapping": mapping,
        "data_preview": preview[:20],
        "status": status,
        "quality_report": quality_report,
        "model_feed_report": model_feed_report,
        "model_feed_status": model_feed_report.get("status", "unknown"),
        "persisted_record_count": persisted_record_count,
    }


def _legacy_summary_payload(summary: dict[str, Any]) -> dict[str, Any]:
    return {
        key: summary[key]
        for key in [
            "tenant_id",
            "user_id",
            "source",
            "filename",
            "row_count",
            "column_mapping",
            "data_preview",
            "status",
        ]
    }


def _save_summary(summary: dict[str, Any]) -> str | None:
    try:
        insert_row("ingested_data", summary)
        return None
    except SupabaseNotConfigured:
        return "Supabase baglantisi bulunamadi."
    except Exception as exc:
        try:
            insert_row("ingested_data", _legacy_summary_payload(summary))
            return f"Ozet ek alanlari yazilamadi: {exc}"
        except Exception as fallback_exc:
            raise HTTPException(status_code=500, detail=f"Supabase kayit hatasi: {fallback_exc}") from fallback_exc


def _save_ingested_records(
    *,
    tenant_id: str | None,
    user_id: str | None,
    source_name: str | None,
    source_type: str,
    rows: list[dict[str, Any]],
    standardized: list[dict[str, Any]],
    mapping: dict[str, str],
    batch_id: str | None = None,
) -> tuple[int, str | None]:
    # Yarida kalan onceki yuklemeyi otomatik temizle
    if batch_id:
        cleaned = delete_rows_by_batch("ingested_records", batch_id)
        if cleaned > 0:
            import logging
            logging.getLogger(__name__).info(
                "Onceki yarida kalan yukleme temizlendi: batch_id=%s, silinen=%d", batch_id, cleaned
            )

    record_rows = [
        {
            "tenant_id": tenant_id,
            "uploaded_by": user_id,
            "source_name": source_name or source_type,
            "standard_payload": standard_row,
            "original_payload": original_row,
            "mapping": mapping,
            "batch_id": batch_id,
        }
        for original_row, standard_row in zip(rows, standardized)
    ]
    if not record_rows:
        return 0, None

    inserted_count = 0
    chunk_size = 10000
    try:
        for i in range(0, len(record_rows), chunk_size):
            chunk = record_rows[i:i + chunk_size]
            count = insert_rows("ingested_records", chunk)
            inserted_count += count
        return inserted_count, None
    except SupabaseNotConfigured:
        return inserted_count, "Supabase baglantisi bulunamadi."
    except Exception as exc:
        return inserted_count, f"Satir bazli kayit parcali islemde (chunk {i}) yarida kaldi: {exc}"


def _enrich_history_row(row: dict[str, Any]) -> dict[str, Any]:
    if row.get("model_feed_report"):
        return row
    preview = row.get("data_preview") or []
    if isinstance(preview, list):
        report = _model_feed_report(preview)
    else:
        report = {"status": "unknown", "domains": [], "ready_domain_count": 0, "total_domain_count": 0}
    row["model_feed_report"] = report
    row["model_feed_status"] = report.get("status", "unknown")
    return row


import uuid
from pathlib import Path

TEMP_DIR = Path("data/temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/csv-preview")
async def preview_csv_mapping(file: UploadFile = File(...)):
    """
    CSV dosyasini okur, standart semaya eslestirir ve kaydetmeden on izleme dondurur.
    """
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    try:
        df = pd.read_csv(StringIO(content.decode("utf-8")))
        columns = df.columns.tolist()
        mapping_result = map_columns(columns)
        df = df.where(pd.notnull(df), None)
        
        # Buyuk veriler icin frontend'e tamamini gondermek yerine gecici dosyaya yaziyoruz
        session_id = str(uuid.uuid4())
        temp_path = TEMP_DIR / f"{session_id}.pkl"
        df.to_pickle(temp_path)

        # Raporlama icin ilk basta hizlica standardize edelim
        staged_rows = df.head(100).to_dict(orient="records") # Rapor icin sadece 100 satir yeterli
        standardized = _standardize_rows(staged_rows, mapping_result.get("mapped", {}))

        return {
            "status": "success",
            "mapping_result": mapping_result,
            "columns_found": columns,
            "preview_data": df.head(3).to_dict(orient="records"),
            "session_id": session_id,
            "staged_rows": [], # RAM sismemesi icin bos gonderiyoruz
            "total_rows": len(df),
            "source_name": file.filename,
            "quality_report": _data_quality_report(df),
            "model_feed_report": _model_feed_report(standardized),
        }
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV UTF-8 formatinda okunamadi.") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"CSV read error: {exc}") from exc


@router.get("/history")
async def ingestion_history(request: Request, limit: int = 25):
    """
    Tenant icin onceki veri alim kayitlarini listeler.
    """
    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    tenant_id = getattr(request.state, "tenant_id", None)
    try:
        rows = select_rows("ingested_data", tenant_id, limit=max(1, min(limit, 100)))
    except SupabaseNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"items": [_enrich_history_row(row) for row in rows], "total": len(rows)}


@router.delete("/history/{record_id}")
async def delete_history(record_id: str, request: Request):
    """
    Belirli bir gecmis yukleme kaydini siler.
    """
    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase is not configured.")
    tenant_id = getattr(request.state, "tenant_id", None)
    success = delete_history_record("ingested_data", record_id, tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Kayit bulunamadi veya silinemedi.")
    if tenant_id:
        invalidate_tenant_cache(tenant_id)
    return {"status": "success"}


@router.post("/confirm-mapping")
async def confirm_mapping_and_save(payload: dict[str, Any], request: Request):
    """
    Kullanici eslestirmeyi onaylayinca ozet ve satir bazli kalici kayit olusturur.
    """
    final_mapping = payload.get("final_mapping", {})
    rows = payload.get("data", [])
    session_id = payload.get("session_id")
    source_name = payload.get("source_name", "customer-upload.csv")

    if session_id:
        temp_path = TEMP_DIR / f"{session_id}.pkl"
        if temp_path.exists():
            df = pd.read_pickle(temp_path)
            df = df.where(pd.notnull(df), None)
            rows = df.to_dict(orient="records")
            temp_path.unlink() # Isimiz bitince sil

    if not final_mapping:
        raise HTTPException(status_code=400, detail="final_mapping is required.")
    if not rows:
        raise HTTPException(status_code=400, detail="data rows or session_id are required.")

    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)
    standardized = _standardize_rows(rows, final_mapping)
    quality_report = _data_quality_report(pd.DataFrame(rows))
    model_feed_report = _model_feed_report(standardized)

    if not is_configured():
        raise HTTPException(status_code=503, detail="Supabase kaydi yapilandirilmamis; veri kaydedilemedi.")

    persisted_records = 0
    persistence_warnings: list[str] = []

    persisted_records, record_warning = _save_ingested_records(
        tenant_id=tenant_id,
        user_id=user_id,
        source_name=source_name,
        source_type="csv",
        rows=rows,
        standardized=standardized,
        mapping=final_mapping,
        batch_id=session_id,
    )
    if record_warning:
        persistence_warnings.append(record_warning)

    summary_warning = _save_summary(
        _summary_payload(
            tenant_id=tenant_id,
            user_id=user_id,
            source="csv",
            filename=source_name,
            row_count=len(rows),
            mapping=final_mapping,
            preview=standardized,
            status="confirmed",
            quality_report=quality_report,
            model_feed_report=model_feed_report,
            persisted_record_count=persisted_records,
        )
    )
    if summary_warning:
        persistence_warnings.append(summary_warning)

    if tenant_id:
        invalidate_tenant_cache(tenant_id)

    return {
        "status": "success",
        "message": f"{len(rows)} satir basariyla sisteme kaydedildi.",
        "applied_mapping": final_mapping,
        "inserted_rows": len(rows),
        "persisted_records": persisted_records,
        "quality_report": quality_report,
        "model_feed_report": model_feed_report,
        "persistence_warning": " ".join(persistence_warnings) or None,
        "tenant_id": tenant_id,
    }


@router.post("/webhook")
async def erp_webhook_ingest(payload: dict[str, Any] | list[dict[str, Any]], request: Request):
    """
    ERP sistemlerinden otomatik JSON beslemesi icin endpoint.
    """
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")

    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)

    if isinstance(payload, list) and payload:
        columns = list(payload[0].keys())
        rows = payload
    elif isinstance(payload, dict):
        columns = list(payload.keys())
        rows = [payload]
    else:
        columns = []
        rows = []

    mapping_result = map_columns(columns)
    mapping = mapping_result.get("mapped", {})
    standardized = _standardize_rows(rows, mapping)
    quality_report = _data_quality_report(pd.DataFrame(rows)) if rows else {}
    model_feed_report = _model_feed_report(standardized)

    if rows and not is_configured():
        raise HTTPException(status_code=503, detail="Supabase kaydi yapilandirilmamis; veri kaydedilemedi.")

    persistence_warnings: list[str] = []
    persisted_records = 0
    if rows:
        persisted_records, record_warning = _save_ingested_records(
            tenant_id=tenant_id,
            user_id=user_id,
            source_name="webhook",
            source_type="webhook",
            rows=rows,
            standardized=standardized,
            mapping=mapping,
        )
        if record_warning:
            persistence_warnings.append(record_warning)
        summary_warning = _save_summary(
            _summary_payload(
                tenant_id=tenant_id,
                user_id=user_id,
                source="webhook",
                filename=None,
                row_count=len(rows),
                mapping=mapping,
                preview=standardized,
                status="mapped",
                quality_report=quality_report,
                model_feed_report=model_feed_report,
                persisted_record_count=persisted_records,
            )
        )
        if summary_warning:
            persistence_warnings.append(summary_warning)

        if tenant_id:
            invalidate_tenant_cache(tenant_id)

    return {
        "status": "success",
        "message": f"Webhook alindi. {len(rows)} kayit islendi.",
        "mapping_result": mapping_result,
        "persisted_records": persisted_records,
        "model_feed_report": model_feed_report,
        "persistence_warning": " ".join(persistence_warnings) or None,
        "tenant_id": tenant_id,
    }
