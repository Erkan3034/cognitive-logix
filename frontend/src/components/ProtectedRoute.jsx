import { useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { onboardBilling } from "../lib/api.js";
import { supabase } from "../lib/supabaseClient.js";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [onboarding, setOnboarding] = useState(false);
  const onboardingAttempted = useRef(false);

  useEffect(() => {
    const tenantId = user?.user_metadata?.tenant_id || user?.app_metadata?.tenant_id;
    
    if (user && !tenantId && !onboardingAttempted.current) {
      onboardingAttempted.current = true;
      setOnboarding(true);
      
      onboardBilling({
        company_name: (user.user_metadata?.full_name || "Kullanıcı") + " A.Ş.",
        user_id: user.id
      })
      .then(() => {
        return supabase.auth.refreshSession();
      })
      .catch((err) => {
        console.error("Onboarding hatası:", err.response?.data?.detail || err.message || err);
      })
      .finally(() => {
        setOnboarding(false);
      });
    }
  }, [user]);

  if (loading || onboarding) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#060c1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16
      }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid rgba(99,102,241,0.2)",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }} />
        <span style={{ color: "#64748b", fontSize: 14 }}>
          {onboarding ? "Hesabınız hazırlanıyor..." : "Oturum kontrol ediliyor..."}
        </span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
