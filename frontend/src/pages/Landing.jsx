import "../landing.css";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

/* ─── SVG Icons ─────────────────────────────────────────── */
const IconBrain = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);
const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" /><circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
  </svg>
);
const IconTrend = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, color: "#f59e0b" }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const IconZap = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

/* ─── Data ────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <IconTruck />,
    tag: "Modül A",
    title: "Tahminleyici Lojistik",
    desc: "CatBoost + SHAP ile kalibrasyon görmüş gecikme riski skoru. Her tahmin için 'Neden gecikiyor?' açıklaması ve counterfactual aksiyon önerisi.",
    color: "#6366f1",
    algo: ["CatBoost Classifier", "Probability Calibration", "SHAP Explainability"],
  },
  {
    icon: <IconTrend />,
    tag: "Modül B",
    title: "Talep ve Envanter Zekası",
    desc: "Quantile Regression ile düşük/beklenen/yüksek senaryo tahmini. Hierarchical Forecasting ve Safety Stock algoritmaları ile otonom yeniden sipariş önerileri.",
    color: "#10b981",
    algo: ["Quantile Demand Forecasting", "Safety Stock Algorithm", "Reorder Point"],
  },
  {
    icon: <IconShield />,
    tag: "Modül C",
    title: "Finansal Güvenlik & Fraud",
    desc: "CatBoost Fraud Classifier ile bilinen kalıpları yakala; Isolation Forest ile daha önce hiç görülmemiş anomalileri tespit et. Her uyarıya açıklama kodu ekle.",
    color: "#f43f5e",
    algo: ["Fraud Classifier", "Isolation Forest / LOF", "Anomaly Reason Codes"],
  },
];

const STATS = [
  { value: "54.8%", label: "Geç Teslimat Oranı", sub: "180K+ gerçek sipariş analizi" },
  { value: "12x", label: "Daha Hızlı Karar", sub: "Manuel analize kıyasla" },
  { value: "2.25%", label: "Fraud Tespiti", sub: "43:1 sınıf dengesizliği çözüldü" },
  { value: "%90", label: "Güven Aralığı", sub: "Quantile tahmin bandı" },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/ ay",
    desc: "Sistemi keşfet, demo verisiyle dene.",
    features: ["100 AI tahmini / ay", "3 modülün demo erişimi", "Supabase auth ile oturum", "Topluluk desteği"],
    cta: "Ücretsiz Başla",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$49",
    period: "/ ay",
    desc: "KOBİ'ler için tam SaaS deneyimi.",
    features: ["5.000 AI tahmini / ay", "CSV / Excel veri yükleme", "SHAP açıklamaları", "E-posta desteği", "API Key erişimi"],
    cta: "Starter'ı Dene",
    highlight: true,
    badge: "Popüler",
  },
  {
    name: "Pro",
    price: "$149",
    period: "/ ay",
    desc: "Büyüyen operasyonlar için eksiksiz motor.",
    features: ["50.000 AI tahmini / ay", "Webhook / ERP entegrasyonu", "Monte Carlo simülatörü", "Model drift izleme", "Öncelikli destek"],
    cta: "Pro'ya Geç",
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: "Mert Kaya",
    role: "Supply Chain Director, LogiCo",
    text: "SHAP açıklamaları sayesinde artık gecikme raporlarını birkaç dakikada anlıyoruz. Operasyonel kararlarımız %40 hızlandı.",
    stars: 5,
  },
  {
    name: "Selin Arslan",
    role: "Procurement Manager, NovaTrade",
    text: "Safety Stock algoritması ilk ayda fazla stoğumuzu %23 düşürdü. ROI hesaplamak için uzun süre beklememiz gerekmedi.",
    stars: 5,
  },
  {
    name: "Emir Demir",
    role: "CTO, MedSupply",
    text: "ERP'den direkt veri akışı kurmak 30 dakika sürdü. Webhook entegrasyonu beklediğimizden çok daha kolaydı.",
    stars: 5,
  },
];

/* ─── Animation Variants ──────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] } }),
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({ opacity: 1, transition: { duration: 0.6, delay: i * 0.1 } }),
};

/* ─── Reusable Section Wrapper ────────────────────────────── */
function Section({ children, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.section>
  );
}

/* ─── Floating Orb ────────────────────────────────────────── */
function Orb({ style }) {
  return <div className="landing-orb" style={style} />;
}

/* ─── Navbar ──────────────────────────────────────────────── */
function Navbar({ scrolled }) {
  return (
    <motion.nav
      className={`landing-nav${scrolled ? " scrolled" : ""}`}
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="landing-nav-inner">
        <div className="landing-nav-brand">
          <div className="landing-nav-logo"><IconBrain /></div>
          <span className="landing-nav-name">Cognitive Logix</span>
        </div>
        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Özellikler</a>
          <a href="#pricing" className="landing-nav-link">Fiyatlandırma</a>
          <a href="#testimonials" className="landing-nav-link">Müşteriler</a>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="landing-btn-ghost">Giriş Yap</Link>
          <Link to="/register" className="landing-btn-primary">
            Ücretsiz Başla <IconArrow />
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

/* ─── Hero ────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="landing-hero">
      <Orb style={{ top: "5%", left: "10%", width: 500, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />
      <Orb style={{ top: "30%", right: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)" }} />
      <Orb style={{ bottom: "10%", left: "30%", width: 350, height: 350, background: "radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)" }} />

      <div className="landing-hero-content">
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible" className="landing-hero-badge">
          <span className="badge-dot" />
          <span>12 Endüstri Standardı Algoritma • Gerçek SaaS Karar Motoru</span>
        </motion.div>

        <motion.h1 variants={fadeUp} custom={1} initial="hidden" animate="visible" className="landing-hero-title">
          Tedarik Zincirinizin<br />
          <span className="landing-hero-gradient">Bilişsel Kontrol Kulesi</span>
        </motion.h1>

        <motion.p variants={fadeUp} custom={2} initial="hidden" animate="visible" className="landing-hero-desc">
          Gecikme riskini öngör, talebi güven aralığıyla tahmin et, sahtekarlığı anomali skoru ile tespit et.<br />
          Sadece veri değil — <strong>eyleme dönüştürülebilir karar.</strong>
        </motion.p>

        <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="landing-hero-cta">
          <Link to="/register" className="landing-btn-primary large">
            Ücretsiz Dene — Kredi Kartı Gerekmez <IconArrow />
          </Link>
          <a href="#features" className="landing-btn-ghost large">Nasıl Çalışır?</a>
        </motion.div>

        <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="landing-hero-stats">
          {STATS.map((s, i) => (
            <div key={i} className="hero-stat">
              <span className="hero-stat-value">{s.value}</span>
              <span className="hero-stat-label">{s.label}</span>
              <span className="hero-stat-sub">{s.sub}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Animated dashboard mockup */}
      <motion.div
        className="landing-hero-mockup"
        initial={{ opacity: 0, y: 60, rotateX: 15 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 1.2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mockup-bar">
          <span className="mockup-dot red" /><span className="mockup-dot yellow" /><span className="mockup-dot green" />
          <span className="mockup-url">cognitive-logix.app / dashboard</span>
        </div>
        <div className="mockup-body">
          <div className="mockup-kpi-row">
            {[
              { label: "Gecikme Riski", value: "54.8%", trend: "↓ 12%", color: "#6366f1" },
              { label: "Talep Güven Skoru", value: "91.3%", trend: "↑ 4%", color: "#10b981" },
              { label: "Fraud Tespit", value: "2.25%", trend: "↓ 0.8%", color: "#f43f5e" },
            ].map((k, i) => (
              <motion.div
                key={i}
                className="mockup-kpi"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + i * 0.15, duration: 0.5 }}
              >
                <span className="mockup-kpi-label">{k.label}</span>
                <span className="mockup-kpi-value" style={{ color: k.color }}>{k.value}</span>
                <span className="mockup-kpi-trend">{k.trend}</span>
              </motion.div>
            ))}
          </div>
          <div className="mockup-shap">
            <div className="mockup-shap-title">SHAP Açıklaması — Gecikme Nedenleri</div>
            {[
              { label: "Kargo Modu", pct: 72, color: "#6366f1" },
              { label: "Sipariş Bölgesi", pct: 55, color: "#8b5cf6" },
              { label: "Ürün Kategorisi", pct: 38, color: "#a78bfa" },
              { label: "Planlanan Süre", pct: 24, color: "#c4b5fd" },
            ].map((bar, i) => (
              <div key={i} className="mockup-bar-row">
                <span className="mockup-bar-label">{bar.label}</span>
                <div className="mockup-bar-track">
                  <motion.div
                    className="mockup-bar-fill"
                    style={{ background: bar.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.pct}%` }}
                    transition={{ delay: 1.4 + i * 0.1, duration: 0.7, ease: "easeOut" }}
                  />
                </div>
                <span className="mockup-bar-pct">{bar.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ─── Features ────────────────────────────────────────────── */
function Features() {
  return (
    <Section className="landing-section" id="features">
      <motion.div variants={fadeUp} className="section-header">
        <span className="section-tag">12 Algoritma • 3 Modül</span>
        <h2 className="section-title">Sektör Standardı Karar Motoru</h2>
        <p className="section-desc">Her modül, yıllar içinde rafine edilmiş endüstriyel algoritmalarla birleştirilerek operasyonel mükemmeliyeti otomatize eder.</p>
      </motion.div>

      <div className="features-grid">
        {FEATURES.map((f, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            custom={i}
            className="feature-card"
            whileHover={{ y: -6, transition: { duration: 0.25 } }}
          >
            <div className="feature-card-top">
              <div className="feature-icon" style={{ background: `${f.color}20`, color: f.color }}>{f.icon}</div>
              <span className="feature-tag" style={{ background: `${f.color}15`, color: f.color }}>{f.tag}</span>
            </div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
            <div className="feature-algos">
              {f.algo.map((a, j) => (
                <span key={j} className="algo-chip" style={{ borderColor: `${f.color}40`, color: f.color }}>
                  <IconZap /> {a}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Extra modules row */}
      <div className="extra-modules">
        {[
          { icon: "⚡", title: "Monte Carlo Simülatörü", desc: "What-if senaryolarını olasılıksal olarak modelle" },
          { icon: "📡", title: "Data Drift Detection", desc: "PSI/KS ile model bozulmasını gerçek zamanlı izle" },
          { icon: "🔗", title: "Webhook / ERP Entegrasyonu", desc: "SAP, Oracle ve custom sistemlerden canlı veri akışı" },
          { icon: "🗺️", title: "Auto Schema Mapping", desc: "Fuzzy eşleştirme ile kendi kolon isimlerini otomatik tanı" },
        ].map((m, i) => (
          <motion.div key={i} variants={fadeUp} custom={i * 0.5} className="extra-module-card">
            <span className="extra-module-icon">{m.icon}</span>
            <div>
              <div className="extra-module-title">{m.title}</div>
              <div className="extra-module-desc">{m.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────── */
function Pricing() {
  return (
    <Section className="landing-section" id="pricing">
      <motion.div variants={fadeUp} className="section-header">
        <span className="section-tag">Fiyatlandırma</span>
        <h2 className="section-title">Operasyonunuzun Ölçeğine Uygun Plan</h2>
        <p className="section-desc">Tüm planlarda 12 algoritmanın temel yetenekleri mevcut. İhtiyacınıza göre ölçeklendirin.</p>
      </motion.div>

      <div className="pricing-grid">
        {PLANS.map((plan, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            custom={i}
            className={`pricing-card${plan.highlight ? " highlighted" : ""}`}
            whileHover={{ y: -8, transition: { duration: 0.25 } }}
          >
            {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
            <div className="pricing-name">{plan.name}</div>
            <div className="pricing-price">
              {plan.price}<span className="pricing-period">{plan.period}</span>
            </div>
            <p className="pricing-desc">{plan.desc}</p>
            <ul className="pricing-features">
              {plan.features.map((feat, j) => (
                <li key={j} className="pricing-feature">
                  <span className="check-icon"><IconCheck /></span>
                  {feat}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className={`pricing-cta${plan.highlight ? " primary" : " ghost"}`}
            >
              {plan.cta}
            </Link>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ─── Testimonials ────────────────────────────────────────── */
function Testimonials() {
  return (
    <Section className="landing-section" id="testimonials">
      <motion.div variants={fadeUp} className="section-header">
        <span className="section-tag">Müşteri Görüşleri</span>
        <h2 className="section-title">Onlar Kullandı, Dönüştü</h2>
      </motion.div>

      <div className="testimonials-grid">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            custom={i}
            className="testimonial-card"
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <div className="testimonial-stars">
              {Array.from({ length: t.stars }).map((_, j) => <IconStar key={j} />)}
            </div>
            <p className="testimonial-text">"{t.text}"</p>
            <div className="testimonial-author">
              <div className="testimonial-avatar">{t.name[0]}</div>
              <div>
                <div className="testimonial-name">{t.name}</div>
                <div className="testimonial-role">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}

/* ─── CTA Banner ──────────────────────────────────────────── */
function CTABanner() {
  return (
    <Section className="landing-cta-section">
      <motion.div variants={fadeUp} className="cta-banner">
        <Orb style={{ top: "-20%", left: "20%", width: 300, height: 300, background: "radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)" }} />
        <motion.h2 variants={fadeUp} custom={0} className="cta-title">
          Karar Motorunuzu Bugün Başlatın
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="cta-desc">
          Kredi kartı gerekmez. 5 dakikada sisteme bağlanın. İlk 100 tahmin ücretsiz.
        </motion.p>
        <motion.div variants={fadeUp} custom={2} className="cta-actions">
          <Link to="/register" className="landing-btn-primary large">
            Ücretsiz Hesap Oluştur <IconArrow />
          </Link>
          <Link to="/login" className="landing-btn-ghost large">Giriş Yap</Link>
        </motion.div>
      </motion.div>
    </Section>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="landing-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="landing-nav-logo" style={{ marginBottom: 8 }}><IconBrain /></div>
          <div className="landing-nav-name">Cognitive Logix</div>
          <p className="footer-tagline">Tedarik Zinciri Bilişsel Kontrol Kulesi</p>
        </div>
        <div className="footer-links">
          <span className="footer-links-title">Platform</span>
          <a href="#features">Özellikler</a>
          <a href="#pricing">Fiyatlandırma</a>
          <Link to="/login">Giriş Yap</Link>
          <Link to="/register">Kayıt Ol</Link>
        </div>
        <div className="footer-links">
          <span className="footer-links-title">Algoritmalar</span>
          <span>CatBoost / LightGBM</span>
          <span>SHAP Explainability</span>
          <span>Isolation Forest</span>
          <span>Monte Carlo</span>
        </div>
        <div className="footer-links">
          <span className="footer-links-title">Destek</span>
          <a href="mailto:hello@cognitive-logix.app">İletişim</a>
          <span>Dokümantasyon</span>
          <span>API Referansı</span>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Cognitive Logix</span>
        <span>MIT Lisansı</span>
      </div>
    </footer>
  );
}

/* ─── Main Landing Component ──────────────────────────────── */
export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing-root">
      <Navbar scrolled={scrolled} />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  );
}
