import { useState } from "react";
import { postForecast } from "../lib/api.js";

export default function Demand() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const data = await postForecast({ horizon: 14, series: [] });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Demand</h2>
      <p>Forecast & simulation UI (POST /forecast).</p>
      <button onClick={run} disabled={loading}>
        {loading ? "Forecasting..." : "Run demo forecast"}
      </button>
      {result && (
        <pre style={{ marginTop: 12, padding: 12, background: "#f6f6f6" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

