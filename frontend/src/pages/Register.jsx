import { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../lib/AuthContext";
import "../landing.css";

const IconBrain = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

const SmallIcon = ({ type }) => {
  const paths = {
    mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 1 0-16 0" /></>,
    building: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 22V12h6v10" /><path d="M3 9h18" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>{paths[type]}</svg>;
};

export default function Register() {
  const { signUp, user } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/app";

  if (user) {
    return <Navigate to={from} replace />;
  }

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Kayıt başarısız. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-root">
        <motion.div className="auth-card" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <h2 className="auth-title" style={{ marginBottom: 12 }}>Hesabınız oluşturuldu</h2>
            <p className="auth-desc" style={{ marginBottom: 24 }}>
              <strong style={{ color: "#e2e8f0" }}>{email}</strong> adresine doğrulama e-postası gönderdik.<br />
              E-postanızı onaylayıp giriş yapabilirsiniz.
            </p>
            <Link to="/login" className="auth-submit-btn" style={{ display: "inline-block", textDecoration: "none", textAlign: "center" }}>
              Giriş Sayfasına Git
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="auth-root">
      <motion.div className="auth-card" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
        <div className="auth-logo">
          <div className="landing-nav-logo" style={{ width: 44, height: 44, borderRadius: 14 }}><IconBrain /></div>
          <div>
            <div className="auth-brand-name">Cognitive Logix</div>
            <div className="auth-brand-sub">Ücretsiz hesap oluşturun</div>
          </div>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">Karar motorunuzu kurun</h1>
          <p className="auth-desc">Kredi kartı gerekmez · İlk 100 tahmin ücretsiz</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label className="auth-label" htmlFor="fullName">Ad Soyad</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><SmallIcon type="user" /></span>
              <input id="fullName" className="auth-input" type="text" placeholder="Adınız Soyadınız" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="company">Şirket Adı</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><SmallIcon type="building" /></span>
              <input id="company" className="auth-input" type="text" placeholder="Şirket A.Ş." value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="email">E-posta</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><SmallIcon type="mail" /></span>
              <input id="email" className="auth-input" type="email" placeholder="ornek@sirket.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="password">Şifre <span style={{ color: "#475569" }}>(min. 8 karakter)</span></label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon"><SmallIcon type="lock" /></span>
              <input id="password" className="auth-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>
          </div>

          {error && <motion.div className="auth-error" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.div>}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : "Hesap Oluştur"}
          </button>
        </form>

        <p className="auth-footer-text">
          Zaten hesabınız var mı? <Link to="/login" className="auth-link">Giriş yapın</Link>
        </p>
      </motion.div>
    </div>
  );
}
