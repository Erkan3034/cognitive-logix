import { lazy, Suspense, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Logistics = lazy(() => import("./pages/Logistics.jsx"));
const Demand = lazy(() => import("./pages/Demand.jsx"));
const Fraud = lazy(() => import("./pages/Fraud.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const DataHub = lazy(() => import("./pages/DataHub.jsx"));
const ModelHealth = lazy(() => import("./pages/ModelHealth.jsx"));
const Usage = lazy(() => import("./pages/Usage.jsx"));
const AuditLog = lazy(() => import("./pages/AuditLog.jsx"));
const ApiKeys = lazy(() => import("./pages/ApiKeys.jsx"));
const Billing = lazy(() => import("./pages/Billing.jsx"));

const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
  </svg>
);

const IconTrendingUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconDatabase = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const IconPulse = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </svg>
);

const IconList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" />
    <path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" />
  </svg>
);

const IconAudit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" /><path d="M9 15l2 2 4-5" />
  </svg>
);

const IconKey = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const IconCreditCard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconBrain = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: "white" }}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2Z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z" />
  </svg>
);

const NAV_ITEMS = [
  { to: "/app", label: "Genel Bakis", Icon: IconGrid, end: true },
  { to: "/app/logistics", label: "Lojistik", Icon: IconTruck },
  { to: "/app/demand", label: "Talep Tahmini", Icon: IconTrendingUp },
  { to: "/app/fraud", label: "Fraud ve Risk", Icon: IconShield },
  { to: "/app/data", label: "Veri Merkezi", Icon: IconDatabase },
  { to: "/app/usage", label: "Kullanim", Icon: IconList },
  { to: "/app/audit", label: "Audit Log", Icon: IconAudit },
  { to: "/app/model-health", label: "Model Health", Icon: IconPulse },
  { to: "/app/api-keys", label: "API Keys", Icon: IconKey },
  { to: "/app/billing", label: "Abonelik", Icon: IconCreditCard },
];

const PAGE_TITLES = {
  "/app": "Genel Bakis",
  "/app/logistics": "Lojistik",
  "/app/demand": "Talep Tahmini",
  "/app/fraud": "Fraud ve Risk",
  "/app/data": "Veri Merkezi",
  "/app/usage": "Kullanim",
  "/app/audit": "Audit Log",
  "/app/model-health": "Model Health",
  "/app/api-keys": "API Key Yonetimi",
  "/app/billing": "Abonelik ve Faturalama",
};

const PAGE_DESCRIPTIONS = {
  "/app": "Operasyonel durum, kritik riskler ve finansal maruziyet ozeti.",
  "/app/logistics": "Siparis bazinda gecikme olasiligina gore onleyici karar destegi.",
  "/app/demand": "Talep egrileriyle envanter ve kapasite planlama destegi.",
  "/app/fraud": "Anomali sinyalleriyle islem dogrulama ve zarar onleme destegi.",
  "/app/data": "Sisteme veri besleme ve AI kolon eslestirme.",
  "/app/usage": "Tenant bazli API kullanimi, kota ve faturalama sinyalleri.",
  "/app/audit": "Kullanici aksiyonlari ve incident karar izleri.",
  "/app/model-health": "Model surumleri, validasyon metrikleri ve drift izleme.",
  "/app/api-keys": "Dis sistemler icin API key uretimi, yonetimi ve kullanim ornekleri.",
  "/app/billing": "Kullanim kotanizi takip edin ve planinizi yonetin.",
};

function RouteLoader() {
  return <div className="route-loader">Modul yukleniyor...</div>;
}

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo"><IconBrain /></div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Cognitive Logix</span>
          <span className="sidebar-brand-sub">Supply Chain AI</span>
        </div>
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? "Genislet" : "Daralt"}>
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section-label">Moduller</span>
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}>
            <span className="nav-icon"><Icon /></span>
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="status-dot" />
        <span className="status-label">Canli veri baglantisi</span>
      </div>
    </aside>
  );
}

function TopBar() {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? "Sayfa";
  const description = PAGE_DESCRIPTIONS[location.pathname] ?? "Modul ozeti";

  return (
    <div className="topbar">
      <div className="topbar-heading">
        <span className="topbar-breadcrumb">Cognitive Logix / <span>{title}</span></span>
        <span className="topbar-description">{description}</span>
      </div>
      <span className="topbar-spacer" />
      <span className="topbar-live-badge">
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--risk-low)", display: "inline-block" }} />
        Sistem Cevrimici
      </span>
    </div>
  );
}

function AppShell({ collapsed, setCollapsed }) {
  return (
    <ProtectedRoute>
      <div className="app-shell">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
        <div className={`app-content${collapsed ? " sidebar-collapsed" : ""}`}>
          <TopBar />
          <main className="app-main">
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/logistics" element={<Logistics />} />
                <Route path="/demand" element={<Demand />} />
                <Route path="/fraud" element={<Fraud />} />
                <Route path="/data" element={<DataHub />} />
                <Route path="/usage" element={<Usage />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/model-health" element={<ModelHealth />} />
                <Route path="/api-keys" element={<ApiKeys />} />
                <Route path="/billing" element={<Billing />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/app/*" element={<AppShell collapsed={collapsed} setCollapsed={setCollapsed} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
