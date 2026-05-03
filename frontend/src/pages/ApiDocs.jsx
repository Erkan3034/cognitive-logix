import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navbar, Footer } from "./Landing.jsx";
import "../landing.css";

function EndpointBlock({ method, path, title, desc, codeStr }) {
  return (
    <div className="panel" style={{ marginBottom: 32 }}>
      <div className="panel-header" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 className="panel-title" style={{ fontSize: 18, display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ 
              background: method === "POST" ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)", 
              color: method === "POST" ? "#22c55e" : "#3b82f6", 
              padding: "4px 8px", 
              borderRadius: 6, 
              fontSize: 12, 
              fontWeight: 800 
            }}>{method}</span>
            <code style={{ fontFamily: "monospace", color: "#e2e8f0", fontSize: 15 }}>{path}</code>
          </h3>
          <p className="panel-subtitle" style={{ marginTop: 8 }}>{title}</p>
        </div>
      </div>
      <div style={{ padding: "0 20px 20px" }}>
        <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>{desc}</p>
        <div style={{ 
          background: "#0a0f1d", 
          border: "1px solid rgba(148,163,184,0.1)", 
          borderRadius: 8, 
          padding: 16,
          overflowX: "auto"
        }}>
          <pre style={{ margin: 0, fontFamily: "monospace", fontSize: 13, color: "#a5b4fc", lineHeight: 1.5 }}>
            {codeStr}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function ApiDocs() {
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
            API <span className="landing-hero-gradient">Referansı</span>
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="landing-hero-desc"
          >
            Uygulamanızı Cognitive Logix motoruna bağlayın. Sistemlerinize yapay zeka entegre etmek 
            için ihtiyacınız olan REST endpointleri.
          </motion.p>
        </div>
      </header>

      <section className="landing-section" style={{ paddingTop: 0, maxWidth: 900 }}>
        
        <div style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 24, marginBottom: 40 }}>
          <h3 style={{ fontSize: 18, color: "#f1f5f9", marginBottom: 8 }}>Authentication (Kimlik Doğrulama)</h3>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>
            API istekleri yapabilmek için <Link to="/app/api-keys" style={{ color: "#818cf8" }}>API Keys</Link> sayfasından oluşturacağınız anahtarı 
            <code> X-API-Key</code> header'ı ile göndermeniz gerekmektedir. Tüm endpoint'ler `application/json` formatında çalışır.
          </p>
        </div>

        <EndpointBlock 
          method="POST"
          path="/api/v1/ingest/webhook"
          title="Veri İçe Aktarma (Webhook)"
          desc="ERP veya CRM sistemlerinizden gelen gerçek zamanlı sipariş/lojistik verilerini anında içeri aktarır ve analiz sırasına ekler."
          codeStr={`curl -X POST https://api.cognitive-logix.app/v1/ingest/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: cl_test_12345" \\
  -d '{
    "order_id": "ORD-5892",
    "origin": "Istanbul",
    "destination": "Ankara",
    "volume_kg": 1500,
    "priority": "high"
  }'`}
        />

        <EndpointBlock 
          method="GET"
          path="/api/v1/predict/logistics/:order_id"
          title="Gerçek Zamanlı Lojistik Tahmini"
          desc="Sisteme kaydedilmiş bir siparişin gecikme olasılığını ve risk skorunu döndürür."
          codeStr={`curl -X GET https://api.cognitive-logix.app/v1/predict/logistics/ORD-5892 \\
  -H "X-API-Key: cl_test_12345"
  
// Response:
// {
//   "order_id": "ORD-5892",
//   "delay_probability": 0.82,
//   "risk_level": "high",
//   "main_factor": "Weather conditions on route"
// }`}
        />

        <EndpointBlock 
          method="GET"
          path="/api/v1/health/models"
          title="Sistem ve Model Durumu"
          desc="Kullanılabilir olan makine öğrenmesi modellerinin versiyonlarını, PSI değerlerini ve operasyonel durumlarını listeler."
          codeStr={`curl -X GET https://api.cognitive-logix.app/v1/health/models \\
  -H "X-API-Key: cl_test_12345"
  
// Response:
// {
//   "status": "healthy",
//   "active_models": ["catboost_v2_logistic", "isolation_v1_fraud"]
// }`}
        />
      </section>

      <Footer />
    </div>
  );
}
