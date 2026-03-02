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
          <span className="app-title-sub">Supply Chain Digital Twin</span>
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
          Overview
        </NavLink>
        <NavLink
          to="/logistics"
          className={({ isActive }) =>
            `app-nav-link ${isActive ? "app-nav-link-active" : ""}`
          }
        >
          Logistics
        </NavLink>
        <NavLink
          to="/demand"
          className={({ isActive }) =>
            `app-nav-link ${isActive ? "app-nav-link-active" : ""}`
          }
        >
          Demand
        </NavLink>
        <NavLink
          to="/fraud"
          className={({ isActive }) =>
            `app-nav-link ${isActive ? "app-nav-link-active" : ""}`
          }
        >
          Fraud & Risk
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

