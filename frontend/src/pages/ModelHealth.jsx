import { useEffect, useMemo, useState } from "react";
import { getModelHealth } from "../lib/api.js";

const MODEL_LABELS = {
  logistics: { name: "Teslimat Risk Motoru", icon: "🚚", desc: "Sipariş bazında gecikme olasılığını tahmin eder." },
  fraud:     { name: "Güvenlik & Dolandırıcılık Motoru", icon: "🛡️", desc: "Şüpheli siparişleri tespit eder." },
  demand:    { name: "Talep Tahmin Motoru", icon: "📈", desc: "Gelecek talebi tahmin eder." },
};
function toLabel(name = "") {
  const k = Object.keys(MODEL_LABELS).find(k => name.toLowerCase().includes(k));
  return MODEL_LABELS[k] ?? { name, icon: "⚙️", desc: "" };
}
const METRIC_TR = {
  accuracy: "Doğruluk", roc_auc: "AUC Skoru", f1: "Denge (F1)",
  precision: "Kesinlik", recall: "Kapsama", mae: "Ort. Hata",
  rmse: "Kök Hata", mape: "Yüzde Hata", p50_mae: "Medyan Hata", p90_mae: "Üst Bant Hatası",
};
const toMLabel = (k) => METRIC_TR[k.toLowerCase()] || k;
const pct = (v) => v == null ? "—" : (v * 100).toFixed(1) + "%";
const fmt = (v) => { if (v == null || typeof v === "object") return "—"; const n = Number(v); return isNaN(n) ? String(v) : n >= 10 ? n.toFixed(2) : n.toFixed(4); };

function ModelCard({ model }) {
  const lbl = toLabel(model.name);
  const isReady = model.status === "ready";
  const color = isReady ? "#10b981" : model.status === "missing" ? "#f59e0b" : "#ef4444";
  const statusText = isReady ? "✅ Çalışıyor" : model.status === "missing" ? "⚠️ Hazırlanıyor" : "❌ Hata";
  const metrics = Object.entries(model.validation_metrics ?? {});
  const barM = metrics.filter(([, v]) => typeof v === "number" && v >= 0 && v <= 1);
  const numM = metrics.filter(([k, v]) => typeof v === "number" && !barM.find(([bk]) => bk === k));
  return (
    <div style={{ background: "var(--bg-surface-1)", border: `1px solid ${color}30`, borderRadius: 14, padding: "18px 20px", borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>{lbl.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{lbl.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: `${color}15`, color, border: `1px solid ${color}30` }}>{statusText}</span>
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{lbl.desc}</p>
        </div>
      </div>
      {isReady && barM.map(([k, v]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>{toMLabel(k)}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: v >= 0.85 ? "#10b981" : v >= 0.7 ? "#f59e0b" : "#ef4444" }}>{pct(v)}</span>
          </div>
          <div style={{ height: 5, borderRadius: 3, background: "rgba(148,163,184,0.1)" }}>
            <div style={{ height: "100%", width: `${Math.min(100, v * 100)}%`, borderRadius: 3, background: v >= 0.85 ? "#10b981" : v >= 0.7 ? "#f59e0b" : "#ef4444" }} />
          </div>
        </div>
      ))}
      {isReady && numM.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {numM.map(([k, v]) => (
            <div key={k} style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.1)" }}>
              <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>{toMLabel(k)}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>{fmt(v)}</div>
            </div>
          ))}
        </div>
      )}
      {!isReady && model.error && <p style={{ fontSize: 12, color: "#ef4444", margin: 0 }}>{model.error}</p>}
    </div>
  );
}

export default function ModelHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let m = true; setLoading(true);
    getModelHealth().then(d => { if (m) { setHealth(d); setError(""); } }).catch(e => { if (m) setError(e.message || "Model durumu alınamadı."); }).finally(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);
  const readyCount = health?.models?.filter(m => m.status === "ready").length ?? 0;
  const total = health?.models?.length ?? 0;
  const driftMetrics = health?.drift?.metrics ?? [];
  const driftAlert = driftMetrics.filter(m => m.status !== "stable").length;
  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Yapay Zeka Durumu</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Model Sağlık Takibi</h1>
            <p className="page-subtitle">Platformdaki yapay zeka motorlarının çalışma durumu ve tahmin kalitesi.</p>
          </div>
          <div className="pill">
            <span className="pill-dot" style={{ background: readyCount === total ? "#10b981" : "#f59e0b" }} />
            {loading ? "Kontrol ediliyor..." : `${readyCount}/${total} motor hazır`}
          </div>
        </div>
      </header>
      {error && <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}><p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>⚠️ {error}</p></div>}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 20 }}>
        {loading ? [1,2,3].map(k => <div key={k} className="skeleton" style={{ height: 160, borderRadius: 14 }} />) : (health?.models ?? []).map(m => <ModelCard key={m.name} model={m} />)}
      </section>
      {driftMetrics.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Veri Sapma Monitörü</h2>
              <p className="panel-subtitle">Yüksek sapma tahmin kalitesini düşürür — şu an {driftAlert === 0 ? "tüm özellikler kararlı." : `${driftAlert} özellikte sapma var.`}</p>
            </div>
            <span className={`panel-header-badge ${driftAlert > 0 ? "red" : "green"}`}>{driftAlert > 0 ? `⚠️ ${driftAlert} sapma` : "✓ Kararlı"}</span>
          </div>
          {driftMetrics.map(m => {
            const color = m.status === "stable" ? "#10b981" : m.status === "watch" ? "#f59e0b" : "#ef4444";
            const statusTR = m.status === "stable" ? "Kararlı" : m.status === "watch" ? "İzlemede" : "Uyarı!";
            return (
              <div key={m.feature} style={{ padding: "10px 14px", borderRadius: 10, marginBottom: 6, background: `${color}07`, border: `1px solid ${color}20` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{m.feature}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{statusTR}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: "rgba(148,163,184,0.1)" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, m.psi * 200)}%`, borderRadius: 2, background: color }} />
                </div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>Sapma skoru: {m.psi?.toFixed(4)} {m.psi < 0.1 ? "· Sorun yok" : m.psi < 0.25 ? "· Hafif sapma" : "· Ciddi sapma"}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
