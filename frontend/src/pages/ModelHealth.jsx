import { useEffect, useMemo, useState } from "react";
import { getModelHealth } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

const MODEL_LABELS = {
  logistics: { name: "Teslimat risk motoru", desc: "Sipariş bazında gecikme olasılığını tahmin eder." },
  fraud: { name: "Finansal risk motoru", desc: "Şüpheli sipariş ve ödeme anomalilerini tespit eder." },
  demand: { name: "Talep tahmin motoru", desc: "Gelecek talebi ve stok kararlarını üretir." },
};

const METRIC_TR = {
  accuracy: "Doğruluk",
  roc_auc: "AUC skoru",
  f1: "F1",
  precision: "Kesinlik",
  recall: "Kapsama",
  mae: "Ortalama hata",
  rmse: "Kök hata",
  mape: "Yüzde hata",
  p50_mae: "Medyan hata",
  p90_mae: "Üst bant hatası",
};

function labelFor(modelName = "") {
  const key = Object.keys(MODEL_LABELS).find((item) => modelName.toLowerCase().includes(item));
  return MODEL_LABELS[key] ?? { name: modelName, desc: "Model durumu." };
}

function metricLabel(key) {
  return METRIC_TR[String(key).toLowerCase()] || key;
}

function metricValue(value) {
  if (value == null || typeof value === "object") return "Yok";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  if (number >= 0 && number <= 1) return `${(number * 100).toFixed(1)}%`;
  return number >= 10 ? number.toFixed(2) : number.toFixed(4);
}

function ModelCard({ model }) {
  const label = labelFor(model.name);
  const isReady = model.status === "ready";
  const tone = isReady ? "green" : model.status === "missing" ? "amber" : "red";
  const metrics = Object.entries(model.validation_metrics ?? {});

  return (
    <article className={`model-card model-card-${tone}`}>
      <div className="model-card-head">
        <div>
          <h2>{label.name}</h2>
          <p>{label.desc}</p>
        </div>
        <span className={`panel-header-badge ${tone}`}>
          {isReady ? "Hazır" : model.status === "missing" ? "Eksik" : "Hata"}
        </span>
      </div>

      {isReady && metrics.length > 0 ? (
        <div className="model-metric-grid">
          {metrics.map(([key, value]) => {
            const number = Number(value);
            const bounded = typeof value === "number" && number >= 0 && number <= 1;
            return (
              <div key={key} className="model-metric">
                <div className="model-metric-top">
                  <span>{metricLabel(key)}</span>
                  <strong>{metricValue(value)}</strong>
                </div>
                {bounded && (
                  <div className="model-metric-track">
                    <span style={{ width: `${Math.min(100, number * 100)}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="model-card-note">{model.error || "Doğrulama metriği bulunamadı."}</p>
      )}
    </article>
  );
}

export default function ModelHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getModelHealth()
      .then((data) => {
        if (mounted) setHealth(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.detail || err.message || "Model sağlığı alınamadı.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const models = health?.models ?? [];
    const ready = models.filter((model) => model.status === "ready").length;
    const driftMetrics = health?.drift?.metrics ?? [];
    const driftAlerts = driftMetrics.filter((metric) => metric.status !== "stable").length;
    return { total: models.length, ready, driftMetrics, driftAlerts };
  }, [health]);

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Model operasyonları"
        title="Model Sağlığı"
        aside={
          <div className="pill">
            <span className="pill-dot" style={{ background: stats.ready === stats.total ? "#10b981" : "#f59e0b" }} />
            {loading ? <InlineSpinner label="Kontrol ediliyor" /> : `${stats.ready}/${stats.total} motor hazır`}
          </div>
        }
      >
        Tahmin motorlarının çalışma durumunu, doğrulama metriklerini ve veri sapması sinyallerini izleyin.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Model durumu alınamadı">
          {error}
        </StatusBanner>
      )}

      <section className="model-card-grid">
        {loading ? (
          [1, 2, 3].map((item) => <div key={item} className="skeleton model-card-skeleton" />)
        ) : (health?.models ?? []).length > 0 ? (
          health.models.map((model) => <ModelCard key={model.name} model={model} />)
        ) : (
          <EmptyState title="Model kaydı yok">
            Sunucu model sağlığı bağlantısı henüz model listesi döndürmedi.
          </EmptyState>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Veri sapma monitörü</h2>
            <p className="panel-subtitle">
              Sapma arttığında modelin üretim davranışı eğitim verisinden uzaklaşabilir.
            </p>
          </div>
          <span className={`panel-header-badge ${stats.driftAlerts > 0 ? "red" : "green"}`}>
            {stats.driftAlerts > 0 ? `${stats.driftAlerts} uyarı` : "Kararlı"}
          </span>
        </div>

        {loading ? (
          <div className="usage-skeleton-list">
            {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" />)}
          </div>
        ) : stats.driftMetrics.length === 0 ? (
          <EmptyState title="Sapma metriği yok">
            Sapma hesaplaması çalıştığında özellik bazlı değişim burada görünür.
          </EmptyState>
        ) : (
          <div className="model-drift-list">
            {stats.driftMetrics.map((metric) => {
              const tone = metric.status === "stable" ? "green" : metric.status === "watch" ? "amber" : "red";
              const label = metric.status === "stable" ? "Kararlı" : metric.status === "watch" ? "İzlemede" : "Uyarı";
              return (
                <article key={metric.feature} className={`model-drift-row model-drift-${tone}`}>
                  <div>
                    <strong>{metric.feature}</strong>
                    <span>PSI {Number(metric.psi || 0).toFixed(4)}</span>
                  </div>
                  <em>{label}</em>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
