import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getIncidents,
  getOverviewMetrics,
  getRiskMap,
  getXaiExplanations,
  postIncidentAction,
  postWhatIfScenario,
} from "../lib/api.js";
import DigitalTwinMap from "../components/DigitalTwinMap.jsx";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

function fmtPct(value) {
  if (value == null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function fmtMoney(value) {
  if (value == null) return "-";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function severityTone(severity) {
  if (severity === "critical") return "red";
  if (severity === "high" || severity === "medium") return "amber";
  return "green";
}

function riskTone(score) {
  if (score >= 0.75) return { label: "Kritik", color: "var(--risk-high)", badge: "red" };
  if (score >= 0.55) return { label: "Yüksek", color: "var(--risk-med)", badge: "amber" };
  return { label: "Normal", color: "var(--risk-low)", badge: "green" };
}

const KPI_META = [
  {
    key: "on_time_delivery_pct",
    title: "Zamanında Teslimat",
    caption: "Operasyon sağlığı",
    formatter: fmtPct,
    accent: "green",
  },
  {
    key: "late_delivery_risk_pct",
    title: "Gecikme Riski",
    caption: "Öncelikli sevkiyat takibi",
    formatter: fmtPct,
    accent: "red",
  },
  {
    key: "demand_risk_pct",
    title: "Talep Riski",
    caption: "Stok ve kapasite baskısı",
    formatter: fmtPct,
    accent: "amber",
  },
  {
    key: "financial_exposure_usd",
    title: "Finansal Maruziyet",
    caption: "Risk altındaki gelir",
    formatter: fmtMoney,
    accent: "red",
  },
];

const FALLBACK_EXPLANATIONS = {
  on_time_delivery_pct: "Zamanında teslimat oranı, geçmiş sevkiyat performansı ve gecikme kayıtları üzerinden hesaplanır.",
  late_delivery_risk_pct: "Gecikme riski; rota, kargo modu, bölge ve geçmiş teslimat kalıplarının birleşik sinyalidir.",
  demand_risk_pct: "Talep riski, kategori ve bölge bazlı oynaklık ile sipariş trendlerinden türetilir.",
  financial_exposure_usd: "Finansal maruziyet, zarar eden veya anomali taşıyan siparişlerin toplam etkisini gösterir.",
};

const TITLE_TR = {
  "Negative-profit order exposure": "Zarar Eden Sipariş Riski",
  "Suspected fraud exposure cluster": "Şüpheli İşlem Kümesi",
};

function translateTitle(title) {
  if (TITLE_TR[title]) return TITLE_TR[title];
  return title
    ?.replace("lane delay risk", "hat gecikme riski")
    ?.replace("Standard Class", "Standart")
    ?.replace("First Class", "Öncelikli")
    ?.replace("Second Class", "İkinci Sınıf")
    ?.replace("Same Day", "Aynı Gün") ?? "Risk olayı";
}

function translateAction(action) {
  const text = (action || "").toLowerCase();
  if (text.includes("hold")) return "Sevkiyatı durdur";
  if (text.includes("review")) return "İncelemeye al";
  if (text.includes("upgrade")) return "Servis seviyesini yükselt";
  if (text.includes("notify")) return "Ekibi bilgilendir";
  if (text.includes("inspect")) return "Detaya bak";
  return "Onayla";
}

function KpiCard({ meta, value, explanation }) {
  return (
    <article className={`card kpi-accent-${meta.accent}`}>
      <div className="ct-kpi-head">
        <div>
          <p className="card-title">{meta.title}</p>
          <p className="card-value">{meta.formatter(value)}</p>
          <p className="card-caption">{meta.caption}</p>
        </div>
      </div>
      <p className="card-caption" style={{ marginTop: 12, lineHeight: 1.55 }}>{explanation}</p>
    </article>
  );
}

function ScenarioDrawer({ open, onClose, scenario, onChange, onApply, onReset, loading }) {
  if (!open) return null;
  return (
    <>
      <button aria-label="Senaryo panelini kapat" className="ct-drawer-overlay" onClick={onClose} />
      <aside className="ct-drawer" role="dialog" aria-label="Senaryo simülasyonu">
        <div className="ct-drawer-head">
          <div>
            <p className="ct-drawer-eyebrow">Senaryo</p>
            <h2 className="ct-drawer-title">Operasyon Etkisini Simüle Et</h2>
            <p className="ct-drawer-subtitle">Varsayımları değiştirin, KPI etkisini ayrı bir senaryo olarak görün.</p>
          </div>
          <button type="button" onClick={onClose} className="ct-drawer-close">Kapat</button>
        </div>

        <div className="ct-drawer-fields">
          <label className="ct-drawer-field">
            <span className="ct-drawer-field-label">Liman kapanması</span>
            <select
              value={scenario.portClosed ? "yes" : "no"}
              onChange={(event) => onChange({ portClosed: event.target.value === "yes" })}
              className="ct-drawer-select"
            >
              <option value="no">Yok</option>
              <option value="yes">Büyük liman kapalı</option>
            </select>
          </label>
          <label className="ct-drawer-field">
            <span className="ct-drawer-field-label">Talep artışı: %{scenario.demandSurge}</span>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={scenario.demandSurge}
              onChange={(event) => onChange({ demandSurge: Number(event.target.value) })}
              className="ct-drawer-range"
            />
          </label>
          <label className="ct-drawer-field">
            <span className="ct-drawer-field-label">Tedarikçi grevi</span>
            <select
              value={scenario.strike}
              onChange={(event) => onChange({ strike: event.target.value })}
              className="ct-drawer-select"
            >
              <option value="none">Yok</option>
              <option value="local">Bölgesel</option>
              <option value="global">Küresel</option>
            </select>
          </label>
        </div>

        <div className="ct-drawer-actions">
          <button type="button" onClick={onApply} className="ct-drawer-btn ct-drawer-btn-primary" disabled={loading}>
            {loading ? <InlineSpinner label="Simülasyon çalışıyor..." /> : "Simülasyonu çalıştır"}
          </button>
          <button type="button" onClick={onReset} className="ct-drawer-btn ct-drawer-btn-secondary" disabled={loading}>
            Sıfırla
          </button>
        </div>
      </aside>
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [simulatedMetrics, setSimulatedMetrics] = useState(null);
  const [xaiMap, setXaiMap] = useState(FALLBACK_EXPLANATIONS);
  const [riskZones, setRiskZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [isSimulationApplied, setIsSimulationApplied] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState({});
  const [decisions, setDecisions] = useState({});
  const [scenario, setScenario] = useState({ portClosed: false, demandSurge: 0, strike: "none" });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([
      getOverviewMetrics(),
      getXaiExplanations({ port_closed: false, demand_surge_pct: 0, supplier_strike: "none" }),
      getRiskMap({ limit: 8 }),
      getIncidents({ limit: 6 }),
    ])
      .then(([overview, explanations, riskMap, incidentData]) => {
        if (!mounted) return;
        setMetrics(overview);
        setRiskZones(riskMap?.items ?? []);
        setIncidents(incidentData?.items ?? []);
        if (explanations?.explanations) {
          setXaiMap((prev) => ({ ...prev, ...explanations.explanations }));
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || "Kontrol kulesi verileri yüklenemedi.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeMetrics = useMemo(
    () => (isSimulationApplied ? simulatedMetrics ?? metrics : metrics),
    [isSimulationApplied, metrics, simulatedMetrics],
  );

  async function approveIncident(item) {
    setDecisionLoading((prev) => ({ ...prev, [item.id]: true }));
    try {
      await postIncidentAction({
        incident_id: item.id,
        action: item.recommended_action,
        status: "approved",
        metadata: {
          title: item.title,
          severity: item.severity,
          impact_usd: item.impact_usd,
          source: "control_tower",
        },
      });
      setDecisions((prev) => ({ ...prev, [item.id]: "approved" }));
    } catch {
      setDecisions((prev) => ({ ...prev, [item.id]: "failed" }));
    } finally {
      setDecisionLoading((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  function drillLogistics(params) {
    navigate(`/app/logistics?${new URLSearchParams(params).toString()}`);
  }

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Yönetici kokpiti"
        title="Kontrol Kulesi"
        aside={
          <div className="ct-top-actions">
            <button type="button" onClick={() => setScenarioOpen(true)} className="ct-sim-open-btn">
              Senaryo simülasyonu
            </button>
            <div className="pill">
              <span className="pill-dot" />
              {loading ? "Yükleniyor..." : "Canlı veri"}
            </div>
          </div>
        }
      >
        Bugün aksiyon gerektiren riskleri, finansal etkiyi ve model sinyallerini tek yerde izleyin.
      </PageIntro>

      {error && <StatusBanner type="error" title="Veri alınamadı">{error}</StatusBanner>}
      {isSimulationApplied && (
        <StatusBanner type="warning" title="Senaryo görünümü açık">
          KPI değerleri simülasyon sonucunu gösteriyor. Gerçek operasyon görünümüne dönmek için senaryoyu sıfırlayın.
        </StatusBanner>
      )}

      <section className="kpi-grid">
        {loading || !activeMetrics ? (
          [1, 2, 3, 4].map((key) => <article key={key} className="card"><div className="skeleton skeleton-card" /></article>)
        ) : (
          KPI_META.map((meta) => (
            <KpiCard
              key={meta.key}
              meta={meta}
              value={activeMetrics[meta.key]}
              explanation={xaiMap[meta.key] ?? FALLBACK_EXPLANATIONS[meta.key]}
            />
          ))
        )}
      </section>

      <section className="panel" style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
        <div className="panel-header" style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="panel-title-block">
            <h2 className="panel-title">Operasyon Haritası</h2>
            <p className="panel-subtitle">Bölge ve rota bazında risk yoğunluğunu izleyin.</p>
          </div>
          <span className="panel-header-badge blue">Canlı görünüm</span>
        </div>
        <DigitalTwinMap zones={riskZones} incidents={incidents} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Bölgesel Gecikme Riskleri</h2>
              <p className="panel-subtitle">Bir satıra tıklayarak ilgili lojistik analizine geçin.</p>
            </div>
            <span className="panel-header-badge amber">{riskZones.length} hat</span>
          </div>
          {riskZones.length === 0 && !loading ? (
            <EmptyState title="Risk verisi bulunamadı">
              Veri Merkezi üzerinden sipariş veya sevkiyat verisi yükleyerek risk haritasını güncelleyin.
            </EmptyState>
          ) : (
            <div className="pro-table">
              <div className="pro-table-head">
                <span className="pro-th" style={{ flex: 2 }}>Bölge</span>
                <span className="pro-th" style={{ flex: 2 }}>Kargo modu</span>
                <span className="pro-th" style={{ flex: 2 }}>Risk</span>
                <span className="pro-th" style={{ width: 72 }} />
              </div>
              {riskZones.map((zone) => {
                const tone = riskTone(zone.late_risk_pct);
                return (
                  <button
                    key={zone.id}
                    type="button"
                    className="pro-table-row pro-table-button"
                    onClick={() => drillLogistics({
                      order_region: zone.order_region,
                      shipping_mode: zone.shipping_mode,
                      category: zone.category_name,
                      sku: zone.sku,
                    })}
                  >
                    <span className="pro-td pro-td-name" style={{ flex: 2 }}>{zone.order_region}</span>
                    <span className="pro-td" style={{ flex: 2 }}>{zone.shipping_mode}</span>
                    <span className="pro-td" style={{ flex: 2, display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="pro-mini-track">
                        <span className="pro-mini-fill" style={{ width: `${zone.late_risk_pct * 100}%`, background: tone.color }} />
                      </span>
                      <strong style={{ color: tone.color }}>{fmtPct(zone.late_risk_pct)}</strong>
                      <span className={`pro-tag pro-tag-${tone.badge}`}>{tone.label}</span>
                    </span>
                    <span className="pro-td pro-td-action" style={{ width: 72 }}>İncele</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Bugünün Aksiyonları</h2>
              <p className="panel-subtitle">Onaylanan kararlar denetim kaydına yazılır.</p>
            </div>
            <span className="panel-header-badge amber">{incidents.length} bekleyen</span>
          </div>

          {incidents.length === 0 && !loading ? (
            <EmptyState title="Bekleyen aksiyon yok">
              Kritik bir olay oluştuğunda burada etki, önerilen aksiyon ve inceleme bağlantısı görünür.
            </EmptyState>
          ) : (
            <div className="pro-table">
              <div className="pro-table-head">
                <span className="pro-th" style={{ flex: 2 }}>Olay</span>
                <span className="pro-th" style={{ width: 90 }}>Etki</span>
                <span className="pro-th" style={{ width: 150, textAlign: "right" }}>Aksiyon</span>
              </div>
              {incidents.map((item) => {
                const approved = decisions[item.id] === "approved";
                const failed = decisions[item.id] === "failed";
                const saving = decisionLoading[item.id];
                return (
                  <div key={item.id} className="pro-table-row">
                    <span className="pro-td pro-td-name" style={{ flex: 2 }}>
                      <span className={`ct-dot ${severityTone(item.severity)}`} style={{ marginRight: 8 }} />
                      {translateTitle(item.title)}
                    </span>
                    <span className="pro-td" style={{ width: 90, color: item.impact_usd > 0 ? "var(--risk-high)" : "var(--text-muted)", fontWeight: 800 }}>
                      {item.impact_usd > 0 ? fmtMoney(item.impact_usd) : "-"}
                    </span>
                    <span className="pro-td" style={{ width: 150, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      <button
                        type="button"
                        className="pro-btn-ghost"
                        onClick={() => approveIncident(item)}
                        disabled={approved || saving}
                      >
                        {saving ? "Kaydediliyor" : approved ? "Onaylandı" : failed ? "Tekrar dene" : translateAction(item.recommended_action)}
                      </button>
                      {Object.keys(item.drilldown_params ?? {}).length > 0 && (
                        <button type="button" className="pro-btn-outline" onClick={() => drillLogistics(item.drilldown_params)}>
                          İncele
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ScenarioDrawer
        open={scenarioOpen}
        scenario={scenario}
        loading={scenarioLoading}
        onClose={() => setScenarioOpen(false)}
        onChange={(patch) => setScenario((prev) => ({ ...prev, ...patch }))}
        onApply={async () => {
          setScenarioLoading(true);
          try {
            const result = await postWhatIfScenario({
              port_closed: scenario.portClosed,
              demand_surge_pct: scenario.demandSurge,
              supplier_strike: scenario.strike,
            });
            if (result?.metrics) {
              setSimulatedMetrics(result.metrics);
              setIsSimulationApplied(true);
            }
            if (result?.explanations) {
              setXaiMap((prev) => ({ ...prev, ...result.explanations }));
            }
            setScenarioOpen(false);
          } finally {
            setScenarioLoading(false);
          }
        }}
        onReset={async () => {
          setScenario({ portClosed: false, demandSurge: 0, strike: "none" });
          setIsSimulationApplied(false);
          setSimulatedMetrics(null);
          const explanations = await getXaiExplanations({
            port_closed: false,
            demand_surge_pct: 0,
            supplier_strike: "none",
          });
          if (explanations?.explanations) {
            setXaiMap((prev) => ({ ...prev, ...explanations.explanations }));
          }
        }}
      />
    </div>
  );
}
