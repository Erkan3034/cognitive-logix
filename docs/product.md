# Ürün El Kitabı

Cognitive Logix, her biri tedarik zincirinin belirli bir segmentini izlemek ve optimize etmek için tasarlanmış, birbirine bağlı çeşitli modüllerden oluşur.

## 1. Lojistik ve Teslimat
Lojistik modülü, operasyonel performansı değerlendirir ve gecikmiş teslimat olasılığını tahmin eder. 
Kargo yöntemini, sipariş bölgesini ve ürün kategorilerini bir CatBoost sınıflandırma modeli aracılığıyla analiz eder. Yüksek riskli bir gecikme tespit edilirse, sistem kargo hizmet seviyesinin (tier) yükseltilmesi veya envanterin farklı bir rotaya yönlendirilmesi gibi proaktif müdahale önerileri sunar.

## 2. Finansal Risk ve Dolandırıcılık Tespiti (Fraud)
Dolandırıcılık modülü, kötü niyetli işlemlere karşı bir kalkan görevi görür.
İşlem tutarlarını, ödeme türlerini ve coğrafi verileri bir Isolation Forest (İzolasyon Ormanı) ve CatBoost topluluğu (ensemble) ile işleyerek anomali barındıran davranışları işaretler. Şüpheli siparişler yerine getirilmeden (fulfillment) önce tespit edilir ve WMS veya ERP sistemine bir "Beklet (Hold)" tavsiyesi gönderilir.

## 3. Talep Tahmini ve Stok Yönetimi
Talep modülü, kantil regresyon (quantile regression) tahminleri (p10, p50, p90) sağlamak için LightGBM kullanır.
Bu sayede stok yöneticileri, en kötü ve en iyi talep senaryolarını inceleyebilir; böylece aşırı stoklama (overstocking) veya stok tükenmesi (stockout) durumlarının finansal etkisini en aza indirir. Aralıklı (intermittent) talep kalıpları için modül, doğru temel (baseline) hesaplamaları sağlamak adına dinamik olarak Croston metoduna geçer.

## 4. Senaryo Laboratuvarı
Senaryo Laboratuvarı, canlı veri seti üzerinde stres testi yapılmasını sağlar.
Tedarik zinciri yöneticileri; liman kapanmaları, tedarikçi grevleri veya ani talep artışları gibi varsayımsal krizleri simüle edebilir ve ML çıkarım motoru tarafından hesaplanan finansal ve operasyonel etkiyi anında görüntüleyebilir.

## 5. Kontrol Kulesi (Control Tower) ve Veri Alımı (Ingestion)
Kontrol Kulesi, merkezi bir yönetici gösterge paneli (dashboard) olarak hizmet verir. Veriler sisteme manuel toplu yüklemeler (Veri Merkezi) veya otomatik webhook'lar (API Anahtarları) aracılığıyla akar. Kullanıcı arayüzü, sıfır gecikmeli (zero-latency) metrik hesaplaması sunmak için gerçek zamanlı önbellekleme kullanır. Bu da sunulan eyleme dönüştürülebilir içgörülerin, ERP'den gelen en son verilerle her zaman güncel kalmasını sağlar.
