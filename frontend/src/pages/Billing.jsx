import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getBillingStatus, upgradePlan } from "../lib/api.js";

const PLANS = [
  {
    id: "free", name: "Başlangıç", price: "0", unit: "/ay",
    badge: null,
    desc: "Platformu keşfetmek için ideal. Temel lojistik analizi ücretsiz.",
    features: ["Aylık 100 analiz hakkı", "Teslimat Risk Modülü", "Topluluk desteği"],
  },
  {
    id: "pro", name: "Pro", price: "4.900", unit: "₺/ay",
    badge: "En Popüler",
    desc: "Orta ölçekli operasyonlar için tüm modüllere tam erişim.",
    features: ["Aylık 10.000 analiz hakkı", "Tüm Modüller (Lojistik, Talep, Güvenlik)", "E-posta desteği"],
  },
  {
    id: "enterprise", name: "Kurumsal", price: "9.999", unit: "₺/ay",
    badge: "Tam Güç",
    desc: "Büyük operasyonlar için sınırsız analiz ve öncelikli destek.",
    features: ["Sınırsız analiz hakkı", "Özel model eğitimi", "7/24 Öncelikli destek & SLA"],
  },
];

export default function Billing() {
  const [searchParams] = useSearchParams();
  const quotaError = searchParams.get("error") === "quota_exceeded";
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);

  const fetchStatus = () => {
    getBillingStatus().then(d => setStatus(d)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchStatus(); }, []);

  const handleUpgrade = async (planId) => {
    if (planId === status?.plan) return;
    if (!window.confirm("Plan yükseltme işlemi başlatılacak. Onaylıyor musunuz?")) return;
    setUpgrading(planId);
    try { await upgradePlan({ plan: planId }); fetchStatus(); }
    catch { alert("Yükseltme sırasında bir sorun oluştu. Lütfen tekrar deneyin."); }
    finally { setUpgrading(null); }
  };

  const used = status?.used ?? 0;
  const limit = status?.limit ?? 1;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const isNear = pct >= 80;
  const planName = PLANS.find(p => p.id === status?.plan)?.name ?? status?.plan;

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Abonelik</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Abonelik ve Kullanım Hakkı</h1>
            <p className="page-subtitle">
              Mevcut planınızı ve bu aylık analiz kullanımınızı izleyin. Kotanız dolmadan önce planınızı yükseltin.
            </p>
          </div>
        </div>
      </header>

      {quotaError && (
        <div style={{ padding: "16px 20px", borderRadius: 12, marginBottom: 16,
          background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 22 }}>🚫</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>Aylık Kullanım Hakkınız Doldu</div>
              <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>
                Analiz yapmaya devam edebilmek için aşağıdan planınızı yükseltin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Kullanım özeti */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Bu Ayki Kullanımınız</h2>
            <p className="panel-subtitle">
              Mevcut Plan: <strong style={{ color: "var(--accent)" }}>{loading ? "—" : planName}</strong>
            </p>
          </div>
          <span className={`panel-header-badge ${isNear ? "red" : "green"}`}>
            {loading ? "—" : `%${pct} kullanıldı`}
          </span>
        </div>

        <div style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              Kullanılan: <strong style={{ color: "#e2e8f0" }}>{used.toLocaleString("tr-TR")}</strong> analiz
            </span>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>
              Toplam Hak: <strong style={{ color: "#e2e8f0" }}>{limit.toLocaleString("tr-TR")}</strong> analiz
            </span>
          </div>
          <div style={{ width: "100%", height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 5, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 5,
              background: isNear ? "#ef4444" : "#6366f1", transition: "width .5s" }} />
          </div>
          {isNear && status?.plan !== "enterprise" && (
            <p style={{ marginTop: 10, fontSize: 12, color: "#ef4444" }}>
              ⚠️ Kotanızın %{pct}'ini kullandınız. Kesinti yaşamamak için planınızı yükseltin.
            </p>
          )}
        </div>
      </section>

      {/* Plan kartları */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
        {PLANS.map(plan => {
          const isCurrent = status?.plan === plan.id;
          const color = plan.id === "enterprise" ? "#f59e0b" : plan.id === "pro" ? "#6366f1" : "#64748b";
          return (
            <div key={plan.id} style={{
              background: "var(--bg-surface-1)", border: `1px solid ${isCurrent ? color : "var(--border)"}`,
              borderRadius: 16, padding: "22px 22px", display: "flex", flexDirection: "column",
              position: "relative", borderTop: `3px solid ${color}`,
            }}>
              {isCurrent && (
                <div style={{ position: "absolute", top: -12, right: 18, background: "#6366f1", color: "#fff",
                  padding: "3px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>Mevcut Plan</div>
              )}
              {plan.badge && !isCurrent && (
                <div style={{ position: "absolute", top: -12, right: 18, background: color, color: "#fff",
                  padding: "3px 12px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{plan.badge}</div>
              )}
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>{plan.name}</h3>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16, minHeight: 36 }}>{plan.desc}</p>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color }}>{plan.price === "0" ? "Ücretsiz" : plan.price}</span>
                {plan.price !== "0" && <span style={{ fontSize: 13, color: "#64748b" }}> {plan.unit}</span>}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10,
                    fontSize: 13, color: "#94a3b8" }}>
                    <span style={{ color, fontSize: 16 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || !!upgrading}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  cursor: isCurrent ? "default" : "pointer", border: "none",
                  background: isCurrent ? "rgba(148,163,184,0.08)" : color,
                  color: isCurrent ? "#64748b" : "#fff",
                  opacity: upgrading && upgrading !== plan.id ? 0.5 : 1,
                }}>
                {upgrading === plan.id ? "⟳ Yükseltiliyor..." : isCurrent ? "Mevcut Planınız" : `${plan.name}'a Geç`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
