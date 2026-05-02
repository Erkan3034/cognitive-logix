import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBillingStatus, upgradePlan } from "../lib/api.js";

const PLANS = [
  {
    id: "free",
    name: "Baslangic",
    price: "0",
    desc: "Test ve kucuk olcekli veriler icin.",
    features: ["Aylik 100 API Istegi", "Sadece Lojistik Modeli", "Topluluk Destegi"],
    buttonText: "Mevcut Plan",
    disabled: true
  },
  {
    id: "pro",
    name: "Pro",
    price: "4900",
    desc: "Orta olcekli operasyonlar icin ideal.",
    features: ["Aylik 10.000 API Istegi", "Tum Modellere Erisim", "E-posta Destegi"],
    buttonText: "Pro'ya Yukselt",
    disabled: false
  },
  {
    id: "enterprise",
    name: "Kurumsal",
    price: "9999",
    desc: "Buyuk sirketler icin sinirsiz guc.",
    features: ["Sinirsiz API Istegi", "Ozel Model Egitimi", "7/24 Oncelikli Destek"],
    buttonText: "Kurumsal'a Yukselt",
    disabled: false
  }
];

export default function Billing() {
  const [searchParams] = useSearchParams();
  const quotaError = searchParams.get("error") === "quota_exceeded";

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);

  const fetchStatus = () => {
    getBillingStatus()
      .then((data) => setStatus(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleUpgrade = async (planId) => {
    if (planId === status?.plan) return;
    if (!window.confirm("Bu islem gercek bir odeme simule edecektir. Onayliyor musunuz?")) return;

    setUpgrading(planId);
    try {
      await upgradePlan({ plan: planId });
      alert("Odeme basarili! Planiniz guncellendi.");
      fetchStatus();
    } catch (err) {
      alert("Yukseltme sirasinda hata olustu.");
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return <div className="page-layout" style={{ color: "var(--text-secondary)" }}>Yukleniyor...</div>;
  }

  const percent = status ? Math.min(100, Math.round((status.used / status.limit) * 100)) : 0;
  const isNearLimit = percent >= 80;

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Faturalama</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Abonelik ve Kullanim</h1>
            <p className="page-subtitle">
              Mevcut planinizi goruntuleyin, kullanim limitlerinizi takip edin ve gerekirse planinizi yukseltin.
            </p>
          </div>
        </div>
      </header>

      {quotaError && (
        <section className="panel" style={{ borderColor: "var(--risk-high)", background: "rgba(239, 68, 68, 0.05)" }}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title" style={{ color: "var(--risk-high)" }}>Aylik Kotaniz Doldu</h2>
              <p className="panel-subtitle">API islemlerinize devam edebilmek icin asagidan planinizi yukseltmeniz gerekmektedir.</p>
            </div>
          </div>
        </section>
      )}

      {/* Kullanim Ozeti */}
      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Bu Ayki Kullaniminiz</h2>
            <p className="panel-subtitle">Planiniz: <strong style={{ color: "var(--text-primary)", textTransform: "capitalize" }}>{status?.plan}</strong></p>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
            <span style={{ color: "var(--text-secondary)" }}>Kullanilan: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{status?.used}</span></span>
            <span style={{ color: "var(--text-secondary)" }}>Limit: <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{status?.limit}</span></span>
          </div>
          <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${percent}%`,
                background: isNearLimit ? "var(--risk-high)" : "var(--brand-primary)",
                transition: "width 0.5s ease"
              }}
            />
          </div>
          {isNearLimit && status?.plan !== "enterprise" && (
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--risk-high)" }}>
              Kotanizin %{percent} kismini doldurdunuz. Kesinti yasamamak icin planinizi yukseltin.
            </p>
          )}
        </div>
      </section>

      {/* Planlar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginTop: 32 }}>
        {PLANS.map(plan => {
          const isCurrent = status?.plan === plan.id;

          return (
            <div key={plan.id} className="panel" style={{
              display: "flex", flexDirection: "column",
              borderColor: isCurrent ? "var(--brand-primary)" : "var(--border)",
              position: "relative"
            }}>
              {isCurrent && (
                <div style={{ position: "absolute", top: -12, right: 24, background: "var(--brand-primary)", color: "#fff", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  Mevcut Plan
                </div>
              )}

              <h3 style={{ fontSize: 20, color: "var(--text-primary)", marginBottom: 8 }}>{plan.name}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, minHeight: 40 }}>{plan.desc}</p>

              <div style={{ margin: "24px 0", borderBottom: "1px solid var(--border)", paddingBottom: 24 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: "var(--text-primary)" }}>${plan.price}</span>
                <span style={{ color: "var(--text-secondary)", fontSize: 14 }}> / ay</span>
              </div>

              <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1 }}>
                {plan.features.map((feat, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 14, color: "var(--text-secondary)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                className={`btn-action ${isCurrent ? "" : "blue"}`}
                style={{ marginTop: 24, width: "100%", justifyContent: "center", padding: "12px 0", opacity: isCurrent ? 0.5 : 1 }}
                disabled={isCurrent || upgrading}
                onClick={() => handleUpgrade(plan.id)}
              >
                {upgrading === plan.id ? "Yukseltiliyor..." : isCurrent ? "Mevcut Plan" : plan.buttonText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
