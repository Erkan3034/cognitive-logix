import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { postFraud } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";
import { startTour } from "../lib/tourConfig.js";

const REASON_TR = {
  "High sales amount": "Yüksek sipariş tutarı",
  "Negative profit order": "Sipariş zarar üretiyor",
  "Negative profit margin": "Sipariş zarar üretiyor",
  "Low profit margin": "Kar marjı düşük",
  "High order value relative to segment": "Segment için yüksek tutar",
  "Unusual payment pattern": "Ödeme deseninde sapma",
  "Market mismatch": "Pazar ve segment uyumsuzluğu",
  "Type": "Ödeme tipi",
  "Category Name": "Ürün kategorisi",
  "Market": "Pazar",
  "Customer Segment": "Müşteri segmenti",
  "Order Region": "Sipariş bölgesi",
  "Order Item Quantity": "Sipariş adedi",
  "Order Item Discount Rate": "İndirim oranı",
  "Sales_winsor": "Sipariş tutarı",
  "Benefit per order_winsor": "Sipariş karlılığı",
  "shipping_delay": "Sevkiyat gecikmesi",
  "negative_profit_flag": "Negatif kar riski",
  "raises_risk": "Riski artırıyor",
  "lowers_risk": "Riski azaltıyor",
};

const INITIAL_FEATURES = {
  sales: 200,
  benefit_per_order: 25,
  market: "US / Puerto Rico",
  customer_segment: "Consumer",
  order_region: "US / Puerto Rico",
  category: "Fan Shop",
  quantity: 1,
  discount_rate: 0,
  payment_type: "DEBIT",
};

function toTR(text) {
  return REASON_TR[text] || text || "Gerekçe";
}

function riskLevel(score) {
  if (score == null) return { label: "Bekleniyor", cls: "neutral", color: "#a1a1aa" };
  if (score >= 0.67) return { label: "Yüksek risk", cls: "high", color: "#ef4444" };
  if (score >= 0.34) return { label: "İnceleme gerekli", cls: "medium", color: "#f59e0b" };
  return { label: "Normal", cls: "low", color: "#10b981" };
}

function ReasonChart({ reasons }) {
  const data = (reasons || []).slice(0, 6).map((reason) => ({
    name: toTR(reason.reason),
    impact: Math.abs(Number(reason.shap_value || 0.05)),
    direction: reason.impact,
  }));

  if (!data.length) {
    return (
      <EmptyState title="Gerekçe listesi yok">
        Model bu işlem için ayrıntılı gerekçe döndürmedi.
      </EmptyState>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(150, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={170} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ payload }) => {
            const row = payload?.[0]?.payload;
            if (!row) return null;
            return (
              <div className="usage-tooltip">
                <strong>{row.name}</strong>
                <span>{row.direction === "raises_risk" ? "Riski artırıyor" : "Riski azaltıyor"}</span>
              </div>
            );
          }}
        />
        <Bar dataKey="impact" radius={[0, 5, 5, 0]}>
          {data.map((row, index) => (
            <Cell key={index} fill={row.direction === "raises_risk" ? "#ef4444" : "#10b981"} fillOpacity={0.86} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RiskAction({ score }) {
  const actions =
    score >= 0.67
      ? ["İşlemi geçici olarak askıya alın.", "Müşteri ve ödeme bilgilerini manuel doğrulayın.", "Risk ekibi onayı olmadan sevkiyat başlatmayın."]
      : score >= 0.34
        ? ["Hesap geçmişini hızlıca kontrol edin.", "İndirim ve kar marjı sapmasını doğrulayın.", "Gerekirse müşteriden ek teyit alın."]
        : ["Standart onay akışıyla devam edin.", "Kayıtları denetim izinde saklayın.", "Benzer segmentlerde periyodik takip yapın."];

  return (
    <div className="decision-list">
      {actions.map((action) => (
        <div key={action} className="decision-list-row">
          <span aria-hidden="true" />
          <p>{action}</p>
        </div>
      ))}
    </div>
  );
}

export default function Fraud() {
  const [features, setFeatures] = useState(INITIAL_FEATURES);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setField = (key, value) => {
    setFeatures((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setResult(await postFraud({ features }));
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Finansal risk analizi tamamlanamadı.");
    } finally {
      setLoading(false);
    }
  };

  const score = result && !result.error ? (result.combined_risk_score ?? result.anomaly_score ?? 0) : null;
  const level = riskLevel(score);
  const margin = features.sales > 0 ? (features.benefit_per_order / features.sales) * 100 : 0;
  const grossValue = Number(features.sales || 0) * Number(features.quantity || 1);

  const resultStats = useMemo(() => {
    if (score == null) return null;
    const pct = score * 100;
    return {
      scoreText: pct > 0 && pct < 1 ? `${pct.toFixed(1)}/100` : `${Math.round(pct)}/100`,
      valueAtRisk: grossValue * score,
      margin,
    };
  }, [score, grossValue, margin]);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="page-layout">
      <PageIntro eyebrow="Finansal risk" title="Sipariş Güvenlik Analizi" onTourStart={() => startTour("fraud")}>
        Sipariş tutarı, kar marjı, ödeme tipi ve müşteri segmentini birlikte değerlendirerek anomali riskini hesaplayın.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Analiz tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <motion.section id="fraud-guide" className="guide-grid" variants={staggerContainer} initial="hidden" animate="show">
        {[
          ["1", "İşlem bilgisi", "Sipariş, ödeme ve müşteri alanlarını girin."],
          ["2", "Risk skoru", "Skoru eşiklerle birlikte okuyun: normal, inceleme, yüksek risk."],
          ["3", "Karar", "Onay, bekletme veya manuel inceleme aksiyonunu uygulayın."],
        ].map(([step, title, text]) => (
          <motion.article key={step} className="guide-card" variants={fadeInUp} whileHover={{ y: -4, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}>
            <span className="guide-step">{step}</span>
            <h3 className="guide-title">{title}</h3>
            <p className="guide-text">{text}</p>
          </motion.article>
        ))}
      </motion.section>

      <section className="two-column">
        <form id="fraud-form" className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">İşlem bilgileri</h2>
              <p className="panel-subtitle">Modelin finansal risk skoru için kullandığı alanlar.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Sipariş tutarı</span>
              <input type="number" min={0} step={0.01} className="input" value={features.sales} onChange={(event) => setField("sales", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">Sipariş karlılığı</span>
              <input type="number" step={0.01} className="input" value={features.benefit_per_order} onChange={(event) => setField("benefit_per_order", Number(event.target.value))} />
              {features.benefit_per_order < 0 && <span className="field-helper">Negatif kar marjı yüksek risk sinyalidir.</span>}
            </label>
            <label className="field">
              <span className="field-label">Sipariş adedi</span>
              <input type="number" min={1} className="input" value={features.quantity} onChange={(event) => setField("quantity", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">İndirim oranı: %{Math.round(features.discount_rate * 100)}</span>
              <input type="range" min={0} max={0.5} step={0.01} value={features.discount_rate} onChange={(event) => setField("discount_rate", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">Ödeme tipi</span>
              <select className="select" value={features.payment_type} onChange={(event) => setField("payment_type", event.target.value)}>
                <option value="DEBIT">Banka kartı</option>
                <option value="TRANSFER">Havale</option>
                <option value="CASH">Nakit</option>
                <option value="PAYMENT">Ödeme</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Müşteri tipi</span>
              <select className="select" value={features.customer_segment} onChange={(event) => setField("customer_segment", event.target.value)}>
                <option value="Consumer">Bireysel</option>
                <option value="Corporate">Kurumsal</option>
                <option value="Home Office">Ev ofisi</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Sipariş bölgesi</span>
              <select className="select" value={features.order_region} onChange={(event) => setField("order_region", event.target.value)}>
                <option value="US / Puerto Rico">ABD / Porto Riko</option>
                <option value="Western Europe">Batı Avrupa</option>
                <option value="Central America">Orta Amerika</option>
                <option value="South America">Güney Amerika</option>
                <option value="Southeast Asia">Güneydoğu Asya</option>
                <option value="West Africa">Batı Afrika</option>
                <option value="Eastern Europe">Doğu Avrupa</option>
                <option value="LATAM">Latin Amerika</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Pazar</span>
              <select className="select" value={features.market} onChange={(event) => setField("market", event.target.value)}>
                <option value="US / Puerto Rico">ABD / Porto Riko</option>
                <option value="Europe">Avrupa</option>
                <option value="LATAM">Latin Amerika</option>
                <option value="Pacific Asia">Pasifik Asya</option>
                <option value="Africa">Afrika</option>
                <option value="Canada">Kanada</option>
                <option value="USCA">ABD ve Kanada</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Kategori</span>
              <select className="select" value={features.category} onChange={(event) => setField("category", event.target.value)}>
                <option value="Fan Shop">Taraftar ürünleri</option>
                <option value="Sporting Goods">Spor ürünleri</option>
                <option value="Cleats">Krampon</option>
                <option value="Apparel">Giyim</option>
                <option value="Footwear">Ayakkabı</option>
                <option value="Fitness Equipment">Egzersiz ekipmanı</option>
                <option value="Electronics">Elektronik</option>
              </select>
            </label>
          </div>

          <StatusBanner type={features.benefit_per_order < 0 ? "warning" : "info"} title="Canlı marj özeti">
            Sipariş değeri ${grossValue.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}; kar marjı %{margin.toFixed(1)}.
          </StatusBanner>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? <InlineSpinner label="Analiz ediliyor" /> : "Siparişi risk analizinden geçir"}
          </button>
        </form>

        <div id="fraud-result" className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Karar özeti</h2>
              <p className="panel-subtitle">Skor, finansal etki ve gerekçeler.</p>
            </div>
            {score != null && <span className={`panel-header-badge ${level.cls === "high" ? "red" : level.cls === "medium" ? "amber" : "green"}`}>{level.label}</span>}
          </div>

          {!result ? (
            <EmptyState title="Analiz bekleniyor">
              Formu tamamlayıp finansal risk analizini başlatın.
            </EmptyState>
          ) : (
            <motion.div className="result-stack" variants={staggerContainer} initial="hidden" animate="show">
              <motion.div className="decision-score-card" variants={fadeInUp}>
                <span>Risk skoru</span>
                <strong style={{ color: level.color }}>{resultStats.scoreText}</strong>
                <p>Risk altındaki değer: ${resultStats.valueAtRisk.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
              </motion.div>

              <motion.div variants={fadeInUp}>
                <RiskAction score={score} />
              </motion.div>

              <motion.div className="risk-result-box" variants={fadeInUp}>
                <div className="panel-title-block">
                  <h3 className="panel-title">Gerekçeler</h3>
                  <p className="panel-subtitle">Modelin bu işlem için öne çıkardığı risk sinyalleri.</p>
                </div>
                <ReasonChart reasons={result.reason_codes} />
              </motion.div>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
