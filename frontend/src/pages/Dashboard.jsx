import { useEffect, useState } from "react";
import { getOverviewMetrics } from "../lib/api.js";

function formatPct(value) {
  if (value == null) return null;
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(value) {
  if (value == null) return null;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

/* ── Icons ───────────────────────────────────── */
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconBarChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconDollarSign = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

/* ── Skeleton KPI Card ───────────────────────── */
function SkeletonCard() {
  return (
    <article className="card">
      <div className="card-header" style={{ marginBottom: 14 }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: "60%" }} />
        </div>
      </div>
      <div className="skeleton skeleton-value" style={{ width: "55%" }} />
      <div className="skeleton skeleton-text" style={{ width: "80%", marginTop: 10 }} />
    </article>
  );
}

/* ── KPI Card ────────────────────────────────── */
function KpiCard({ title, value, caption, trend, iconColor, stripeColor, Icon }) {
  return (
    <article className="card">
      <div className={`card-accent-stripe ${stripeColor}`} />
      <div className="card-header">
        <div className={`card-icon ${iconColor}`}>
          <Icon />
        </div>
        <div style={{ flex: 1 }}>
          <div className="card-title">{title}</div>
          {trend && <div className={`card-trend ${trend.cls}`}>{trend.text}</div>}
        </div>
      </div>
      <div className="card-value">{value ?? "--"}</div>
      <p className="card-caption">{caption}</p>
    </article>
  );
}

const WATCHLIST = [
  {
    color: "red",
    title: "Yüksek gecikme riski · Yüksek marj",
    desc: "Batı Avrupa'ya gönderilen spor malzemeleri için alternatif taşıyıcıyı önceliklendirin.",
  },
  {
    color: "green",
    title: "Güçlü talep · Sağlıklı marj",
    desc: "ABD fan mağazası kategorisi için envanter çekmeyi değerlendirin.",
  },
  {
    color: "red",
    title: "Şüpheli dolandırıcılık tespiti",
    desc: "Yerine getirmeden önce anormal ödeme desenleri olan 4.062 siparişi izole edin.",
  },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getOverviewMetrics()
      .then((data) => { if (mounted) setMetrics(data); })
      .catch(() => { if (mounted) setMetrics(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const onTime             = formatPct(metrics?.on_time_delivery_pct);
  const lateRisk           = formatPct(metrics?.late_delivery_risk_pct);
  const demandRisk         = formatPct(metrics?.demand_risk_pct);
  const financialExposure  = formatMoney(metrics?.financial_exposure_usd);
  const lossOrders         = metrics?.loss_making_orders?.toLocaleString() ?? "--";
  const demandRiskCats     = metrics?.demand_risk_categories ?? "--";

  return (
    <div className="page-layout">
      {/* Header */}
      <header className="page-header">
        <span className="page-eyebrow">Yönetici Kokpiti</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Kontrol Kulesi — Genel Görünüm</h1>
            <p className="page-subtitle">
              Küresel tedarik zinciriniz genelinde zamanında teslimat, talep riski ve finansal risk maruziyetinin birleşik görünümü.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Senkronize ediliyor…" : "Canlı veri"}
          </div>
        </div>
      </header>

      {/* KPI Grid */}
      <section className="kpi-grid">
        {loading ? (
          [1,2,3,4].map((k) => <SkeletonCard key={k} />)
        ) : (
          <>
            <KpiCard
              title="Zamanında Teslimat"
              value={onTime}
              caption="Aktif ağ genelinde zamanında ulaşması öngörülen siparişlerin oranı."
              trend={{ text: "Model tabanlı · Son 7 gün", cls: "badge-positive" }}
              iconColor="green" stripeColor="green" Icon={IconCheck}
            />
            <KpiCard
              title="Gecikme Riski"
              value={lateRisk}
              caption="Yüksek gecikme olasılığına sahip siparişler (late_delivery_risk sinyali)."
              trend={{ text: lateRisk ? `${lateRisk} mevcut risk` : "Hesaplanıyor…", cls: "badge-negative" }}
              iconColor="red" stripeColor="red" Icon={IconAlert}
            />
            <KpiCard
              title="Talep Riski"
              value={demandRisk}
              caption="Günlük volatilitesi yüksek kategorilerdeki hacim payı (CV > 0.8)."
              trend={{ text: `${demandRiskCats} volatil kategori`, cls: "badge-neutral" }}
              iconColor="amber" stripeColor="amber" Icon={IconBarChart}
            />
            <KpiCard
              title="Finansal Maruziyet"
              value={financialExposure}
              caption="Negatif kâr bayraklı siparişlerden kaynaklanan potansiyel kayıp."
              trend={{ text: `${lossOrders} zarar eden sipariş`, cls: "badge-negative" }}
              iconColor="red" stripeColor="red" Icon={IconDollarSign}
            />
          </>
        )}
      </section>

      {/* Bottom panels */}
      <section className="two-column">
        {/* Risk Heat Map */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Ağ Risk Dağılımı</h2>
              <p className="panel-subtitle">
                Tahmini gecikme olasılığına göre bölge ve sevkiyat modu dağılımı.
              </p>
            </div>
            <span className="panel-header-badge red">Uyarı</span>
          </div>
          <div className="chip-row">
            <span className="chip risk-high">🔴 Batı Avrupa · Standart · Yüksek risk</span>
            <span className="chip risk-med">🟡 ABD &amp; Porto Riko · Aynı Gün · Orta risk</span>
            <span className="chip risk-low">🟢 LATAM · İkinci Sınıf · Düşük risk</span>
            <span className="chip risk-low">🟢 Asya-Pasifik · Ekspres · Düşük risk</span>
          </div>
          <p className="card-caption" style={{ marginTop: 14, lineHeight: 1.6 }}>
            Görsel gecikme ısı haritası ve SHAP tabanlı etken analizi bir sonraki geliştirme aşamasında burada gösterilecektir.
          </p>
        </div>

        {/* Today's Watchlist */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Bugünün İzleme Listesi</h2>
              <p className="panel-subtitle">
                Gecikmeli, yüksek riskli talep ve şüpheli dolandırıcılık siparişleri.
              </p>
            </div>
            <span className="panel-header-badge amber">{WATCHLIST.length} öğe</span>
          </div>
          <div className="alert-feed">
            {WATCHLIST.map((item, i) => (
              <div className="alert-item" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
                <span className={`alert-indicator ${item.color}`} />
                <div className="alert-body">
                  <div className="alert-title">{item.title}</div>
                  <div className="alert-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
