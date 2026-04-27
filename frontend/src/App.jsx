import { useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Logistics from "./pages/Logistics.jsx";
import Demand from "./pages/Demand.jsx";
import Fraud from "./pages/Fraud.jsx";

/* ── Inline SVG Icons ───────────────────────── */
const IconGrid = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconTruck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/>
    <rect x="9" y="11" width="14" height="10" rx="2"/>
    <circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
  </svg>
);
const IconTrendingUp = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconBrain = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18,color:'white'}}>
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
);

const NAV_ITEMS = [
  { to: "/",          label: "Genel Bakış",       Icon: IconGrid,        end: true },
  { to: "/logistics", label: "Lojistik",           Icon: IconTruck },
  { to: "/demand",    label: "Talep Tahmini",      Icon: IconTrendingUp },
  { to: "/fraud",     label: "Dolandırıcılık & Risk", Icon: IconShield },
];

const PAGE_TITLES = {
  "/":          "Genel Bakış",
  "/logistics": "Lojistik",
  "/demand":    "Talep Tahmini",
  "/fraud":     "Dolandırıcılık & Risk",
};

const PAGE_DESCRIPTIONS = {
  "/": "Operasyonel durum, kritik riskler ve finansal maruziyet özet görünümü.",
  "/logistics": "Sipariş bazında gecikme olasılığına göre önleyici karar desteği.",
  "/demand": "Kısa vadeli talep eğrileriyle envanter ve kapasite planlama desteği.",
  "/fraud": "Anomali sinyalleriyle işlem doğrulama ve zarar önleme desteği.",
};

function Sidebar({ collapsed, onToggle }) {
  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <IconBrain />
        </div>
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Cognitive Logix</span>
          <span className="sidebar-brand-sub">Tedarik Zinciri AI</span>
        </div>
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? "Genişlet" : "Daralt"}>
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="nav-section-label">Modüller</span>
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
          >
            <span className="nav-icon"><Icon /></span>
            <span className="nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer status */}
      <div className="sidebar-footer">
        <span className="status-dot" />
        <span className="status-label">Canlı veri bağlantısı</span>
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
        <span className="topbar-breadcrumb">
          Cognitive Logix / <span>{title}</span>
        </span>
        <span className="topbar-description">{description}</span>
      </div>
      <span className="topbar-spacer" />
      <span className="topbar-live-badge">
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--risk-low)", display: "inline-block" }} />
        Sistem Çevrimiçi
      </span>
    </div>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className={`app-content${collapsed ? " sidebar-collapsed" : ""}`}>
        <TopBar />
        <main className="app-main">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/logistics" element={<Logistics />} />
            <Route path="/demand"    element={<Demand />} />
            <Route path="/fraud"     element={<Fraud />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
