import { useEffect, useMemo, useState } from "react";
import { getOverviewMetrics, postWhatIfScenario } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";
import { formatMoney, formatPct } from "../components/OperationsUI.jsx";

const KPI_ITEMS = [
  { key: "on_time_delivery_pct", label: "Zamanında teslimat", formatter: formatPct, better: "up" },
  { key: "late_delivery_risk_pct", label: "Gecikme riski", formatter: formatPct, better: "down" },
  { key: "demand_risk_pct", label: "Talep riski", formatter: formatPct, better: "down" },
  { key: "financial_exposure_usd", label: "Finansal maruziyet", formatter: formatMoney, better: "down" },
];

function deltaTone(base, scenario, better) {
  const diff = Number(scenario || 0) - Number(base || 0);
  if (Math.abs(diff) < 0.001) return "neutral";
  const improved = better === "up" ? diff > 0 : diff < 0;
  return improved ? "success" : "risk";
}

function metricRatio(key, value, baseValue, scenarioValue) {
  const numeric = Number(value || 0);
  if (key.endsWith("_pct")) return Math.max(0, Math.min(100, numeric * 100));
  const max = Math.max(Number(baseValue || 0), Number(scenarioValue || 0), 1);
  return Math.max(4, Math.min(100, (numeric / max) * 100));
}

function deltaLabel(item, baseValue, scenarioValue) {
  if (scenarioValue == null) return "Baz durum";
  const diff = Number(scenarioValue || 0) - Number(baseValue || 0);
  if (Math.abs(diff) < 0.001) return "Değişim yok";
  const sign = diff > 0 ? "+" : "-";
  if (item.key.endsWith("_pct")) return `${sign}${Math.round(Math.abs(diff) * 100)} puan`;
  return `${sign}${item.formatter(Math.abs(diff))}`;
}

function ScenarioImpactCard({ item, baseValue, scenarioValue }) {
  const hasScenario = scenarioValue != null;
  const activeValue = hasScenario ? scenarioValue : baseValue;
  const tone = hasScenario ? deltaTone(baseValue, scenarioValue, item.better) : "neutral";
  const baseRatio = metricRatio(item.key, baseValue, baseValue, scenarioValue);
  const scenarioRatio = metricRatio(item.key, activeValue, baseValue, scenarioValue);
  const baseY = 48 - Math.min(40, baseRatio * 0.42);
  const scenarioY = 48 - Math.min(40, scenarioRatio * 0.42);
  const midY = (baseY + scenarioY) / 2 + (tone === "risk" ? 5 : tone === "success" ? -5 : 0);

  return (
    <article
      className={`scenario-impact-card scenario-${tone}${hasScenario ? " has-scenario" : ""}`}
      style={{ "--meter-width": `${scenarioRatio}%`, "--meter-base": `${baseRatio}%` }}
    >
      <div className="scenario-impact-head">
        <span>{item.label}</span>
        <em className={`scenario-delta-chip scenario-delta-${tone}`}>{deltaLabel(item, baseValue, scenarioValue)}</em>
      </div>
      <div className="scenario-impact-main">
        <strong>{item.formatter(activeValue)}</strong>
        <svg className="scenario-sparkline" viewBox="0 0 96 56" role="img" aria-label={`${item.label} değişim grafiği`}>
          <path d="M4 48 H92" />
          <polyline points={`6,${baseY} 48,${midY} 90,${scenarioY}`} />
          <circle cx="6" cy={baseY} r="3" />
          <circle cx="90" cy={scenarioY} r="4" />
        </svg>
      </div>
      <div className="scenario-meter" aria-hidden="true">
        <span className="scenario-meter-fill" />
        <span className="scenario-meter-base" />
      </div>
      <div className="scenario-impact-foot">
        <small>Baz: {item.formatter(baseValue)}</small>
        <small>{hasScenario ? `Senaryo: ${item.formatter(scenarioValue)}` : "Senaryo bekleniyor"}</small>
      </div>
    </article>
  );
}

function ScenarioFeedbackHero({ narrative, scenarioResult }) {
  if (!narrative || !scenarioResult) return null;
  const isRisky = narrative.exposureDelta > 0 || narrative.lateDelta > 0;
  const lateText = `${narrative.lateDelta > 0 ? "+" : narrative.lateDelta < 0 ? "-" : ""}${Math.round(Math.abs(narrative.lateDelta) * 100)} puan`;
  const exposureText = `${narrative.exposureDelta > 0 ? "+" : narrative.exposureDelta < 0 ? "-" : ""}${formatMoney(Math.abs(narrative.exposureDelta))}`;

  return (
    <div className={`scenario-feedback-hero ${isRisky ? "scenario-feedback-risk" : "scenario-feedback-success"}`}>
      <div className="scenario-feedback-gauge" aria-hidden="true">
        <span>{isRisky ? "Risk" : "İyi"}</span>
      </div>
      <div className="scenario-feedback-copy">
        <span>Sonuç geri bildirimi</span>
        <h3>{isRisky ? "Senaryo operasyonel baskıyı artırıyor" : "Senaryo daha dengeli bir sonuç üretiyor"}</h3>
        <p>{narrative.text}</p>
      </div>
      <div className="scenario-feedback-pills">
        <strong>Gecikme {lateText}</strong>
        <strong>Maliyet etkisi {exposureText}</strong>
      </div>
    </div>
  );
}

export default function ScenarioLab() {
  const [baseline, setBaseline] = useState(null);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [explanations, setExplanations] = useState({});
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [scenario, setScenario] = useState({
    port_closed: false,
    demand_surge_pct: 12,
    supplier_strike: "none",
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getOverviewMetrics()
      .then((data) => {
        if (mounted) setBaseline(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.detail || "Baz gösterge verisi alınamadı.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const runScenario = async () => {
    setRunning(true);
    setError(null);
    try {
      const data = await postWhatIfScenario(scenario);
      setScenarioResult(data.metrics);
      setExplanations(data.explanations ?? {});
    } catch (err) {
      setError(err?.response?.data?.detail || "Senaryo çalıştırılamadı.");
    } finally {
      setRunning(false);
    }
  };

  const narrative = useMemo(() => {
    if (!baseline || !scenarioResult) return null;
    const exposureDelta = Number(scenarioResult.financial_exposure_usd || 0) - Number(baseline.financial_exposure_usd || 0);
    const lateDelta = Number(scenarioResult.late_delivery_risk_pct || 0) - Number(baseline.late_delivery_risk_pct || 0);
    return {
      exposureDelta,
      lateDelta,
      text: `${scenario.port_closed ? "Liman kapanması" : "Normal liman akışı"}, %${scenario.demand_surge_pct} talep artışı ve ${scenario.supplier_strike === "none" ? "grev yok" : `${scenario.supplier_strike} tedarikçi grevi`} varsayımıyla hesaplandı.`,
    };
  }, [baseline, scenarioResult, scenario]);

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Karar laboratuvarı"
        title="Senaryo Laboratuvarı"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loading ? <InlineSpinner label="Hazırlanıyor" /> : "Olasılıksal simülasyon"}
          </div>
        }
      >
        Operasyon varsayımlarını değiştirin ve gösterge etkisini gerçek simülasyon bağlantısıyla karşılaştırın.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Senaryo tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <section className="scenario-grid">
        <form className="panel scenario-control-panel" onSubmit={(event) => { event.preventDefault(); runScenario(); }}>
          <div className="panel-title-block">
            <h2 className="panel-title">Senaryo girdileri</h2>
            <p className="panel-subtitle">Girdiler sunucu simülasyon motoruna gönderilir.</p>
          </div>

          <label className="field">
            <span className="field-label">Liman durumu</span>
            <select
              className="select"
              value={scenario.port_closed ? "closed" : "open"}
              onChange={(event) => setScenario((prev) => ({ ...prev, port_closed: event.target.value === "closed" }))}
            >
              <option value="open">Normal</option>
              <option value="closed">Büyük liman kapalı</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">Talep artışı: %{scenario.demand_surge_pct}</span>
            <input
              type="range"
              min={0}
              max={30}
              value={scenario.demand_surge_pct}
              onChange={(event) => setScenario((prev) => ({ ...prev, demand_surge_pct: Number(event.target.value) }))}
            />
          </label>

          <label className="field">
            <span className="field-label">Tedarikçi grevi</span>
            <select
              className="select"
              value={scenario.supplier_strike}
              onChange={(event) => setScenario((prev) => ({ ...prev, supplier_strike: event.target.value }))}
            >
              <option value="none">Yok</option>
              <option value="local">Bölgesel</option>
              <option value="global">Küresel</option>
            </select>
          </label>

          <button type="submit" className="btn btn-full" disabled={running || loading}>
            {running ? <InlineSpinner label="Simülasyon çalışıyor" /> : "Senaryoyu çalıştır"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Gösterge etkisi</h2>
              <p className="panel-subtitle">Baz durum ve senaryo sonucu yan yana.</p>
            </div>
          </div>

          {loading ? (
            <div className="usage-skeleton-list">
              {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" />)}
            </div>
          ) : !baseline ? (
            <EmptyState title="Baz gösterge bulunamadı">
              Simülasyon için önce genel metriklerin hesaplanması gerekiyor.
            </EmptyState>
          ) : (
            <div className="result-stack">
              {running && (
                <div className="scenario-running-strip">
                  <span />
                  <div>
                    <strong>Simülasyon çalışıyor</strong>
                    <p>Yeni sonuçlar hesaplanıyor; kartlar tamamlandığında hareketli olarak güncellenecek.</p>
                  </div>
                </div>
              )}

              <ScenarioFeedbackHero narrative={narrative} scenarioResult={scenarioResult} />

              <div className="scenario-result-grid">
                {KPI_ITEMS.map((item) => {
                  const scenarioValue = scenarioResult?.[item.key];
                  return (
                    <ScenarioImpactCard
                      key={`${item.key}-${scenarioValue ?? "base"}`}
                      item={item}
                      baseValue={baseline[item.key]}
                      scenarioValue={scenarioValue}
                    />
                  );
                })}
              </div>

              {narrative ? (
                <StatusBanner type={narrative.exposureDelta > 0 || narrative.lateDelta > 0 ? "warning" : "success"} title="Senaryo yorumu">
                  {narrative.text} Finansal maruziyet farkı {formatMoney(Math.abs(narrative.exposureDelta))}, gecikme riski farkı {formatPct(Math.abs(narrative.lateDelta))}.
                </StatusBanner>
              ) : (
                <EmptyState title="Senaryo çalıştırılmadı">
                  Girdileri ayarlayıp simülasyonu başlatın.
                </EmptyState>
              )}

              {Object.keys(explanations).length > 0 && (
                <div className="quality-issue-list">
                  {Object.entries(explanations).map(([key, text]) => (
                    <div key={key} className="quality-issue-row">
                      <span>{KPI_ITEMS.find((item) => item.key === key)?.label || key}</span>
                      <strong>{text}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
