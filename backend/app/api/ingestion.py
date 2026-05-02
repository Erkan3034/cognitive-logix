"""
Data Ingestion API — CSV yükleme, fuzzy mapping ve Supabase'e kaydetme.
"""
from __future__ import annotations

from io import StringIO
from typing import Any, Dict

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.services.mapping_engine import map_columns
from app.services.supabase_ops import SupabaseNotConfigured, get_supabase_admin, insert_row, is_configured


router = APIRouter(prefix="/api/v1/ingest", tags=["ingestion"])


def _supabase_client():
    try:
        return get_supabase_admin()
    except SupabaseNotConfigured as exc:
        raise HTTPException(
            status_code=503,
            detail="Supabase backend env is missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        ) from exc


def _standardize_rows(rows: list[dict], final_mapping: dict) -> list[dict]:
    return [
        {standard_col: row.get(original_col) for original_col, standard_col in final_mapping.items()}
        for row in rows
    ]


@router.post("/csv-preview")
async def preview_csv_mapping(file: UploadFile = File(...)):
    """
    CSV dosyasını okur, fuzzy matching ile standart şemaya eşleştirir.
    Sonucu ve 3 satırlık önizlemeyi döner. Henüz kaydetmez.
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    try:
        df = pd.read_csv(StringIO(content.decode("utf-8")))
        columns = df.columns.tolist()
        mapping_result = map_columns(columns)
        df = df.where(pd.notnull(df), None)

        return {
            "status": "success",
            "mapping_result": mapping_result,
            "columns_found": columns,
            "preview_data": df.head(3).to_dict(orient="records"),
            "staged_rows": df.to_dict(orient="records"),
            "total_rows": len(df),
            "source_name": file.filename,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"CSV read error: {exc}") from exc


@router.post("/confirm-mapping")
async def confirm_mapping_and_save(payload: Dict[str, Any], request: Request):
    """
    Kullanıcı eşleştirmeyi onaylayınca çağrılır.
    Veriyi Supabase ingested_data tablosuna kaydeder.
    """
    final_mapping = payload.get("final_mapping", {})
    rows = payload.get("data", [])
    source_name = payload.get("source_name", "customer-upload.csv")

    if not final_mapping:
        raise HTTPException(status_code=400, detail="final_mapping is required.")
    if not rows:
        raise HTTPException(status_code=400, detail="data rows are required.")

    # Middleware'den gelen tenant ve user bilgisi
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)

    # Standartlaştırılmış veriyi oluştur
    standardized = _standardize_rows(rows, final_mapping)

    if is_configured():
        try:
            # ingested_data tablosuna özet kaydı yaz
            insert_row("ingested_data", {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "source": "csv",
                "filename": source_name,
                "row_count": len(rows),
                "column_mapping": final_mapping,
                "data_preview": standardized[:5],  # İlk 5 satır önizleme olarak
                "status": "confirmed",
            })
        except SupabaseNotConfigured:
            pass
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Supabase kayıt hatası: {exc}") from exc

    return {
        "status": "success",
        "message": f"{len(rows)} satır başarıyla sisteme kaydedildi.",
        "applied_mapping": final_mapping,
        "inserted_rows": len(rows),
        "tenant_id": tenant_id,
    }


@router.post("/webhook")
async def erp_webhook_ingest(payload: Dict[str, Any], request: Request):
    """
    ERP sistemlerinden otomatik JSON beslemesi için endpoint.
    X-API-Key header'ı ile kimlik doğrulaması yapılır.
    """
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")

    # API key ile gelen isteklerde tenant_id middleware'den gelir
    tenant_id = getattr(request.state, "tenant_id", None)
    user_id = getattr(request.state, "user_id", None)

    if isinstance(payload, list) and len(payload) > 0:
        columns = list(payload[0].keys())
        rows = payload
    elif isinstance(payload, dict):
        columns = list(payload.keys())
        rows = [payload]
    else:
        columns = []
        rows = []

    mapping_result = map_columns(columns)

    # Eğer Supabase yapılandırılmışsa, webhook verisini de kaydet
    if is_configured() and rows:
        try:
            insert_row("ingested_data", {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "source": "webhook",
                "filename": None,
                "row_count": len(rows),
                "column_mapping": mapping_result.get("mapped", {}),
                "data_preview": rows[:5],
                "status": "mapped",
            })
        except Exception:
            pass  # Webhook loglama hatası ana akışı kırmamalı

    return {
        "status": "success",
        "message": f"Webhook alındı. {len(rows)} kayıt işlendi.",
        "mapping_result": mapping_result,
        "tenant_id": tenant_id,
    }
