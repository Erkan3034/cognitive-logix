import { useEffect, useMemo, useState } from "react";
import { getDecisionImpact } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";
import { formatMoney, translateAction, translateIncidentTitle, typeLabel } from "../components/OperationsUI.jsx";

const STATUS_TR = {
  approved: "Onaylandı",
  queued: "Sıraya alındı",
  dismissed: "Reddedildi",
};

function formatDate(value) {
  if (!value) return "Henüz yok";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Geçersiz tarih";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function ImpactBar({ item, max }) {
  const pct = max > 0 ? Math.max(5, Math.round((item.protected_value_usd / max) * 100)) : 0;
  return (
    <article className="impact-bar-row">
      <div>
        <strong>{typeLabel(item.type)}</strong>
        <span>{item.count} karar</span>
      </div>
      <div className="impact-bar-track">
        <span style={{ width: `${pct}%` }} />
      </div>
      <em>{formatMoney(item.protected_value_usd)}</em>
    </article>
  );
}

export default function DecisionImpact() {
  const [impact, setImpact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchImpact = async () => {
    setLoading(true);
    setError(null);
    try {
      setImpact(await getDecisionImpact({ limit: 250 }));
    } catch (err) {
      setError(err?.response?.data?.detail || "Karar etkisi alınamadı.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpact();
  }, []);

  const maxProtected = useMemo(() => {
    return Math.max(...(impact?.by_type ?? []).map((item) => item.protected_value_usd), 0);
  }, [impact]);

  const statusCounts = impact?.status_counts ?? {};

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Aksiyon getirisi"
        title="Karar Etkisi"
        aside={
          <button type="button" className="pro-btn-outline" onClick={fetchImpact} disabled={loading}>
            {loading ? <InlineSpinner label="Yükleniyor" /> : "Yenile"}
          </button>
        }
      >
        Olay Kutusu’nda alınan kararların finansal etkisini, korunmuş değeri ve ekip aksiyon hızını görünür hale getirin.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Karar etkisi okunamadı">
          {error}
        </StatusBanner>
      )}

      <section className="impact-hero-grid">
        <article className="impact-hero-card">
          <span>Korunan tahmini değer</span>
          <strong>{loading ? "..." : formatMoney(impact?.protected_value_usd)}</strong>
          <p>Onaylanan ve sıraya alınan kararların risk azaltım katsayısıyla hesaplandı.</p>
        </article>
        <article className="impact-hero-card">
          <span>Toplam karar</span>
          <strong>{loading ? "..." : impact?.total_decisions ?? 0}</strong>
          <p>Denetim izi olan olay aksiyonları.</p>
        </article>
        <article className="impact-hero-card">
          <span>Onay oranı</span>
          <strong>{loading ? "..." : `%${Math.round((impact?.approval_rate ?? 0) * 100)}`}</strong>
          <p>Bekleyen olaylardan aksiyona dönen pay.</p>
        </article>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Etki kırılımı</h2>
              <p className="panel-subtitle">Karar türlerine göre korunmuş değer.</p>
            </div>
          </div>
          {loading ? (
            <div className="usage-skeleton-list">
              {[1, 2, 3].map((item) => <div key={item} className="skeleton" />)}
            </div>
          ) : (impact?.by_type ?? []).length === 0 ? (
            <EmptyState title="Henüz karar yok">
              Olay Kutusu’nda aksiyon aldıkça etki kırılımı burada oluşur.
            </EmptyState>
          ) : (
            <div className="impact-bar-list">
              {impact.by_type.map((item) => <ImpactBar key={item.type} item={item} max={maxProtected} />)}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Karar durumu</h2>
              <p className="panel-subtitle">Ekip aksiyonlarının dağılımı.</p>
            </div>
          </div>
          <div className="impact-status-grid">
            {["approved", "queued", "dismissed"].map((status) => (
              <article key={status} className={`impact-status-card impact-${status}`}>
                <span>{STATUS_TR[status]}</span>
                <strong>{loading ? "..." : statusCounts[status] ?? 0}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Son kararlar</h2>
            <p className="panel-subtitle">En son kaydedilen aksiyonlar.</p>
          </div>
        </div>
        {loading ? (
          <div className="usage-skeleton-list">
            {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" />)}
          </div>
        ) : (impact?.recent ?? []).length === 0 ? (
          <EmptyState title="Karar kaydı yok">
            Kararlar onaylandığında veya sıraya alındığında liste burada görünür.
          </EmptyState>
        ) : (
          <div className="impact-timeline">
            {impact.recent.map((row) => {
              const metadata = row.metadata ?? {};
              return (
                <article key={row.id} className="impact-timeline-row">
                  <span />
                  <div>
                    <strong>{translateIncidentTitle(metadata.title || "Operasyon kararı")}</strong>
                    <p>{STATUS_TR[row.status] || row.status} · {translateAction(row.action)} · {formatMoney(metadata.impact_usd || 0)} etki</p>
                  </div>
                  <time>{formatDate(row.created_at)}</time>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
