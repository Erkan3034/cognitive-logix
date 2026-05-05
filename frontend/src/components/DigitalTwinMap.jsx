import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, LayerGroup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Updated mapping to include start (origin) and end (destination) for routes
const REGION_ROUTES = {
  "Western Europe": { start: [52.52, 13.40], end: [48.8566, 2.3522], type: "Truck" }, // Berlin -> Paris
  "Eastern Europe": { start: [48.2082, 16.3738], end: [52.2297, 21.0122], type: "Truck" }, // Vienna -> Warsaw
  "Pacific Asia": { start: [31.2304, 121.4737], end: [1.3521, 103.8198], type: "Ship" }, // Shanghai -> Singapore
  "Asya-Pasifik": { start: [31.2304, 121.4737], end: [1.3521, 103.8198], type: "Ship" },
  "Central America": { start: [19.4326, -99.1332], end: [9.9281, -84.0907], type: "Truck" }, // Mexico City -> San Jose
  "Caribbean": { start: [25.7617, -80.1918], end: [18.1096, -77.2975], type: "Ship" }, // Miami -> Jamaica
  "South America": { start: [-34.6037, -58.3816], end: [-23.5505, -46.6333], type: "Truck" }, // Buenos Aires -> Sao Paulo
  "LATAM": { start: [-34.6037, -58.3816], end: [-23.5505, -46.6333], type: "Truck" },
  "USCA": { start: [34.0522, -118.2437], end: [39.0997, -94.5786], type: "Truck" }, // LA -> KC
  "US / Puerto Rico": { start: [40.7128, -74.0060], end: [18.2208, -66.5901], type: "Ship" }, // NYC -> PR
  "ABD/P.R.": { start: [40.7128, -74.0060], end: [18.2208, -66.5901], type: "Ship" },
  "West of USA": { start: [47.6062, -122.3321], end: [36.7783, -119.4179], type: "Truck" }, // Seattle -> Cali
  "East of USA": { start: [41.8781, -87.6298], end: [40.7128, -74.0060], type: "Truck" }, // Chicago -> NYC
  "South Asia": { start: [13.7563, 100.5018], end: [20.5937, 78.9629], type: "Ship" }, // Bangkok -> India
  "North Africa": { start: [43.2965, 5.3698], end: [30.0444, 31.2357], type: "Ship" }, // Marseille -> Cairo
  "West Africa": { start: [38.7223, -9.1393], end: [9.0820, 8.6753], type: "Ship" }, // Lisbon -> Nigeria
  "Southern Africa": { start: [-8.8390, 13.2894], end: [-30.5595, 22.9375], type: "Truck" }, // Luanda -> SA
  "Oceania": { start: [-6.2088, 106.8456], end: [-25.2744, 133.7751], type: "Ship" } // Jakarta -> Aus
};

// Removed getJitter to stop absolute coordinates from drifting at all

const createVehicleIcon = (riskPct, type) => {
  const isHighRisk = riskPct >= 0.6;
  const isMedRisk = riskPct >= 0.35 && riskPct < 0.6;

  let color = "#10b981"; // Green
  let rgb = "16, 185, 129"; // Green

  if (isHighRisk) {
    color = "#ef4444"; // Red
    rgb = "239, 68, 68";
  } else if (isMedRisk) {
    color = "#f59e0b"; // Amber
    rgb = "245, 158, 11";
  }

  let iconEmoji = "🚚";
  if (type === "Ship") iconEmoji = "🚢";
  if (type === "Air") iconEmoji = "✈️";

  return L.divIcon({
    html: `
      <div style="
        --vehicle-rgb: ${rgb};
        background: #18181b;
        border: 2px solid ${color};
        border-radius: 50%;
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
        position: relative;
      ">
        ${iconEmoji}
        <div style="
          position: absolute; top: -4px; right: -4px;
          width: 8px; height: 8px; border-radius: 50%;
          background: ${color};
        "></div>
      </div>
    `,
    className: "custom-vehicle-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const createWeatherIcon = () => {
  return L.divIcon({
    html: `
      <div class="weather-system-container">
        <div class="weather-blob-2"></div>
        <div class="weather-blob-1"></div>
        <div class="weather-blob-3"></div>
      </div>
    `,
    className: "weather-icon-wrapper",
    iconSize: [280, 280],
    iconAnchor: [140, 140],
  });
};

const EMPTY_ARRAY = [];

export default function DigitalTwinMap({ zones = EMPTY_ARRAY, incidents = EMPTY_ARRAY }) {
  const [vehicles, setVehicles] = useState([]);
  const [timelinePct, setTimelinePct] = useState(80);
  const [showWeather, setShowWeather] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setTimelinePct(p => (p >= 100 ? 0 : p + 2));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    // Process zones and incidents into vehicles
    const newVehicles = [];

    // Deterministic fallback route generator for custom regions
    const getFallbackRoute = (str) => {
      let hash = 0;
      for (let i = 0; i < (str || "unknown").length; i++) {
        hash = (str || "unknown").charCodeAt(i) + ((hash << 5) - hash);
      }
      const lat1 = (hash % 100) - 50; // -50 to 50
      const lng1 = ((hash >> 3) % 240) - 120; // -120 to 120
      const lat2 = lat1 + (((hash >> 5) % 30) - 15);
      const lng2 = lng1 + (((hash >> 7) % 40) - 20);
      return { start: [lat1, lng1], end: [lat2, lng2], type: "Truck" };
    };

    // Map zones
    zones.forEach((z, i) => {
      const route = REGION_ROUTES[z.order_region] || getFallbackRoute(z.order_region);

      // Override type based on shipping mode
      let vType = route.type;
      if (z.shipping_mode === "First Class" || z.shipping_mode === "Same Day") {
        vType = "Air";
      }

      if (route) {
        newVehicles.push({
          id: `zone-${i}`,
          start: route.start,
          end: route.end,
          riskPct: z.late_risk_pct,
          region: z.order_region,
          type: vType,
          detail: "Route Analysis",
          sku: z.sku || "Various"
        });
      }
    });

    // Map incidents
    incidents.forEach((inc, i) => {
      const regionKeys = Object.keys(REGION_ROUTES);
      const randomRegion = regionKeys[Math.floor((inc.id.charCodeAt(0) || 0) % regionKeys.length)]; // Deterministic
      const route = REGION_ROUTES[randomRegion];

      if (route) {
        newVehicles.push({
          id: `inc-${inc.id}`,
          start: route.start,
          end: route.end,
          riskPct: inc.severity === 'critical' || inc.severity === 'high' ? 0.9 : 0.5,
          region: randomRegion,
          type: route.type,
          detail: inc.title,
          sku: inc.id.split('-')[0]
        });
      }
    });

    setVehicles(newVehicles);
  }, [zones, incidents]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Controls Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#09090b", padding: "10px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ background: isPlaying ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)", color: isPlaying ? "#ef4444" : "#10b981", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
          >
            {isPlaying ? "⏸ Duraklat" : "▶ Oynat"}
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, paddingRight: 20 }}>
            <span style={{ fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap" }}>Zaman Çizelgesi:</span>
            <input
              type="range" min={0} max={100} value={timelinePct}
              onChange={e => { setTimelinePct(Number(e.target.value)); setIsPlaying(false); }}
              style={{ width: "100%", accentColor: "#6366f1" }}
            />
            <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: "bold", width: "40px" }}>%{timelinePct}</span>
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowWeather(!showWeather)}
            style={{ background: showWeather ? "rgba(168,85,247,0.2)" : "transparent", color: showWeather ? "#c084fc" : "#94a3b8", border: `1px solid ${showWeather ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.2)"}`, padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: 6 }}
          >
            ⛈️ {showWeather ? "Hava Durumu Açık" : "Hava Durumu Kapalı"}
          </button>
        </div>
      </div>

      <div style={{ height: "400px", width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.08)", position: "relative" }}>
        <MapContainer
          center={[20, 0]}
          zoom={2}
          style={{ height: "100%", width: "100%", background: "#09090b" }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Weather Storm Layers (Model-Driven Radar) */}
          {showWeather && vehicles.filter(v => v.riskPct >= 0.35).map(v => (
            <Marker 
              key={`weather-${v.id}`} 
              position={[v.start[0] + (v.end[0] - v.start[0]) * 0.5, v.start[1] + (v.end[1] - v.start[1]) * 0.5]} 
              icon={createWeatherIcon()} 
              interactive={false} 
              zIndexOffset={-1000}
            />
          ))}

          {vehicles.map((v) => {
            const pathColor = v.riskPct >= 0.6 ? "#ef4444" : v.riskPct >= 0.35 ? "#f59e0b" : "#10b981";
            const currentLat = v.start[0] + (v.end[0] - v.start[0]) * (timelinePct / 100);
            const currentLng = v.start[1] + (v.end[1] - v.start[1]) * (timelinePct / 100);
            return (
              <LayerGroup key={v.id}>
                {/* Draw the route line */}
                <Polyline
                  positions={[v.start, v.end]}
                  pathOptions={{
                    color: pathColor,
                    weight: 2,
                    opacity: 0.5,
                    dashArray: "4 6",
                    className: "animated-route-line"
                  }}
                />

                {/* Place the vehicle marker */}
                <Marker
                  position={[currentLat, currentLng]}
                  icon={createVehicleIcon(v.riskPct, v.type)}
                  zIndexOffset={1000}
                >
                  <Popup className="digital-twin-popup">
                    <div style={{ padding: "4px 8px", background: "#18181b", color: "#f4f4f5", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", minWidth: "180px" }}>
                      <div style={{ fontSize: "10px", fontWeight: "600", color: "#a1a1aa", textTransform: "uppercase" }}>{v.region} Route</div>
                      <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>{v.type === "Ship" ? "Vessel" : "Transport"} • {v.sku}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                        <span style={{ color: "#a1a1aa" }}>Risk Score:</span>
                        <span style={{ fontWeight: "700", color: pathColor }}>
                          {(v.riskPct * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                        <span style={{ color: "#a1a1aa" }}>Status:</span>
                        <span style={{ fontWeight: "500", color: "#e4e4e7" }}>{v.detail}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </LayerGroup>
            );
          })}
        </MapContainer>

        <style dangerouslySetInnerHTML={{
          __html: `
        .digital-twin-popup .leaflet-popup-content-wrapper {
          background: #18181b;
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .digital-twin-popup .leaflet-popup-tip {
          background: #18181b;
        }
        .digital-twin-popup .leaflet-popup-content {
          margin: 8px;
        }
        .digital-twin-popup a.leaflet-popup-close-button {
          color: #a1a1aa;
        }
        @keyframes vehiclePulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0px rgba(var(--vehicle-rgb), 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 12px rgba(var(--vehicle-rgb), 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0px rgba(var(--vehicle-rgb), 0); }
        }
        .custom-vehicle-icon > div {
          animation: vehiclePulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes dashMove {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animated-route-line {
          animation: dashMove 1.5s linear infinite;
        }

        /* Weather System CSS (Calm Directional Flow) */
        .weather-system-container {
          width: 100%; height: 100%;
          position: relative;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
          overflow: hidden;
          border-radius: 50%;
          filter: blur(10px); /* Softens the edges to look like real radar data */
        }
        @keyframes cloudDrift {
          0% { transform: translate(-25%, -15%) scale(1); opacity: 0.5; }
          50% { transform: translate(15%, 5%) scale(1.15); opacity: 0.85; }
          100% { transform: translate(35%, -10%) scale(1); opacity: 0.5; }
        }
        @keyframes rainDrift {
          0% { transform: translate(-35%, 15%) scale(1.1); opacity: 0.4; }
          50% { transform: translate(-5%, -15%) scale(1); opacity: 0.7; }
          100% { transform: translate(30%, 25%) scale(1.1); opacity: 0.4; }
        }
        .weather-blob-1 {
          position: absolute;
          width: 80%; height: 80%;
          background: radial-gradient(circle, rgba(239,68,68,0.75) 0%, rgba(245,158,11,0.3) 50%, transparent 70%);
          animation: cloudDrift 9s ease-in-out infinite alternate;
        }
        .weather-blob-2 {
          position: absolute;
          width: 90%; height: 75%;
          background: radial-gradient(circle, rgba(245,158,11,0.6) 0%, rgba(16,185,129,0.15) 60%, transparent 80%);
          animation: rainDrift 12s ease-in-out infinite alternate-reverse;
        }
        .weather-blob-3 {
          position: absolute;
          width: 55%; height: 55%;
          background: radial-gradient(circle, rgba(220,38,38,0.85) 0%, rgba(239,68,68,0.4) 50%, transparent 80%);
          animation: cloudDrift 7s ease-in-out infinite alternate;
          animation-delay: -4s;
        }
      `}}
        />
      </div>
    </div>
  );
}
