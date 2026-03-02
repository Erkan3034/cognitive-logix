import { useState } from "react";
import { postForecast } from "../lib/api.js";

export default function Demand() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState(30);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postForecast({ horizon, series: [] });
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
        <span className="page-eyebrow">Module B · Demand intelligence</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Category demand forecast</h1>
            <p className="page-subtitle">
              Project short-term demand curves by category and time horizon to align
              inventory and capacity decisions.
            </p>
          </div>
        </div>
      </header>

      <section className="two-column">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Forecast configuration</h2>
              <p className="panel-subtitle">
                Horizon and series selection for the Prophet-based forecast model.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Forecast horizon (days)</label>
              <input
                type="number"
                min={7}
                max={90}
                className="input"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
              />
              <span className="field-helper">Typical window: 14–60 days.</span>
            </div>

            <div className="field">
              <label className="field-label">Category / segment</label>
              <input
                className="input"
                placeholder="e.g. Fan Shop · Western Europe"
              />
              <span className="field-helper">
                In a later step this will drive filtered time series from the data warehouse.
              </span>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Generating forecast…" : "Generate forecast"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Forecast output</h2>
              <p className="panel-subtitle">
                Forecast points returned from `/forecast` and ready to be visualised.
              </p>
            </div>
          </div>

          {result ? (
            <>
              {result.error ? (
                <p className="badge-negative">Error: {result.error}</p>
              ) : (
                <p className="card-caption">
                  Received <strong>{result.points?.length ?? 0}</strong> forecast points for a{" "}
                  {horizon}-day horizon.
                </p>
              )}
              <pre className="result-code" style={{ marginTop: "0.7rem" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </>
          ) : (
            <p className="card-caption">
              Configure the horizon and category on the left, then run the forecast to inspect
              the raw JSON output.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

