import { useEffect, useState } from "react";
import { getAuditLogs, getIncidentActions } from "../lib/api.js";

function formatDate(v) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

/* Teknik aksiyon/kaynak isimlerini Türkçeye çevir */
const ACTION_TR = {
  incident_action: "Karar Verildi", create: "Oluşturuldu", update: "Güncellendi",
  delete: "Silindi", approve: "Onaylandı", revoke: "İptal Edildi",
  login: "Giriş Yapıldı", logout: "Çıkış Yapıldı", upload: "Veri Yüklendi",
};
const STATUS_TR = {
  approved: "Onaylandı", rejected: "Reddedildi", pending: "Bekliyor",
  queued: "Sıraya Alındı", resolved: "Çözüldü",
};
const toTR = (map, val) => map[val?.toLowerCase?.()] || val || "—";

const SEV_CFG = {
  critical: { color: "#ef4444", badge: "🔴 Kritik" },
  high:     { color: "#ef4444", badge: "🔴 Yüksek" },
  medium:   { color: "#f59e0b", badge: "🟡 Orta" },
  low:      { color: "#10b981", badge: "🟢 Düşük" },
};

function EventCard({ icon, title, meta, badge, badgeColor = "#6366f1", desc }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 14px",
      borderRadius: 10, background: "rgba(148,163,184,0.04)", border: "1px solid rgba(148,163,184,0.08)",
      marginBottom: 6,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{title}</span>
          {badge && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 12,
              background: `${badgeColor}18`, color: badgeColor, border: `1px solid ${badgeColor}25` }}>
              {badge}
            </span>
          )}
        </div>
        {desc && <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>}
      </div>
      <span style={{ fontSize: 10, color: "#64748b", flexShrink: 0, whiteSpace: "nowrap" }}>{meta}</span>
    </div>
  );
}

export default function AuditLog() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [incidentActions, setIncidentActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true); setError(null);
    Promise.all([getAuditLogs({ limit: 50 }), getIncidentActions({ limit: 50 })])
      .then(([a, b]) => { if (mounted) { setAuditLogs(a?.items ?? []); setIncidentActions(b?.items ?? []); } })
      .catch(e => { if (mounted) setError(e?.response?.data?.detail || "Kayıtlar yüklenemedi."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const LIMIT = 8;
  const actions = showAll ? incidentActions : incidentActions.slice(0, LIMIT);
  const logs = showAll ? auditLogs : auditLogs.slice(0, LIMIT);

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Şeffaflık & Uyumluluk</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Denetim Kaydı</h1>
            <p className="page-subtitle">
              Platform üzerinde alınan kararlar ve gerçekleştirilen işlemler burada kayıt altına alınır.
              Her aksiyon kim tarafından, ne zaman alındığını görebilirsiniz.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Yükleniyor..." : `${auditLogs.length + incidentActions.length} kayıt`}
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16,
          background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      <section className="two-column">
        {/* Alınan kararlar */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Alınan Kararlar</h2>
              <p className="panel-subtitle">Dashboard üzerinden onaylanan veya reddedilen uyarı kararları</p>
            </div>
            <span className="panel-header-badge amber">{incidentActions.length} karar</span>
          </div>

          {loading ? [1,2,3].map(k => <div key={k} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 6 }} />) : (
            <>
              {incidentActions.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>
                  Henüz karar kaydı yok.
                </div>
              )}
              {actions.map(row => {
                const sev = row.metadata?.severity;
                const cfg = SEV_CFG[sev] ?? {};
                return (
                  <EventCard key={row.id}
                    icon="⚡"
                    title={row.metadata?.title || "Uyarı Kararı"}
                    badge={cfg.badge}
                    badgeColor={cfg.color}
                    desc={toTR(STATUS_TR, row.status) + (row.metadata?.impact_usd > 0 ? ` · $${Number(row.metadata.impact_usd).toLocaleString("tr-TR")} finansal etki` : "")}
                    meta={formatDate(row.created_at)}
                  />
                );
              })}
              {incidentActions.length > LIMIT && (
                <button onClick={() => setShowAll(p => !p)} style={{
                  width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  color: "#818cf8", background: "rgba(99,102,241,0.07)",
                  border: "1px solid rgba(99,102,241,0.15)", cursor: "pointer", marginTop: 6,
                }}>
                  {showAll ? "▲ Daha az göster" : `▼ ${incidentActions.length - LIMIT} karar daha`}
                </button>
              )}
            </>
          )}
        </div>

        {/* İşlem geçmişi */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">İşlem Geçmişi</h2>
              <p className="panel-subtitle">Veri yükleme, anahtar oluşturma gibi platform işlemleri</p>
            </div>
            <span className="panel-header-badge blue">{auditLogs.length} işlem</span>
          </div>

          {loading ? [1,2,3].map(k => <div key={k} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 6 }} />) : (
            <>
              {auditLogs.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>
                  Henüz işlem kaydı yok.
                </div>
              )}
              {logs.map(row => (
                <EventCard key={row.id}
                  icon="📋"
                  title={toTR(ACTION_TR, row.action)}
                  badge={row.resource_type}
                  badgeColor="#6366f1"
                  desc={row.metadata?.title || row.metadata?.source || undefined}
                  meta={formatDate(row.created_at)}
                />
              ))}
              {auditLogs.length > LIMIT && (
                <button onClick={() => setShowAll(p => !p)} style={{
                  width: "100%", padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  color: "#818cf8", background: "rgba(99,102,241,0.07)",
                  border: "1px solid rgba(99,102,241,0.15)", cursor: "pointer", marginTop: 6,
                }}>
                  {showAll ? "▲ Daha az göster" : `▼ ${auditLogs.length - LIMIT} işlem daha`}
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
