import { useEffect, useMemo, useState } from "react";
import { getLiveConnections } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

const STATUS_META = {
  online: { label: "Çalışıyor", tone: "success", pct: 100 },
  warning: { label: "Kesintili", tone: "warning", pct: 58 },
  offline: { label: "Kapalı", tone: "risk", pct: 16 },
};

function formatTime(value) {
  if (!value) return "Henüz yok";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Geçersiz zaman";
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function ConnectionCard({ item }) {
  const meta = STATUS_META[item.status] || STATUS_META.warning;
  const latency = item.latency_ms == null ? "Ölçülmedi" : `${item.latency_ms} ms`;

  return (
    <article className={`live-connection-card live-${meta.tone}`}>
      <div className="live-connection-head">
        <div>
          <span>{item.source}</span>
          <h3>{item.label}</h3>
        </div>
        <strong>{meta.label}</strong>
      </div>
      <p>{item.message}</p>
      <div className="live-meter" aria-label={`${item.label} sağlık oranı`}>
        <span style={{ width: `${meta.pct}%` }} />
      </div>
      <div className="live-connection-foot">
        <small>Yanıt: {latency}</small>
        <small>Kontrol: {formatTime(item.checked_at)}</small>
      </div>
    </article>
  );
}

export default function LiveConnections() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchConnections = async ({ soft = false } = {}) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setPayload(await getLiveConnections());
    } catch (err) {
      setError(err?.response?.data?.detail || "Canlı bağlantı durumu alınamadı.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchConnections();
    const timer = window.setInterval(() => {
      if (mounted) fetchConnections({ soft: true });
    }, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const summary = useMemo(() => {
    const items = payload?.items ?? [];
    const problemCount = items.filter((item) => item.status !== "online").length;
    const healthPct = items.length ? Math.round((payload.online_count / items.length) * 100) : 0;
    return { problemCount, healthPct };
  }, [payload]);

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Canlı kaynaklar"
        title="Canlı Bağlantılar"
        aside={
          <button type="button" className="pro-btn-outline" onClick={() => fetchConnections({ soft: true })} disabled={refreshing}>
            {refreshing ? <InlineSpinner label="Yenileniyor" /> : "Yenile"}
          </button>
        }
      >
        Veri deposu, model çalışma zamanı ve dış kaynakların anlık durumunu izleyin. Kesinti varsa hangi karar akışını etkilediğini hemen görün.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Bağlantılar okunamadı">
          {error}
        </StatusBanner>
      )}

      <section className="live-hero-panel">
        <div className="live-gauge" style={{ "--live-health": `${summary.healthPct}%` }}>
          <strong>{loading ? "..." : `%${summary.healthPct}`}</strong>
          <span>sağlık</span>
        </div>
        <div>
          <h2>{summary.problemCount > 0 ? `${summary.problemCount} kaynak dikkat istiyor` : "Tüm kaynaklar izleniyor"}</h2>
          <p>
            Bu ekran düzenli aralıklarla yenilenir ve gerçek bağlantı sınamalarının sonucunu gösterir.
            Son kontrol: {formatTime(payload?.checked_at)}.
          </p>
        </div>
      </section>

      {loading ? (
        <section className="live-connection-grid">
          {[1, 2, 3].map((item) => <div key={item} className="skeleton live-card-skeleton" />)}
        </section>
      ) : (payload?.items ?? []).length === 0 ? (
        <EmptyState title="Bağlantı kaydı yok">
          Kaynak sınamaları çalıştığında sonuçlar burada görünür.
        </EmptyState>
      ) : (
        <section className="live-connection-grid">
          {payload.items.map((item) => <ConnectionCard key={item.key} item={item} />)}
        </section>
      )}
    </div>
  );
}
