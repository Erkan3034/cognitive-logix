# Cognitive Logix - B2B SaaS Mimarisi ve Veri Akışı

Bu belge, sistemin mevcut durumunda verilerin nasıl işlendiğini ve bu projenin ticari bir B2B (Business-to-Business) SaaS (Software as a Service) ürününe dönüştürüldüğünde şirketlerin kendi verilerini sisteme nasıl entegre edeceğini açıklamaktadır.

## 1. Mevcut Sistemde Kararlar Nereden Geliyor?

Şu an sistemin beyni, proje geliştirilirken arka planda eğitilen büyük veri setine (DataCo Supply Chain) dayanmaktadır.

* **Eğitim Süreci:** Makine öğrenmesi modelleri (XGBoost, Random Forest vb.) bu veri setiyle eğitilmiş ve geçmişteki yüz binlerce satır veriye bakarak *"Hangi koşullar bir araya geldiğinde gecikme yaşanır?"* veya *"Hangi müşteri ve sipariş tipleri dolandırıcılık riski taşır?"* kurallarını öğrenmiştir.
* **Karar Mekanizması:** Arayüzde (örneğin Lojistik sayfasında) form doldurulup "Analiz Et" butonuna basıldığında, bu bilgiler arka taraftaki (Python FastAPI) yapay zeka modeline gönderilir. Model, eğitim sırasında öğrendiği **kendi hafızasındaki (weights) desenlerle** bu yeni gelen bilgiyi anlık olarak karşılaştırıp bir risk skoru ve gerekçe üreterek frontend'e döner.

---

## 2. Sistemi Şirketlere Sattığımızda Nasıl Çalışacak? (B2B SaaS Mimarisi)

Sistemi şirketlere sattığımızda, hiçbir şirket diğerinin verisini göremez (Multi-tenant) ve her sistem **o şirketin kendi dinamiklerine (kendi müşterileri, kargo firmaları, ürünleri)** göre çalışır. 

Bunu sağlamak için **3 aşamalı bir Müşteri Onboarding ve Entegrasyon** süreci kurulur:

### Aşama 1: Veri Entegrasyonu (Şirket verisi nasıl bağlanır?)
Şirketler sistemi satın aldığında onlara bir "Kurulum ve Entegrasyon" ekranı (Veri Merkezi) açılır. Excel ile manuel veri yüklemek büyük ölçekte kullanışsız olduğu için otomasyon sağlanır:
* **API ve ERP Bağlantıları:** Şirketlerin halihazırda kullandığı SAP, Oracle, Microsoft Dynamics gibi ERP sistemleri veya Shopify, Magento gibi e-ticaret altyapılarına hazır **API konnektörleri** ile bağlanılır.
* **Veri Ambarı (Data Warehouse):** Daha büyük ölçekli şirketler için Snowflake, Google BigQuery veya AWS Redshift gibi şirketin kendi veri ambarlarına "Okuma" (Read-only) yetkisiyle doğrudan bağlanılır.
* Sistem, her gece veya anlık (streaming) olarak şirketin yeni siparişlerini, stok durumlarını güvenli bulut sunucularımıza çeker.

### Aşama 2: Şirkete Özel Yapay Zeka Eğitimi (Fine-Tuning)
Kurduğumuz ana model çöpe atılmaz, **"Taban Model" (Base Model)** olarak kullanılır.
* Yeni bir Müşteri (Örn: X Şirketi) sisteme bağlandığında, X şirketinin son 1-2 yıllık geçmiş verisi (historical data) sisteme çekilir.
* Tedarik zinciri kurallarını genel hatlarıyla öğrenmiş güçlü ana modelimiz, **X Şirketinin kendi verisiyle yeniden eğitilir (Transfer Learning / Fine-Tuning).**
* *Neden?* Çünkü X şirketinin taşıyıcı firması farklıdır, iptal oranları farklıdır. Y şirketinin ise tamamen farklı bir coğrafyada, farklı bir risk profili vardır.
* Sonuç olarak arka planda **Her Şirketin Kendi Yapay Zeka Modeli** (Örn: `model_fraud_X_company.pkl`) oluşur ve ayrıştırılmış veri tabanlarında (Tenant bazlı) tutulur.

### Aşama 3: Canlı Operasyon ve Karar Akışı
Sistem şirket için tamamen özelleştiğinde canlıya (Production) alınır ve şu döngü başlar:
1. Şirketin satış kanallarından yeni bir sipariş düşer.
2. Bu sipariş verisi, mili-saniyeler içinde API üzerinden bizim **Cognitive Logix** sistemimize iletilir.
3. Sisteme düşen sipariş, sadece o şirkete özel eğitilmiş yapay zeka modelinden anlık olarak geçer.
4. **Eğer risk yoksa (Normal):** Cognitive Logix, şirketin ERP/Sipariş Yönetim sistemine "Onaylandı" API yanıtı döner ve sipariş depoya iletilir.
5. **Eğer risk varsa (Örn: Yüksek Dolandırıcılık veya Kesin Gecikme):** Cognitive Logix, işlemi depoya göndermeden durdurur (Hold state). Bu şüpheli işlemi bizim **Olay Kutusu (Exception Inbox)** ekranımıza ve ana Dashboard'a düşürür.
6. Şirketin operasyon veya risk yöneticisi sistemi açar, Olay Kutusundaki sadece yapay zekanın "riskli" bulduğu problemli işlemleri inceler, kararı manuel olarak (Onayla / İptal Et / İncelemeye Al) verir.

> **Özet:** Şu an kurduğumuz sistem güçlü bir **Çekirdek Zeka'dır (Core Engine)**. Bunu ticari bir ürüne dönüştürürken etrafına bir API katmanı ve veri entegrasyon modülleri yazarak, her firmaya özel veriyi otomatik alıp o firmaya özel sonuç üreten ve kararları doğrudan ERP'ye besleyen kapalı bir kutu (SaaS) haline getiririz.
