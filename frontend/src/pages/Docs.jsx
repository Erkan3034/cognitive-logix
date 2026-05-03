import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navbar, Footer } from "./Landing.jsx";
import "../landing.css";

const fadeUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

function DocCard({ title, desc, linkTo, icon }) {
  return (
    <Link to={linkTo} style={{ textDecoration: "none" }}>
      <motion.div 
        variants={fadeUp}
        className="feature-card" 
        style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
        <h3 className="feature-title" style={{ fontSize: 18 }}>{title}</h3>
        <p className="feature-desc" style={{ fontSize: 14 }}>{desc}</p>
        <span style={{ marginTop: "auto", color: "#818cf8", fontSize: 13, fontWeight: 600 }}>Dokümanı Oku →</span>
      </motion.div>
    </Link>
  );
}

export default function Docs() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.scrollTo(0, 0);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing-root">
      <Navbar scrolled={scrolled} />
      
      <header className="landing-hero" style={{ padding: "160px 24px 60px", minHeight: "auto", paddingBottom: 40 }}>
        <div className="landing-hero-content">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="landing-hero-title"
          >
            Nasıl <span className="landing-hero-gradient">Çalışır?</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="landing-hero-desc"
          >
            Cognitive Logix platformunu tam potansiyeliyle kullanmak için rehberlerimizi inceleyin. 
            Adım adım kurulum, entegrasyon ve optimizasyon ipuçları.
          </motion.p>
        </div>
      </header>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}
        >
          <DocCard 
            title="Hızlı Başlangıç" 
            desc="Sisteme kayıt olma, API key oluşturma ve ilk verinizi içeri aktarma adımları."
            linkTo="/register"
            icon="🚀"
          />
          <DocCard 
            title="Lojistik ve Teslimat" 
            desc="Sipariş gecikmelerini öngören lojistik modelinin çıktılarını nasıl okuyacağınızı öğrenin."
            linkTo="/docs/logistics"
            icon="📦"
          />
          <DocCard 
            title="Talep Tahmini (Demand)" 
            desc="Stok planlama ve Quantile tahminleme modellerinin iş süreçlerine entegrasyonu."
            linkTo="/docs/demand"
            icon="📈"
          />
          <DocCard 
            title="Sahtekarlık (Fraud) Tespiti" 
            desc="Anomali tespit sistemimizle finansal riskleri nasıl en aza indirebileceğinizi keşfedin."
            linkTo="/docs/fraud"
            icon="🛡️"
          />
          <DocCard 
            title="Veri Formatı ve Şema" 
            desc="Webhook ve CSV yüklemeleri için gerekli olan JSON formatları ve kolon eşleştirmeleri."
            linkTo="/api-docs"
            icon="🗄️"
          />
          <DocCard 
            title="Gelişmiş API Kullanımı" 
            desc="Sistemden canlı tahmin sonuçları almak için REST API referans rehberi."
            linkTo="/api-docs"
            icon="🔌"
          />
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
