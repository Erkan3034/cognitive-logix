import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getUsage } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

const MODULE_MAP = [
  { match: /\/predict/i, label: "Lojistik", group: "Analiz" },
  { match: /\/fraud/i, label: "Finansal Risk", group: "Analiz" },
  { match: /\/forecast/i, label: "Talep Tahmini", group: "Analiz" },
  { match: /\/api\/v1\/ingest|\/ingest/i, label: "Veri İçe Aktarma", group: "Veri" },
  { match: /\/metrics\/simulate/i, label: "Senaryo Simülasyonu", group: "Analiz" },
  { match: /\/metrics/i, label: "İçgörü Metrikleri", group: "Sistem" },
  { match: /\/ops\/usage/i, label: "Kullanım Raporu", group: "Sistem" },
  { match: /\/ops\/audit/i, label: "Denetim Kaydı", group: "Sistem" },
  { match: /\/ops\/incident/i, label: "Karar Kayıtları", group: "Sistem" },
  { match: /\/ops\/live-connections/i, label: "Canlı Bağlantılar", group: "Operasyon" },
  { match: /\/ops\/decision-impact/i, label: "Karar Etkisi", group: "Operasyon" },
  { match: /\/ops\/route-intelligence/i, label: "Rota Zekası", group: "Operasyon" },
  { match: /\/api\/v1\/keys/i, label: "Bağlantı Anahtarları", group: "Sistem" },
  { match: /\/api\/v1\/billing/i, label: "Abonelik", group: "Sistem" },
];

const BAR_COLORS = ["#ffffff", "#10b981", "#f59e0b", "#60a5fa", "#a78bfa"];

function toModule(endpoint = "") {
  return MODULE_MAP.find((item) => item.match.test(endpoint)) ?? {
    label: endpoint || "Bilinmeyen uç",
    group: "Diğer",
  };
}

function isSuccess(status) {
  return !status || (status >= 200 && status < 400);
}

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

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function KpiCard({ title, value, sub, tone = "neutral" }) {
  return (
    <article className={`usage-kpi usage-kpi-${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <p>{sub}</p>
    </article>
  );
}

function ModuleUsageChart({ data }) {
  if (!data.length) {
    return (
      <EmptyState title="Henüz kullanım verisi yok">
        Modüller çalıştıkça burada gerçek uç kullanım dağılımı oluşacak.
      </EmptyState>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 46, 160)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, left: 12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fontSize: 11, fill: "#a1a1aa" }}
          tickLine={false}
          axisLine={false}
          width={150}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ payload }) => {
            const item = payload?.[0]?.payload;
            if (!item) return null;
            return (
              <div className="usage-tooltip">
                <strong>{item.label}</strong>
                <span>{item.count} istek</span>
                <small>{item.group}</small>
              </div>
            );
          }}
        />
        <Bar dataKey="count" radius={[0, 5, 5, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} fillOpacity={0.82} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActivityFeed({ items }) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 8);

  if (!items.length) {
    return (
      <EmptyState title="Henüz aktivite yok">
        Bağlantı veya uygulama modülleri kullanıldığında son işlemler burada listelenecek.
      </EmptyState>
    );
  }

  return (
    <div className="usage-activity-list">
      {visibleItems.map((item, index) => {
        const mod = toModule(item.endpoint);
        const ok = isSuccess(item.status_code);
        return (
          <article key={item.id ?? index} className="usage-activity-row">
            <div className="usage-activity-main">
              <span className={`usage-status-dot ${ok ? "success" : "error"}`} />
              <div>
                <strong>{mod.label}</strong>
                <span>Bağlantı adresi: {item.endpoint || "Bilinmeyen uç"}</span>
              </div>
            </div>
            <div className="usage-activity-meta">
              <span>{formatDate(item.created_at)}</span>
              <strong className={ok ? "success" : "error"}>
                {ok ? "Başarılı" : `Hata ${item.status_code || ""}`}
              </strong>
            </div>
          </article>
        );
      })}

      {items.length > 8 && (
        <button type="button" className="pro-btn-outline usage-show-more" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Daha az göster" : `${items.length - 8} aktivite daha göster`}
        </button>
      )}
    </div>
  );
}

export default function Usage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getUsage()
      .then((data) => {
        if (mounted) setUsage(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.detail || "Kullanım verisi yüklenemedi.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const moduleUsage = useMemo(() => {
    const grouped = {};
    Object.entries(usage?.by_endpoint ?? {}).forEach(([endpoint, count]) => {
      const mod = toModule(endpoint);
      const key = `${mod.group}:${mod.label}`;
      grouped[key] = grouped[key] ?? { label: mod.label, group: mod.group, count: 0 };
      grouped[key].count += count;
    });
    return Object.values(grouped).sort((a, b) => b.count - a.count);
  }, [usage]);

  const activityStats = useMemo(() => {
    const recent = usage?.recent ?? [];
    return {
      successCount: recent.filter((item) => isSuccess(item.status_code)).length,
      errorCount: recent.filter((item) => !isSuccess(item.status_code)).length,
      writeCount: recent.filter((item) => ["POST", "PUT", "PATCH", "DELETE"].includes(String(item.method || "").toUpperCase())).length,
    };
  }, [usage]);

  const total = usage?.total_calls ?? 0;
  const totalUnits = usage?.total_units ?? 0;
  const lastUsed = formatDate(usage?.recent?.[0]?.created_at);

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Operasyon izleme"
        title="Kullanım ve Kota"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loading ? <InlineSpinner label="Yükleniyor" /> : `${formatNumber(total)} istek`}
          </div>
        }
      >
        Müşteri alanı bazlı bağlantı trafiğini, modül dağılımını ve son işlemleri izleyin.
        Bu ekran ürünün gerçekten nasıl kullanıldığını gösterir.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Kullanım verisi alınamadı">
          {error}
        </StatusBanner>
      )}

      <section className="usage-kpi-grid">
        <KpiCard
          tone="neutral"
          title="Toplam istek"
          value={loading ? "..." : formatNumber(total)}
          sub="Son 1.000 kullanım kaydına göre"
        />
        <KpiCard
          tone="success"
          title="Başarılı işlem"
          value={loading ? "..." : formatNumber(activityStats.successCount)}
          sub="Son aktivite penceresinde"
        />
        <KpiCard
          tone="warning"
          title="Yazma işlemi"
          value={loading ? "..." : formatNumber(activityStats.writeCount)}
          sub="Kayıt oluşturan veya değiştiren işlemler"
        />
        <KpiCard
          tone="muted"
          title="Son kullanım"
          value={loading ? "..." : lastUsed}
          sub={`${formatNumber(totalUnits)} toplam birim`}
        />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Modül kullanım dağılımı</h2>
              <p className="panel-subtitle">Hangi ürün modüllerinin ne kadar kullanıldığını gösterir.</p>
            </div>
            <span className="panel-header-badge blue">{moduleUsage.length} modül</span>
          </div>

          {loading ? (
            <div className="usage-skeleton-list">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="skeleton" />
              ))}
            </div>
          ) : (
            <ModuleUsageChart data={moduleUsage} />
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Son aktiviteler</h2>
              <p className="panel-subtitle">İstek, durum ve zaman çizelgesi.</p>
            </div>
            {activityStats.errorCount > 0 ? (
              <span className="panel-header-badge red">{activityStats.errorCount} hata</span>
            ) : (
              <span className="panel-header-badge green">Sağlıklı</span>
            )}
          </div>

          {loading ? (
            <div className="usage-skeleton-list">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="skeleton" />
              ))}
            </div>
          ) : (
            <ActivityFeed items={usage?.recent ?? []} />
          )}
        </div>
      </section>
    </div>
  );
}
