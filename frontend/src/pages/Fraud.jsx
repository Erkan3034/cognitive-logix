import { useState } from "react";
import { postFraud } from "../lib/api.js";

export default function Fraud() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState({
    sales: 200,
    benefit_per_order: 25,
    market: "US / Puerto Rico",
    customer_segment: "Consumer"
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postFraud({ features });
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
        <span className="page-eyebrow">Module C · Financial security</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Fraud & negative profit risk</h1>
            <p className="page-subtitle">
              Combine anomaly detection and profit flags to safeguard revenue before order
              approval.
            </p>
          </div>
        </div>
      </header>

      <section className="two-column">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Transaction snapshot</h2>
              <p className="panel-subtitle">
                Core financial features used by the Isolation Forest fraud model.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Sales ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={features.sales}
                onChange={(e) =>
                  setFeatures({ ...features, sales: Number(e.target.value) })
                }
              />
            </div>

            <div className="field">
              <label className="field-label">Benefit per order ($)</label>
              <input
                type="number"
                step={0.01}
                className="input"
                value={features.benefit_per_order}
                onChange={(e) =>
                  setFeatures({ ...features, benefit_per_order: Number(e.target.value) })
                }
              />
              <span className="field-helper">Negative values indicate loss-making orders.</span>
            </div>

            <div className="field">
              <label className="field-label">Market</label>
              <input
                className="input"
                value={features.market}
                onChange={(e) => setFeatures({ ...features, market: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label">Customer segment</label>
              <input
                className="input"
                value={features.customer_segment}
                onChange={(e) =>
                  setFeatures({ ...features, customer_segment: e.target.value })
                }
              />
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Scoring transaction…" : "Score fraud risk"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Anomaly score</h2>
              <p className="panel-subtitle">
                Output from `/fraud` endpoint, where higher scores mean higher anomaly.
              </p>
            </div>
          </div>

          {result ? (
            <>
              {result.error ? (
                <p className="badge-negative">Error: {result.error}</p>
              ) : (
                <p className="card-caption">
                  Anomaly score:&nbsp;
                  <strong>{(result.anomaly_score * 100).toFixed(1)} / 100</strong>
                </p>
              )}
              <pre className="result-code" style={{ marginTop: "0.7rem" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </>
          ) : (
            <p className="card-caption">
              Provide a quick snapshot of the transaction on the left and run the score to see
              how anomalous it looks compared to your historical data.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

