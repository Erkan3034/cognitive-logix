# Cognitive Logix API Entegrasyon Rehberi
*docs.cognitivelogix.com | Sürüm 1.0.0*

Cognitive Logix, ERP, depo yönetimi (WMS), e-ticaret ve finans sistemlerinizden gelen verileri **otomatik olarak** içeri almak ve anında risk/fırsat analizine tabi tutmak için modern bir Webhook API altyapısı sunar.

Bu doküman, sistemlerinizden Cognitive Logix'e nasıl gerçek zamanlı veri göndereceğinizi açıklar.

---

## 1. Kimlik Doğrulama (Authentication)

API'ye yapılan tüm istekler **Bearer Token** yöntemiyle doğrulanır. Anahtarınızı güvende tutun ve asla istemci tarafı (frontend) kodlarında paylaşmayın.

**Header Formatı:**
```http
Authorization: Bearer <API_ANAHTARINIZ>
```

> [!IMPORTANT]
> API anahtarınızın kapsamının (scope) **"Veri gönderimi" (ingest)** olarak ayarlandığından emin olun. Aksi takdirde sunucu `403 Forbidden` hatası döndürecektir.

---

## 2. Webhook Endpoint Kullanımı

**Endpoint:** `POST https://api.cognitive-logix.com/api/v1/ingest/webhook`

Bu endpoint'e göndereceğiniz veriler (payload), sistemin yapay zeka destekli eşleştirme (NLP Auto-Mapping) motorundan geçer. Bu sayede veritabanınızdaki sütun isimlerini (örneğin; `siparis_no`, `tutar`) bizim formatımıza çevirmek için kod yazmanıza gerek kalmaz.

### Payload Formatı
Body olarak JSON tipinde **tek bir obje (dict)** veya **objelerden oluşan bir liste (array)** gönderebilirsiniz.

#### İstek Örneği (cURL)
```bash
curl -X POST "https://api.cognitive-logix.com/api/v1/ingest/webhook" \
  -H "Authorization: Bearer c1_bALwG2KkHp6RzTrooq..." \
  -H "Content-Type: application/json" \
  -d '[
    {
      "siparis_kodu": "ORD-10023",
      "tarih": "2026-05-17",
      "musteri_bolge": "Batı Avrupa",
      "kargo_sekli": "Standart",
      "urun_kategorisi": "Elektronik",
      "tutar": 2450.50,
      "maliyet": 2100.00,
      "hedef_teslimat": "2026-05-20"
    }
  ]'
```

#### İstek Örneği (Python / Requests)
```python
import requests

url = "https://api.cognitive-logix.com/api/v1/ingest/webhook"
headers = {
    "Authorization": "Bearer c1_bALwG2KkHp6RzTrooq...",
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

#### İstek Örneği (Node.js / Axios)
```javascript
const axios = require('axios');

const payload = [{
    "fatura_no": "INV-559",
    "kategori": "Giyim",
    "tutar": 120.00
}];

axios.post('https://api.cognitive-logix.com/api/v1/ingest/webhook', payload, {
    headers: {
        'Authorization': `Bearer c1_bALwG2KkHp6RzTrooq...`,
        'Content-Type': 'application/json'
    }
}).then(res => console.log(res.data));
```

---

## 3. Yapay Zeka ile Otomatik Kolon Eşleştirme (Auto-Mapping)

Gönderdiğiniz JSON objelerinin içindeki anahtarların (keys) isimleri Cognitive Logix tarafından otomatik olarak analiz edilir ve standart formata dökülür.

**Sistem Tarafından Tanınan Örnek Alanlar:**
- `siparis_no`, `order_id`, `fatura_no` -> **Order Id**
- `tarih`, `date`, `siparis_tarihi` -> **Order Date**
- `kargo_sekli`, `shipping_tier`, `teslimat_turu` -> **Shipping Mode**
- `tutar`, `satis`, `sales_value` -> **Sales**
- `maliyet`, `cost`, `alis_fiyati` -> **Cost**

> [!TIP]
> Mevcut veritabanınızdan veri çekerken hiçbir "AS" (alias) veya dönüşüm (transform) işlemi yapmanıza gerek yoktur. SQL sorgunuzun sonucunu doğrudan `JSON`'a çevirip bize iletebilirsiniz.

---

## 4. Başarı ve Hata Kodları

İsteğiniz işlendiğinde sistem aşağıdaki HTTP durum kodlarından birini dönecektir:

| Kod | Durum | Açıklama |
| :--- | :--- | :--- |
| **200** | `OK` | Veri başarıyla alındı, eşleştirildi ve işlendi. |
| **400** | `Bad Request` | Gönderilen payload boş (Empty payload) veya JSON formatı hatalı. |
| **401** | `Unauthorized` | API anahtarı eksik, geçersiz veya iptal edilmiş. |
| **403** | `Forbidden` | API anahtarı geçerli ancak "Veri gönderimi" yetkisine sahip değil. |
| **422** | `Unprocessable` | JSON geçerli ancak beklenen formatta (dict veya list) değil. |
| **503** | `Service Unavail.` | Supabase veritabanı bağlantısı yapılandırılmamış veya ulaşılamıyor. |

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

---

## 5. Verilerin Görselleştirilmesi
Veriler API'ye ulaştıktan sonraki milisaniyeler içerisinde:
1. Şirketinizin `tenant_id`'sine özel olarak kaydedilir.
2. RAM üzerindeki "Canlı Ön Bellek" (Live Cache) silinerek yenilenir.
3. Yönetici panelinde (Control Tower) ekrandaki metrikler, açık riskler ve yapay zeka tavsiyeleri **sayfa yenilenmesine gerek kalmadan** bu yeni verilere göre güncellenir.
