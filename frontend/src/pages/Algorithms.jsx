import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Navbar, Footer } from "./Landing.jsx";
import "../landing.css";

const fadeUp = {
  hidden: { y: 40, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

function AlgorithmSection({ id, title, badge, desc, imageDesc, reverse }) {
  return (
    <section id={id} className="landing-section" style={{ padding: "80px 24px" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: "60px",
        alignItems: "center"
      }}>
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-100px" }} 
          variants={fadeUp}
          style={{ order: reverse ? 2 : 1 }}
        >
          <div className="section-tag" style={{ marginBottom: 16 }}>{badge}</div>
          <h2 className="section-title" style={{ fontSize: "32px", marginBottom: "20px" }}>{title}</h2>
          <p className="section-desc">{desc}</p>
        </motion.div>
        
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-100px" }} 
          variants={fadeUp}
          style={{ order: reverse ? 1 : 2 }}
        >
          <div className="feature-card" style={{ padding: "40px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "300px", background: "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(16,185,129,0.05))" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
              <h3 style={{ color: "#e2e8f0", fontSize: 18, marginBottom: 8 }}>{imageDesc.title}</h3>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>{imageDesc.sub}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Algorithms() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className="landing-root">
      <Navbar scrolled={scrolled} />
      
      <header className="landing-hero" style={{ padding: "160px 24px 80px", minHeight: "auto" }}>
        <div className="landing-hero-content">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="landing-hero-title"
          >
            Motorun Altındaki <br/>
            <span className="landing-hero-gradient">Yapay Zeka Gücü</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="landing-hero-desc"
          >
            Gelişmiş algoritmalarımız verilerinizi işler, riskleri öngörür ve 
            karar alma sürecinizi otomatikleştirir. Siyah kutu değil, şeffaf ve kanıta dayalı yapay zeka.
          </motion.p>
        </div>
      </header>

      <AlgorithmSection 
        id="catboost"
        badge="KARAR AĞAÇLARI"
        title="CatBoost & LightGBM"
        desc="Lojistik teslimat sürelerini ve talep tahminlerini yaparken en güçlü gradyan artırma algoritmalarını kullanıyoruz. Eksik veriler ve kategorik değişkenlerle doğrudan başa çıkabilen bu algoritmalar, devasa veri setlerinde bile milisaniyeler içinde yüksek isabetli tahminler üretir."
        imageDesc={{ title: "Gradyan artırma", sub: "Gelişmiş karar ağacı mimarisi ile yüksek başarı." }}
      />

      <AlgorithmSection 
        id="shap"
        badge="AÇIKLANABİLİR ZEKA"
        title="SHAP Açıklanabilirliği"
        desc="Yapay zeka sadece sonuç üretmez, nedenini de söyler. SHAP (SHapley Additive exPlanations) entegrasyonumuz sayesinde her bir tahminin altında yatan faktörleri (örneğin: hava durumu mu, rota mı gecikmeye sebep oldu?) tam olarak görebilirsiniz."
        imageDesc={{ title: "Şeffaf Kararlar", sub: "Her tahminin arkasındaki nedensellik bağı." }}
        reverse
      />

      <AlgorithmSection 
        id="isolation"
        badge="ANOMALİ TESPİTİ"
        title="Isolation Forest"
        desc="Milyonlarca işlem arasından finansal usulsüzlükleri ve tedarik zinciri anomalilerini saniyeler içinde ayıklar. Standart kuralların dışına çıkan her veri noktasını izole ederek sıfır-gün risklerini bile önceden tespit eder."
        imageDesc={{ title: "Anomali Avcısı", sub: "Beklenmeyen örüntüleri anında izole eder." }}
      />

      <AlgorithmSection 
        id="montecarlo"
        badge="SİMÜLASYON"
        title="Olasılıksal Simülasyon"
        desc="Sadece tek bir tahmin değil, tüm olasılıkları hesaplıyoruz. Olasılıksal simülasyonlarla stok darboğazlarını, maliyet dalgalanmalarını ve risk senaryolarını %90 güven aralıklarıyla önünüze seriyoruz."
        imageDesc={{ title: "Olasılık Dağılımı", sub: "10,000 farklı senaryonun eşzamanlı analizi." }}
        reverse
      />

      <Footer />
    </div>
  );
}
