import { useState } from "react";
import { postFraud } from "../lib/api.js";

/* ── Anomaly Gauge ───────────────────────────── */
function AnomalyGauge({ score }) {
  const pct  = Math.round((score ?? 0) * 100);
  const cls  = pct <= 33 ? "low" : pct <= 66 ? "med" : "high";
  const label = cls === "low" ? "Normal" : cls === "med" ? "Şüpheli" : "Anomali";

  const segments = [
    { color: "var(--risk-low)",  w: 33, label: "Normal" },
    { color: "var(--risk-med)",  w: 33, label: "Şüpheli" },
    { color: "var(--risk-high)", w: 34, label: "Anomali" },
  ];

  return (
    <div className="risk-result-box">
      <div className="risk-score-header">
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Anomali Skoru</div>
          <div className={`risk-score-number ${cls}`}>
            {pct}<span style={{ fontSize: 22, fontWeight: 500 }}>/100</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span className={`risk-badge ${cls}`}>{label}</span>
          {cls === "high" && (
            <button className="btn btn-danger" style={{ fontSize: 11, padding: "5px 12px" }}>
              🚫 İzole Et
            </button>
          )}
        </div>
      </div>

      {/* Segmented bar */}
      <div>
        <div style={{ display: "flex", height: 10, border: "1px solid var(--border)", borderRadius: 999, overflow: "hidden", gap: 2, background: "var(--bg-overlay)" }}>
          {segments.map((seg, i) => (
            <div key={i} style={{
              width: `${seg.w}%`, background: "var(--bg-surface-2)",
              position: "relative", overflow: "hidden",
            }}>
              {pct > (i === 0 ? 0 : i === 1 ? 33 : 66) && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: seg.color,
                  opacity: 0.85,
                  animation: "progress-fill 0.8s cubic-bezier(0.4,0,0.2,1) both",
                }} />
              )}
            </div>
          ))}
        </div>
        <div className="risk-label-row" style={{ marginTop: 6 }}>
          <span>0 — Normal</span>
          <span>33 — Şüpheli</span>
          <span>66 — Anomali — 100</span>
        </div>
      </div>

      <p className="card-caption">
        {cls === "high"
          ? "Bu islem gecmis verilerle oldukca uyumsuz. Yerine getirmeden once manuel dogrulama yapin."
          : cls === "med"
            ? "Hafif anomali isareti var. Odeme desenleri incelenebilir."
            : "Bu islem normal davranis kaliplariyla uyumlu gorunuyor."}
      </p>
    </div>
  );
}

/* ── Empty State ─────────────────────────────── */
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">RISK</div>
      <div className="empty-state-title">Henüz analiz yok</div>
      <div className="empty-state-desc">
        Soldaki işlem bilgilerini doldurun ve "Dolandırıcılık Riskini Puanla" butonuna basın.
      </div>
    </div>
  );
}

export default function Fraud() {
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [features, setFeatures] = useState({
    sales:              200,
    benefit_per_order:  25,
    market:             "US / Puerto Rico",
    customer_segment:   "Consumer",
  });

  function set(key, val) {
    setFeatures((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postFraud({ features });
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  const isLoss = features.benefit_per_order < 0;

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Modül C · Finansal Güvenlik</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Dolandırıcılık &amp; Negatif Kâr Riski</h1>
            <p className="page-subtitle">
              Sipariş onayından önce geliri korumak için anomali tespiti ve kâr bayraklarını birleştirin.
            </p>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Kullanim Akisi</h2>
            <p className="panel-subtitle">Supheli islemleri hizli elemek ve zarar riskini azaltmak icin adimlari izleyin.</p>
          </div>
          <span className="panel-header-badge blue">3 Adim</span>
        </div>
        <div className="guide-grid">
          <article className="guide-card">
            <span className="guide-step">1</span>
            <h3 className="guide-title">Islem Verisini Girin</h3>
            <p className="guide-text">Satis, siparis basi kar ve segment alanlarini dogru girerek model baglamini guclendirin.</p>
          </article>
          <article className="guide-card">
            <span className="guide-step">2</span>
            <h3 className="guide-title">Anomali Skorunu Okuyun</h3>
            <p className="guide-text">Skor 66 ustune ciktiginda islemi manuel kontrole alarak finansal kaybi onleyin.</p>
          </article>
          <article className="guide-card">
            <span className="guide-step">3</span>
            <h3 className="guide-title">Aksiyon Karari Verin</h3>
            <p className="guide-text">Yuksek riskte izolasyon, orta riskte ek dogrulama, dusuk riskte normal akisi surdurun.</p>
          </article>
        </div>
      </section>

      <section className="two-column">
        {/* Form */}
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">İşlem Özeti</h2>
              <p className="panel-subtitle">Isolation Forest modeli tarafından kullanılan temel finansal özellikler.</p>
            </div>
            <span className="panel-header-badge blue">Isolation Forest</span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Satış Tutarı ($)</label>
              <input type="number" min={0} step={0.01} className="input"
                value={features.sales}
                onChange={(e) => set("sales", Number(e.target.value))} />
            </div>

            <div className="field">
              <label className="field-label">Sipariş Başına Kâr ($)</label>
              <input type="number" step={0.01} className="input"
                value={features.benefit_per_order}
                onChange={(e) => set("benefit_per_order", Number(e.target.value))}
                style={isLoss ? { borderColor: "rgba(239,68,68,0.5)", boxShadow: "0 0 0 3px rgba(239,68,68,0.12)" } : {}} />
              <span className="field-helper">
                {isLoss
                  ? <span style={{ color: "var(--risk-high)" }}>⚠️ Negatif değer — zarar eden sipariş</span>
                  : "Negatif değerler zarar eden siparişleri gösterir."}
              </span>
            </div>

            <div className="field">
              <label className="field-label">Pazar</label>
              <select className="select" value={features.market}
                onChange={(e) => set("market", e.target.value)}>
                <option>US / Puerto Rico</option>
                <option>Europe</option>
                <option>LATAM</option>
                <option>Pacific Asia</option>
                <option>Africa</option>
                <option>Canada</option>
                <option>USCA</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Müşteri Segmenti</label>
              <select className="select" value={features.customer_segment}
                onChange={(e) => set("customer_segment", e.target.value)}>
                <option>Consumer</option>
                <option>Corporate</option>
                <option>Home Office</option>
              </select>
            </div>
          </div>

          {/* Profit/Sales ratio preview */}
          {features.sales > 0 && (
            <div style={{
              background: isLoss ? "var(--risk-high-soft)" : "var(--risk-low-soft)",
              border: `1px solid ${isLoss ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
              borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: 16,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Kâr Marjı</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: isLoss ? "var(--risk-high)" : "var(--risk-low)" }}>
                {((features.benefit_per_order / features.sales) * 100).toFixed(1)}%
              </span>
            </div>
          )}

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? "⟳ Analiz ediliyor…" : "Dolandiricilik Riskini Puanla"}
          </button>
        </form>

        {/* Result */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Anomali Analizi</h2>
              <p className="panel-subtitle">
                Geçmiş işlem desenleriyle karşılaştırmalı risk skoru.
              </p>
            </div>
          </div>

          {result ? (
            result.error ? (
              <div style={{ padding: "12px", background: "var(--risk-high-soft)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <p className="badge-negative" style={{ fontSize: 13 }}>❌ {result.error}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <AnomalyGauge score={result.anomaly_score} />
                <details className="result-details">
                  <summary>Tam API Yaniti</summary>
                  <pre className="result-code">{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            )
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
    </div>
  );
}
