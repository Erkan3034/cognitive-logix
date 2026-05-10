import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { getBillingStatus } from "../lib/api.js";
import { supabase } from "../lib/supabaseClient.js";
import { InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

const PLAN_LABELS = { free: "Başlangıç", pro: "Pro", enterprise: "Kurumsal" };

function formatDate(value) {
  if (!value) return "Henüz yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function InfoRow({ label, value }) {
  return (
    <div className="profile-info-row">
      <span>{label}</span>
      <strong>{value || "Henüz yok"}</strong>
    </div>
  );
}

function StatCard({ label, value, tone = "neutral" }) {
  return (
    <article className={`usage-kpi usage-kpi-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>Hesap ve kullanım bilgisi</p>
    </article>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getBillingStatus()
      .then((data) => {
        if (mounted) setBilling(data);
      })
      .catch(() => {
        if (mounted) setBilling(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    const name = user?.user_metadata?.full_name || user?.email || "CL";
    return name.slice(0, 2).toUpperCase();
  }, [user]);

  const plan = billing?.plan ?? "free";
  const used = billing?.used ?? 0;
  const limit = billing?.limit ?? 100;
  const remaining = Math.max(0, limit - used);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handlePasswordReset = async () => {
    if (!supabase || !user?.email) {
      setNotice({ type: "error", title: "İşlem başlatılamadı", text: "Supabase oturumu veya e-posta bilgisi bulunamadı." });
      return;
    }
    setResetting(true);
    setNotice(null);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/app/profile`,
    });
    setResetting(false);
    if (error) {
      setNotice({ type: "error", title: "E-posta gönderilemedi", text: error.message });
      return;
    }
    setNotice({ type: "success", title: "Şifre sıfırlama e-postası gönderildi", text: "Gelen kutunuzu kontrol edin." });
  };

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Hesap"
        title="Profil ve Güvenlik"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loading ? <InlineSpinner label="Yükleniyor" /> : `${PLAN_LABELS[plan] || plan} planı`}
          </div>
        }
      >
        Hesap bilgilerinizi, plan durumunuzu ve güvenli entegrasyon ayarlarınızı yönetin.
      </PageIntro>

      {notice && (
        <StatusBanner type={notice.type} title={notice.title}>
          {notice.text}
        </StatusBanner>
      )}

      <section className="profile-hero panel">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-identity">
          <h2>{user?.user_metadata?.full_name || "Platform kullanıcısı"}</h2>
          <p>{user?.email}</p>
          <div className="data-chip-list">
            <span className="data-chip">{PLAN_LABELS[plan] || plan} planı</span>
            <span className="data-chip success">Hesap aktif</span>
          </div>
        </div>
        <div className="profile-actions">
          <Link to="/app/billing" className="pro-btn-outline">Planı yönet</Link>
          <button type="button" className="btn btn-danger" onClick={handleLogout}>Çıkış yap</button>
        </div>
      </section>

      <section className="usage-kpi-grid">
        <StatCard label="Bu ay kullanılan" value={loading ? "..." : used.toLocaleString("tr-TR")} />
        <StatCard label="Kalan analiz" value={loading ? "..." : remaining.toLocaleString("tr-TR")} tone="success" />
        <StatCard label="Aylık limit" value={loading ? "..." : limit.toLocaleString("tr-TR")} tone="warning" />
        <StatCard label="Kayıt tarihi" value={formatDate(user?.created_at)} tone="muted" />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Profil detayları</h2>
              <p className="panel-subtitle">Supabase oturumundan gelen temel bilgiler.</p>
            </div>
          </div>
          <InfoRow label="E-posta" value={user?.email} />
          <InfoRow label="Ad soyad" value={user?.user_metadata?.full_name} />
          <InfoRow label="Kayıt tarihi" value={formatDate(user?.created_at)} />
          <InfoRow label="Son oturum" value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("tr-TR") : null} />
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Güvenlik ve entegrasyon</h2>
              <p className="panel-subtitle">Şifre sıfırlama ve API bağlantı yönetimi.</p>
            </div>
          </div>

          <div className="profile-action-block">
            <strong>Şifre sıfırlama</strong>
            <p>Hesabınız için Supabase üzerinden sıfırlama bağlantısı gönderin.</p>
            <button type="button" className="pro-btn-outline" disabled={resetting} onClick={handlePasswordReset}>
              {resetting ? "Gönderiliyor" : "Sıfırlama e-postası gönder"}
            </button>
          </div>

          <div className="profile-action-block">
            <strong>API anahtarları</strong>
            <p>ERP, depo ve finans sistemleri için kapsam kontrollü anahtar oluşturun.</p>
            <Link to="/app/api-keys" className="pro-btn-outline">API anahtarlarını aç</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
