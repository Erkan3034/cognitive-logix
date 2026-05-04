import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { getUsage } from "../lib/api.js";

/* ── Endpoint → Modül adı çevirisi ─────────────────────── */
const MODULE_MAP = [
  { match: /\/predict/i,           label: "Lojistik Analizi",          icon: "🚚", group: "Lojistik" },
  { match: /\/fraud/i,             label: "Güvenlik Kontrolü",          icon: "🛡️", group: "Güvenlik" },
  { match: /\/forecast/i,          label: "Talep Tahmini",              icon: "📈", group: "Talep" },
  { match: /\/metrics\/overview/i, label: "Genel Bakış",                icon: "🏠", group: "Sistem" },
  { match: /\/metrics\/xai/i,      label: "AI Açıklaması",              icon: "🤖", group: "Sistem" },
  { match: /\/metrics\/risk/i,     label: "Risk Haritası",              icon: "🗺️", group: "Sistem" },
  { match: /\/metrics\/incident/i, label: "Olay Listesi",               icon: "⚠️", group: "Sistem" },
  { match: /\/metrics\/model/i,    label: "Model Durumu",               icon: "⚙️", group: "Sistem" },
  { match: /\/ops\/usage/i,        label: "Kullanım Raporu",            icon: "📊", group: "Sistem" },
  { match: /\/ops\/audit/i,        label: "Denetim Kaydı",              icon: "📋", group: "Sistem" },
  { match: /\/ops\/incident/i,     label: "Olay Yönetimi",              icon: "🔔", group: "Sistem" },
  { match: /\/ingest\/confirm/i,   label: "Veri Kaydı Onayı",           icon: "✅", group: "Veri" },
  { match: /\/ingest/i,            label: "Veri Yükleme",               icon: "📂", group: "Veri" },
  { match: /\/api-keys/i,          label: "API Anahtar Yönetimi",       icon: "🔑", group: "Sistem" },
  { match: /\/billing/i,           label: "Abonelik & Fatura",          icon: "💳", group: "Sistem" },
];

function toModule(endpoint = "") {
  const m = MODULE_MAP.find(r => r.match.test(endpoint));
  return m ?? { label: "Sistem", icon: "⚙️", group: "Sistem" };
}

function isSuccess(status) { return !status || (status >= 200 && status < 400); }

function formatDate(v) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

/* ── KPI Kartı ──────────────────────────────────────────── */
function KpiCard({ icon, title, value, sub, color = "#6366f1" }) {
  return (
    <article style={{
      background: "var(--bg-surface-1)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "18px 20px",
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{sub}</div>
    </article>
  );
}

/* ── Modül kullanım çubukları ───────────────────────────── */
function ModuleUsageChart({ data }) {
  if (!data.length) return (
    <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b" }}>Henüz kullanım verisi yok.</div>
  );
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 120)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
        <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickLine={false} axisLine={false} width={140} />
        <Tooltip
          cursor={{ fill: "rgba(99,102,241,0.06)" }}
          content={({ payload }) => payload?.[0] ? (
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{payload[0].payload.label}</p>
              <p style={{ color: "#818cf8", fontWeight: 700, fontSize: 14, margin: 0 }}>
                {payload[0].value} kullanım
              </p>
            </div>
          ) : null}
        />
        <Bar dataKey="count" radius={[0, 5, 5, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill="#6366f1" fillOpacity={0.75} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Son aktivite feed'i ───────────────────────────────── */
function ActivityFeed({ items, limit = 8 }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, limit);

  if (!items.length) return (
    <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>
      Henüz kayıtlı aktivite yok.
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visible.map((item, i) => {
          const mod = toModule(item.endpoint);
          const ok = isSuccess(item.status_code);
          return (
            <div key={item.id ?? i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
              borderRadius: 9, background: "rgba(148,163,184,0.04)", border: "1px solid rgba(148,163,184,0.08)",
            }}>
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{mod.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>
                  {mod.label}
                </div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{formatDate(item.created_at)}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 12, flexShrink: 0,
                background: ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                color: ok ? "#10b981" : "#ef4444",
                border: `1px solid ${ok ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
                {ok ? "✓ Başarılı" : "✕ Hatalı"}
              </span>
            </div>
          );
        })}
      </div>
      {items.length > limit && (
        <button onClick={() => setExpanded(p => !p)} style={{
          marginTop: 10, width: "100%", padding: "8px", borderRadius: 8, fontSize: 12,
          fontWeight: 600, color: "#818cf8", background: "rgba(99,102,241,0.07)",
          border: "1px solid rgba(99,102,241,0.15)", cursor: "pointer",
        }}>
          {expanded ? "▲ Daha az göster" : `▼ ${items.length - limit} aktivite daha göster`}
        </button>
      )}
    </div>
  );
}

/* ── Ana sayfa ─────────────────────────────────────────── */
export default function Usage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true); setError(null);
    getUsage()
      .then(d => { if (mounted) setUsage(d); })
      .catch(e => { if (mounted) setError(e?.response?.data?.detail || "Kullanım verisi yüklenemedi."); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  /* Endpoint → modül bazlı gruplama */
  const moduleUsage = useMemo(() => {
    const byEndpoint = usage?.by_endpoint ?? {};
    const grouped = {};
    Object.entries(byEndpoint).forEach(([ep, count]) => {
      const mod = toModule(ep);
      grouped[mod.label] = (grouped[mod.label] ?? 0) + count;
    });
    return Object.entries(grouped)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [usage]);

  /* Toplam başarılı / hatalı */
  const { successCount, errorCount } = useMemo(() => {
    const items = usage?.recent ?? [];
    return {
      successCount: items.filter(r => isSuccess(r.status_code)).length,
      errorCount: items.filter(r => !isSuccess(r.status_code)).length,
    };
  }, [usage]);

  const total = usage?.total_calls ?? 0;
  const lastUsed = formatDate(usage?.recent?.[0]?.created_at);

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Platform Kullanımı</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Kullanım ve Kota İzleme</h1>
            <p className="page-subtitle">
              Platformu hangi modüller için ne sıklıkla kullandığınızı izleyin.
              Kota durumunuzu ve aktivite geçmişinizi buradan takip edebilirsiniz.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Yükleniyor..." : `${total.toLocaleString("tr-TR")} istek`}
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16,
          background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>
            ⚠️ {error}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <KpiCard
          icon="📊" title="Toplam Kullanım"
          value={loading ? "—" : total.toLocaleString("tr-TR")}
          sub="Bu aya ait toplam platform sorgusu"
          color="#6366f1"
        />
        <KpiCard
          icon="✅" title="Başarılı İşlemler"
          value={loading ? "—" : successCount}
          sub="Hatasız tamamlanan analizler"
          color="#10b981"
        />
        <KpiCard
          icon="📦" title="Aktif Modül"
          value={loading ? "—" : moduleUsage.length}
          sub="Kullanılan platform bileşeni"
          color="#f59e0b"
        />
        <KpiCard
          icon="🕐" title="Son Kullanım"
          value={loading ? "—" : lastUsed}
          sub="En son platform erişim zamanı"
          color="#64748b"
        />
      </section>

      <section className="two-column">
        {/* Modül kullanım grafiği */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Modül Kullanım Dağılımı</h2>
              <p className="panel-subtitle">Hangi analiz modüllerini en çok kullandığınız</p>
            </div>
            <span className="panel-header-badge blue">{moduleUsage.length} modül</span>
          </div>
          {loading ? (
            <div style={{ display: "grid", gap: 8 }}>
              {[1, 2, 3, 4].map(k => (
                <div key={k} className="skeleton" style={{ height: 32, borderRadius: 6 }} />
              ))}
            </div>
          ) : (
            <ModuleUsageChart data={moduleUsage} />
          )}
          {!loading && total > 0 && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8,
              background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)" }}>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                💡 Yüksek kullanılan modüller planınızda öncelikli kota ayırımı yapılacak anlamına gelir.
              </p>
            </div>
          )}
        </div>

        {/* Aktivite feed'i */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Son Aktiviteler</h2>
              <p className="panel-subtitle">Platform üzerindeki son işlemleriniz</p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {errorCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 12,
                  background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {errorCount} hata
                </span>
              )}
              <span className="panel-header-badge green">
                {usage?.recent?.length ?? 0} kayıt
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "grid", gap: 8 }}>
              {[1, 2, 3, 4, 5].map(k => (
                <div key={k} className="skeleton" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          ) : (
            <ActivityFeed items={usage?.recent ?? []} limit={8} />
          )}
        </div>
      </section>
    </div>
  );
}
