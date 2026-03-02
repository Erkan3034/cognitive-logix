import { useEffect, useState } from "react";
import { getOverviewMetrics } from "../lib/api.js";

function formatPct(value) {
  if (value == null) return "--";
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(value) {
  if (value == null) return "--";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getOverviewMetrics()
      .then((data) => {
        if (mounted) setMetrics(data);
      })
      .catch(() => {
        if (mounted) setMetrics(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const onTime = formatPct(metrics?.on_time_delivery_pct);
  const lateRisk = formatPct(metrics?.late_delivery_risk_pct);
  const demandRisk = formatPct(metrics?.demand_risk_pct);
  const financialExposure = formatMoney(metrics?.financial_exposure_usd);
  const lossOrders = metrics?.loss_making_orders?.toLocaleString() ?? "--";
  const demandRiskCats = metrics?.demand_risk_categories ?? "--";

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Executive cockpit</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Control Tower Overview</h1>
            <p className="page-subtitle">
              Unified view of on-time delivery, demand risk and financial exposure across
              your global supply chain.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Syncing data…" : "Live data"}
          </div>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="card">
          <div className="card-header">
            <span className="card-title">On-time delivery</span>
            <span className="card-trend badge-positive">Model-based, last 7 days</span>
          </div>
          <div className="card-value">{onTime}</div>
          <p className="card-caption">
            Share of orders predicted to arrive on time across the active network.
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Late delivery risk</span>
            <span className="card-trend badge-negative">
              {lateRisk !== "--" ? `${lateRisk} currently late risk` : "Loading…"}
            </span>
          </div>
          <div className="card-value">{lateRisk}</div>
          <p className="card-caption">
            Orders with high delay probability based on `Late_delivery_risk` signals.
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Demand risk</span>
            <span className="card-trend badge-neutral">
              {demandRiskCats} volatile categories
            </span>
          </div>
          <div className="card-value">{demandRisk}</div>
          <p className="card-caption">
            Volume share in categories with high day‑to‑day volatility (CV &gt; 0.8).
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Financial exposure</span>
            <span className="card-trend badge-negative">
              {lossOrders} loss‑making orders
            </span>
          </div>
          <div className="card-value">{financialExposure}</div>
          <p className="card-caption">
            Potential negative profit from orders flagged with `negative_profit_flag = 1`.
          </p>
        </article>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Network risk heatmap</h2>
              <p className="panel-subtitle">
                Region & shipping mode breakdown by predicted delay probability.
              </p>
            </div>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <div className="chip-row">
              <span className="chip">Western Europe · Standard Class · High risk</span>
              <span className="chip">US & Puerto Rico · Same Day · Medium risk</span>
              <span className="chip">LATAM · Second Class · Low risk</span>
            </div>
            <p className="card-caption" style={{ marginTop: "0.7rem" }}>
              Visual delay heatmap and SHAP-based driver analysis will be rendered here
              (Recharts + SHAP plots).
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Today&apos;s watchlist</h2>
              <p className="panel-subtitle">
                Combined view of late, high-risk demand and suspected fraud orders.
              </p>
            </div>
          </div>
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0, fontSize: "0.8rem" }}>
            <li style={{ marginBottom: "0.45rem" }}>
              <span className="badge-negative">High delay · High margin</span> — prioritize
              alternative carrier for Western Europe sporting goods.
            </li>
            <li style={{ marginBottom: "0.45rem" }}>
              <span className="badge-positive">High demand · Healthy margin</span> — consider
              pulling inventory for US fan shop category.
            </li>
            <li>
              <span className="badge-negative">Suspected fraud</span> — isolate 4,062 orders
              with abnormal payment patterns before fulfillment.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

