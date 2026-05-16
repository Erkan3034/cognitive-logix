import "../landing.css";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

/* ─── SVG Icons ─────────────────────────────────────────── */
const IconBrain = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 28, height: 28 }}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);
const IconArrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconStar = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14, color: "#f59e0b" }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/* ─── Animated Counter ────────────────────────────────────── */
function AnimatedCounter({ value, suffix = "", duration = 2 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""));

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const end = numericValue;
    const stepTime = (duration * 1000) / 60;
    const increment = end / 60;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(start);
    }, stepTime);
    return () => clearInterval(timer);
  }, [inView, numericValue, duration]);

  const display = numericValue % 1 !== 0 ? count.toFixed(1) : Math.floor(count);
  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Section with InView ─────────────────────────────────── */
function Section({ children, className = "", ...props }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
      {...props}
    >
      {children}
    </motion.section>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] } }),
};

/* ─── Data ────────────────────────────────────────────────── */
const FEATURES = [
  {
    tag: "Lojistik Gecikme Analizi",
    title: "Gecikmeyi Önceden Bilin",
    desc: "CatBoost + SHAP ile kalibrasyon görmüş gecikme riski skoru. Her tahmin için 'Neden gecikiyor?' açıklaması ve karşı olgu aksiyon önerisi.",
    color: "#6366f1",
    algos: ["CatBoost Classifier", "Isotonic Regression", "SHAP Explainability"],
    splineUrl: "https://my.spline.design/untitled-e2a1c8e05d2ef55bc5fcf3ff4e72aaaa/",
    visual: "ship",
  },
  {
    tag: "Talep ve Stok Tahmini",
    title: "Talebi Güven Aralığıyla Tahmin Edin",
    desc: "LightGBM Quantile Regressor ile düşük, beklenen ve yüksek senaryo tahmini. Aralıklı taleplerde Croston metodu otomatik devreye girer.",
    color: "#10b981",
    algos: ["LightGBM Quantile", "Croston Method", "Safety Stock Algorithm"],
    splineUrl: "https://my.spline.design/untitled-e2a1c8e05d2ef55bc5fcf3ff4e72aaaa/",
    visual: "globe",
  },
  {
    tag: "Finansal Risk Dedektörü",
    title: "Sahtekarlığı Anomali Skoru ile Durdurun",
    desc: "CatBoost bilinen dolandırıcılık desenlerini yakalar. Isolation Forest daha önce hiç görülmemiş anomalileri tespit eder. Her uyarıya SHAP kodu eklenir.",
    color: "#f43f5e",
    algos: ["CatBoost + Isolation Forest", "Anomaly Scoring", "SHAP Reason Codes"],
    splineUrl: "https://my.spline.design/untitled-e2a1c8e05d2ef55bc5fcf3ff4e72aaaa/",
    visual: "container",
  },
];

const STATS = [
  { value: "54.8", suffix: "%", label: "Geç Teslimat Oranı", sub: "180K+ gerçek sipariş analizi" },
  { value: "12", suffix: "x", label: "Daha Hızlı Karar", sub: "Manuel analize kıyasla" },
  { value: "2.25", suffix: "%", label: "Usulsüzlük Tespiti", sub: "43:1 sınıf dengesizliği çözüldü" },
  { value: "90", suffix: "%", label: "Güven Aralığı", sub: "Kantil tahmin bandı" },
];

const PLANS = [
  { name: "Ücretsiz", price: "$0", period: "/ ay", desc: "Sistemi keşfet, demo verisiyle dene.", features: ["100 yapay zeka tahmini / ay", "3 modülün deneme erişimi", "Güvenli oturum", "Topluluk desteği"], cta: "Ücretsiz Başla", highlight: false },
  { name: "Başlangıç", price: "$49", period: "/ ay", desc: "KOBİ'ler için tam bulut ürün deneyimi.", features: ["5.000 yapay zeka tahmini / ay", "Dosya veri yükleme", "SHAP açıklamaları", "E-posta desteği", "API erişimi"], cta: "Başlangıç Planını Dene", highlight: true, badge: "Popüler" },
  { name: "Profesyonel", price: "$149", period: "/ ay", desc: "Büyüyen operasyonlar için eksiksiz motor.", features: ["50.000 yapay zeka tahmini / ay", "ERP entegrasyonu", "Olasılıksal simülatör", "Model sapma izleme", "Öncelikli destek"], cta: "Profesyonel Plana Geç", highlight: false },
];

const TESTIMONIALS = [
  { name: "Mert Kaya", role: "Tedarik Zinciri Direktörü, LogiCo", text: "SHAP açıklamaları sayesinde artık gecikme raporlarını birkaç dakikada anlıyoruz. Operasyonel kararlarımız %40 hızlandı.", stars: 5 },
  { name: "Selin Arslan", role: "Satın Alma Müdürü, NovaTrade", text: "Güvenlik stoğu algoritması ilk ayda fazla stoğumuzu %23 düşürdü. Yatırım getirisini hesaplamak için uzun süre beklememiz gerekmedi.", stars: 5 },
  { name: "Emir Demir", role: "CTO, MedSupply", text: "ERP'den direkt veri akışı kurmak 30 dakika sürdü. Otomatik veri akışı entegrasyonu beklediğimizden çok daha kolaydı.", stars: 5 },
];

/* ─── 3D Visual Component (CSS-based) ────────────────────── */
function Visual3D({ type, color }) {
  if (type === "ship") {
    return (
      <div className="visual-3d-container" style={{ "--accent": color }}>
        <div className="visual-3d-glow" />
        <div className="ship-scene">
          <div className="ship-water" />
          <div className="ship-body">
            <div className="ship-hull" />
            <div className="ship-bridge" />
            <div className="ship-containers">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="ship-container-box" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <div className="ship-smoke">
              <div className="smoke-puff s1" />
              <div className="smoke-puff s2" />
              <div className="smoke-puff s3" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (type === "globe") {
    return (
      <div className="visual-3d-container" style={{ "--accent": color }}>
        <div className="visual-3d-glow" />
        <div className="globe-scene">
          <div className="globe-sphere">
            <div className="globe-ring ring-1" />
            <div className="globe-ring ring-2" />
            <div className="globe-ring ring-3" />
            <div className="globe-core" />
            {[...Array(8)].map((_, i) => (
              <div key={i} className="globe-dot" style={{ "--angle": `${i * 45}deg`, "--delay": `${i * 0.3}s` }} />
            ))}
          </div>
          <div className="globe-pulse" />
        </div>
      </div>
    );
  }
  // container
  return (
    <div className="visual-3d-container" style={{ "--accent": color }}>
      <div className="visual-3d-glow" />
      <div className="container-scene">
        <div className="container-stack">
          {[...Array(4)].map((_, row) => (
            <div key={row} className="container-row">
              {[...Array(3)].map((_, col) => (
                <div key={col} className="container-box" style={{ animationDelay: `${(row * 3 + col) * 0.1}s` }} />
              ))}
            </div>
          ))}
        </div>
        <div className="container-crane">
          <div className="crane-arm" />
          <div className="crane-cable" />
          <div className="crane-hook" />
        </div>
      </div>
    </div>
  );
}

/* ─── Navbar ──────────────────────────────────────────────── */
export function Navbar({ scrolled }) {
  const { user } = useAuth();
  return (
    <motion.nav
      className={`landing-nav${scrolled ? " scrolled" : ""}`}
      initial={{ y: -60, x: "-50%", opacity: 0 }}
      animate={{ y: 0, x: "-50%", opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="landing-nav-inner">
        <div className="landing-nav-brand">
          <div className="landing-nav-logo"><IconBrain /></div>
          <span className="landing-nav-name">Cognitive Logix</span>
        </div>
        <div className="landing-nav-links">
          <a href="/#features" className="landing-nav-link">Özellikler</a>
          <a href="/#pricing" className="landing-nav-link">Fiyatlandırma</a>
          <a href="/#testimonials" className="landing-nav-link">Müşteriler</a>
        </div>
        <div className="landing-nav-actions">
          {user ? (
            <Link to="/app" className="landing-btn-primary">Uygulamaya Git <IconArrow /></Link>
          ) : (
            <>
              <Link to="/login" className="landing-btn-ghost">Giriş Yap</Link>
              <Link to="/register" className="landing-btn-primary">Ücretsiz Başla <IconArrow /></Link>
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}

/* ─── Hero with Parallax ──────────────────────────────────── */
function Hero() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const shipScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const shipRotate = useTransform(scrollYProgress, [0, 1], [0, 8]);

  return (
    <section className="landing-hero" ref={heroRef}>
      {/* Gradient mesh background */}
      <div className="hero-gradient-mesh" />

      {/* Parallax grid lines */}
      <div className="hero-grid-overlay" />

      <motion.div className="landing-hero-content" style={{ y: textY, opacity }}>
        <motion.div variants={fadeUp} custom={0} initial="hidden" animate="visible" className="landing-hero-badge">
          <span className="badge-dot" />
          <span>6 Algoritma &bull; 3 Modül &bull; Gerçek Karar Motoru</span>
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
      </motion.div>

      {/* 3D Ship Visual - Parallax */}
      <motion.div className="hero-3d-visual" style={{ scale: shipScale, rotate: shipRotate }}>
        <Visual3D type="ship" color="#6366f1" />
      </motion.div>

      {/* Stats bar */}
      <motion.div
        className="landing-hero-stats"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.7 }}
      >
        {STATS.map((s, i) => (
          <div key={i} className="hero-stat">
            <span className="hero-stat-value">
              <AnimatedCounter value={s.value} suffix={s.suffix} />
            </span>
            <span className="hero-stat-label">{s.label}</span>
            <span className="hero-stat-sub">{s.sub}</span>
          </div>
        ))}
      </motion.div>
    </section>
  );
}

/* ─── Zigzag Features with 3D Visuals ─────────────────────── */
function Features() {
  return (
    <Section className="landing-section" id="features">
      <motion.div variants={fadeUp} className="section-header">
        <span className="section-tag">6 Algoritma &bull; 3 Modül</span>
        <h2 className="section-title">Endüstri Standardı Karar Motoru</h2>
        <p className="section-desc">Her modül, yıllar içinde rafine edilmiş endüstriyel algoritmalarla birleştirilerek operasyonel mükemmeliyeti otomatize eder.</p>
      </motion.div>

      <div className="features-zigzag">
        {FEATURES.map((f, i) => {
          const isReversed = i % 2 !== 0;
          return (
            <FeatureRow key={i} feature={f} index={i} reversed={isReversed} />
          );
        })}
      </div>
    </Section>
  );
}

function FeatureRow({ feature: f, index, reversed }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className={`zigzag-row ${reversed ? "reversed" : ""}`}>
      <motion.div
        className="zigzag-content"
        initial={{ opacity: 0, x: reversed ? 60 : -60 }}
        animate={inView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="zigzag-tag" style={{ background: `${f.color}15`, color: f.color, borderColor: `${f.color}40` }}>{f.tag}</span>
        <h3 className="zigzag-title">{f.title}</h3>
        <p className="zigzag-desc">{f.desc}</p>
        <div className="zigzag-algos">
          {f.algos.map((a, j) => (
            <span key={j} className="algo-pill" style={{ borderColor: `${f.color}40`, color: f.color }}>{a}</span>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="zigzag-visual"
        initial={{ opacity: 0, x: reversed ? -60 : 60, scale: 0.9 }}
        animate={inView ? { opacity: 1, x: 0, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <Visual3D type={f.visual} color={f.color} />
      </motion.div>
    </div>
  );
}

/* ─── Pricing ─────────────────────────────────────────────── */
function Pricing() {
  return (
    <Section className="landing-section" id="pricing">
      <motion.div variants={fadeUp} className="section-header">
        <span className="section-tag">Fiyatlandırma</span>
        <h2 className="section-title">Operasyonunuzun Ölçeğine Uygun Plan</h2>
        <p className="section-desc">Tüm planlarda 6 algoritmanın temel yetenekleri mevcut. İhtiyacınıza göre ölçeklendirin.</p>
      </motion.div>
      <div className="pricing-grid">
        {PLANS.map((plan, i) => (
          <motion.div key={i} variants={fadeUp} custom={i} className={`pricing-card${plan.highlight ? " highlighted" : ""}`} whileHover={{ y: -8, transition: { duration: 0.25 } }}>
            {plan.badge && <span className="pricing-badge">{plan.badge}</span>}
            <div className="pricing-name">{plan.name}</div>
            <div className="pricing-price">{plan.price}<span className="pricing-period">{plan.period}</span></div>
            <p className="pricing-desc">{plan.desc}</p>
            <ul className="pricing-features">
              {plan.features.map((feat, j) => (
                <li key={j} className="pricing-feature"><span className="check-icon"><IconCheck /></span>{feat}</li>
              ))}
            </ul>
            <Link to="/register" className={`pricing-cta${plan.highlight ? " primary" : " ghost"}`}>{plan.cta}</Link>
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
          <motion.div key={i} variants={fadeUp} custom={i} className="testimonial-card" whileHover={{ y: -4, transition: { duration: 0.2 } }}>
            <div className="testimonial-stars">{Array.from({ length: t.stars }).map((_, j) => <IconStar key={j} />)}</div>
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
        <motion.h2 variants={fadeUp} custom={0} className="cta-title">Karar Motorunuzu Bugün Başlatın</motion.h2>
        <motion.p variants={fadeUp} custom={1} className="cta-desc">Kredi kartı gerekmez. 5 dakikada sisteme bağlanın. İlk 100 tahmin ücretsiz.</motion.p>
        <motion.div variants={fadeUp} custom={2} className="cta-actions">
          <Link to="/register" className="landing-btn-primary large">Ücretsiz Hesap Oluştur <IconArrow /></Link>
          <Link to="/login" className="landing-btn-ghost large">Giriş Yap</Link>
        </motion.div>
      </motion.div>
    </Section>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
export function Footer() {
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
          <a href="/#features">Özellikler</a>
          <a href="/#pricing">Fiyatlandırma</a>
          <Link to="/login">Giriş Yap</Link>
          <Link to="/register">Kayıt Ol</Link>
        </div>
        <div className="footer-links">
          <span className="footer-links-title">Algoritmalar</span>
          <Link to="/algorithms#catboost">CatBoost / LightGBM</Link>
          <Link to="/algorithms#shap">SHAP Açıklanabilirliği</Link>
          <Link to="/algorithms#isolation">Isolation Forest</Link>
          <Link to="/algorithms#montecarlo">Olasılıksal Simülasyon</Link>
        </div>
        <div className="footer-links">
          <span className="footer-links-title">Destek</span>
          <a href="mailto:hello@cognitive-logix.app">İletişim</a>
          <Link to="/docs">Dokümantasyon</Link>
          <Link to="/api-docs">API Referansı</Link>
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
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

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
