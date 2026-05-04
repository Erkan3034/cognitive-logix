import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  getIncidents, getOverviewMetrics, getRiskMap,
  getXaiExplanations, postIncidentAction, postWhatIfScenario,
} from "../lib/api.js";

/* ── Formatters ────────────────────────────────────────── */
const fmtPct = (v) => v == null ? null : `${(v * 100).toFixed(1)}%`;
const fmtMoney = (v) => {
  if (v == null) return null;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
};
const riskCls = (s) => s >= 0.7 ? "risk-high" : s >= 0.4 ? "risk-med" : "risk-low";
const sevCls = (s) => (s === "critical" || s === "high") ? "red" : s === "medium" ? "amber" : "green";

/* ── TR Çeviri katmanı ─────────────────────────────────── */
const TR_TITLE = {
  "Negative-profit order exposure": "Zarar Eden Sipariş Riski",
  "Suspected fraud exposure cluster": "Şüpheli Dolandırıcılık Kümesi",
  "High delay risk cluster": "Yüksek Gecikme Risk Grubu",
  "Demand spike detected": "Ani Talep Artışı Tespit Edildi",
  "Inventory shortfall risk": "Stok Yetersizlik Riski",
  "Late shipment cluster": "Geciken Sevkiyat Grubu",
  "Revenue at risk": "Risk Altındaki Gelir",
  "Anomaly cluster detected": "Anomali Kümesi Tespit Edildi",
};
const TR_DESC = {
  "loss-making orders": "zararlı sipariş",
  "at risk": "risk altında",
  "gross exposure": "toplam maruz kalınan tutar",
  "require manual review": "manuel inceleme gerektiriyor",
  "approval": "onay",
  "suspected-fraud orders": "şüpheli sipariş",
  "before approval": "onay öncesinde",
  "hold fulfillment": "teslimatı askıya alın",
  "high-value": "yüksek tutarlı",
  "review discounts, shipping cost, and refund policy thresholds": "iskonto, kargo maliyeti ve iade eşiklerini gözden geçirin",
};
function trTitle(t) { return TR_TITLE[t] || t; }
function trDesc(d) {
  if (!d) return d;
  let s = d;
  Object.entries(TR_DESC).forEach(([en, tr]) => { s = s.replaceAll(en, tr); });
  // Genel sayısal kalıplar: "337094 loss-making orders represent $6,781,579 revenue at risk."
  s = s.replace(/(\d[\d,]+)\s+loss-making orders? represent (\$[\d,]+) revenue at risk\.?/gi,
    '$1 zararlı sipariş, $2 geliri risk altında tutuyor.');
  s = s.replace(/(\d[\d,]+)\s+suspected-fraud orders? carry (\$[\d,]+) gross exposure\.?/gi,
    '$1 şüpheli sipariş, $2 tutarında risk taşıyor.');
  s = s.replace(/Hold fulfillment for high-value suspected-fraud orders and route them to review\./gi,
    'Yüksek tutarlı şüpheli siparişleri askıya alın ve inceleme kuyruğuna gönderin.');
  s = s.replace(/Review discounts?, shipping cost,? and refund policy thresholds?\./gi,
    'İskonto oranları, kargo maliyeti ve iade eşiklerini gözden geçirin.');
  return s;
}
function trAction(a) {
  if (!a) return 'Onayla';
  const map = {
    'approve': 'Onayla', 'review': 'İncele', 'hold': 'Askıya Al',
    'escalate': 'Üst Kademeye İlet', 'investigate': 'Araştır',
    'flag': 'İşaretle', 'resolve': 'Çözüldü Olarak Kapat',
  };
  const low = a.toLowerCase();
  for (const [en, tr] of Object.entries(map)) { if (low.includes(en)) return tr; }
  return a;
}

/* ── Sparkline mock data ─────────────────────────────── */
const makeSpark = (end, len = 10, vol = 0.06) =>
  Array.from({ length: len }, (_, i) => ({
    i,
    v: Math.max(0, end * (1 + (Math.random() - 0.5) * vol * (len - i) / len)),
  }));

/* ── KPI Card ────────────────────────────────────────── */
function KpiCard({ title, value, accent, formatter, xaiText, spark, icon, sub }) {
  const [showXai, setShowXai] = useState(false);
  const formatted = formatter(value);
  const colorMap = { green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#6366f1" };
  const color = colorMap[accent] || "#6366f1";

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="kpi-card-v2"
      style={{ "--kpi-color": color }}
    >
      <div className="kpi-v2-top">
        <div className="kpi-v2-icon">{icon}</div>
        <button className="kpi-v2-info" onClick={() => setShowXai(p => !p)} title="AI açıklaması">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </button>
      </div>
      <div className="kpi-v2-value">{formatted ?? "—"}</div>
      <div className="kpi-v2-label">{title}</div>
      {sub && <div className="kpi-v2-sub">{sub}</div>}

      <div className="kpi-v2-spark">
        <ResponsiveContainer width="100%" height={44}>
          <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sg-${accent}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
              fill={`url(#sg-${accent})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <AnimatePresence>
        {showXai && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="kpi-v2-xai">
            <span className="kpi-v2-xai-label">🤖 Açıklanabilir AI</span>
            <p>{xaiText}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

/* ── Risk Bar Chart ──────────────────────────────────── */
function RiskBarChart({ zones, onDrill }) {
  const data = zones.map(z => ({
    name: z.order_region?.replace("Western ", "B. ").replace("Pacific Asia", "Asya-Pasifik")
      .replace("US / Puerto Rico", "ABD/P.R.").replace("LATAM", "LATAM") ?? z.id,
    risk: parseFloat((z.late_risk_pct * 100).toFixed(1)),
    raw: z,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748b" }}
          tickLine={false} axisLine={false} unit="%" />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }}
          tickLine={false} axisLine={false} width={80} />
        <Tooltip
          cursor={{ fill: "rgba(99,102,241,0.06)" }}
          content={({ payload }) => payload?.[0] ? (
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{payload[0].payload.name}</p>
              <p style={{ color: payload[0].value >= 60 ? "#ef4444" : payload[0].value >= 35 ? "#f59e0b" : "#10b981", fontWeight: 700, fontSize: 14 }}>
                Gecikme Riski: {payload[0].value}%
              </p>
            </div>
          ) : null}
        />
        <Bar dataKey="risk" radius={[0, 4, 4, 0]} onClick={(d) => onDrill(d.raw)} style={{ cursor: "pointer" }}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.risk >= 60 ? "#ef4444" : entry.risk >= 35 ? "#f59e0b" : "#10b981"} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── How It Works (Onboarding) ───────────────────────── */
function HowItWorks() {
  const steps = [
    { icon: "📦", title: "Veri Yükle", desc: "CSV veya ERP bağlantısıyla operasyonel verinizi sisteme aktarın." },
    { icon: "🤖", title: "AI Analiz Eder", desc: "XGBoost, LightGBM ve Isolation Forest modelleri her siparişi saniyeler içinde puanlar." },
    { icon: "⚡", title: "Karar Al", desc: "Risk skoru ve AI önerisiyle hızlı, doğru operasyonel karar verin." },
  ];
  return (
    <section className="panel" style={{ marginBottom: 20 }}>
      <div className="panel-header">
        <div className="panel-title-block">
          <h2 className="panel-title">Sistem Nasıl Çalışır?</h2>
          <p className="panel-subtitle">İlk kez kullananlar için 3 adımlı özet</p>
        </div>
        <span className="panel-header-badge blue">Başlangıç Rehberi</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
            borderRadius: 12, padding: "16px 18px", display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <div style={{ fontSize: 26, lineHeight: 1 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
                <span style={{ color: "#6366f1", marginRight: 6 }}>{i + 1}.</span>{s.title}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Scenario Drawer ─────────────────────────────────── */
function ScenarioDrawer({ open, onClose, scenario, onChange, onApply, onReset, loading }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button aria-label="Kapat" className="ct-drawer-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="ct-drawer" role="dialog">
            <div className="ct-drawer-head">
              <div>
                <p className="ct-drawer-eyebrow">Simülasyon</p>
                <h2 className="ct-drawer-title">Senaryo Simülatörü</h2>
                <p className="ct-drawer-subtitle">Girdileri değiştirip KPI etkisini anında görün.</p>
              </div>
              <button type="button" onClick={onClose} className="ct-drawer-close">Kapat</button>
            </div>
            <div className="ct-drawer-fields">
              <label className="ct-drawer-field">
                <span className="ct-drawer-field-label">Liman Kapanması</span>
                <select value={scenario.portClosed ? "yes" : "no"}
                  onChange={(e) => onChange({ portClosed: e.target.value === "yes" })} className="ct-drawer-select">
                  <option value="no">Hayır</option>
                  <option value="yes">Evet — Büyük liman kapandı</option>
                </select>
              </label>
              <label className="ct-drawer-field">
                <span className="ct-drawer-field-label">Talep Artışı: %{scenario.demandSurge}</span>
                <input type="range" min={0} max={30} step={1} value={scenario.demandSurge}
                  onChange={(e) => onChange({ demandSurge: Number(e.target.value) })} className="ct-drawer-range" />
              </label>
              <label className="ct-drawer-field">
                <span className="ct-drawer-field-label">Tedarikçi Grevi</span>
                <select value={scenario.strike} onChange={(e) => onChange({ strike: e.target.value })} className="ct-drawer-select">
                  <option value="none">Yok</option>
                  <option value="local">Bölgesel Grev</option>
                  <option value="global">Küresel Grev</option>
                </select>
              </label>
            </div>
            <div className="ct-drawer-actions">
              <button type="button" onClick={onApply} className="ct-drawer-btn ct-drawer-btn-primary" disabled={loading}>
                {loading ? "Simülasyon çalışıyor..." : "Simülasyonu Başlat"}
              </button>
              <button type="button" onClick={onReset} className="ct-drawer-btn ct-drawer-btn-secondary" disabled={loading}>
                Sıfırla
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

const FALLBACK_XAI = {
  on_time_delivery_pct: "Rota güvenilirliği, transit süreleri ve istisna kayıtları değerlendirilerek hesaplandı.",
  late_delivery_risk_pct: "Taşıyıcı performansı, liman yoğunluğu ve geçmiş transit verilerine göre ölçüldü.",
  demand_risk_pct: "Kategori bazlı günlük oynaklık ve bölgesel sipariş trendi birleştirilerek üretildi.",
  financial_exposure_usd: "Negatif kâr bayrağı, sipariş tutarı ve anomali sinyallerinden tahmin edildi.",
};

const KPI_META = [
  { key: "on_time_delivery_pct", title: "Zamanında Teslimat", accent: "green", formatter: fmtPct, icon: "✅", sub: "Hedefe göre ± karşılaştırma" },
  { key: "late_delivery_risk_pct", title: "Gecikme Riski", accent: "red", formatter: fmtPct, icon: "⚠️", sub: "Yüksek risk siparişleri" },
  { key: "demand_risk_pct", title: "Talep Riski", accent: "amber", formatter: fmtPct, icon: "📊", sub: "Stok yetersizlik ihtimali" },
  { key: "financial_exposure_usd", title: "Finansal Maruziyet", accent: "red", formatter: fmtMoney, icon: "💸", sub: "Zarar eden sipariş toplamı" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [simulatedMetrics, setSimulatedMetrics] = useState(null);
  const [xaiMap, setXaiMap] = useState(FALLBACK_XAI);
  const [loading, setLoading] = useState(true);
  const [riskZones, setRiskZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [isSimulationApplied, setIsSimulationApplied] = useState(false);
  const [decisions, setDecisions] = useState({});
  const [decisionLoading, setDecisionLoading] = useState({});
  const [scenario, setScenario] = useState({ portClosed: false, demandSurge: 0, strike: "none" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getOverviewMetrics(),
      getXaiExplanations({ port_closed: false, demand_surge_pct: 0, supplier_strike: "none" }),
      getRiskMap({ limit: 8 }),
      getIncidents({ limit: 6 }),
    ])
      .then(([ov, xai, rm, inc]) => {
        if (!mounted) return;
        setMetrics(ov);
        setRiskZones(rm?.items ?? []);
        setIncidents(inc?.items ?? []);
        if (xai?.explanations) setXaiMap(p => ({ ...p, ...xai.explanations }));
      })
      .catch(() => { if (mounted) { setMetrics(null); setXaiMap(FALLBACK_XAI); } })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const activeMetrics = useMemo(() =>
    isSimulationApplied ? simulatedMetrics ?? metrics : metrics,
    [isSimulationApplied, simulatedMetrics, metrics]
  );

  const mockSparks = useMemo(() => {
    if (!metrics) return {};
    return Object.fromEntries(KPI_META.map(k => [k.key, makeSpark(metrics[k.key] ?? 0.5)]));
  }, [metrics]);

  const onApprove = async (item) => {
    setDecisionLoading(p => ({ ...p, [item.id]: true }));
    try {
      await postIncidentAction({ incident_id: item.id, action: item.recommended_action, status: "approved", metadata: { title: item.title, severity: item.severity, impact_usd: item.impact_usd, source: "control_tower" } });
      setDecisions(p => ({ ...p, [item.id]: "approved" }));
    } catch { setDecisions(p => ({ ...p, [item.id]: "failed" })); }
    finally { setDecisionLoading(p => ({ ...p, [item.id]: false })); }
  };

  const drillLogistics = (params) => navigate(`/app/logistics?${new URLSearchParams(params).toString()}`);

  /* ── Render ──────────────────────────────────── */
  return (
    <div className="page-layout">
      {/* Header */}
      <header className="page-header">
        <span className="page-eyebrow">Yönetici Kokpiti</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Kontrol Kulesi — Genel Görünüm</h1>
            <p className="page-subtitle">
              KPI, risk ve karar akışını tek ekranda yönetin. AI açıklamaları ve senaryo simülasyonuyla proaktif karar desteği.
            </p>
          </div>
          <div className="ct-top-actions">
            <button type="button" onClick={() => setScenarioOpen(true)} className="ct-sim-open-btn">
              🧪 Senaryo Simülasyonu
            </button>
            {isSimulationApplied && (
              <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600, padding: "4px 10px",
                background: "rgba(245,158,11,0.1)", borderRadius: 20, border: "1px solid rgba(245,158,11,0.3)" }}>
                ⚠ Simülasyon Aktif
              </span>
            )}
            <div className="pill">
              <span className="pill-dot" />
              {loading ? "Yükleniyor..." : "Canlı Veri"}
            </div>
          </div>
        </div>
      </header>

      {/* Onboarding */}
      <HowItWorks />

      {/* KPI Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {loading || !activeMetrics
          ? [1, 2, 3, 4].map(k => (
            <div key={k} className="kpi-card-v2" style={{ "--kpi-color": "#6366f1" }}>
              <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
            </div>
          ))
          : KPI_META.map(kpi => (
            <KpiCard key={kpi.key}
              title={kpi.title} value={activeMetrics[kpi.key]}
              accent={kpi.accent} formatter={kpi.formatter}
              xaiText={xaiMap[kpi.key] ?? FALLBACK_XAI[kpi.key]}
              spark={mockSparks[kpi.key] ?? []}
              icon={kpi.icon} sub={kpi.sub}
            />
          ))
        }
      </section>

      {/* Two Column */}
      <section className="two-column">
        {/* Risk Bar Chart */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Bölgesel Gecikme Risk Haritası</h2>
              <p className="panel-subtitle">Bir çubuğa tıklayarak Lojistik modülüne geçin.</p>
            </div>
            <span className="panel-header-badge red">Detaya Git →</span>
          </div>
          {riskZones.length > 0 ? (
            <RiskBarChart zones={riskZones} onDrill={(z) => drillLogistics({
              order_region: z.order_region, shipping_mode: z.shipping_mode,
              category: z.category_name, sku: z.sku,
            })} />
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              {loading ? <span className="chip">Yükleniyor...</span> : <span className="chip">Veri bekleniyor</span>}
            </div>
          )}
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(99,102,241,0.05)",
            borderRadius: 8, border: "1px solid rgba(99,102,241,0.12)" }}>
            <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
              🔴 Kırmızı: Yüksek risk (&gt;60%) &nbsp;|&nbsp; 🟡 Sarı: Orta risk (35–60%) &nbsp;|&nbsp; 🟢 Yeşil: Düşük risk (&lt;35%)
            </p>
          </div>
        </div>

        {/* İzleme Listesi */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Bugünün İzleme Listesi</h2>
              <p className="panel-subtitle">AI'ın tespit ettiği kritik durumlar ve önerilen aksiyonlar</p>
            </div>
            <span className="panel-header-badge amber">
              {incidents.length > 0 ? `${incidents.length} Bekleyen Karar` : '0 Karar'}
            </span>
          </div>

          {loading && (
            <div style={{ display: 'grid', gap: 10 }}>
              {[1,2,3].map(k => <div key={k} className="skeleton" style={{ height: 90, borderRadius: 10 }} />)}
            </div>
          )}

          {!loading && incidents.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>Harika! Bugün için bekleyen karar yok.</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Tüm operasyonlar normal akışında devam ediyor.</div>
            </div>
          )}

          <div className="ct-watchlist">
            {incidents.map(item => {
              const sev = item.severity;
              const approved = decisions[item.id] === 'approved';
              const failed   = decisions[item.id] === 'failed';
              const saving   = decisionLoading[item.id];
              const sevConfig = {
                critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.22)', badge: '🔴 Kritik' },
                high:     { color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.22)', badge: '🔴 Yüksek' },
                medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.22)', badge: '🟡 Orta' },
                low:      { color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.22)', badge: '🟢 Düşük' },
              };
              const cfg = sevConfig[sev] ?? sevConfig.low;
              return (
                <article key={item.id} style={{
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                  transition: 'box-shadow .2s',
                }}>
                  {/* Başlık satırı */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                          {trTitle(item.title)}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                          background: `${cfg.color}18`, color: cfg.color,
                        }}>{cfg.badge}</span>
                      </div>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
                        {trDesc(item.description)}
                      </p>
                    </div>
                    {item.impact_usd > 0 && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 10, color: '#64748b' }}>Finansal Etki</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444' }}>
                          {fmtMoney(item.impact_usd)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aksiyon butonları */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {approved ? (
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: '#10b981',
                        padding: '6px 14px', borderRadius: 8,
                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                      }}>✅ Onaylandı</span>
                    ) : (
                      <button type="button" onClick={() => onApprove(item)}
                        disabled={saving}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
                          background: cfg.color, color: '#fff', border: 'none', cursor: 'pointer',
                          opacity: saving ? 0.7 : 1, transition: 'opacity .15s',
                        }}>
                        {saving ? '⟳ İşleniyor...' : failed ? '↻ Tekrar Dene' : trAction(item.recommended_action)}
                      </button>
                    )}
                    {Object.keys(item.drilldown_params ?? {}).length > 0 && (
                      <button type="button" onClick={() => drillLogistics(item.drilldown_params)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
                          background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                          border: '1px solid rgba(99,102,241,0.25)', cursor: 'pointer',
                        }}>🔍 Lojistikte İncele</button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <ScenarioDrawer open={scenarioOpen} scenario={scenario} loading={scenarioLoading}
        onClose={() => setScenarioOpen(false)}
        onChange={(patch) => setScenario(p => ({ ...p, ...patch }))}
        onApply={async () => {
          setScenarioLoading(true);
          try {
            const res = await postWhatIfScenario({ port_closed: scenario.portClosed, demand_surge_pct: scenario.demandSurge, supplier_strike: scenario.strike });
            if (res?.metrics) { setSimulatedMetrics(res.metrics); setIsSimulationApplied(true); }
            if (res?.explanations) setXaiMap(p => ({ ...p, ...res.explanations }));
            setScenarioOpen(false);
          } catch { setIsSimulationApplied(false); }
          finally { setScenarioLoading(false); }
        }}
        onReset={async () => {
          setScenario({ portClosed: false, demandSurge: 0, strike: "none" });
          setIsSimulationApplied(false); setSimulatedMetrics(null);
          try {
            const xai = await getXaiExplanations({ port_closed: false, demand_surge_pct: 0, supplier_strike: "none" });
            if (xai?.explanations) setXaiMap(p => ({ ...p, ...xai.explanations }));
          } catch { setXaiMap(FALLBACK_XAI); }
        }}
      />
    </div>
  );
}
