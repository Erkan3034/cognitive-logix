# API Entegrasyon Rehberi

Cognitive Logix, ERP, depo yönetimi (WMS), e-ticaret ve finans sistemlerinizden gelen verileri otomatik olarak içeri almak için modern bir Webhook API altyapısı sunar.

## 1. Kimlik Doğrulama (Authentication)

API'ye yapılan tüm istekler **Bearer Token** yöntemiyle doğrulanır.

**Header Formatı:**
```http
Authorization: Bearer <API_ANAHTARINIZ>
```

API anahtarınızın kapsamının (scope) **"Veri gönderimi" (ingest)** olarak ayarlandığından emin olun. Aksi takdirde sunucu `403 Forbidden` hatası döndürecektir.

## 2. Webhook Endpoint Kullanımı

**Endpoint:** `POST https://api.cognitive-logix.com/api/v1/ingest/webhook`

Bu endpoint'e gönderdiğiniz veriler (payload), sistemin yapay zeka destekli eşleştirme (NLP Auto-Mapping) motorundan geçerek veritabanınızdaki sütun isimlerini otomatik olarak bizim formatımıza standartlaştırır.

### Payload Formatı
Body olarak JSON tipinde **tek bir obje (dict)** veya **objelerden oluşan bir liste (array)** gönderebilirsiniz.

#### İstek Örneği (cURL)
```bash
curl -X POST "https://api.cognitive-logix.com/api/v1/ingest/webhook" \
  -H "Authorization: Bearer <API_ANAHTARINIZ>" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "siparis_kodu": "ORD-10023",
      "tarih": "2026-05-17",
      "musteri_bolge": "Batı Avrupa",
      "kargo_sekli": "Standart",
      "urun_kategorisi": "Elektronik",
      "tutar": 2450.50,
      "maliyet": 2100.00
    }
  ]'
```

#### İstek Örneği (Python / Requests)
```python
import requests

url = "https://api.cognitive-logix.com/api/v1/ingest/webhook"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
payload = {
    "order_id": "ORD-10024",
    "customer_country": "Germany",
    "shipping_tier": "Express",
    "sales_value": 3100.00
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

## 3. Otomatik Kolon Eşleştirme (Auto-Mapping)

NLP motoru, gelen JSON anahtarlarını standart Cognitive Logix alanlarıyla otomatik olarak eşleştirir.
Sistem tarafından tanınan örnek eşleştirmeler:
- `siparis_no`, `order_id`, `fatura_no` -> **Order Id**
- `tarih`, `date`, `siparis_tarihi` -> **Order Date**
- `kargo_sekli`, `shipping_tier`, `teslimat_turu` -> **Shipping Mode**
- `tutar`, `satis`, `sales_value` -> **Sales**
- `maliyet`, `cost`, `alis_fiyati` -> **Cost**

İstemci tarafında veriyi gönderirken SQL üzerinden (`AS`) alias (takma ad) vermenize veya herhangi bir veri dönüşümü yapmanıza gerek yoktur.

## 4. Başarı ve Hata Kodları

| Kod | Durum | Açıklama |
| :--- | :--- | :--- |
| **200** | `OK` | Veri başarıyla alındı, eşleştirildi ve işlendi. |
| **400** | `Bad Request` | Gönderilen payload boş (Empty payload) veya JSON formatı hatalı. |
| **401** | `Unauthorized` | API anahtarı eksik veya geçersiz. |
| **403** | `Forbidden` | API anahtarı geçerli ancak "Veri gönderimi" yetkisine sahip değil. |
| **422** | `Unprocessable` | JSON geçerli ancak beklenen formatta (dict veya list) değil. |
| **503** | `Service Unavail.` | Veritabanı bağlantı sorunu. |

### Başarılı Yanıt Örneği (200 OK)
```json
{
  "status": "success",
  "records_processed": 1,
  "mapping_report": {
    "siparis_kodu": "Order Id",
    "tutar": "Sales",
    "kargo_sekli": "Shipping Mode"
  },
  "tenant_id": "tenant_123abc..."
}
```
