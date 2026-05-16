import { driver } from "driver.js";
import "driver.js/dist/driver.css";

/**
 * Merkezi Ürün Eğitim Turu Sistemi
 * Her sayfaya özel, kullanıcı dostu adım adım rehberlik sağlar.
 * Teknik kavramlardan arındırılmış, iş odaklı açıklamalar kullanır.
 */

const TOUR_STEPS = {

  /* ─── Operasyon Merkezi (Dashboard) ─── */
  dashboard: [
    {
      element: ".page-header",
      popover: {
        title: "📊 Operasyon Merkezine Hoş Geldiniz",
        description: "Burası tedarik zincirinizin kontrol merkezidir. Tüm kritik göstergeleri tek bakışta görebilir, sorunlu alanları tespit edip anında aksiyon alabilirsiniz.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#dashboard-kpi",
      popover: {
        title: "📈 Temel Performans Göstergeleri (KPI)",
        description: "Bu kartlar operasyonunuzun anlık sağlık durumunu özetler:\n\n• Zamanında teslimat: Siparişlerin kaçının zamanında ulaştığı\n• Gecikme riski: Gecikme olasılığı yüksek olan siparişlerin oranı\n• Talep riski: Talepteki ani değişim olasılığı\n• Finansal maruziyet: Potansiyel mali kayıp tutarı\n\nHer kart, tüm sipariş verilerinizin yapay zeka tarafından analiz edilmesiyle hesaplanır.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#dashboard-risk-map",
      popover: {
        title: "🗺️ Risk Haritası",
        description: "Bu tablo hangi bölge, taşıma yöntemi ve ürün kategorisinde risk yoğunlaştığını gösterir. Kırmızı satırlar acil müdahale gerektiren alanları işaret eder.\n\nSatıra tıklayarak o segmentin detaylı analizine (Lojistik sayfasına) geçebilirsiniz.",
        side: "top",
        align: "start",
      },
    },
    {
      element: "#dashboard-incidents",
      popover: {
        title: "🚨 Olay Kutusu",
        description: "Sistemin otomatik tespit ettiği kritik olaylar burada listelenir. Örneğin; bir bölgede anormal gecikme artışı veya şüpheli sipariş paterni algılandığında buraya düşer.\n\nHer olayın yanındaki butonla detaya inebilir, notunuzu ekleyebilir veya olayı çözümlendi olarak işaretleyebilirsiniz.",
        side: "top",
        align: "start",
      },
    },
  ],

  /* ─── Lojistik Modülü ─── */
  logistics: [
    {
      element: ".page-header",
      popover: {
        title: "🚛 Teslimat Risk Analizi",
        description: "Bu sayfa, her siparişin gecikme olasılığını yapay zeka modeliyle hesaplar. Sonuçta sadece bir skor değil; gecikmeye neden olan faktörler, önerilen aksiyonlar ve harita üzerinde rota görselleştirmesi de sunulur.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#logistics-guide",
      popover: {
        title: "📋 Nasıl Kullanılır?",
        description: "3 basit adımda:\n\n1️⃣ Sol taraftaki forma sipariş bilgilerini girin\n2️⃣ Sistemin ürettiği risk skorunu ve nedenlerini okuyun\n3️⃣ Gerekirse alternatif gönderim senaryosunu karşılaştırın\n\nBu kartlar size her zaman yol gösterir.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#logistics-form",
      popover: {
        title: "📝 Sipariş Bilgileri Formu",
        description: "Buraya analiz etmek istediğiniz siparişin detaylarını girersiniz:\n\n• Rota: Çıkış ve varış şehrini yazmanız yeterli, koordinatlar otomatik bulunur\n• Gönderim hızı: Standart, ekonomi veya öncelikli\n• Bölge ve pazar: Siparişin hedef pazarı\n• Tutar ve adet: Siparişin mali değeri\n\nBu alanlar yapay zeka modeline girdi olarak gönderilir.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#logistics-result",
      popover: {
        title: "📊 Karar Özeti Paneli",
        description: "Analiz sonuçları burada görünür:\n\n• Gecikme riski yüzdesi (örn. %44)\n• Tahmini finansal maruziyet (gecikme durumundaki potansiyel kayıp)\n• Riski etkileyen faktörlerin sıralı listesi (hangi girdi riski artırıyor, hangisi azaltıyor)\n• Duruma özel aksiyon önerileri\n\nKırmızı = Kritik, Sarı = İzlenmeli, Yeşil = Güvenli",
        side: "left",
        align: "start",
      },
    },
  ],

  /* ─── Talep Tahmini Modülü ─── */
  demand: [
    {
      element: ".page-header",
      popover: {
        title: "📦 Stok ve Talep Planlama",
        description: "Bu sayfa, geçmiş sipariş verilerinizi analiz ederek gelecekteki talebi tahmin eder. Ne kadar ürün sipariş etmeniz gerektiğini, stokta ne kadar tutmanız gerektiğini ve hangi noktada yeni sipariş vermeniz gerektiğini hesaplar.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#demand-guide",
      popover: {
        title: "📋 Kullanım Adımları",
        description: "1️⃣ Tahmin kapsamını seçin (ürün, bölge, dönem)\n2️⃣ Grafikteki güven aralığını okuyun (en iyi ve en kötü senaryo)\n3️⃣ Sistem tarafından önerilen sipariş miktarını değerlendirin",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#demand-form",
      popover: {
        title: "⚙️ Tahmin Ayarları",
        description: "Tahmin modelinin ihtiyaç duyduğu bilgileri buradan girersiniz:\n\n• Tahmin dönemi: Kaç gün ilerisi için tahmin yapılacak (7-90 gün)\n• Kategori ve pazar: Hangi ürün grubu ve coğrafya için\n• Mevcut stok: Şu an depoda kaç adet ürün var\n• Tedarik süresi: Yeni sipariş verdiğinizde kaç günde ulaşır\n\nBu bilgiler, tahmin doğruluğunu ve stok önerilerini doğrudan etkiler.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#demand-result",
      popover: {
        title: "📈 Tahmin Sonuçları",
        description: "Sonuçlar üç katmanda sunulur:\n\n• Üst kısım: Ortalama talep, en iyi senaryo ve en kötü senaryo sayıları\n• Grafik: Beyaz çizgi = tahmin edilen talep, turuncu alan = olası üst sınır, kesikli çizgi = alt sınır\n• Alt kısım: Güvenlik stoğu miktarı, sipariş tetik noktası ve önerilen sipariş adedi\n\nYeşil banner = stok yeterli, Sarı banner = sipariş vermeniz önerilir.",
        side: "left",
        align: "start",
      },
    },
  ],

  /* ─── Finansal Risk Modülü ─── */
  fraud: [
    {
      element: ".page-header",
      popover: {
        title: "🔒 Sipariş Güvenlik Analizi",
        description: "Bu sayfa her siparişi yapay zeka ile anomali kontrolünden geçirir. Sipariş tutarı, kar marjı, ödeme tipi ve müşteri segmentini birlikte değerlendirerek işlemin ne kadar güvenli olduğunu belirler.\n\nAmaç: Şüpheli, zararlı veya alışılmadık siparişleri sevkiyattan önce tespit etmek.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#fraud-guide",
      popover: {
        title: "📋 3 Adımda Risk Kontrolü",
        description: "1️⃣ Sipariş ve müşteri bilgilerini girin\n2️⃣ Risk skorunu eşik değerleriyle karşılaştırın (Normal / İnceleme / Yüksek risk)\n3️⃣ Sisteme göre onaylayın, beklemeye alın veya manuel incelemeye yönlendirin",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#fraud-form",
      popover: {
        title: "📝 İşlem Bilgileri",
        description: "Yapay zeka modelinin değerlendirme yapabilmesi için gereken sipariş bilgileri:\n\n• Sipariş tutarı ve karlılık: Normalden yüksek tutar veya negatif kar, otomatik uyarı tetikler\n• İndirim oranı: Aşırı yüksek indirimler şüpheli işlem sinyalidir\n• Ödeme tipi ve müşteri segmenti: Ödeme yöntemi ve müşteri profili birlikte değerlendirilir\n• Bölge ve pazar: Coğrafi uyumsuzluklar ek risk sinyali üretir",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#fraud-result",
      popover: {
        title: "📊 Karar Özeti",
        description: "Risk analizi sonuçları burada görünür:\n\n• Risk Skoru (100 üzerinden): Yapay zekanın o işleme verdiği güvenlik notu\n• Risk altındaki değer: Sorun yaşanırsa kaybedilecek toplam tutar\n• Aksiyon önerileri: Skora göre otomatik üretilen adımlar (onay, bekleme veya inceleme)\n• Gerekçeler: Hangi faktörün skoru yükselttiğini veya düşürdüğünü gösteren çubuk grafik\n\n🟢 0-33 = Normal | 🟡 34-66 = İnceleme gerekli | 🔴 67-100 = Yüksek risk",
        side: "left",
        align: "start",
      },
    },
  ],

  /* ─── Senaryo Laboratuvarı ─── */
  scenarioLab: [
    {
      element: ".page-header",
      popover: {
        title: "🧪 Senaryo Laboratuvarı",
        description: "Bu sayfa \"Ya eğer...?\" sorularınızı test etmenizi sağlar. Örneğin: \"Ana liman kapanırsa ne olur?\", \"Talep %30 artarsa maliyetimiz nasıl değişir?\" gibi senaryoları gerçekleşmeden önce simüle edebilirsiniz.\n\nAmaç: Kriz anında hazırlıksız yakalanmamak için önceden plan yapmak.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: "#scenario-form",
      popover: {
        title: "🎛️ Senaryo Girdileri",
        description: "Kriz parametrelerini bu panelden ayarlarsınız:\n\n• Liman durumu: Ana limanın açık mı kapalı mı olduğunu seçin\n• Talep artışı: Talepte beklenen yüzdelik artışı kaydırıcıyla belirleyin\n• Tedarikçi grevi: Bölgesel veya küresel grev senaryosunu simüle edin\n\nBu parametreler, mevcut verilerinize stres testi olarak uygulanır ve sonuçlar anında hesaplanır.",
        side: "right",
        align: "start",
      },
    },
    {
      element: "#scenario-kpi",
      popover: {
        title: "📊 Gösterge Etkisi Kartları",
        description: "Her kart, mevcut durumunuz (Baz) ile felaket senaryonuz (Senaryo) arasındaki farkı gösterir:\n\n• Zamanında teslimat: Senaryoda teslimat oranı ne kadar düşer?\n• Gecikme riski: Gecikme olasılığı kaç puan artar?\n• Talep riski: Talep oynaklığı nasıl değişir?\n• Finansal maruziyet: Şirkete ek maliyeti ne olur?\n\nKırmızı chip (+puan) kötüleşme, yeşil chip iyileşme anlamına gelir.",
        side: "bottom",
        align: "center",
      },
    },
    {
      element: "#scenario-hero",
      popover: {
        title: "💡 Sonuç Geri Bildirimi",
        description: "Simülasyon tamamlandığında bu alan otomatik bir yorum üretir:\n\n• 'Senaryo operasyonel baskıyı artırıyor' = Kriz durumu mali ve operasyonel riskleri yükseltiyor\n• 'Senaryo daha dengeli sonuç üretiyor' = Alternatif senaryo mevcut durumdan daha iyi\n\nSağ taraftaki etiketler tam olarak kaç puan gecikme artışı ve ne kadarlık ek maliyet oluştuğunu gösterir.",
        side: "top",
        align: "center",
      },
    },
  ],

  /* ─── Olay Kutusu ─── */
  exceptionInbox: [
    {
      element: ".page-header",
      popover: {
        title: "📬 Olay Kutusu",
        description: "Sistem tarafından otomatik tespit edilen tüm anormal durumlar burada listelenir. Her olay; önem derecesi (kritik, yüksek, orta), tipi (gecikme, talep anomalisi, dolandırıcılık) ve açıklamasıyla birlikte gösterilir.\n\nAmaç: Hiçbir kritik olayı gözden kaçırmadan, merkezi bir yerden yönetmek.",
        side: "bottom",
        align: "start",
      },
    },
  ],

  /* ─── Canlı Bağlantılar ─── */
  liveConnections: [
    {
      element: ".page-header",
      popover: {
        title: "🔌 Canlı Bağlantılar",
        description: "Sisteminizin dış veri kaynaklarına (ERP, depo yönetimi, ödeme sistemi vb.) olan bağlantı durumunu gösterir. Yeşil = aktif ve sağlıklı, Kırmızı = bağlantı kopuk veya sorunlu.\n\nBağlantı kopukluğu durumunda verileriniz güncel olmayabilir, bu da risk hesaplamalarını etkileyebilir.",
        side: "bottom",
        align: "start",
      },
    },
  ],

  /* ─── Karar Etkisi ─── */
  decisionImpact: [
    {
      element: ".page-header",
      popover: {
        title: "📐 Karar Etkisi Takibi",
        description: "Geçmişte aldığınız aksiyonların (rota değişikliği, hızlı gönderim, sipariş iptali vb.) sonuçlarını ölçer. Hangi kararın ne kadar iyileştirme veya kötüleşme sağladığını gösterir.\n\nAmaç: Veri odaklı karar alma kültürünü güçlendirmek.",
        side: "bottom",
        align: "start",
      },
    },
  ],
};

/**
 * Belirli bir sayfa için eğitim turunu başlatır.
 * @param {string} pageKey - Sayfa anahtarı (ör. "logistics", "fraud")
 */
export function startTour(pageKey) {
  const steps = TOUR_STEPS[pageKey];
  if (!steps || steps.length === 0) return;

  // Sayfadaki mevcut elementleri kontrol et, olmayanları filtrele
  const validSteps = steps.filter((step) => {
    if (!step.element) return true;
    return document.querySelector(step.element);
  });

  if (validSteps.length === 0) return;

  const driverObj = driver({
    showProgress: true,
    showButtons: ["next", "previous", "close"],
    nextBtnText: "Sonraki →",
    prevBtnText: "← Önceki",
    doneBtnText: "Turu Bitir ✓",
    progressText: "{{current}} / {{total}}",
    popoverClass: "cl-tour-popover",
    overlayColor: "rgba(0, 0, 0, 0.75)",
    stagePadding: 8,
    stageRadius: 12,
    animate: true,
    smoothScroll: true,
    allowClose: true,
    steps: validSteps,
  });

  driverObj.drive();
}

/**
 * Sayfa için tur mevcut mu kontrol eder.
 * @param {string} pageKey
 * @returns {boolean}
 */
export function hasTour(pageKey) {
  return Boolean(TOUR_STEPS[pageKey]?.length);
}
