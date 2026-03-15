import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Logistics from "./pages/Logistics.jsx";
import Demand from "./pages/Demand.jsx";
import Fraud from "./pages/Fraud.jsx";

function Nav() {
  return (
    <header className="app-navbar">
      <div className="app-navbar-left">
        <div className="app-logo" />
        <div className="app-title">
          <span className="app-title-main">Cognitive Logix</span>
          <span className="app-title-sub">Tedarik Zinciri Dijital İkizi</span>
        </div>
      </div>
      <nav className="app-nav-links">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `app-nav-link ${isActive ? "app-nav-link-active" : ""}`
          }
        >
          Genel Bakış
        </NavLink>
        <NavLink
          to="/logistics"
          className={({ isActive }) =>
            `app-nav-link ${isActive ? "app-nav-link-active" : ""}`
          }
        >
          Lojistik
        </NavLink>
        <NavLink
          to="/demand"
          className={({ isActive }) =>
            `app-nav-link ${isActive ? "app-nav-link-active" : ""}`
          }
        >
          Talep
        </NavLink>
        <NavLink
          to="/fraud"
          className={({ isActive }) =>
            `app-nav-link ${isActive ? "app-nav-link-active" : ""}`
          }
        >
          Dolandırıcılık & Risk
        </NavLink>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/demand" element={<Demand />} />
          <Route path="/fraud" element={<Fraud />} />
        </Routes>
      </main>
    </div>
  );
}

