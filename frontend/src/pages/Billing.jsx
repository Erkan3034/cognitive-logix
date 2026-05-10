import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBillingStatus, upgradePlan } from "../lib/api.js";
import { InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

const PLANS = [
  {
    id: "free",
    name: "Başlangıç",
    price: "0",
    unit: "ay",
    desc: "İlk canlı akışları doğrulamak ve temel analizleri denemek için.",
    features: ["Aylık 100 analiz", "Lojistik risk analizi", "CSV içe aktarma", "Standart kullanım kayıtları"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "4.900",
    unit: "TL / ay",
    badge: "Önerilen",
    desc: "Düzenli operasyon ekipleri için tüm karar motorlarına erişim.",
    features: ["Aylık 10.000 analiz", "Talep tahmini", "Finansal risk analizi", "Model sağlığı ve drift takibi"],
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    price: "9.999",
    unit: "TL / ay",
    badge: "Yüksek hacim",
    desc: "Çoklu entegrasyon, yüksek hacim ve öncelikli operasyon ihtiyaçları için.",
    features: ["Pratik sınırsız analiz", "Genişletilmiş API kullanımı", "Öncelikli destek", "Kurumsal karar kayıtları"],
  },
];

const PLAN_ORDER = ["free", "pro", "enterprise"];

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR");
}

export default function Billing() {
  const [searchParams] = useSearchParams();
  const quotaError = searchParams.get("error") === "quota_exceeded";
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [upgrading, setUpgrading] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBillingStatus();
      setStatus(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Abonelik durumu yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const currentPlan = status?.plan ?? "free";
  const currentPlanInfo = useMemo(
    () => PLANS.find((plan) => plan.id === currentPlan) ?? PLANS[0],
    [currentPlan]
  );

  const used = status?.used ?? 0;
  const limit = status?.limit ?? 1;
  const remaining = status?.remaining ?? Math.max(0, limit - used);
  const pct = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const isNear = pct >= 80 && currentPlan !== "enterprise";

  const handleUpgrade = async () => {
    if (!pendingPlan || pendingPlan.id === currentPlan) return;
    setUpgrading(pendingPlan.id);
    setError(null);
    try {
      await upgradePlan({ plan: pendingPlan.id });
      setPendingPlan(null);
      await fetchStatus();
    } catch (err) {
      setError(err?.response?.data?.detail || "Plan değişikliği tamamlanamadı.");
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Abonelik"
        title="Plan ve Kullanım"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loading ? <InlineSpinner label="Yükleniyor" /> : currentPlanInfo.name}
          </div>
        }
      >
        Analiz kotanızı, mevcut planınızı ve plan değişikliklerini tek yerden yönetin.
        Kota yalnızca gerçek analiz ve veri işleme uçları için sayılır.
      </PageIntro>

      <StatusBanner type="info" title="Ödeme simülasyonu aktif">
        Plan değişiklikleri Supabase tenant kaydına yazılır. Gerçek ödeme tahsilatı bu aşamada yapılmaz.
      </StatusBanner>

      {quotaError && (
        <StatusBanner type="warning" title="Aylık analiz kotası doldu">
          Yeni analiz çalıştırmadan önce planınızı yükseltin veya bir sonraki dönem yenilemesini bekleyin.
        </StatusBanner>
      )}

      {error && (
        <StatusBanner type="error" title="Abonelik işlemi tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Bu ayki kullanım</h2>
            <p className="panel-subtitle">
              Mevcut plan: <strong>{loading ? "Yükleniyor" : currentPlanInfo.name}</strong>
            </p>
          </div>
          <span className={`panel-header-badge ${isNear ? "red" : "green"}`}>
            {loading ? "Yükleniyor" : `%${pct} kullanıldı`}
          </span>
        </div>

        <div className="billing-usage-grid">
          <div className="billing-usage-stat">
            <span>Kullanılan</span>
            <strong>{loading ? "..." : formatNumber(used)}</strong>
          </div>
          <div className="billing-usage-stat">
            <span>Kalan</span>
            <strong>{loading ? "..." : currentPlan === "enterprise" ? "Sınırsız" : formatNumber(remaining)}</strong>
          </div>
          <div className="billing-usage-stat">
            <span>Plan limiti</span>
            <strong>{loading ? "..." : currentPlan === "enterprise" ? "Sınırsız" : formatNumber(limit)}</strong>
          </div>
        </div>

        <div className="billing-progress-track" aria-label="Kullanım oranı">
          <span className={isNear ? "risk" : ""} style={{ width: `${pct}%` }} />
        </div>

        {isNear && (
          <p className="billing-warning">
            Kullanım oranı yüksek. Kesinti yaşamamak için Pro veya Kurumsal plana geçin.
          </p>
        )}
      </section>

      {pendingPlan && (
        <StatusBanner
          type="warning"
          title={`${pendingPlan.name} planına geçiş onayı`}
          action={
            <div className="billing-confirm-actions">
              <button type="button" className="pro-btn-ghost" onClick={() => setPendingPlan(null)}>
                Vazgeç
              </button>
              <button type="button" className="btn" disabled={!!upgrading} onClick={handleUpgrade}>
                {upgrading ? <InlineSpinner label="Uygulanıyor" /> : "Planı uygula"}
              </button>
            </div>
          }
        >
          Bu işlem ödeme simülasyonu üzerinden planınızı hemen günceller.
        </StatusBanner>
      )}

      <div className="billing-plan-grid">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isLower = PLAN_ORDER.indexOf(plan.id) < PLAN_ORDER.indexOf(currentPlan);
          return (
            <article key={plan.id} className={`billing-plan-card ${isCurrent ? "current" : ""}`}>
              <div className="billing-plan-top">
                <div>
                  <h2>{plan.name}</h2>
                  <p>{plan.desc}</p>
                </div>
                {plan.badge && <span className="panel-header-badge blue">{plan.badge}</span>}
              </div>

              <div className="billing-plan-price">
                {plan.price === "0" ? "Ücretsiz" : plan.price}
                {plan.price !== "0" && <span>{plan.unit}</span>}
              </div>

              <ul className="billing-feature-list">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span aria-hidden="true">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={isCurrent ? "pro-btn-ghost" : "btn"}
                disabled={loading || isCurrent || !!upgrading}
                onClick={() => setPendingPlan(plan)}
              >
                {isCurrent ? "Mevcut plan" : isLower ? "Bu plana geç" : `${plan.name} planına geç`}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
