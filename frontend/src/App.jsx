import { lazy, Suspense, useMemo, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./lib/AuthContext.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const ExceptionInbox = lazy(() => import("./pages/ExceptionInbox.jsx"));
const Logistics = lazy(() => import("./pages/Logistics.jsx"));
const Demand = lazy(() => import("./pages/Demand.jsx"));
const Fraud = lazy(() => import("./pages/Fraud.jsx"));
const DataHub = lazy(() => import("./pages/DataHub.jsx"));
const DataQuality = lazy(() => import("./pages/DataQuality.jsx"));
const ScenarioLab = lazy(() => import("./pages/ScenarioLab.jsx"));
const LiveConnections = lazy(() => import("./pages/LiveConnections.jsx"));
const DecisionImpact = lazy(() => import("./pages/DecisionImpact.jsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.jsx"));
const ModelHealth = lazy(() => import("./pages/ModelHealth.jsx"));
const Usage = lazy(() => import("./pages/Usage.jsx"));
const AuditLog = lazy(() => import("./pages/AuditLog.jsx"));
const ApiKeys = lazy(() => import("./pages/ApiKeys.jsx"));
const Billing = lazy(() => import("./pages/Billing.jsx"));
const Profile = lazy(() => import("./pages/Profile.jsx"));
const Landing = lazy(() => import("./pages/Landing.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Algorithms = lazy(() => import("./pages/Algorithms.jsx"));
const Docs = lazy(() => import("./pages/Docs.jsx"));
const DocArticle = lazy(() => import("./pages/DocArticle.jsx"));
const ApiDocs = lazy(() => import("./pages/ApiDocs.jsx"));

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const Icons = {
  grid: () => <Icon><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Icon>,
  inbox: () => <Icon><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></Icon>,
  truck: () => <Icon><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" /><rect x="9" y="11" width="14" height="10" rx="2" /><circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" /></Icon>,
  trend: () => <Icon><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Icon>,
  shield: () => <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>,
  database: () => <Icon><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></Icon>,
  quality: () => <Icon><path d="M4 19V5" /><path d="M4 5h16" /><path d="m8 13 3 3 5-7" /></Icon>,
  lab: () => <Icon><path d="M10 2v6L4 19a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 19L14 8V2" /><path d="M8.5 2h7" /><path d="M7 16h10" /></Icon>,
  pulse: () => <Icon><path d="M3 12h4l3-8 4 16 3-8h4" /></Icon>,
  list: () => <Icon><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></Icon>,
  audit: () => <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15l2 2 4-5" /></Icon>,
  key: () => <Icon><path d="M21 2l-2 2" /><path d="m15.5 7.5 3 3L22 7l-3-3" /><path d="M11.39 11.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78Z" /><path d="m11.39 11.61 4.11-4.11" /></Icon>,
  card: () => <Icon><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></Icon>,
  setup: () => <Icon><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icon>,
  plug: () => <Icon><path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><path d="M6 8h12v4a6 6 0 0 1-12 0Z" /></Icon>,
  impact: () => <Icon><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-7" /><path d="M19 7h-4" /><path d="M19 7v4" /></Icon>,
};

const NAV_GROUPS = [
  {
    label: "Operasyon",
    items: [
      { to: "/app", label: "Operasyon Merkezi", Icon: Icons.grid, end: true, desc: "Genel operasyon görünümü" },
      { to: "/app/inbox", label: "Olay Kutusu", Icon: Icons.inbox, desc: "Karar bekleyen olaylar" },
      { to: "/app/scenario-lab", label: "Senaryo Laboratuvarı", Icon: Icons.lab, desc: "Gösterge simülasyonu" },
      { to: "/app/live-connections", label: "Canlı Bağlantılar", Icon: Icons.plug, desc: "Kaynak sağlığı" },
      { to: "/app/decision-impact", label: "Karar Etkisi", Icon: Icons.impact, desc: "Aksiyon getirisi" },
    ],
  },
  {
    label: "Modüller",
    items: [
      { to: "/app/logistics", label: "Lojistik", Icon: Icons.truck, desc: "Teslimat riski" },
      { to: "/app/demand", label: "Talep Tahmini", Icon: Icons.trend, desc: "Stok planlama" },
      { to: "/app/fraud", label: "Finansal Risk", Icon: Icons.shield, desc: "Anomali analizi" },
    ],
  },
  {
    label: "Veri ve Yönetim",
    items: [
      { to: "/app/data", label: "Veri Merkezi", Icon: Icons.database, desc: "Dosya içe aktarma" },
      { to: "/app/data-quality", label: "Veri Kalitesi", Icon: Icons.quality, desc: "Veri kalite skoru" },
      { to: "/app/onboarding", label: "Kurulum", Icon: Icons.setup, desc: "Canlı kurulum" },
      { to: "/app/model-health", label: "Model Sağlığı", Icon: Icons.pulse, desc: "Sapma ve metrikler" },
      { to: "/app/usage", label: "Kullanım", Icon: Icons.list, desc: "Kota ve trafik" },
      { to: "/app/audit", label: "Denetim Kaydı", Icon: Icons.audit, desc: "Karar izleri" },
      { to: "/app/api-keys", label: "Bağlantı Anahtarları", Icon: Icons.key, desc: "Entegrasyon yetkileri" },
      { to: "/app/billing", label: "Abonelik", Icon: Icons.card, desc: "Plan ve kota" },
    ],
  },
];

const ALL_NAV = NAV_GROUPS.flatMap((group) => group.items);

function RouteLoader() {
  return <div className="route-loader">Modül yükleniyor...</div>;
}

function Sidebar({ collapsed, onToggle }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "CL";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">CL</div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Cognitive Logix</span>
          <span className="sidebar-brand-sub">Tedarik Zinciri Zekası</span>
        </div>
        <button className="sidebar-toggle" type="button" onClick={onToggle} title={collapsed ? "Genişlet" : "Daralt"}>
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="nav-group">
            <span className="nav-section-label">{group.label}</span>
            {group.items.map(({ to, label, Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}>
                <span className="nav-icon"><Icon /></span>
                <span className="nav-label">{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-user-section">
        <NavLink to="/app/profile" className={({ isActive }) => `sidebar-user-card${isActive ? " active" : ""}`}>
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-email">{user?.email}</span>
            <span className="sidebar-user-sub">Profili görüntüle</span>
          </div>
        </NavLink>
        <button className="sidebar-logout-btn" type="button" onClick={handleLogout}>
          <span className="nav-icon"><Icons.card /></span>
          <span className="sidebar-logout-label">Çıkış yap</span>
        </button>
      </div>
    </aside>
  );
}

function TopBar() {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const activePage = useMemo(() => {
    return [...ALL_NAV].sort((a, b) => b.to.length - a.to.length).find((item) => (
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )) || ALL_NAV[0];
  }, [location.pathname]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return ALL_NAV.filter((item) => `${item.label} ${item.desc}`.toLowerCase().includes(needle)).slice(0, 6);
  }, [query]);

  return (
    <div className="topbar">
      <div className="topbar-heading">
        <span className="topbar-breadcrumb">Cognitive Logix / <span>{activePage.label}</span></span>
        <span className="topbar-description">{activePage.desc}</span>
      </div>
      <div className="topbar-search">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Modül veya aksiyon ara" />
        {results.length > 0 && (
          <div className="topbar-search-results">
            {results.map((item) => (
              <Link key={item.to} to={item.to} onClick={() => setQuery("")}>
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <span className="topbar-spacer" />
      <Link to="/app/data" className="pro-btn-ghost">Veri yükle</Link>
      <Link to="/app/inbox" className="pro-btn-outline">Olay Kutusu</Link>
      <span className="topbar-live-badge">
        <span className="status-dot" />
        Sistem çevrimiçi
      </span>
    </div>
  );
}

function AppShell({ collapsed, setCollapsed }) {
  return (
    <ProtectedRoute>
      <div className="app-shell">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        <div className={`app-content${collapsed ? " sidebar-collapsed" : ""}`}>
          <TopBar />
          <main className="app-main">
            <Suspense fallback={<RouteLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inbox" element={<ExceptionInbox />} />
                <Route path="/scenario-lab" element={<ScenarioLab />} />
                <Route path="/live-connections" element={<LiveConnections />} />
                <Route path="/decision-impact" element={<DecisionImpact />} />
                <Route path="/logistics" element={<Logistics />} />
                <Route path="/demand" element={<Demand />} />
                <Route path="/fraud" element={<Fraud />} />
                <Route path="/data" element={<DataHub />} />
                <Route path="/data-quality" element={<DataQuality />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/usage" element={<Usage />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/model-health" element={<ModelHealth />} />
                <Route path="/api-keys" element={<ApiKeys />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/profile" element={<Profile />} />
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
        <Route path="/algorithms" element={<Algorithms />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/:slug" element={<DocArticle />} />
        <Route path="/api-docs" element={<ApiDocs />} />
        <Route path="/app/*" element={<AppShell collapsed={collapsed} setCollapsed={setCollapsed} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
