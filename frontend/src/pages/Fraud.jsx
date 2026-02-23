import { useState } from "react";
import { postFraud } from "../lib/api.js";

export default function Fraud() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const data = await postFraud({ features: {} });
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Fraud</h2>
      <p>Fraud detection UI (POST /fraud).</p>
      <button onClick={run} disabled={loading}>
        {loading ? "Scoring..." : "Run demo fraud score"}
      </button>
      {result && (
        <pre style={{ marginTop: 12, padding: 12, background: "#f6f6f6" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

