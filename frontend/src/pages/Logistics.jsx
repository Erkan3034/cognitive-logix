import { useState } from "react";
import { postPredict } from "../lib/api.js";

export default function Logistics() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const data = await postPredict({ features: {} });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Logistics</h2>
      <p>Delay prediction UI (POST /predict).</p>
      <button onClick={run} disabled={loading}>
        {loading ? "Predicting..." : "Run demo predict"}
      </button>
      {result && (
        <pre style={{ marginTop: 12, padding: 12, background: "#f6f6f6" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

