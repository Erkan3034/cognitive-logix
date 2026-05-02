MİMARİ VE GELİŞTİRME KURAL SETİ: COGNITIVE CONTROL TOWER B2B SAAS
KAPSAM VE AMAÇ:
Bu proje bir B2B SaaS platformudur. Geliştirilecek her kod parçası, veri tabanı sorgusu ve yapay zeka modeli istisnasız olarak "Multi-Tenant" (Çoklu Kiracı) mimarisine uygun olmalıdır. Statik veri işleme, yerel dosya okuma ve paylaşımlı model kullanımı kesinlikle yasaktır.

Tüm geliştirmeler aşağıdaki 4 ana kurala göre yapılacaktır:

1. VERİ İZOLASYONU VE GÜVENLİK (MULTI-TENANCY)

Veritabanı olarak PostgreSQL (Supabase) kullanılacaktır.

Oluşturulan her tabloda istisnasız bir tenant_id (şirket/müşteri kimliği) kolonu bulunacaktır.

Tüm tablolarda Row Level Security (RLS) politikaları aktif edilecek; hiçbir sorgunun, oturum açmış kullanıcının tenant_id'si ile eşleşmeyen veriyi okumasına, yazmasına veya silmesine izin verilmeyecektir.

2. DİNAMİK VERİ ALIMI VE EŞLEŞTİRME (DATA MAPPING & INGESTION)

Sistem, yerel .csv dosyalarından okuma yapmayacaktır.

Kullanıcıların kendi verilerini sisteme aktarabilmesi için iki kanal kodlanacaktır:

UI üzerinden güvenli CSV/Excel yükleme modülü (Supabase Storage entegrasyonu ile).

ERP sistemleri için REST API / Webhook uç noktaları.

Veri tabanına yazılmadan önce bir "Schema Mapping" (Veri Eşleştirme) arayüzü/katmanı oluşturulacaktır. Müşterinin verisindeki kolon isimleri (Örn: Sipariş_Adedi), sistemin algoritmalarının beklediği standart kolon isimlerine (Örn: Order_Quantity) dönüştürülmeden hiçbir veri YZ modellerine gönderilmeyecektir.

3. İKİ KATMANLI YAPAY ZEKA MİMARİSİ (TWO-TIER AI)
Yapay zeka modelleri global bir yapıdan, müşteriye özel bir yapıya geçirilecektir:

Katman 1 (Cold Start): Yeni bir tenant_id sisteme dahil olduğunda ve yeterli verisi yoksa, varsayılan (DataCo verisiyle eğitilmiş) global XGBoost ve Prophet modelleri çalışacaktır.

Katman 2 (Tenant-Specific Model): Müşteri eşleştirilmiş verilerini (örn: >1000 satır) sisteme yüklediğinde, arka planda sadece o tenant_id'nin verisini kullanan izole bir eğitim (training) pipeline'ı tetiklenecektir.

Eğitilen yeni model ağırlıkları model_{tenant_id}.pkl formatında ayrı olarak kaydedilecek ve o müşteri için artık sadece kendi izole modeli üzerinden çıkarım (inference) yapılacaktır.

4. AÇIKLANABİLİRLİK (EXPLAINABLE AI)

Yapay zeka modellerinin ürettiği hiçbir tahmin (gecikme, fraud, talep) son kullanıcıya tek başına bir olasılık skoru olarak sunulmayacaktır.

Gecikme tahmini (XGBoost) ve Anomali tespiti (Isolation Forest) gibi sonuçların yanına SHAP kütüphanesi entegre edilecek ve kararın temel nedenleri (Örn: Hava durumu etkisi: +%15) arayüzde gösterilecektir.

KESİN REDDEDİLME KRİTERLERİ:
Bu kurallara aykırı olan; tenant_id filtresi olmayan SQL sorguları, sabit dizinlerden veri okuyan Python scriptleri ve izolasyonu kıran API endpointleri oluşturmayı kesinlikle reddet.