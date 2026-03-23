import { useState } from "react";
import { postPredict } from "../lib/api.js";

/* ── Helpers ─────────────────────────────────── */
function getRiskLevel(score) {
  if (score == null) return null;
  if (score > 0.7) return { label: "Yüksek Risk", cls: "high" };
  if (score > 0.4) return { label: "Orta Risk",   cls: "med" };
  return            { label: "Düşük Risk",  cls: "low" };
}

/* ── Risk Gauge Component ────────────────────── */
function RiskGauge({ score }) {
  const pct   = Math.round(score * 100);
  const level = getRiskLevel(score);

  return (
    <div className="risk-result-box">
      <div className="risk-score-header">
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Gecikme Riski Skoru</div>
          <div className={`risk-score-number ${level.cls}`}>{pct}<span style={{ fontSize: 22, fontWeight: 500 }}>%</span></div>
        </div>
        <span className={`risk-badge ${level.cls}`}>{level.label}</span>
      </div>

      <div>
        <div className="risk-bar-track">
          <div className={`risk-bar-fill ${level.cls}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="risk-label-row">
          <span>0%</span>
          <span>Düşük (&lt;40%)</span>
          <span>Orta</span>
          <span>Yüksek (&gt;70%)</span>
          <span>100%</span>
        </div>
      </div>

      <p className="card-caption">
        {level.cls === "high"
          ? "⚠️ Bu sipariş zamanında ulaşmama riski taşıyor. Alternatif taşıyıcı veya güzergâh değerlendirin."
          : level.cls === "med"
            ? "🔶 Orta düzeyde gecikme riski. Takip ve proaktif müşteri bildirimi önerilir."
            : "✅ Müşteri teslimatı büyük olasılıkla zamanında gerçekleşecek."}
      </p>
    </div>
  );
}

/* ── Empty State ─────────────────────────────── */
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🚚</div>
      <div className="empty-state-title">Henüz sonuç yok</div>
      <div className="empty-state-desc">
        Soldaki formu doldurun ve "Gecikme Riskini Puanla" butonuna basın.
      </div>
    </div>
  );
}

export default function Logistics() {
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [formData, setFormData] = useState({
    shipping_mode:  "Standard Class",
    order_region:   "Western Europe",
    days_scheduled: 4,
    category:       "Sporting Goods",
    market:         "Europe",
    sales:          150,
    quantity:       2,
  });

  function set(key, val) {
    setFormData((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postPredict({ features: formData });
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Modül A · Tahmine Dayalı Lojistik</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Teslimat Gecikme Tahmini</h1>
            <p className="page-subtitle">
              Siparişleri yerine getirmeden önce gecikme riskine göre puanlayın; proaktif olarak taşıyıcı, güzergâh veya hizmet seviyesini değiştirin.
            </p>
          </div>
        </div>
      </header>

      <section className="two-column">
        {/* Form */}
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Sipariş Bilgileri</h2>
              <p className="panel-subtitle">XGBoost modeli tarafından kullanılan temel operasyonel özellikler.</p>
            </div>
            <span className="panel-header-badge blue">XGBoost</span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Sevkiyat Modu</label>
              <select className="select" value={formData.shipping_mode}
                onChange={(e) => set("shipping_mode", e.target.value)}>
                <option>Standard Class</option>
                <option>Second Class</option>
                <option>First Class</option>
                <option>Same Day</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Sipariş Bölgesi</label>
              <input className="input" value={formData.order_region}
                onChange={(e) => set("order_region", e.target.value)}
                placeholder="ör. Western Europe" />
            </div>

            <div className="field">
              <label className="field-label">Planlanan Sevkiyat (gün)</label>
              <input type="number" min={0} className="input" value={formData.days_scheduled}
                onChange={(e) => set("days_scheduled", Number(e.target.value))} />
              <span className="field-helper">Sipariş tarihinden taahhüt edilen sevk tarihine kadar.</span>
            </div>

            <div className="field">
              <label className="field-label">Ürün Kategorisi</label>
              <input className="input" value={formData.category}
                onChange={(e) => set("category", e.target.value)} />
            </div>

            <div className="field">
              <label className="field-label">Pazar</label>
              <input className="input" value={formData.market}
                onChange={(e) => set("market", e.target.value)} />
            </div>

            <div className="field">
              <label className="field-label">Sipariş Tutarı ($)</label>
              <input type="number" min={0} step={0.01} className="input" value={formData.sales}
                onChange={(e) => set("sales", Number(e.target.value))} />
            </div>

            <div className="field">
              <label className="field-label">Miktar</label>
              <input type="number" min={1} className="input" value={formData.quantity}
                onChange={(e) => set("quantity", Number(e.target.value))} />
            </div>
          </div>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading
              ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Puanlanıyor…</>
              : "🔍 Gecikme Riskini Puanla"}
          </button>
        </form>

        {/* Result */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Model Çıktısı</h2>
              <p className="panel-subtitle">Gerçek zamanlı risk skoru ve öneri.</p>
            </div>
          </div>

          {result ? (
            result.error ? (
              <div style={{ padding: "12px", background: "var(--risk-high-soft)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <p className="badge-negative" style={{ fontSize: 13 }}>❌ {result.error}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <RiskGauge score={result.delay_risk} />
                <details className="result-details">
                  <summary>📋 Tam API Yanıtı</summary>
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
