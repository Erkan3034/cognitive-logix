from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any
import re
import unicodedata

try:
    from thefuzz import process
except ImportError:
    process = None


STANDARD_COLUMNS = [
    "Order_ID",
    "Product_ID",
    "Category",
    "Quantity",
    "Order_Date",
    "Expected_Delivery_Date",
    "Actual_Delivery_Date",
    "Origin",
    "Destination",
    "Shipping_Mode",
    "Sales",
    "Profit",
    "Customer_Type",
    "Payment_Type",
    "Discount_Rate",
]

MATCH_THRESHOLD = 78


def _normalize(value: str) -> str:
    translated = value.translate(
        str.maketrans(
            {
                "ı": "i",
                "İ": "I",
                "ğ": "g",
                "Ğ": "G",
                "ü": "u",
                "Ü": "U",
                "ş": "s",
                "Ş": "S",
                "ö": "o",
                "Ö": "O",
                "ç": "c",
                "Ç": "C",
            }
        )
    )
    normalized = unicodedata.normalize("NFKD", translated)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "", ascii_value.casefold())


SYNONYMS = {
    "siparisno": "Order_ID",
    "siparisid": "Order_ID",
    "sipariskodu": "Order_ID",
    "orderid": "Order_ID",
    "ordernumber": "Order_ID",
    "urun": "Product_ID",
    "urunkodu": "Product_ID",
    "urunid": "Product_ID",
    "sku": "Product_ID",
    "productid": "Product_ID",
    "productcode": "Product_ID",
    "kategori": "Category",
    "category": "Category",
    "miktar": "Quantity",
    "adet": "Quantity",
    "quantity": "Quantity",
    "siparistarihi": "Order_Date",
    "tarih": "Order_Date",
    "orderdate": "Order_Date",
    "beklenenteslimtarihi": "Expected_Delivery_Date",
    "planlananteslimtarihi": "Expected_Delivery_Date",
    "teslimtarihi": "Expected_Delivery_Date",
    "expecteddeliverydate": "Expected_Delivery_Date",
    "gerceklesenteslimtarihi": "Actual_Delivery_Date",
    "fiiliteslimtarihi": "Actual_Delivery_Date",
    "actualdeliverydate": "Actual_Delivery_Date",
    "cikisyeri": "Origin",
    "kaynak": "Origin",
    "origin": "Origin",
    "varisyeri": "Destination",
    "hedef": "Destination",
    "bolge": "Destination",
    "region": "Destination",
    "destination": "Destination",
    "kargo": "Shipping_Mode",
    "kargomodu": "Shipping_Mode",
    "kargotipi": "Shipping_Mode",
    "tasimamodu": "Shipping_Mode",
    "shippingmode": "Shipping_Mode",
    "siparistutari": "Sales",
    "tutar": "Sales",
    "satis": "Sales",
    "ciro": "Sales",
    "sales": "Sales",
    "revenue": "Sales",
    "kar": "Profit",
    "karzarar": "Profit",
    "profit": "Profit",
    "benefit": "Profit",
    "musteritipi": "Customer_Type",
    "musterisegmenti": "Customer_Type",
    "customersegment": "Customer_Type",
    "customertype": "Customer_Type",
    "odemetipi": "Payment_Type",
    "odemeyontemi": "Payment_Type",
    "paymenttype": "Payment_Type",
    "indirim": "Discount_Rate",
    "indirimorani": "Discount_Rate",
    "discountrate": "Discount_Rate",
}


def map_columns(incoming_columns: list[str]) -> dict[str, Any]:
    mapping_result = {
        "mapped": {},
        "unmapped": [],
        "confidence": {},
    }

    normalized_standard = {_normalize(column): column for column in STANDARD_COLUMNS}
    normalized_synonyms = {_normalize(key): value for key, value in SYNONYMS.items()}

    for col in incoming_columns:
        normalized_col = _normalize(str(col))

        if normalized_col in normalized_synonyms:
            mapping_result["mapped"][col] = normalized_synonyms[normalized_col]
            mapping_result["confidence"][col] = 100
            continue

        if normalized_col in normalized_standard:
            mapping_result["mapped"][col] = normalized_standard[normalized_col]
            mapping_result["confidence"][col] = 100
            continue

        if process is not None:
            best_match, score = process.extractOne(col, STANDARD_COLUMNS)
        else:
            best_match, score = max(
                (
                    (
                        standard,
                        int(SequenceMatcher(None, normalized_col, _normalize(standard)).ratio() * 100),
                    )
                    for standard in STANDARD_COLUMNS
                ),
                key=lambda item: item[1],
            )

        if score >= MATCH_THRESHOLD:
            mapping_result["mapped"][col] = best_match
            mapping_result["confidence"][col] = score
        else:
            mapping_result["unmapped"].append(col)
            mapping_result["confidence"][col] = score

    return mapping_result
