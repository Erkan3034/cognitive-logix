export default function Dashboard() {
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
            Live data
          </div>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="card">
          <div className="card-header">
            <span className="card-title">On-time delivery</span>
            <span className="card-trend badge-positive">+4.2 pts vs last week</span>
          </div>
          <div className="card-value">45.2%</div>
          <p className="card-caption">
            Share of orders predicted to arrive on time in the next 7 days.
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Late delivery risk</span>
            <span className="card-trend badge-negative">54.8% currently late</span>
          </div>
          <div className="card-value">38.7%</div>
          <p className="card-caption">
            Orders with high delay probability based on current network conditions.
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Demand risk</span>
            <span className="card-trend badge-neutral">14 categories in focus</span>
          </div>
          <div className="card-value">12.3%</div>
          <p className="card-caption">
            Forecasted volume at risk due to demand volatility in the next 30 days.
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Financial exposure</span>
            <span className="card-trend badge-negative">33,784 loss-making orders</span>
          </div>
          <div className="card-value">$1.24M</div>
          <p className="card-caption">
            Potential negative profit from high-risk & suspected fraud transactions.
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

