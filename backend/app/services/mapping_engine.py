from typing import List, Dict, Any
from difflib import SequenceMatcher

try:
    from thefuzz import process
except ImportError:
    process = None

# Standart şemamız (Modellerimizin beklentisi olan asıl kolonlar)
STANDARD_COLUMNS = [
    "Order_ID",
    "Product_ID",
    "Category",
    "Quantity",
    "Order_Date",
    "Expected_Delivery_Date",
    "Origin",
    "Destination",
    "Shipping_Mode"
]

# Eşleşmenin kabul edilmesi için gereken minimum skor (0-100 arası)
MATCH_THRESHOLD = 80

def map_columns(incoming_columns: List[str]) -> Dict[str, Any]:
    """
    Müşterinin gönderdiği (Excel/CSV veya API) kolon isimlerini,
    sistemin standart kolon isimleriyle eşleştirir (Fuzzy String Matching).
    
    Örnek:
    Gelen: ["SiparisNo", "Urun", "Adet", "GidecekYer", "Tarih"]
    Dönen: {
        "mapped": {"SiparisNo": "Order_ID", "Urun": "Product_ID", ...},
        "unmapped": ["Adet", "GidecekYer", "Tarih"] # Eğer eşleşme bulunamadıysa
    }
    """
    
    mapping_result = {
        "mapped": {},      # Otomatik başarıyla eşleşenler
        "unmapped": [],    # Skorun altında kalıp eşleşmeyenler (kullanıcıya sorulacak)
        "confidence": {}   # Eşleşmelerin güven skoru
    }
    
    # Her ihtimale karşı standart listeyi küçük harfe çevirerek daha esnek arama da yapabiliriz,
    # Ancak thefuzz kütüphanesi default olarak case-insensitive çalışır.
    
    # Bazı çok bariz ve sık kullanılan Türkçe/İngilizce kelimeleri manuel bir sözlükle destekleyebiliriz
    # (Opsiyonel ama isabet oranını çok artırır)
    synonyms = {
        "siparisno": "Order_ID",
        "sipariş_no": "Order_ID",
        "orderid": "Order_ID",
        "urun": "Product_ID",
        "urun_kodu": "Product_ID",
        "miktar": "Quantity",
        "adet": "Quantity",
        "kategori": "Category",
        "cikis_yeri": "Origin",
        "kaynak": "Origin",
        "varis_yeri": "Destination",
        "hedef": "Destination",
        "siparis_tarihi": "Order_Date",
        "teslim_tarihi": "Expected_Delivery_Date",
        "kargo": "Shipping_Mode",
        "kargo_tipi": "Shipping_Mode"
    }

    for col in incoming_columns:
        normalized_col = col.lower().replace(" ", "").replace("_", "")
        
        # 1. Aşama: Manuel eşanlamlılar (Synonyms) kontrolü (Kesin eşleşme için)
        matched_from_synonym = False
        for syn, std_col in synonyms.items():
            if normalized_col == syn.replace("_", ""):
                mapping_result["mapped"][col] = std_col
                mapping_result["confidence"][col] = 100
                matched_from_synonym = True
                break
                
        if matched_from_synonym:
            continue
            
        # 2. Aşama: Fuzzy Matching (Eğer sözlükte yoksa yapay zeka ile benzetme)
        # thefuzz process.extractOne bize tuple döner: (EşleşenKelime, Skor)
        if process is not None:
            best_match, score = process.extractOne(col, STANDARD_COLUMNS)
        else:
            best_match, score = max(
                (
                    (standard, int(SequenceMatcher(None, col.casefold(), standard.casefold()).ratio() * 100))
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
