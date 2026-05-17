from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any
import re
import unicodedata

try:
    # pyrefly: ignore [missing-import]
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
    # ── Order ID ──
    "siparisno": "Order_ID",
    "siparisid": "Order_ID",
    "sipariskodu": "Order_ID",
    "orderid": "Order_ID",
    "ordernumber": "Order_ID",
    "ordercustomerid": "Order_ID",
    "orderitemid": "Order_ID",
    # ── Product ID ──
    "urun": "Product_ID",
    "urunkodu": "Product_ID",
    "urunid": "Product_ID",
    "sku": "Product_ID",
    "productid": "Product_ID",
    "productcode": "Product_ID",
    "productcardid": "Product_ID",
    "productcategoryid": "Product_ID",
    "orderitemcardprodid": "Product_ID",
    "productname": "Product_ID",
    "departmentid": "Product_ID",
    "departmentname": "Product_ID",
    # ── Category ──
    "kategori": "Category",
    "category": "Category",
    "categoryname": "Category",
    "categoryid": "Category",
    # ── Quantity ──
    "miktar": "Quantity",
    "adet": "Quantity",
    "quantity": "Quantity",
    "orderitemquantity": "Quantity",
    "salespercustomer": "Quantity",
    # ── Order Date ──
    "siparistarihi": "Order_Date",
    "tarih": "Order_Date",
    "orderdate": "Order_Date",
    "orderdatedateorders": "Order_Date",
    # ── Expected Delivery Date ──
    "beklenenteslimtarihi": "Expected_Delivery_Date",
    "planlananteslimtarihi": "Expected_Delivery_Date",
    "teslimtarihi": "Expected_Delivery_Date",
    "expecteddeliverydate": "Expected_Delivery_Date",
    "daysforshipmentscheduled": "Expected_Delivery_Date",
    # ── Actual Delivery Date ──
    "gerceklesenteslimtarihi": "Actual_Delivery_Date",
    "fiiliteslimtarihi": "Actual_Delivery_Date",
    "actualdeliverydate": "Actual_Delivery_Date",
    "shippingdatedateorders": "Actual_Delivery_Date",
    "daysforshippingreal": "Actual_Delivery_Date",
    "latedeliveryrisk": "Actual_Delivery_Date",
    "iscanceled": "Actual_Delivery_Date",
    "orderstatus": "Actual_Delivery_Date",
    # ── Origin ──
    "cikisyeri": "Origin",
    "kaynak": "Origin",
    "origin": "Origin",
    "ordercity": "Origin",
    "ordercountry": "Origin",
    "orderstate": "Origin",
    "latitude": "Origin",
    "longitude": "Origin",
    # ── Destination ──
    "varisyeri": "Destination",
    "hedef": "Destination",
    "bolge": "Destination",
    "region": "Destination",
    "destination": "Destination",
    "orderregion": "Destination",
    "customercity": "Destination",
    "customercountry": "Destination",
    "customerstate": "Destination",
    "customerzipcode": "Destination",
    "market": "Destination",
    # ── Shipping Mode ──
    "kargo": "Shipping_Mode",
    "kargomodu": "Shipping_Mode",
    "kargotipi": "Shipping_Mode",
    "tasimamodu": "Shipping_Mode",
    "shippingmode": "Shipping_Mode",
    "deliverystatus": "Shipping_Mode",
    "shippingdelay": "Shipping_Mode",
    # ── Sales ──
    "siparistutari": "Sales",
    "tutar": "Sales",
    "satis": "Sales",
    "ciro": "Sales",
    "sales": "Sales",
    "revenue": "Sales",
    "orderitemtotal": "Sales",
    "saleswinsor": "Sales",
    "saleslog1p": "Sales",
    "orderprofitperorder": "Sales",
    "orderitemproductprice": "Sales",
    "productprice": "Sales",
    "orderitemproductpricewinsor": "Sales",
    "orderitemproductpricelog1p": "Sales",
    # ── Profit ──
    "kar": "Profit",
    "karzarar": "Profit",
    "profit": "Profit",
    "benefit": "Profit",
    "benefitperorder": "Profit",
    "orderitemprofitratio": "Profit",
    "negativeprofitflag": "Profit",
    "benefitperorderwinsor": "Profit",
    # ── Customer Type ──
    "musteritipi": "Customer_Type",
    "musterisegmenti": "Customer_Type",
    "customersegment": "Customer_Type",
    "customertype": "Customer_Type",
    "type": "Customer_Type",
    "customerid": "Customer_Type",
    "customerfname": "Customer_Type",
    "customerlname": "Customer_Type",
    # ── Payment Type ──
    "odemetipi": "Payment_Type",
    "odemeyontemi": "Payment_Type",
    "paymenttype": "Payment_Type",
    # ── Discount Rate ──
    "indirim": "Discount_Rate",
    "indirimorani": "Discount_Rate",
    "discountrate": "Discount_Rate",
    "orderitemdiscountrate": "Discount_Rate",
    "orderitemdiscount": "Discount_Rate",
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
