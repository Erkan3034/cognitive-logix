import { useEffect, useMemo, useState } from "react";
import { getModelHealth } from "../lib/api.js";

function statusClass(status) {
  if (status === "ready") return "green";
  if (status === "missing") return "amber";
  return "red";
}

function driftClass(status) {
  if (status === "stable") return "green";
  if (status === "watch") return "amber";
  return "red";
}

function formatMetric(value) {
  if (value == null) return "-";
  if (typeof value === "number") return value.toFixed(value >= 10 ? 2 : 4);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default function ModelHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getModelHealth()
      .then((data) => {
        if (!mounted) return;
        setHealth(data);
        setError("");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Model health verisi alinamadi.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const readyCount = useMemo(
    () => health?.models?.filter((model) => model.status === "ready").length ?? 0,
    [health],
  );

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Model Operasyonlari</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Model Health & Drift</h1>
            <p className="page-subtitle">
              Uretimde calisan model artifact surumleri, validasyon metrikleri ve veri drift sinyalleri.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Kontrol ediliyor..." : `${readyCount}/${health?.models?.length ?? 0} model hazir`}
          </div>
        </div>
      </header>

      {error && (
        <section className="panel">
          <p className="badge-negative">{error}</p>
        </section>
      )}

      <section className="kpi-grid">
        {(health?.models ?? []).map((model) => (
          <article key={model.name} className={`card kpi-accent-${statusClass(model.status)}`}>
            <div className="ct-kpi-head">
              <div>
                <p className="card-title">{model.name}</p>
                <p className="card-value" style={{ fontSize: 22 }}>{model.status.toUpperCase()}</p>
                <p className="card-caption">{model.model_version || model.error}</p>
              </div>
              <span className={`panel-header-badge ${statusClass(model.status)}`}>{model.status}</span>
            </div>
            <p className="card-caption" style={{ marginTop: 12 }}>{model.model_type}</p>
            <p className="card-caption">Artifact: {model.artifact_created_at || "-"}</p>
          </article>
        ))}
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Validasyon Metrikleri</h2>
              <p className="panel-subtitle">Her modelin egitim sirasinda kaydedilen son metrikleri.</p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {(health?.models ?? []).map((model) => (
              <div key={model.name} className="risk-result-box">
                <h3 className="panel-title">{model.name}</h3>
                <div className="form-grid">
                  {Object.entries(model.validation_metrics ?? {}).map(([key, value]) => (
                    <div key={key} className="quick-note">
                      <strong>{key}</strong>
                      <p className="card-caption">{formatMetric(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Data Drift</h2>
              <p className="panel-subtitle">PSI ile eski ve son veri penceresi karsilastirmasi.</p>
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {(health?.drift?.metrics ?? []).map((metric) => (
              <div key={metric.feature} className="alert-item" style={{ animation: "none" }}>
                <span className={`alert-indicator ${driftClass(metric.status)}`} />
                <div className="alert-body">
                  <div className="alert-title">{metric.feature}</div>
                  <div className="alert-desc">PSI: {metric.psi.toFixed(4)} / {metric.status}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="card-caption" style={{ marginTop: 14 }}>
            Pencere boyutlari: {health?.drift?.window_a_rows ?? "-"} / {health?.drift?.window_b_rows ?? "-"} satir.
          </p>
        </div>
      </section>
    </div>
  );
}
