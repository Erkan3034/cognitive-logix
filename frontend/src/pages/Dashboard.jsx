import { useEffect, useState } from "react";
import { getOverviewMetrics } from "../lib/api.js";

function formatPct(value) {
  if (value == null) return "--";
  return `${(value * 100).toFixed(1)}%`;
}

function formatMoney(value) {
  if (value == null) return "--";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getOverviewMetrics()
      .then((data) => {
        if (mounted) setMetrics(data);
      })
      .catch(() => {
        if (mounted) setMetrics(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const onTime = formatPct(metrics?.on_time_delivery_pct);
  const lateRisk = formatPct(metrics?.late_delivery_risk_pct);
  const demandRisk = formatPct(metrics?.demand_risk_pct);
  const financialExposure = formatMoney(metrics?.financial_exposure_usd);
  const lossOrders = metrics?.loss_making_orders?.toLocaleString() ?? "--";
  const demandRiskCats = metrics?.demand_risk_categories ?? "--";

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Yönetici kokpiti</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Kontrol Kulesi Genel Görünüm</h1>
            <p className="page-subtitle">
              Küresel tedarik zinciriniz genelinde zamanında teslimat, talep riski ve finansal
              risk maruziyetinin birleşik görünümü.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Veriler senkronize ediliyor…" : "Canlı veri"}
          </div>
        </div>
      </header>

      <section className="kpi-grid">
        <article className="card">
          <div className="card-header">
            <span className="card-title">Zamanında teslimat</span>
            <span className="card-trend badge-positive">Model tabanlı, son 7 gün</span>
          </div>
          <div className="card-value">{onTime}</div>
          <p className="card-caption">
            Aktif ağ genelinde zamanında ulaşması öngörülen siparişlerin oranı.
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Gecikme riski</span>
            <span className="card-trend badge-negative">
              {lateRisk !== "--" ? `${lateRisk} mevcut gecikme riski` : "Yükleniyor…"}
            </span>
          </div>
          <div className="card-value">{lateRisk}</div>
          <p className="card-caption">
            `Late_delivery_risk` sinyallerine dayalı yüksek gecikme olasılığına sahip siparişler.
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Talep riski</span>
            <span className="card-trend badge-neutral">
              {demandRiskCats} volatil kategori
            </span>
          </div>
          <div className="card-value">{demandRisk}</div>
          <p className="card-caption">
            Günlük volatilitesi yüksek kategorilerdeki hacim payı (CV &gt; 0.8).
          </p>
        </article>

        <article className="card">
          <div className="card-header">
            <span className="card-title">Finansal maruziyet</span>
            <span className="card-trend badge-negative">
              {lossOrders} zarar eden sipariş
            </span>
          </div>
          <div className="card-value">{financialExposure}</div>
          <p className="card-caption">
            `negative_profit_flag = 1` olarak işaretlenen siparişlerden kaynaklanan potansiyel negatif kâr.
          </p>
        </article>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Ağ risk ısı haritası</h2>
              <p className="panel-subtitle">
                Tahmini gecikme olasılığına göre bölge ve sevkiyat modu dağılımı.
              </p>
            </div>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            <div className="chip-row">
              <span className="chip">Batı Avrupa · Standart Sınıf · Yüksek risk</span>
              <span className="chip">ABD & Porto Riko · Aynı Gün · Orta risk</span>
              <span className="chip">LATAM · İkinci Sınıf · Düşük risk</span>
            </div>
            <p className="card-caption" style={{ marginTop: "0.7rem" }}>
              Görsel gecikme ısı haritası ve SHAP tabanlı etken analizi burada gösterilecektir
              (Recharts + SHAP grafikleri).
            </p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Bugünün izleme listesi</h2>
              <p className="panel-subtitle">
                Gecikmeli, yüksek riskli talep ve şüpheli dolandırıcılık siparişlerinin birleşik görünümü.
              </p>
            </div>
          </div>
          <ul style={{ listStyle: "none", paddingLeft: 0, margin: 0, fontSize: "0.8rem" }}>
            <li style={{ marginBottom: "0.45rem" }}>
              <span className="badge-negative">Yüksek gecikme · Yüksek marj</span> — Batı Avrupa
              spor malzemeleri için alternatif taşıyıcıyı önceliklendirin.
            </li>
            <li style={{ marginBottom: "0.45rem" }}>
              <span className="badge-positive">Yüksek talep · Sağlıklı marj</span> — ABD fan
              mağazası kategorisi için envanter çekmeyi değerlendirin.
            </li>
            <li>
              <span className="badge-negative">Şüpheli dolandırıcılık</span> — Yerine getirmeden
              önce anormal ödeme desenleri olan 4.062 siparişi izole edin.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
