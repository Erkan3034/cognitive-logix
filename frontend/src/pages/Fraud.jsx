import { useMemo, useState } from "react";
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

const REASON_TR = {
  "High sales amount": "Sipariş tutarı normalin üzerinde",
  "Negative profit margin": "Sipariş zarar üretiyor",
  "Low profit margin": "Kar marjı düşük",
  "High order value relative to segment": "Segment için yüksek tutar",
  "Unusual payment pattern": "Ödeme deseninde sapma",
  "Market mismatch": "Pazar ve segment uyumsuzluğu",
  raises_risk: "Riski artırıyor",
  lowers_risk: "Riski azaltıyor",
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
    return {
      scoreText: `${Math.round(score * 100)}/100`,
      valueAtRisk: grossValue * score,
      margin,
    };
  }, [score, grossValue, margin]);

  return (
    <div className="page-layout">
      <PageIntro eyebrow="Finansal risk" title="Sipariş Güvenlik Analizi">
        Sipariş tutarı, kar marjı, ödeme tipi ve müşteri segmentini birlikte değerlendirerek anomali riskini hesaplayın.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Analiz tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <section className="guide-grid">
        {[
          ["1", "İşlem bilgisi", "Sipariş, ödeme ve müşteri alanlarını girin."],
          ["2", "Risk skoru", "Skoru eşiklerle birlikte okuyun: normal, inceleme, yüksek risk."],
          ["3", "Karar", "Onay, bekletme veya manuel inceleme aksiyonunu uygulayın."],
        ].map(([step, title, text]) => (
          <article key={step} className="guide-card">
            <span className="guide-step">{step}</span>
            <h3 className="guide-title">{title}</h3>
            <p className="guide-text">{text}</p>
          </article>
        ))}
      </section>

      <section className="two-column">
        <form className="panel" onSubmit={handleSubmit}>
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
              <input type="number" min={1} max={200} className="input" value={features.quantity} onChange={(event) => setField("quantity", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">İndirim oranı: %{Math.round(features.discount_rate * 100)}</span>
              <input type="range" min={0} max={0.5} step={0.01} value={features.discount_rate} onChange={(event) => setField("discount_rate", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">Ödeme tipi</span>
              <select className="select" value={features.payment_type} onChange={(event) => setField("payment_type", event.target.value)}>
                <option value="DEBIT">DEBIT</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="CASH">CASH</option>
                <option value="PAYMENT">PAYMENT</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Müşteri tipi</span>
              <select className="select" value={features.customer_segment} onChange={(event) => setField("customer_segment", event.target.value)}>
                <option value="Consumer">Consumer</option>
                <option value="Corporate">Corporate</option>
                <option value="Home Office">Home Office</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Sipariş bölgesi</span>
              <select className="select" value={features.order_region} onChange={(event) => setField("order_region", event.target.value)}>
                <option value="US / Puerto Rico">US / Puerto Rico</option>
                <option value="Western Europe">Western Europe</option>
                <option value="Central America">Central America</option>
                <option value="South America">South America</option>
                <option value="Southeast Asia">Southeast Asia</option>
                <option value="West Africa">West Africa</option>
                <option value="Eastern Europe">Eastern Europe</option>
                <option value="LATAM">LATAM</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Pazar</span>
              <select className="select" value={features.market} onChange={(event) => setField("market", event.target.value)}>
                <option value="US / Puerto Rico">US / Puerto Rico</option>
                <option value="Europe">Europe</option>
                <option value="LATAM">LATAM</option>
                <option value="Pacific Asia">Pacific Asia</option>
                <option value="Africa">Africa</option>
                <option value="Canada">Canada</option>
                <option value="USCA">USCA</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Kategori</span>
              <select className="select" value={features.category} onChange={(event) => setField("category", event.target.value)}>
                <option value="Fan Shop">Fan Shop</option>
                <option value="Sporting Goods">Sporting Goods</option>
                <option value="Cleats">Cleats</option>
                <option value="Apparel">Apparel</option>
                <option value="Footwear">Footwear</option>
                <option value="Fitness Equipment">Fitness Equipment</option>
                <option value="Electronics">Electronics</option>
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

        <div className="panel">
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
            <div className="result-stack">
              <div className="decision-score-card">
                <span>Risk skoru</span>
                <strong style={{ color: level.color }}>{resultStats.scoreText}</strong>
                <p>Risk altındaki değer: ${resultStats.valueAtRisk.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
              </div>

              <RiskAction score={score} />

              <div className="risk-result-box">
                <div className="panel-title-block">
                  <h3 className="panel-title">Gerekçeler</h3>
                  <p className="panel-subtitle">Modelin bu işlem için öne çıkardığı risk sinyalleri.</p>
                </div>
                <ReasonChart reasons={result.reason_codes} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
