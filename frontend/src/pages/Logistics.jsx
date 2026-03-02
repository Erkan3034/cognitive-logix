import { useState } from "react";
import { postPredict } from "../lib/api.js";

export default function Logistics() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shipping_mode: "Standard Class",
    order_region: "Western Europe",
    days_scheduled: 4,
    category: "Sporting Goods",
    market: "Europe",
    sales: 150,
    quantity: 2
  });

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
        <span className="page-eyebrow">Module A · Predictive logistics</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Delivery delay prediction</h1>
            <p className="page-subtitle">
              Score individual orders by delay risk before fulfillment and proactively switch
              carrier, route or service level.
            </p>
          </div>
        </div>
      </header>

      <section className="two-column">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Order context</h2>
              <p className="panel-subtitle">
                Key operational features used by the XGBoost delay risk model.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Shipping mode</label>
              <select
                className="select"
                value={formData.shipping_mode}
                onChange={(e) => setFormData({ ...formData, shipping_mode: e.target.value })}
              >
                <option>Standard Class</option>
                <option>Second Class</option>
                <option>First Class</option>
                <option>Same Day</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Order region</label>
              <input
                className="input"
                value={formData.order_region}
                onChange={(e) => setFormData({ ...formData, order_region: e.target.value })}
                placeholder="e.g. Western Europe"
              />
            </div>

            <div className="field">
              <label className="field-label">Planned shipping days</label>
              <input
                type="number"
                min={0}
                className="input"
                value={formData.days_scheduled}
                onChange={(e) =>
                  setFormData({ ...formData, days_scheduled: Number(e.target.value) })
                }
              />
              <span className="field-helper">From order date to promised ship date.</span>
            </div>

            <div className="field">
              <label className="field-label">Category</label>
              <input
                className="input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label">Market</label>
              <input
                className="input"
                value={formData.market}
                onChange={(e) => setFormData({ ...formData, market: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label">Order value ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={formData.sales}
                onChange={(e) => setFormData({ ...formData, sales: Number(e.target.value) })}
              />
            </div>

            <div className="field">
              <label className="field-label">Quantity</label>
              <input
                type="number"
                min={1}
                className="input"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Scoring order…" : "Score delay risk"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Model output</h2>
              <p className="panel-subtitle">
                JSON payload directly returned by the FastAPI `/predict` endpoint.
              </p>
            </div>
          </div>

          {result ? (
            <>
              {result.error ? (
                <p className="badge-negative">Error: {result.error}</p>
              ) : (
                <>
                  <p className="card-caption">
                    Delay risk:&nbsp;
                    <strong>{(result.delay_risk * 100).toFixed(1)}%</strong>
                  </p>
                  <p className="card-caption">
                    Risk band:&nbsp;
                    <strong>
                      {result.delay_risk > 0.7
                        ? "High"
                        : result.delay_risk > 0.4
                        ? "Medium"
                        : "Low"}
                    </strong>
                  </p>
                </>
              )}
              <pre className="result-code" style={{ marginTop: "0.7rem" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </>
          ) : (
            <p className="card-caption">
              Fill in the order context on the left and run a score to see the model output.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

