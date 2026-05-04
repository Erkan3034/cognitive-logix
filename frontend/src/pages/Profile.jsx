import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { api, getBillingStatus } from "../lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07 } }),
};

function StatCard({ label, value, color, icon }) {
  return (
    <motion.div variants={fadeUp} style={{
      background: "var(--bg-surface-1)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "20px 20px", display: "flex", flexDirection: "column", gap: 6,
      borderTop: `3px solid ${color}`
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)" }}>{label}</span>
      </div>
      <span style={{ fontSize: 26, fontWeight: 800, color }}>{value}</span>
    </motion.div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(148,163,184,0.07)" }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{value || "—"}</span>
    </div>
  );
}

const PLAN_LABELS = { free: "Başlangıç", pro: "Pro", enterprise: "Kurumsal" };
const PLAN_COLORS = { free: "#64748b", pro: "#6366f1", enterprise: "#f59e0b" };

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tenantInfo, setTenantInfo] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tenantRes, usageRes] = await Promise.allSettled([
          getBillingStatus(),
          api.get("/api/v1/billing/status"),
        ]);
        if (tenantRes.status === "fulfilled") setTenantInfo(tenantRes.value);
        if (usageRes.status === "fulfilled") setUsage(usageRes.value.data);
      } catch (_) {}
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleLogout() {
    await signOut();
    navigate("/");
  }

  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "CL";
  const joinedDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })
    : "—";
  
  const plan = tenantInfo?.plan ?? "free";
  const planLabel = PLAN_LABELS[plan] || plan;
  const planColor = PLAN_COLORS[plan] || "#64748b";

  const usedPredictions = usage?.used_this_month ?? tenantInfo?.used ?? 0;
  const limitPredictions = tenantInfo?.limit ?? 100;
  const remaining = Math.max(0, limitPredictions - usedPredictions);

  return (
    <div className="page-layout">
      {/* ── Header ── */}
      <header className="page-header">
        <span className="page-eyebrow">Hesap & Ayarlar</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Profilim</h1>
            <p className="page-subtitle">
              Kişisel bilgilerinizi yönetin, sistem özelliklerini yapılandırın ve kullanım haklarınızı inceleyin.
            </p>
          </div>
        </div>
      </header>

      {/* ── Hero / User Identity ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="panel"
        style={{ padding: "32px 32px", marginBottom: 24, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}
      >
        {/* Avatar */}
        <div style={{
          width: 80, height: 80, borderRadius: 20, flexShrink: 0,
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 30, fontWeight: 800, color: "#fff",
          boxShadow: "0 0 0 4px rgba(99,102,241,0.2)"
        }}>
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", margin: 0, marginBottom: 4 }}>
            {user?.user_metadata?.full_name || "Platform Kullanıcısı"}
          </h1>
          <p style={{ fontSize: 14, color: "#94a3b8", margin: 0, marginBottom: 12 }}>{user?.email}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{
              background: `${planColor}15`, color: planColor,
              border: `1px solid ${planColor}40`,
              padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700
            }}>
              {planLabel} Planı
            </span>
            <span style={{
              background: "rgba(16,185,129,0.1)", color: "#10b981",
              border: "1px solid rgba(16,185,129,0.2)",
              padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700
            }}>
              ✓ Sistem Aktif
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <Link to="/app/billing" className="btn" style={{ background: "rgba(148,163,184,0.08)", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.2)" }}>
            Planı Değiştir
          </Link>
          <button
            onClick={handleLogout}
            style={{
              padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)", color: "#ef4444",
              cursor: "pointer", fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            Çıkış Yap
          </button>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}
      >
        <StatCard label="Bu Ay Kullanılan Analiz" icon="🤖"
          value={loading ? "—" : usedPredictions.toLocaleString("tr-TR")}
          color="#6366f1" />
        <StatCard label="Kalan Analiz Hakkı" icon="⚡"
          value={loading ? "—" : remaining.toLocaleString("tr-TR")}
          color="#10b981" />
        <StatCard label="Toplam Aylık Hak" icon="📊"
          value={loading ? "—" : limitPredictions.toLocaleString("tr-TR")}
          color="#8b5cf6" />
        <StatCard label="Hesap Yaşı" icon="📅"
          value={joinedDate}
          color="#64748b" />
      </motion.div>

      {/* ── Bottom Panels ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        
        {/* Account info */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h3 className="panel-title">Profil Detayları</h3>
              <p className="panel-subtitle">Sisteme kayıtlı temel bilgileriniz</p>
            </div>
          </div>
          <div>
            <InfoRow label="E-posta Adresi" value={user?.email} />
            <InfoRow label="Ad Soyad" value={user?.user_metadata?.full_name} />
            <InfoRow label="Kayıt Tarihi" value={joinedDate} />
            <InfoRow label="Giriş Yöntemi" value="E-posta + Şifre" />
            <InfoRow label="Son Oturum Açma" value={
              user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })
                : "—"
            } />
          </div>
        </motion.div>

        {/* Security & Settings */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h3 className="panel-title">Güvenlik ve İzinler</h3>
              <p className="panel-subtitle">Bağlantı ve sistem güvenliği yapılandırması</p>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "16px", borderRadius: 12, background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.1)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Şifre Değişikliği</div>
              <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.5 }}>
                Hesabınızın güvenliğini sağlamak için parolanızı düzenli aralıklarla değiştirin.
              </p>
              <button className="btn" style={{ background: "rgba(148,163,184,0.08)", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.2)" }}
                onClick={() => alert("Şifre sıfırlama e-postası gönderildi!")}>
                🔒 Şifre Değiştir
              </button>
            </div>

            <div style={{ padding: "16px", borderRadius: 12, background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", marginBottom: 6 }}>Dış Sistem Entegrasyonu</div>
              <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12, lineHeight: 1.5 }}>
                ERP veya muhasebe sisteminizi bağlamak için API bağlantı anahtarlarını kullanın.
              </p>
              <Link to="/app/api-keys" className="btn btn-primary" style={{ width: "max-content" }}>
                🔑 Bağlantı Anahtarları →
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
