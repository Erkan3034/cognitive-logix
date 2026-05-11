import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar, Footer } from "./Landing.jsx";
import "../landing.css";

const DOC_CONTENTS = {
  logistics: {
    title: "Lojistik ve Teslimat Model Rehberi",
    subtitle: "CatBoost tabanlı gecikme tahminleme sistemini nasıl yorumlamalısınız?",
    content: (
      <>
        <h2>Modelin Amacı</h2>
        <p>
          Lojistik modeli, siparişin verildiği andan teslimat anına kadar geçen süreyi analiz eder. 
          Amacımız, olası bir gecikmeyi henüz araç yola çıkmadan %90 doğrulukla tahmin etmektir.
        </p>
        
        <h2>Girdiler</h2>
        <ul>
          <li><strong>Mesafe ve Rota:</strong> Çıkış noktası ile hedef arasındaki coğrafi uzaklık.</li>
          <li><strong>Hava Durumu:</strong> Rota üzerindeki anlık ve tahmini meteorolojik olaylar.</li>
          <li><strong>Öncelik Seviyesi:</strong> Siparişin VIP veya standart olma durumu.</li>
          <li><strong>Hacim/Ağırlık:</strong> Yükün taşıma kapasitesine olan etkisi.</li>
        </ul>

        <h2>Çıktıların Yorumlanması</h2>
        <p>
          Model her sipariş için bir <code>delay_probability</code> (gecikme olasılığı) döndürür.
        </p>
        <div style={{ background: "rgba(148,163,184,0.05)", padding: 16, borderRadius: 8, margin: "16px 0", borderLeft: "4px solid #3b82f6" }}>
          <strong>Puanlama Sistemi:</strong><br/>
          • <strong>0.00 - 0.40:</strong> Güvenli Bölge (Zamanında teslimat bekleniyor)<br/>
          • <strong>0.41 - 0.70:</strong> Uyarı Bölgesi (Olası gecikme riski, alternatif rota önerilir)<br/>
          • <strong>0.71 - 1.00:</strong> Kritik Bölge (Gecikme kesin, acil müdahale gerektirir)
        </div>

        <h2>Aksiyon Önerisi</h2>
        <p>
          Kontrol ekranında kırmızı yanan siparişler için anında <em>"Alternatif Kurye Ata"</em> veya 
          <em> "Müşteriye Gecikme Bildirimi Gönder"</em> aksiyonlarını alabilirsiniz.
        </p>
      </>
    )
  },
  demand: {
    title: "Talep Tahmini",
    subtitle: "LightGBM ve kantil regresyon ile stok planlama",
    content: (
      <>
        <h2>Modelin Amacı</h2>
        <p>
          Geçmiş satış verileri, sezonsallık ve ekonomik göstergeleri kullanarak gelecekteki ürün talebini nokta atışı tahmin etmek.
        </p>
        
        <h2>Güven Aralıkları Neden Önemli?</h2>
        <p>
          Geleneksel modeller tek bir sayı verir (örneğin: "Yarın 100 ürün satılacak"). Ancak bizim sistemimiz 
          <strong> %10, %50 ve %90 güven aralıkları</strong> sunar.
        </p>
        <ul>
          <li><strong>P10 (Kötü Senaryo):</strong> Kesinlikle satılacak minimum miktar. Likidite planlaması için kullanılır.</li>
          <li><strong>P50 (Beklenen Senaryo):</strong> En olası satış miktarı. Temel stok planlaması için kullanılır.</li>
          <li><strong>P90 (İyi Senaryo):</strong> Talep patlaması yaşanırsa satılabilecek maksimum miktar. Fırsatları kaçırmamak için tampon stok olarak tutulur.</li>
        </ul>

        <h2>Entegrasyon Adımları</h2>
        <p>
          Stok yönetimi yazılımınız (ERP) ile canlı bağlantı üzerinden bağlanarak, günlük <code>P50</code> tahminini ana sipariş 
          miktarı olarak ayarlayabilir, <code>P90</code> tahminini ise güvenlik stoğu olarak belirleyebilirsiniz.
        </p>
      </>
    )
  },
  fraud: {
    title: "Finansal Usulsüzlük Tespiti",
    subtitle: "Isolation Forest ile Finansal Risk Analizi",
    content: (
      <>
        <h2>Modelin Amacı</h2>
        <p>
          Saniyede binlerce işlem gerçekleşen tedarik ağlarında, normal akışın dışına çıkan (anormal) şüpheli 
          işlemleri anında tespit ederek izole etmek.
        </p>
        
        <h2>Nasıl Çalışır?</h2>
        <p>
          <strong>Isolation Forest</strong> algoritması, veriler arasında kurallar bulmaya çalışmaz. Bunun yerine, 
          "diğerlerine hiç benzemeyen" ayrık verileri arar. Örneğin, her gün 500 TL'lik sipariş veren bir müşterinin 
          aniden gece yarısı 50,000 TL'lik sipariş vermesi saniyeler içinde anomali olarak işaretlenir.
        </p>

        <h2>Kontrol Ekranında Yorumlama</h2>
        <div style={{ background: "rgba(148,163,184,0.05)", padding: 16, borderRadius: 8, margin: "16px 0", borderLeft: "4px solid #ef4444" }}>
          <strong>Anomali Skoru (0.0 ile 1.0 arası):</strong><br/>
          Skor ne kadar 1.0'a yakınsa, işlemin sahtekarlık olma ihtimali o kadar yüksektir. Skor 0.70'i aştığında sistem 
          otomatik olarak siparişi <strong>"Manuel İnceleme"</strong> durumuna alır.
        </div>

        <h2>Müdahale</h2>
        <p>
          Denetim Kaydı ekranından şüpheli işlemin tüm detaylarını inceleyebilir ve işlemi onaylayabilir veya 
          kara listeye alabilirsiniz.
        </p>
      </>
    )
  }
};

export default function DocArticle() {
  const { slug } = useParams();
  const [scrolled, setScrolled] = useState(false);
  const doc = DOC_CONTENTS[slug];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.scrollTo(0, 0);
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  if (!doc) {
    return (
      <div className="landing-root" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 48, marginBottom: 16 }}>404</h1>
          <p style={{ color: "#94a3b8", marginBottom: 24 }}>Doküman bulunamadı.</p>
          <Link to="/docs" className="landing-btn-primary">Dokümantasyonlara Dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-root">
      <Navbar scrolled={scrolled} />
      
      <header className="landing-hero" style={{ padding: "140px 24px 40px", minHeight: "auto", textAlign: "left" }}>
        <div className="landing-hero-content" style={{ maxWidth: 800, margin: "0 auto" }}>
          <Link to="/docs" style={{ color: "#818cf8", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            <span>←</span> Dokümantasyonlara Dön
          </Link>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="landing-hero-title"
            style={{ fontSize: "clamp(32px, 5vw, 48px)" }}
          >
            {doc.title}
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="landing-hero-desc"
            style={{ margin: "16px 0 0 0" }}
          >
            {doc.subtitle}
          </motion.p>
        </div>
      </header>

      <section className="landing-section" style={{ paddingTop: 20 }}>
        <div className="doc-content" style={{ 
          maxWidth: 800, 
          margin: "0 auto", 
          color: "#cbd5e1", 
          fontSize: 16, 
          lineHeight: 1.8 
        }}>
          {doc.content}
        </div>
      </section>

      <Footer />
    </div>
  );
}
