import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navbar, Footer } from "./Landing.jsx";
import "../landing.css";

const fadeUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } },
};

function DocCard({ title, desc, linkTo, code }) {
  return (
    <Link to={linkTo} style={{ textDecoration: "none" }}>
      <motion.div
        variants={fadeUp}
        className="feature-card"
        style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}
      >
        <div className="data-chip" style={{ width: "max-content" }}>{code}</div>
        <h3 className="feature-title" style={{ fontSize: 18 }}>{title}</h3>
        <p className="feature-desc" style={{ fontSize: 14 }}>{desc}</p>
        <span style={{ marginTop: "auto", color: "#818cf8", fontSize: 13, fontWeight: 600 }}>Dokümanı oku</span>
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
          <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="landing-hero-title">
            Ürün <span className="landing-hero-gradient">Dokümantasyonu</span>
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="landing-hero-desc"
          >
            Kurulum, veri içe aktarma, bağlantı kullanımı ve karar ekranlarını doğru yorumlamak için kısa rehberler.
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
          <DocCard title="Hızlı Başlangıç" desc="Kayıt, bağlantı anahtarı oluşturma ve ilk veri aktarımı." linkTo="/register" code="START" />
          <DocCard title="Lojistik ve Teslimat" desc="Gecikme riski skorlarını ve rota kararlarını yorumlama." linkTo="/docs/logistics" code="OPS" />
          <DocCard title="Talep Tahmini" desc="Stok planlama, güven aralığı ve sipariş tetik noktası." linkTo="/docs/demand" code="FORECAST" />
          <DocCard title="Finansal Risk" desc="Anomali skorları, gerekçeler ve manuel inceleme akışı." linkTo="/docs/fraud" code="RISK" />
          <DocCard title="Veri Formatı ve Şema" desc="Dosya yükleme, kolon eşleme ve JSON formatları." linkTo="/api-docs" code="DATA" />
          <DocCard title="Bağlantı Kullanımı" desc="Canlı analiz sonuçları almak için bağlantı referansı." linkTo="/api-docs" code="REF" />
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
