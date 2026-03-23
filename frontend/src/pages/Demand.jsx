import { useState } from "react";
import {
  Line, LineChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis, CartesianGrid, ReferenceLine,
} from "recharts";
import { postForecast } from "../lib/api.js";

/* ── Custom Tooltip ──────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-overlay)",
      border: "1px solid var(--border-accent)",
      borderRadius: "var(--radius-sm)",
      padding: "8px 12px",
      backdropFilter: "blur(12px)",
      boxShadow: "var(--shadow-md)",
    }}>
      <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
        {payload[0].value?.toFixed(1)} <span style={{ fontSize: 11, fontWeight: 400 }}>birim</span>
      </p>
    </div>
  );
}

/* ── Empty / Placeholder Chart ───────────────── */
function EmptyChart() {
  return (
    <div className="empty-state" style={{ minHeight: 200 }}>
      <div className="empty-state-icon">📈</div>
      <div className="empty-state-title">Tahmin grafiği burada görünecek</div>
      <div className="empty-state-desc">
        Sol panelden ufuk ve kategori seçin, ardından "Tahmin Oluştur" butonuna basın.
      </div>
    </div>
  );
}

export default function Demand() {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState(30);
  const [category, setCategory] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postForecast({ horizon, series: [] });
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  const chartData = result?.points?.map((p) => ({ ds: p.ds, yhat: p.yhat })) ?? [];

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Modül B · Talep İstihbaratı</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Kategori Talep Tahmini</h1>
            <p className="page-subtitle">
              Envanter ve kapasite kararlarını uyumlu hâle getirmek için kategoriye ve zaman
              ufkuna göre kısa vadeli talep eğrilerini tahmin edin.
            </p>
          </div>
        </div>
      </header>

      <section className="two-column">
        {/* Config Form */}
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Tahmin Yapılandırması</h2>
              <p className="panel-subtitle">Günlük talep modeli için ufuk ve seri seçimi.</p>
            </div>
            <span className="panel-header-badge blue">Prophet</span>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="field">
              <label className="field-label">Tahmin Ufku (gün): <strong style={{ color: "var(--accent)" }}>{horizon}</strong></label>
              <input
                type="range"
                min={7} max={90} step={1}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="field-helper">7 gün</span>
                <span className="field-helper">Tipik: 14–60 gün</span>
                <span className="field-helper">90 gün</span>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Kategori / Segment</label>
              <input
                className="input"
                placeholder="ör. Fan Shop · Batı Avrupa"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <span className="field-helper">
                Sonraki adımda bu alan, veri ambarından filtrelenmiş zaman serilerini yönlendirecektir.
              </span>
            </div>
          </div>

          {/* Horizon summary */}
          <div style={{
            background: "var(--bg-surface-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)",
            padding: "10px 14px", marginBottom: 16, display: "flex", gap: 16,
          }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Seçilen Ufuk</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{horizon} gün</span>
            </div>
            {category && (
              <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Kategori</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>{category}</span>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? "⟳ Tahmin oluşturuluyor…" : "📊 Tahmin Oluştur"}
          </button>
        </form>

        {/* Chart Panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Tahmin Grafiği</h2>
              <p className="panel-subtitle">
                {result?.points?.length
                  ? `${horizon} günlük ufuk için ${result.points.length} tahmin noktası`
                  : "Günlük talep eğrisi burada görünecek."}
              </p>
            </div>
            {result?.points?.length > 0 && (
              <span className="panel-header-badge green">{result.points.length} nokta</span>
            )}
          </div>

          {result ? (
            result.error ? (
              <div style={{ padding: "12px", background: "var(--risk-high-soft)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <p className="badge-negative" style={{ fontSize: 13 }}>❌ {result.error}</p>
              </div>
            ) : chartData.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="chart-wrapper" style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                      <XAxis dataKey="ds" tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="yhat" stroke="var(--accent)" strokeWidth={2.5} dot={false}
                        activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--bg-body)", strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <details className="result-details">
                  <summary>📋 Ham JSON Verisi</summary>
                  <pre className="result-code">{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            ) : (
              <EmptyChart />
            )
          ) : (
            <EmptyChart />
          )}
        </div>
      </section>
    </div>
  );
}
