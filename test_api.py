# test_api.py dosyasını projenin ana dizininde oluşturun
import requests
import json
import time


API_KEY = "cl_6qvAug_1otNJPb43NKud9-Pee7VvDiAVr4iedoXQ768HSrN_IinNGw"

URL = "http://localhost:8000/api/v1/ingest/webhook"

# Gönderilecek test verisi (ERP Sisteminden geliyormuş gibi)
test_payload = [
    {
        "siparis_no": f"DEMO-{int(time.time())}",
        "tarih": "2026-05-17",
        "musteri_ulkesi": "Germany",
        "kargo_sekli": "First Class", # Bilerek yüksek riskli bir kargo seçtik
        "urun_kategorisi": "Electronics",
        "tutar": 45000.00,  # Büyük bir finansal etki yaratsın diye 45 Bin dolar
        "maliyet": 38000.00
    }
]

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

print(" ERP Sisteminden Cognitive Logix'e canlı veri gönderiliyor...")
response = requests.post(URL, json=test_payload, headers=headers)

if response.status_code == 200:
    print("✅ BAŞARILI! Veri sisteme ulaştı ve Yapay Zeka tarafından işlendi.")
    print(" Eşleştirme Raporu:", json.dumps(response.json(), indent=2, ensure_ascii=False))
    print("\n Şimdi Control Tower (Operasyon Merkezi) sayfasını yenileyin!")
else:
    print(" HATA:", response.status_code)
    print(response.text)
