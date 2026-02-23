import { Link, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Logistics from "./pages/Logistics.jsx";
import Demand from "./pages/Demand.jsx";
import Fraud from "./pages/Fraud.jsx";
// import Login from "./pages/Login.jsx"; // Auth devre dışı - Login sayfası geçici olarak kaldırıldı

function Nav() {
  return (
    <nav style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid #eee" }}>
      <Link to="/">Dashboard</Link>
      <Link to="/logistics">Logistics</Link>
      <Link to="/demand">Demand</Link>
      <Link to="/fraud">Fraud</Link>
      {/* Login linki kaldırıldı - Auth devre dışı */}
    </nav>
  );
}

export default function App() {
  return (
    <div>
      <Nav />
      <div style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logistics" element={<Logistics />} />
          <Route path="/demand" element={<Demand />} />
          <Route path="/fraud" element={<Fraud />} />
          {/* Login route kaldırıldı - Auth devre dışı */}
        </Routes>
      </div>
    </div>
  );
}

