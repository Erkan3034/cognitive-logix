import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  getIncidents,
  getOverviewMetrics,
  getRiskMap,
  getXaiExplanations,
  postIncidentAction,
} from "../lib/api.js";
import DigitalTwinMap from "../components/DigitalTwinMap.jsx";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";
import { startTour } from "../lib/tourConfig.js";
import {
  DecisionDrawer,
  formatMoney,
  formatPct,
  severityMeta,
  translateIncidentDescription,
  translateIncidentTitle,
  typeLabel,
} from "../components/OperationsUI.jsx";

const KPI_META = [
  { key: "on_time_delivery_pct", label: "Zamanında teslimat", formatter: formatPct, tone: "success" },
  { key: "late_delivery_risk_pct", label: "Gecikme riski", formatter: formatPct, tone: "risk" },
  { key: "demand_risk_pct", label: "Talep riski", formatter: formatPct, tone: "warning" },
  { key: "financial_exposure_usd", label: "Finansal maruziyet", formatter: formatMoney, tone: "risk" },
];

const FALLBACK_EXPLANATIONS = {
  on_time_delivery_pct: "Zamanında teslimat oranı mevcut sevkiyat verisinden hesaplanır.",
  late_delivery_risk_pct: "Bölge, taşıma modu ve geçmiş teslimat bayrakları gecikme riskini belirler.",
  demand_risk_pct: "Kategori bazlı oynaklık ve sipariş trendleri talep riskini üretir.",
  financial_exposure_usd: "Negatif kar ve şüpheli işlem sinyalleri finansal maruziyeti gösterir.",
};

function shippingModeLabel(value) {
  const labels = {
    "Standard Class": "Standart",
    "Second Class": "Ekonomi",
    "First Class": "Öncelikli",
    "Same Day": "Aynı gün",
  };
  return labels[value] || value;
}

function regionLabel(value) {
  const labels = {
    "Western Europe": "Batı Avrupa",
    "Eastern Europe": "Doğu Avrupa",
    "Central America": "Orta Amerika",
    "South America": "Güney Amerika",
    "Southeast Asia": "Güneydoğu Asya",
    "West Africa": "Batı Afrika",
    "US / Puerto Rico": "ABD / Porto Riko",
    LATAM: "Latin Amerika",
  };
  return labels[value] || value;
}

function KpiCard({ meta, value, explanation }) {
  return (
    <motion.article 
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
      }}
      className={`usage-kpi usage-kpi-${meta.tone === "risk" ? "warning" : meta.tone}`}
    >
      <span>{meta.label}</span>
      <strong>{meta.formatter(value)}</strong>
      <p>{explanation}</p>
    </motion.article>
  );
}

function RiskLaneRow({ zone, onOpen }) {
  const tone = zone.late_risk_pct >= 0.75 ? "red" : zone.late_risk_pct >= 0.55 ? "amber" : "green";
  return (
    <motion.button 
      variants={{
        hidden: { opacity: 0, x: -10 },
        show: { opacity: 1, x: 0 }
      }}
      whileHover={{ scale: 1.01, backgroundColor: "rgba(255,255,255,0.03)" }}
      whileTap={{ scale: 0.99 }}
      type="button" 
      className="pro-table-row pro-table-button" 
      onClick={() => onOpen(zone)}
    >
      <span className="pro-td pro-td-name" style={{ flex: 2 }}>{regionLabel(zone.order_region)}</span>
      <span className="pro-td" style={{ flex: 1.4 }}>{shippingModeLabel(zone.shipping_mode)}</span>
      <span className="pro-td" style={{ flex: 1.5, gap: 10 }}>
        <span className="pro-mini-track">
          <span className="pro-mini-fill" style={{ width: `${zone.late_risk_pct * 100}%`, background: `var(--risk-${tone === "red" ? "high" : tone === "amber" ? "med" : "low"})` }} />
        </span>
        <strong>{formatPct(zone.late_risk_pct)}</strong>
      </span>
      <span className="pro-td" style={{ flex: 1 }}>{formatMoney(zone.financial_exposure_usd)}</span>
    </motion.button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [explanations, setExplanations] = useState(FALLBACK_EXPLANATIONS);
  const [riskZones, setRiskZones] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState({});

  const fetchCommandCenter = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, xai, riskMap, incidentData] = await Promise.all([
        getOverviewMetrics(),
        getXaiExplanations({ port_closed: false, demand_surge_pct: 0, supplier_strike: "none" }),
        getRiskMap({ limit: 8 }),
        getIncidents({ limit: 8 }),
      ]);
      setMetrics(overview);
      setExplanations({ ...FALLBACK_EXPLANATIONS, ...(xai?.explanations ?? {}) });
      setRiskZones(riskMap?.items ?? []);
      setIncidents(incidentData?.items ?? []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Operasyon merkezi verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandCenter();
  }, []);

  const summary = useMemo(() => {
    const critical = incidents.filter((item) => ["critical", "high"].includes(item.severity)).length;
    const exposure = incidents.reduce((sum, item) => sum + Number(item.impact_usd || 0), 0);
    const topIncident = [...incidents].sort((a, b) => Number(b.impact_usd || 0) - Number(a.impact_usd || 0))[0];
    return { critical, exposure, topIncident };
  }, [incidents]);

  const handleAction = async (item, status) => {
    setSaving((prev) => ({ ...prev, [item.id]: status }));
    try {
      await postIncidentAction({
        incident_id: item.id,
        action: item.recommended_action,
        status,
        metadata: {
          title: item.title,
          type: item.type,
          severity: item.severity,
          impact_usd: item.impact_usd,
          confidence: item.confidence,
          source: "command_center",
        },
      });
      setSelectedIncident(null);
      await fetchCommandCenter();
    } catch (err) {
      setError(err?.response?.data?.detail || "Karar kaydedilemedi.");
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: null }));
    }
  };

  const openZone = (zone) => {
    navigate(`/app/logistics?${new URLSearchParams({
      order_region: zone.order_region,
      shipping_mode: zone.shipping_mode,
      category: zone.category_name,
      sku: zone.sku,
    }).toString()}`);
  };

  const drilldownIncident = (item) => {
    const params = item.drilldown_params ?? {};
    if (Object.keys(params).length > 0) {
      navigate(`/app/logistics?${new URLSearchParams(params).toString()}`);
    } else if (item.type === "fraud") {
      navigate("/app/fraud");
    } else {
      navigate("/app/demand");
    }
  };

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Operasyon merkezi"
        title="Operasyon Karar Merkezi"
        onTourStart={() => startTour("dashboard")}
        aside={
          <div className="ct-top-actions">
            <Link to="/app/inbox" className="pro-btn-outline">Olay Kutusu</Link>
            <Link to="/app/scenario-lab" className="ct-sim-open-btn">Senaryo Laboratuvarı</Link>
          </div>
        }
      >
        Bugün müdahale gerektiren riskleri, finansal etkiyi, rota yoğunluğunu ve model sinyallerini tek ekranda izleyin.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Veri alınamadı">
          {error}
        </StatusBanner>
      )}

      <section className="command-hero">
        <div className="command-hero-panel">
          <div>
            <h2 className="command-hero-title">
              {loading ? "Operasyon sinyalleri hazırlanıyor" : `${summary.critical} öncelikli olay, ${formatMoney(summary.exposure)} risk altında`}
            </h2>
            <p className="command-hero-text">
              Operasyon Merkezi, analiz sonuçlarını ayrı kartlar olarak değil, günlük operasyon karar kuyruğu olarak sunar.
            </p>
          </div>
          <div className="command-hero-actions">
            <button type="button" className="btn" onClick={fetchCommandCenter} disabled={loading}>
              {loading ? <InlineSpinner label="Yenileniyor" /> : "Verileri yenile"}
            </button>
            <Link to="/app/data-quality" className="pro-btn-outline">Veri kalitesini kontrol et</Link>
          </div>
        </div>

        <div className="command-hero-panel">
          <div className="panel-title-block">
            <h2 className="panel-title">Günün en büyük riski</h2>
            <p className="panel-subtitle">Finansal etkiye göre sıralanır.</p>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 86 }} />
          ) : summary.topIncident ? (
            <button type="button" className="exception-card" onClick={() => setSelectedIncident(summary.topIncident)}>
              <div>
                <h3>{translateIncidentTitle(summary.topIncident.title)}</h3>
                <p>{translateIncidentDescription(summary.topIncident.description)}</p>
              </div>
              <div className="exception-card-impact">{formatMoney(summary.topIncident.impact_usd)}</div>
            </button>
          ) : (
            <EmptyState title="Kritik risk yok" />
          )}
        </div>
      </section>

      <section id="dashboard-kpi" className="usage-kpi-grid">
        {loading || !metrics ? (
          [1, 2, 3, 4].map((item) => <article key={item} className="usage-kpi"><div className="skeleton" style={{ height: 84 }} /></article>)
        ) : (
          <motion.div variants={{ show: { transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show" style={{ display: 'contents' }}>
            {KPI_META.map((meta) => (
              <KpiCard key={meta.key} meta={meta} value={metrics[meta.key]} explanation={explanations[meta.key]} />
            ))}
          </motion.div>
        )}
      </section>

      <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="panel-header" style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="panel-title-block">
            <h2 className="panel-title">Operasyon haritası</h2>
            <p className="panel-subtitle">Riskli hatlar ve olaylar aynı coğrafi görünümde.</p>
          </div>
          <span className="panel-header-badge blue">{riskZones.length} hat</span>
        </div>
        <DigitalTwinMap zones={riskZones} incidents={incidents} />
      </section>

      <section className="two-column">
        <div id="dashboard-risk-map" className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Riskli hatlar</h2>
              <p className="panel-subtitle">Lojistik detayına geçmek için satıra tıklayın.</p>
            </div>
          </div>
          {loading ? (
            <div className="usage-skeleton-list">
              {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" />)}
            </div>
          ) : riskZones.length === 0 ? (
            <EmptyState title="Riskli hat bulunamadı" />
          ) : (
            <div className="pro-table">
              <div className="pro-table-head">
                <span className="pro-th" style={{ flex: 2 }}>Bölge</span>
                <span className="pro-th" style={{ flex: 1.4 }}>Mod</span>
                <span className="pro-th" style={{ flex: 1.5 }}>Risk</span>
                <span className="pro-th" style={{ flex: 1 }}>Etki</span>
              </div>
              <motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show" style={{ display: 'contents' }}>
                {riskZones.map((zone) => <RiskLaneRow key={zone.id} zone={zone} onOpen={openZone} />)}
              </motion.div>
            </div>
          )}
        </div>

        <div id="dashboard-incidents" className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Olay Kutusu önizlemesi</h2>
              <p className="panel-subtitle">Detay için olayı açın veya tüm kuyruğa geçin.</p>
            </div>
            <Link to="/app/inbox" className="pro-btn-outline">Tümünü aç</Link>
          </div>
          {loading ? (
            <div className="usage-skeleton-list">
              {[1, 2, 3].map((item) => <div key={item} className="skeleton" />)}
            </div>
          ) : incidents.length === 0 ? (
            <EmptyState title="Bekleyen olay yok" />
          ) : (
            <motion.div 
              variants={{ show: { transition: { staggerChildren: 0.08 } } }} 
              initial="hidden" 
              animate="show" 
              className="exception-card-list"
            >
              {incidents.slice(0, 4).map((item) => {
                const sev = severityMeta(item.severity);
                return (
                  <motion.button 
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      show: { opacity: 1, x: 0 }
                    }}
                    key={item.id} 
                    type="button" 
                    className="exception-card" 
                    onClick={() => setSelectedIncident(item)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div>
                      <h3>{translateIncidentTitle(item.title)}</h3>
                      <div className="exception-card-meta">
                        <span className={`panel-header-badge ${sev.tone}`}>{sev.label}</span>
                        <span className="data-chip">{typeLabel(item.type)}</span>
                      </div>
                    </div>
                    <div className="exception-card-impact">{formatMoney(item.impact_usd)}</div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      <DecisionDrawer
        open={Boolean(selectedIncident)}
        item={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onAction={handleAction}
        loadingAction={selectedIncident ? saving[selectedIncident.id] : null}
        drilldownAction={drilldownIncident}
      />
    </div>
  );
}
