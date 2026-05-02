import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  getIncidents,
  getOverviewMetrics,
  getRiskMap,
  getXaiExplanations,
  postIncidentAction,
  postWhatIfScenario,
} from "../lib/api.js";

function formatPct(value) {
  if (value == null) return null;
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(value) {
  if (value == null) return null;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

const KPI_META = [
  {
    key: "on_time_delivery_pct",
    title: "Zamaninda Teslimat",
    accent: "green",
    formatter: formatPct,
  },
  {
    key: "late_delivery_risk_pct",
    title: "Gecikme Riski",
    accent: "red",
    formatter: formatPct,
  },
  {
    key: "demand_risk_pct",
    title: "Talep Riski",
    accent: "amber",
    formatter: formatPct,
  },
  {
    key: "financial_exposure_usd",
    title: "Finansal Maruziyet",
    accent: "red",
    formatter: formatMoney,
  },
];

const WATCHLIST = [
  {
    id: "TR-982",
    color: "red",
    title: "Gecikmeli Sevkiyat #TR-982",
    desc: "Batı Avrupa hattında liman yoğunluğu nedeniyle teslimat SLA riski artıyor.",
    approveLabel: "Alternatif Hava Rota Onayla (Ek maliyet: $5k)",
    drillParams: { order_region: "Western Europe", shipping_mode: "Same Day", category: "Sporting Goods", sku: "SKU-TR-982" },
  },
  {
    id: "PR-4062",
    color: "amber",
    title: "Supheli Islem #PR-4062",
    desc: "Yuksek tutarli siparis ile beklenmedik odeme deseni eslesmesi bulundu.",
    approveLabel: "Kural Tabanli Ek Dogrulama Baslat",
    drillParams: { order_region: "US / Puerto Rico", shipping_mode: "Standard Class", category: "Fan Shop", sku: "SKU-PR-4062" },
  },
  {
    id: "LAT-221",
    color: "green",
    title: "Talep Pik Sinyali #LAT-221",
    desc: "LATAM bolgesinde talep egiliminde hizli artis, stok yetersizlik riski olusturuyor.",
    approveLabel: "Ek Guvenlik Stogu Tahsis Et",
    drillParams: { order_region: "LATAM", shipping_mode: "Second Class", category: "Cleats", sku: "SKU-LAT-221" },
  },
];

const RISK_ZONES = [
  { id: "WE-ST", text: "Bati Avrupa · Standart · Yuksek risk", risk: "risk-high", params: { order_region: "Western Europe", shipping_mode: "Standard Class", category: "Sporting Goods", sku: "SKU-WE-771" } },
  { id: "US-SD", text: "ABD ve Porto Riko · Ayni gun · Orta risk", risk: "risk-med", params: { order_region: "US / Puerto Rico", shipping_mode: "Same Day", category: "Fan Shop", sku: "SKU-US-224" } },
  { id: "LA-SC", text: "LATAM · Ikinci sinif · Dusuk risk", risk: "risk-low", params: { order_region: "LATAM", shipping_mode: "Second Class", category: "Running Shoes", sku: "SKU-LA-992" } },
  { id: "AP-EX", text: "Asya-Pasifik · Ekspres · Dusuk risk", risk: "risk-low", params: { order_region: "Pacific Asia", shipping_mode: "First Class", category: "Accessories", sku: "SKU-AP-418" } },
];

const FALLBACK_XAI = {
  on_time_delivery_pct:
    "AI analizi: Teslimat basari orani; rota guvenilirligi, transit sureleri ve istisna kayitlariyla hesaplandi.",
  late_delivery_risk_pct:
    "AI analizi: Tasiyici performansi, liman yogunlugu ve transit gecmisine gore gecikme olasiligi olculdu.",
  demand_risk_pct:
    "AI analizi: Kategori bazli gunluk oynaklik (CV) ve bolgesel siparis trendi birlestirilerek talep riski uretildi.",
  financial_exposure_usd:
    "AI analizi: Negatif kar bayragi, siparis tutari dagilimi ve anomali sinyallerinden finansal maruziyet tahmin edildi.",
};

function severityClass(severity) {
  if (severity === "critical" || severity === "high") return "red";
  if (severity === "medium") return "amber";
  return "green";
}

function riskClass(score) {
  if (score >= 0.7) return "risk-high";
  if (score >= 0.4) return "risk-med";
  return "risk-low";
}

function KpiCard({
  title,
  value,
  baseValue,
  accent,
  formatter,
  caption,
  xaiText,
  isSimulationApplied,
  showPopover,
  onTogglePopover,
  onOpenPopover,
  onClosePopover,
}) {
  const formatted = formatter(value);
  const baseFormatted = formatter(baseValue);
  const delta = value - baseValue;
  const isUp = delta > 0;
  const deltaText =
    formatter === formatMoney
      ? formatMoney(Math.abs(delta))
      : `${(Math.abs(delta) * 100).toFixed(1)}%`;

  const accentMap = {
    green: "kpi-accent-green",
    red: "kpi-accent-red",
    amber: "kpi-accent-amber",
  };

  return (
    <motion.article
      layout
      className={`card group relative ct-kpi-card ${showPopover ? "popover-open" : ""} ${accentMap[accent]}`}
      onMouseEnter={onOpenPopover}
      onMouseLeave={onClosePopover}
    >
      <div className="ct-kpi-head">
        <div>
          <p className="card-title">{title}</p>
          <p className="card-value">{formatted ?? "--"}</p>
          <p className="card-caption">{caption}</p>
          {isSimulationApplied && (
            <div className={`ct-kpi-delta ${isUp ? "up" : "down"}`}>
              <span aria-hidden="true">{isUp ? "▲" : "▼"}</span>
              <span>{baseFormatted}{" -> "}{formatted} ({deltaText})</span>
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label={`${title} aciklanabilirlik bilgisini goster`}
          aria-expanded={showPopover}
          onClick={onTogglePopover}
          className="ct-info-btn"
        >
          i
        </button>
      </div>

      <AnimatePresence>
        {showPopover && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label={`${title} XAI aciklamasi`}
            className="ct-xai-popover"
          >
            <p className="ct-xai-label">Aciklanabilir AI</p>
            <p>{xaiText}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function ScenarioDrawer({ open, onClose, scenario, onChange, onApply, onReset, loading }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            aria-label="Senaryo panelini kapat"
            className="ct-drawer-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className="ct-drawer"
            role="dialog"
            aria-label="What-if senaryo simulatoru"
          >
            <div className="ct-drawer-head">
              <div>
                <p className="ct-drawer-eyebrow">What-if Simulator</p>
                <h2 className="ct-drawer-title">Senaryo Simulasyonu</h2>
                <p className="ct-drawer-subtitle">Girdileri degistirip KPI etkisini aninda onizleyin.</p>
              </div>
              <button
                type="button"
                aria-label="Senaryo panelini kapat"
                onClick={onClose}
                className="ct-drawer-close"
              >
                Kapat
              </button>
            </div>

            <div className="ct-drawer-fields">
              <label className="ct-drawer-field">
                <span className="ct-drawer-field-label">X Limani Kapanirsa</span>
                <select
                  aria-label="X Limani kapanma senaryosu"
                  value={scenario.portClosed ? "yes" : "no"}
                  onChange={(e) => onChange({ portClosed: e.target.value === "yes" })}
                  className="ct-drawer-select"
                >
                  <option value="no">Hayir</option>
                  <option value="yes">Evet</option>
                </select>
              </label>

              <label className="ct-drawer-field">
                <span className="ct-drawer-field-label">Talep Artisi (%)</span>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  aria-label="Talep artisi yuzdesi"
                  value={scenario.demandSurge}
                  onChange={(e) => onChange({ demandSurge: Number(e.target.value) })}
                  className="ct-drawer-range"
                />
                <span className="ct-drawer-range-value">%{scenario.demandSurge}</span>
              </label>

              <label className="ct-drawer-field">
                <span className="ct-drawer-field-label">Tedarikci Grevi</span>
                <select
                  aria-label="Tedarikci grev seviyesi"
                  value={scenario.strike}
                  onChange={(e) => onChange({ strike: e.target.value })}
                  className="ct-drawer-select"
                >
                  <option value="none">Yok</option>
                  <option value="local">Bolgesel</option>
                  <option value="global">Kuresel</option>
                </select>
              </label>
            </div>

            <div className="ct-drawer-actions">
              <button
                type="button"
                onClick={onApply}
                aria-label="Senaryoyu calistir"
                className="ct-drawer-btn ct-drawer-btn-primary"
                disabled={loading}
              >
                {loading ? "Simulasyon Calisiyor..." : "Simulasyonu Calistir"}
              </button>
              <button
                type="button"
                onClick={onReset}
                aria-label="Senaryoyu sifirla"
                className="ct-drawer-btn ct-drawer-btn-secondary"
                disabled={loading}
              >
                Sifirla
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function SkeletonCard() {
  return (
    <article className="card">
      <div className="card-header" style={{ marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: "60%" }} />
        </div>
      </div>
      <div className="skeleton skeleton-value" style={{ width: "55%" }} />
      <div className="skeleton skeleton-text" style={{ width: "80%", marginTop: 10 }} />
    </article>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [simulatedMetrics, setSimulatedMetrics] = useState(null);
  const [xaiMap, setXaiMap] = useState(FALLBACK_XAI);
  const [loading, setLoading] = useState(true);
  const [riskZones, setRiskZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [openXaiKey, setOpenXaiKey] = useState(null);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [isSimulationApplied, setIsSimulationApplied] = useState(false);
  const [decisions, setDecisions] = useState({});
  const [decisionLoading, setDecisionLoading] = useState({});
  const [scenario, setScenario] = useState({
    portClosed: false,
    demandSurge: 0,
    strike: "none",
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getOverviewMetrics(),
      getXaiExplanations({ port_closed: false, demand_surge_pct: 0, supplier_strike: "none" }),
      getRiskMap({ limit: 8 }),
      getIncidents({ limit: 6 }),
    ])
      .then(([overviewData, xaiData, riskMapData, incidentData]) => {
        if (!mounted) return;
        setMetrics(overviewData);
        setRiskZones(riskMapData?.items ?? []);
        setIncidents(incidentData?.items ?? []);
        if (xaiData?.explanations) {
          setXaiMap((prev) => ({ ...prev, ...xaiData.explanations }));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setMetrics(null);
        setXaiMap(FALLBACK_XAI);
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
    [isSimulationApplied, simulatedMetrics, metrics],
  );

  const onApproveDecision = async (item) => {
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
  };

  const onInspectDecision = (params) => {
    const search = new URLSearchParams(params).toString();
    navigate(`/app/logistics?${search}`);
  };

  const goRiskDrilldown = (params) => {
    const search = new URLSearchParams(params).toString();
    navigate(`/app/logistics?${search}`);
  };

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Yonetici Kokpiti</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Kontrol Kulesi - Genel Gorunum</h1>
            <p className="page-subtitle">
              KPI, risk ve karar akisini tek ekranda yonetin. AI aciklamalari, what-if simulasyonu ve drill-down akisiyla otonom karar destegi saglanir.
            </p>
          </div>
          <div className="ct-top-actions">
            <button
              type="button"
              aria-label="Senaryo simulatorunu ac"
              onClick={() => setScenarioOpen(true)}
              className="ct-sim-open-btn"
            >
              Senaryo Simulatore Ac
            </button>
            <div className="pill">
              <span className="pill-dot" />
              {loading ? "Senkronize ediliyor..." : "Canli veri"}
            </div>
          </div>
        </div>
      </header>

      <section className="kpi-grid">
        {loading || !activeMetrics ? (
          [1, 2, 3, 4].map((k) => <SkeletonCard key={k} />)
        ) : (
          KPI_META.map((kpi) => (
            <KpiCard
              key={kpi.key}
              title={kpi.title}
              value={activeMetrics[kpi.key]}
              baseValue={metrics[kpi.key]}
              accent={kpi.accent}
              formatter={kpi.formatter}
              caption="Model tabanli tahmin ve risk korelasyonlariyla uretilmistir."
              xaiText={xaiMap[kpi.key] ?? FALLBACK_XAI[kpi.key]}
              isSimulationApplied={isSimulationApplied}
              showPopover={openXaiKey === kpi.key}
              onTogglePopover={() => setOpenXaiKey((prev) => (prev === kpi.key ? null : kpi.key))}
              onOpenPopover={() => setOpenXaiKey(kpi.key)}
              onClosePopover={() => setOpenXaiKey((prev) => (prev === kpi.key ? null : prev))}
            />
          ))
        )}
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Ag Risk Dagilimi</h2>
              <p className="panel-subtitle">Bolgelere tiklayarak kademeli gosterimle lojistik modulune filtreli gecin.</p>
            </div>
            <span className="panel-header-badge red">Drill-down Aktif</span>
          </div>
          <div className="chip-row">
            {riskZones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                onClick={() => goRiskDrilldown({
                  order_region: zone.order_region,
                  shipping_mode: zone.shipping_mode,
                  category: zone.category_name,
                  sku: zone.sku,
                })}
                aria-label={`${zone.order_region} icin lojistik detayina git`}
                className={`chip ${riskClass(zone.late_risk_pct)}`}
              >
                {zone.order_region} · {zone.shipping_mode} · {(zone.late_risk_pct * 100).toFixed(1)}%
              </button>
            ))}
          </div>
          <p className="card-caption" style={{ marginTop: 14, lineHeight: 1.6 }}>
            Bir risk bolgesine tikladiginizda Lojistik modulunde bolge, tasima modu ve SKU on filtreleri otomatik uygulanir.
          </p>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Bugunun Izleme Listesi</h2>
              <p className="panel-subtitle">Statik uyarilar yerine AI onerili mudahale kartlari.</p>
            </div>
            <span className="panel-header-badge amber">{incidents.length} karar</span>
          </div>
          <div className="ct-watchlist">
            {incidents.map((item) => {
              const approved = decisions[item.id] === "approved";
              const failed = decisions[item.id] === "failed";
              const saving = decisionLoading[item.id];
              return (
                <article key={item.id} className="ct-decision-card">
                  <div className="ct-decision-head">
                    <span className={`ct-dot ${severityClass(item.severity)}`} />
                    <div>
                      <h3 className="ct-decision-title">{item.title}</h3>
                      <p className="ct-decision-desc">{item.description}</p>
                    </div>
                  </div>
                  <div className="ct-decision-actions">
                    <button
                      type="button"
                      aria-label={`${item.title} icin AI onerisini onayla`}
                      onClick={() => onApproveDecision(item)}
                      className="ct-action-btn ct-action-btn-approve"
                      disabled={approved || saving}
                    >
                      {saving ? "Kaydediliyor..." : approved ? "Onaylandi" : failed ? "Tekrar Dene" : item.recommended_action}
                    </button>
                    {Object.keys(item.drilldown_params ?? {}).length > 0 && (
                      <button
                        type="button"
                        aria-label={`${item.title} icin lojistik modulune git`}
                        onClick={() => onInspectDecision(item.drilldown_params)}
                        className="ct-action-btn ct-action-btn-review"
                      >
                        Lojistik Modulune Git
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
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
            const res = await postWhatIfScenario({
              port_closed: scenario.portClosed,
              demand_surge_pct: scenario.demandSurge,
              supplier_strike: scenario.strike,
            });
            if (res?.metrics) {
              setSimulatedMetrics(res.metrics);
              setIsSimulationApplied(true);
            }
            if (res?.explanations) {
              setXaiMap((prev) => ({ ...prev, ...res.explanations }));
            }
            setScenarioOpen(false);
          } catch {
            setIsSimulationApplied(false);
          } finally {
            setScenarioLoading(false);
          }
        }}
        onReset={async () => {
          setScenario({ portClosed: false, demandSurge: 0, strike: "none" });
          setIsSimulationApplied(false);
          setSimulatedMetrics(null);
          try {
            const xaiData = await getXaiExplanations({
              port_closed: false,
              demand_surge_pct: 0,
              supplier_strike: "none",
            });
            if (xaiData?.explanations) {
              setXaiMap((prev) => ({ ...prev, ...xaiData.explanations }));
            }
          } catch {
            setXaiMap(FALLBACK_XAI);
          }
        }}
      />
    </div>
  );
}
