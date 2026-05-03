import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { api, getBillingStatus } from "../lib/api";

/* ── Icons ──────────────────────────────── */
const Icon = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
    strokeLinecap="round" strokeLinejoin="round" style={{ width: size, height: size }}>
    <path d={d} />
  </svg>
);

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.07 } }),
};

function StatCard({ label, value, color, icon }) {
  return (
    <motion.div variants={fadeUp} className="panel" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ color: color || "#818cf8", fontSize: 20 }}>{icon}</span>
        <span className="panel-subtitle">{label}</span>
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, color: color || "#f1f5f9" }}>{value}</span>
    </motion.div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid rgba(148,163,184,0.07)" }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{value || "—"}</span>
    </div>
  );
}

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
  const planLabel = { free: "Ücretsiz", starter: "Starter", pro: "Pro" }[plan] || plan;
  const planColor = { free: "#64748b", starter: "#6366f1", pro: "#10b981" }[plan] || "#64748b";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="panel"
        style={{ padding: "32px 32px 28px", marginBottom: 24, display: "flex", gap: 28, alignItems: "center" }}
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

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
            {user?.user_metadata?.full_name || "Kullanıcı"}
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 12px" }}>{user?.email}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span style={{
              background: `${planColor}20`, color: planColor,
              border: `1px solid ${planColor}40`,
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700
            }}>
              {planLabel} Plan
            </span>
            <span style={{
              background: "rgba(16,185,129,0.1)", color: "#10b981",
              border: "1px solid rgba(16,185,129,0.2)",
              padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700
            }}>
              ● Aktif
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <Link to="/app/billing" className="btn btn-ghost" style={{ fontSize: 13 }}>
            Planı Yönet
          </Link>
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)", color: "#ef4444",
              cursor: "pointer", fontSize: 13, fontWeight: 600
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Çıkış Yap
          </button>
        </div>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div
        initial="hidden" animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.07 } } }}
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}
      >
        <StatCard label="Kullanılan Tahmin" icon="🤖"
          value={loading ? "—" : (usage?.used_this_month ?? tenantInfo?.used_predictions ?? "0")}
          color="#6366f1" />
        <StatCard label="Kota Limiti" icon="📊"
          value={loading ? "—" : (tenantInfo?.monthly_limit ?? "500")}
          color="#8b5cf6" />
        <StatCard label="Hesap Yaşı" icon="📅"
          value={joinedDate}
          color="#64748b" />
        <StatCard label="Tenant ID" icon="🏢"
          value={loading ? "—" : (tenantInfo?.tenant_id?.slice(0, 8) + "..." || "—")}
          color="#10b981" />
      </motion.div>

      {/* ── Bottom Panels ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Account info */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="panel" style={{ padding: 24 }}>
          <h3 className="panel-title" style={{ marginBottom: 4 }}>Hesap Bilgileri</h3>
          <p className="panel-subtitle" style={{ marginBottom: 16 }}>Kayıtlı profil detayları</p>
          <InfoRow label="E-posta" value={user?.email} />
          <InfoRow label="Ad Soyad" value={user?.user_metadata?.full_name} />
          <InfoRow label="Kayıt Tarihi" value={joinedDate} />
          <InfoRow label="Kimlik Doğrulama" value="E-posta + Şifre" />
          <InfoRow label="Son Giriş" value={
            user?.last_sign_in_at
              ? new Date(user.last_sign_in_at).toLocaleString("tr-TR")
              : "—"
          } />
        </motion.div>

        {/* Plan info */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="panel" style={{ padding: 24 }}>
          <h3 className="panel-title" style={{ marginBottom: 4 }}>Abonelik Detayı</h3>
          <p className="panel-subtitle" style={{ marginBottom: 16 }}>Plan ve kota bilgileriniz</p>
          <InfoRow label="Aktif Plan" value={planLabel} />
          <InfoRow label="Aylık Kota" value={`${tenantInfo?.monthly_limit ?? 500} tahmin`} />
          <InfoRow label="Bu Ay Kullanılan" value={`${tenantInfo?.used_predictions ?? 0} tahmin`} />
          <InfoRow label="Kalan Kota" value={
            tenantInfo
              ? `${Math.max(0, (tenantInfo.monthly_limit ?? 500) - (tenantInfo.used_predictions ?? 0))} tahmin`
              : "—"
          } />
          <div style={{ marginTop: 20 }}>
            <Link to="/app/billing" className="btn btn-primary" style={{ width: "100%", textAlign: "center", display: "block" }}>
              Planı Yükselt →
            </Link>
          </div>
        </motion.div>

        {/* Security */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="panel" style={{ padding: 24, gridColumn: "1 / -1" }}>
          <h3 className="panel-title" style={{ marginBottom: 4 }}>Güvenlik</h3>
          <p className="panel-subtitle" style={{ marginBottom: 16 }}>Hesap güvenliği ayarları</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" style={{ fontSize: 13 }}
              onClick={() => alert("Şifre sıfırlama e-postası gönderildi! (Demo)")}>
              🔒 Şifre Değiştir
            </button>
            <Link to="/app/api-keys" className="btn btn-ghost" style={{ fontSize: 13 }}>
              🔑 API Anahtarlarını Yönet
            </Link>
            <Link to="/app/audit" className="btn btn-ghost" style={{ fontSize: 13 }}>
              📋 Audit Log'a Git
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
