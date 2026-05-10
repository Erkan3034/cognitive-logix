import { useEffect, useMemo, useState } from "react";
import { getAuditLogs, getIncidentActions } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

const ACTION_TR = {
  "incident.approved": "Karar onaylandı",
  "incident.dismissed": "Karar reddedildi",
  "incident.queued": "Karar sıraya alındı",
  incident_action: "Karar kaydı",
  create: "Oluşturuldu",
  update: "Güncellendi",
  delete: "Silindi",
  approve: "Onaylandı",
  revoke: "İptal edildi",
  login: "Giriş yapıldı",
  logout: "Çıkış yapıldı",
  upload: "Veri yüklendi",
};

const STATUS_TR = {
  approved: "Onaylandı",
  dismissed: "Reddedildi",
  rejected: "Reddedildi",
  pending: "Bekliyor",
  queued: "Sıraya alındı",
  resolved: "Çözüldü",
};

const SEVERITY_TR = {
  critical: "Kritik",
  high: "Yüksek",
  medium: "Orta",
  low: "Düşük",
};

function formatDate(value) {
  if (!value) return "Henüz yok";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Geçersiz tarih";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function toTR(map, value, fallback = "Kayıt") {
  const key = String(value || "").toLowerCase();
  return map[key] || value || fallback;
}

function money(value) {
  const amount = Number(value || 0);
  if (!amount) return null;
  return `$${amount.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
}

function EventCard({ title, subtitle, meta, badge, severity = "neutral" }) {
  return (
    <article className="audit-event-card">
      <div className={`audit-event-marker audit-${severity}`} />
      <div className="audit-event-body">
        <div className="audit-event-title-row">
          <strong>{title}</strong>
          {badge && <span className={`audit-badge audit-${severity}`}>{badge}</span>}
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <time>{meta}</time>
    </article>
  );
}

export default function AuditLog() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [incidentActions, setIncidentActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllDecisions, setShowAllDecisions] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([getAuditLogs({ limit: 50 }), getIncidentActions({ limit: 50 })])
      .then(([auditResponse, actionResponse]) => {
        if (!mounted) return;
        setAuditLogs(auditResponse?.items ?? []);
        setIncidentActions(actionResponse?.items ?? []);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.detail || "Denetim kayıtları yüklenemedi.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const critical = incidentActions.filter((row) => ["critical", "high"].includes(row.metadata?.severity)).length;
    const approvals = incidentActions.filter((row) => row.status === "approved").length;
    return {
      total: auditLogs.length + incidentActions.length,
      decisions: incidentActions.length,
      critical,
      approvals,
    };
  }, [auditLogs, incidentActions]);

  const decisionRows = showAllDecisions ? incidentActions : incidentActions.slice(0, 8);
  const auditRows = showAllLogs ? auditLogs : auditLogs.slice(0, 8);

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Uyumluluk"
        title="Denetim Kaydı"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loading ? <InlineSpinner label="Yükleniyor" /> : `${stats.total} kayıt`}
          </div>
        }
      >
        Kullanıcı kararları, sistem aksiyonları ve olay yönetimi kayıtlarını tenant bazında izleyin.
        Bu alan ekiplerin neden, ne zaman ve hangi etkiyle karar aldığını görünür kılar.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Denetim kayıtları alınamadı">
          {error}
        </StatusBanner>
      )}

      <section className="audit-kpi-grid">
        <div className="usage-kpi">
          <span>Toplam kayıt</span>
          <strong>{loading ? "..." : stats.total}</strong>
          <p>Karar ve işlem kayıtları</p>
        </div>
        <div className="usage-kpi usage-kpi-warning">
          <span>Karar kaydı</span>
          <strong>{loading ? "..." : stats.decisions}</strong>
          <p>Dashboard üzerinden alınan kararlar</p>
        </div>
        <div className="usage-kpi usage-kpi-success">
          <span>Onaylanan karar</span>
          <strong>{loading ? "..." : stats.approvals}</strong>
          <p>Aksiyon alınan olaylar</p>
        </div>
        <div className="usage-kpi usage-kpi-muted">
          <span>Kritik/yüksek</span>
          <strong>{loading ? "..." : stats.critical}</strong>
          <p>Öncelikli denetim gerektiren kayıtlar</p>
        </div>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Alınan kararlar</h2>
              <p className="panel-subtitle">Risk olayları için verilen operasyon kararları.</p>
            </div>
            <span className="panel-header-badge amber">{incidentActions.length} karar</span>
          </div>

          {loading ? (
            <div className="usage-skeleton-list">
              {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" />)}
            </div>
          ) : incidentActions.length === 0 ? (
            <EmptyState title="Henüz karar kaydı yok">
              İzleme listesinden bir aksiyon onaylandığında kayıt burada oluşur.
            </EmptyState>
          ) : (
            <div className="audit-list">
              {decisionRows.map((row) => {
                const severity = row.metadata?.severity || "neutral";
                const impact = money(row.metadata?.impact_usd);
                return (
                  <EventCard
                    key={row.id}
                    title={row.metadata?.title || "Operasyon kararı"}
                    badge={SEVERITY_TR[severity] || toTR(STATUS_TR, row.status)}
                    severity={["critical", "high"].includes(severity) ? "high" : severity}
                    subtitle={[
                      toTR(STATUS_TR, row.status, "Durum yok"),
                      row.action,
                      impact ? `${impact} finansal etki` : null,
                    ].filter(Boolean).join(" · ")}
                    meta={formatDate(row.created_at)}
                  />
                );
              })}
              {incidentActions.length > 8 && (
                <button type="button" className="pro-btn-outline usage-show-more" onClick={() => setShowAllDecisions((value) => !value)}>
                  {showAllDecisions ? "Daha az göster" : `${incidentActions.length - 8} karar daha göster`}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">İşlem geçmişi</h2>
              <p className="panel-subtitle">Veri yükleme, anahtar yönetimi ve sistem aksiyonları.</p>
            </div>
            <span className="panel-header-badge blue">{auditLogs.length} işlem</span>
          </div>

          {loading ? (
            <div className="usage-skeleton-list">
              {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" />)}
            </div>
          ) : auditLogs.length === 0 ? (
            <EmptyState title="Henüz işlem kaydı yok">
              Platformdaki yönetim aksiyonları oluştukça burada listelenir.
            </EmptyState>
          ) : (
            <div className="audit-list">
              {auditRows.map((row) => (
                <EventCard
                  key={row.id}
                  title={toTR(ACTION_TR, row.action, "İşlem kaydı")}
                  badge={row.resource_type || "Sistem"}
                  severity="neutral"
                  subtitle={row.metadata?.title || row.metadata?.source || row.resource_id || "Detay kaydı yok"}
                  meta={formatDate(row.created_at)}
                />
              ))}
              {auditLogs.length > 8 && (
                <button type="button" className="pro-btn-outline usage-show-more" onClick={() => setShowAllLogs((value) => !value)}>
                  {showAllLogs ? "Daha az göster" : `${auditLogs.length - 8} işlem daha göster`}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
