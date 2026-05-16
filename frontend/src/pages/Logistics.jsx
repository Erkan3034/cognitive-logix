import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DigitalTwinMap from "../components/DigitalTwinMap.jsx";
import { getDrilldownSkus, postPredict, postRouteIntelligence } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";
import { startTour } from "../lib/tourConfig.js";

const FACTOR_TR = {
  shipping_mode: "Gönderim hızı",
  days_for_shipment_scheduled: "Planlanan sevkiyat süresi",
  days_for_shipping_real: "Gerçek teslimat süresi",
  order_region: "Sipariş bölgesi",
  category_name: "Ürün kategorisi",
  category: "Ürün kategorisi",
  market: "Pazar",
  sales: "Sipariş tutarı",
  quantity: "Sipariş adedi",
  benefit_per_order: "Sipariş karlılığı",
  customer_segment: "Müşteri tipi",
  "Shipping Mode": "Gönderim hızı",
  "Days for shipment Scheduled": "Planlanan süre",
  "Days for shipment scheduled": "Planlanan süre",
  "Order Region": "Sipariş bölgesi",
  "Category Name": "Ürün kategorisi",
  "Market": "Pazar",
  "Customer Segment": "Müşteri segmenti",
  "Sales": "Sipariş tutarı",
  "Quantity": "Sipariş adedi",
  "Discount Rate": "İndirim oranı",
  "Type": "Ödeme tipi",
};

const INITIAL_FORM = {
  shipping_mode: "Standard Class",
  order_region: "Western Europe",
  days_scheduled: 4,
  days_real: 4,
  category: "Sporting Goods",
  market: "Europe",
  sales: 150,
  quantity: 2,
  benefit_per_order: 20,
  discount_rate: 0,
};

const ROUTE_PRESETS = [
  {
    id: "istanbul-ankara",
    label: "İstanbul → Ankara",
    origin: { name: "İstanbul", lat: 41.0082, lng: 28.9784 },
    destination: { name: "Ankara", lat: 39.9334, lng: 32.8597 },
  },
  {
    id: "izmir-antalya",
    label: "İzmir → Antalya",
    origin: { name: "İzmir", lat: 38.4237, lng: 27.1428 },
    destination: { name: "Antalya", lat: 36.8969, lng: 30.7133 },
  },
  {
    id: "hamburg-munich",
    label: "Hamburg → Münih",
    origin: { name: "Hamburg", lat: 53.5511, lng: 9.9937 },
    destination: { name: "Münih", lat: 48.1351, lng: 11.582 },
  },
];

const INITIAL_ROUTE = {
  enabled: true,
  preset: "istanbul-ankara",
  originName: "İstanbul",
  originLat: 41.0082,
  originLng: 28.9784,
  destinationName: "Ankara",
  destinationLat: 39.9334,
  destinationLng: 32.8597,
};

function toTR(key) {
  return FACTOR_TR[key] || key;
}

function riskLevel(score) {
  if (score == null) return { label: "Bekleniyor", cls: "neutral", color: "#a1a1aa" };
  if (score >= 0.7) return { label: "Kritik", cls: "high", color: "#ef4444" };
  if (score >= 0.4) return { label: "İzlemeye alınmalı", cls: "medium", color: "#f59e0b" };
  return { label: "Kontrol altında", cls: "low", color: "#10b981" };
}

function formatPct(value) {
  return `${Math.round((value || 0) * 100)}%`;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
}

function shippingModeLabel(value) {
  const labels = {
    "Standard Class": "Standart",
    "Second Class": "Ekonomi",
    "First Class": "Öncelikli",
    "Same Day": "Aynı gün",
  };
  return labels[value] || value;
}

function regionLabel(value) {
  const labels = {
    "Western Europe": "Batı Avrupa",
    "Eastern Europe": "Doğu Avrupa",
    "Central America": "Orta Amerika",
    "South America": "Güney Amerika",
    "Southeast Asia": "Güneydoğu Asya",
    "West Africa": "Batı Afrika",
    "US / Puerto Rico": "ABD / Porto Riko",
    LATAM: "Latin Amerika",
  };
  return labels[value] || value;
}

function categoryLabel(value) {
  const labels = {
    "Sporting Goods": "Spor ürünleri",
    "Fan Shop": "Taraftar ürünleri",
    Cleats: "Krampon",
    Apparel: "Giyim",
    Footwear: "Ayakkabı",
    "Fitness Equipment": "Egzersiz ekipmanı",
    Electronics: "Elektronik",
  };
  return labels[value] || value;
}

function marketLabel(value) {
  const labels = {
    Europe: "Avrupa",
    LATAM: "Latin Amerika",
    "Pacific Asia": "Pasifik Asya",
    Africa: "Afrika",
    Canada: "Kanada",
    USCA: "ABD ve Kanada",
    "US / Puerto Rico": "ABD / Porto Riko",
  };
  return labels[value] || value;
}

function FactorChart({ factors }) {
  const data = (factors || []).slice(0, 6).map((factor) => ({
    name: toTR(factor.feature),
    impact: Math.abs(Number(factor.impact || factor.shap_value || 0)),
    direction: factor.direction || factor.impact_direction,
  }));

  if (!data.length) {
    return (
      <EmptyState title="Faktör açıklaması yok">
        Model bu tahmin için ayrı bir etki listesi döndürmedi.
      </EmptyState>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(150, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 20, top: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={154} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ payload }) => {
            const row = payload?.[0]?.payload;
            if (!row) return null;
            const raises = row.direction === "raises_risk";
            return (
              <div className="usage-tooltip">
                <strong>{row.name}</strong>
                <span>{raises ? "Riski artırıyor" : "Riski azaltıyor"}</span>
              </div>
            );
          }}
        />
        <Bar dataKey="impact" radius={[0, 5, 5, 0]}>
          {data.map((row, index) => (
            <Cell key={index} fill={row.direction === "raises_risk" ? "#ef4444" : "#10b981"} fillOpacity={0.86} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RecommendedActions({ score }) {
  const actions =
    score >= 0.7
      ? ["Gönderim yöntemini hızlandırın.", "Müşteriye gecikme ihtimalini proaktif bildirin.", "Alternatif depo veya rota seçeneğini kontrol edin."]
      : score >= 0.4
        ? ["Siparişi izleme listesine alın.", "Planlanan ve gerçek sevkiyat süresini güncel tutun.", "Gecikme artarsa hızlı gönderim senaryosunu karşılaştırın."]
        : ["Mevcut planla devam edin.", "Standart teslimat bildirimlerini sürdürün.", "Aynı segmentteki riskli ürün kodlarını periyodik izleyin."];

  return (
    <div className="decision-list">
      {actions.map((action) => (
        <div key={action} className="decision-list-row">
          <span aria-hidden="true" />
          <p>{action}</p>
        </div>
      ))}
    </div>
  );
}

export default function Logistics() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [skuItems, setSkuItems] = useState([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [comparison, setComparison] = useState(null);
  const [routeForm, setRouteForm] = useState(INITIAL_ROUTE);
  const [routeIntel, setRouteIntel] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);

  const drilldownContext = useMemo(() => {
    const order_region = searchParams.get("order_region");
    const shipping_mode = searchParams.get("shipping_mode");
    const category = searchParams.get("category");
    const sku = searchParams.get("sku");
    if (!order_region && !shipping_mode && !category && !sku) return null;
    return { order_region, shipping_mode, category, sku };
  }, [searchParams]);

  useEffect(() => {
    if (!drilldownContext) return;
    setFormData((prev) => ({
      ...prev,
      order_region: drilldownContext.order_region || prev.order_region,
      shipping_mode: drilldownContext.shipping_mode || prev.shipping_mode,
      category: drilldownContext.category || prev.category,
    }));
  }, [drilldownContext]);

  useEffect(() => {
    let mounted = true;
    if (!drilldownContext) {
      setSkuItems([]);
      return () => {
        mounted = false;
      };
    }

    setSkuLoading(true);
    getDrilldownSkus({
      order_region: drilldownContext.order_region,
      shipping_mode: drilldownContext.shipping_mode,
      category: drilldownContext.category,
      limit: 6,
    })
      .then((data) => {
        if (mounted) setSkuItems(data?.items ?? []);
      })
      .catch(() => {
        if (mounted) setSkuItems([]);
      })
      .finally(() => {
        if (mounted) setSkuLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [drilldownContext]);

  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const setRouteField = (key, value) => {
    setRouteForm((prev) => ({ ...prev, [key]: value, preset: key === "preset" ? value : "custom" }));
  };

  const applyRoutePreset = (presetId) => {
    const preset = ROUTE_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      setRouteForm((prev) => ({ ...prev, preset: "custom" }));
      return;
    }
    setRouteForm({
      enabled: true,
      preset: preset.id,
      originName: preset.origin.name,
      originLat: preset.origin.lat,
      originLng: preset.origin.lng,
      destinationName: preset.destination.name,
      destinationLat: preset.destination.lat,
      destinationLng: preset.destination.lng,
    });
  };

  const fetchCoordinates = async (cityName, type) => {
    if (!cityName) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        setRouteForm(prev => ({
          ...prev,
          [`${type}Lat`]: parseFloat(data[0].lat),
          [`${type}Lng`]: parseFloat(data[0].lon),
          preset: "custom"
        }));
      }
    } catch (err) {
      console.error("Koordinat bulunamadı", err);
    }
  };

  const buildRoutePayload = (baseRisk) => ({
    origin: {
      name: routeForm.originName,
      lat: Number(routeForm.originLat),
      lng: Number(routeForm.originLng),
    },
    destination: {
      name: routeForm.destinationName,
      lat: Number(routeForm.destinationLat),
      lng: Number(routeForm.destinationLng),
    },
    shipping_mode: formData.shipping_mode,
    base_late_risk_pct: Number(baseRisk || 0),
  });

  const runRouteIntelligence = async (baseRisk) => {
    if (!routeForm.enabled) {
      setRouteIntel(null);
      return null;
    }
    setRouteLoading(true);
    try {
      const data = await postRouteIntelligence(buildRoutePayload(baseRisk));
      setRouteIntel(data);
      return data;
    } finally {
      setRouteLoading(false);
    }
  };

  const runPrediction = async (features) => {
    const data = await postPredict({ features });
    return {
      raw: data,
      score: data.calibrated_delay_risk ?? data.delay_risk ?? 0,
      factors: data.top_factors ?? [],
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setComparison(null);
    setRouteIntel(null);
    try {
      const prediction = await runPrediction(formData);
      setResult(prediction);
      await runRouteIntelligence(prediction.score);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Teslimat riski hesaplanamadı.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompareScenario = async () => {
    if (!result) return;
    setLoading(true);
    setError(null);
    try {
      const scenario = {
        ...formData,
        shipping_mode: "First Class",
        days_scheduled: Math.min(Number(formData.days_scheduled || 0), 2),
        days_real: Math.min(Number(formData.days_real || 0), 2),
      };
      const scenarioResult = await runPrediction(scenario);
      setComparison({ form: scenario, result: scenarioResult });
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Senaryo karşılaştırması tamamlanamadı.");
    } finally {
      setLoading(false);
    }
  };

  const score = result?.score ?? null;
  const adjustedScore = routeIntel?.adjusted_late_risk_pct ?? score;
  const adjustedLevel = riskLevel(adjustedScore);
  const financialExposure = adjustedScore != null ? Number(formData.sales || 0) * Number(formData.quantity || 1) * adjustedScore * 0.3 : 0;
  const routeMapData = routeIntel ? [{
    ...routeIntel,
    riskPct: adjustedScore,
    label: `${routeIntel.origin.name} → ${routeIntel.destination.name}`,
    detail: `Mesafe ${routeIntel.distance_km} km · Tahmini süre ${routeIntel.eta_hours} saat`,
  }] : [];

  return (
    <div className="page-layout">
      <PageIntro eyebrow="Lojistik" title="Teslimat Risk Analizi" onTourStart={() => startTour("logistics")}>
        Sipariş bazında gecikme olasılığını hesaplayın, gerekçeleri görün ve alternatif gönderim senaryosunu gerçek model çağrısıyla karşılaştırın.
      </PageIntro>

      {drilldownContext && (
        <StatusBanner type="warning" title="Kontrol kulesinden gelen filtre">
          {[
            regionLabel(drilldownContext.order_region),
            shippingModeLabel(drilldownContext.shipping_mode),
            categoryLabel(drilldownContext.category),
            drilldownContext.sku,
          ].filter(Boolean).join(" · ")}
        </StatusBanner>
      )}

      {error && (
        <StatusBanner type="error" title="Analiz tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <section id="logistics-guide" className="guide-grid">
        {[
          ["1", "Sipariş bilgisi", "Gönderim, bölge, tutar ve süre bilgilerini girin."],
          ["2", "Model skoru", "Risk oranı ve etkili faktörleri birlikte okuyun."],
          ["3", "Aksiyon", "Gerekirse hızlı gönderim senaryosunu karşılaştırın."],
        ].map(([step, title, text]) => (
          <article key={step} className="guide-card">
            <span className="guide-step">{step}</span>
            <h3 className="guide-title">{title}</h3>
            <p className="guide-text">{text}</p>
          </article>
        ))}
      </section>

      <section className="two-column">
        <form id="logistics-form" className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Sipariş detayları</h2>
              <p className="panel-subtitle">Modelin beklediği operasyon alanları.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Rota analizi</span>
              <select
                className="select"
                value={routeForm.enabled ? "enabled" : "disabled"}
                onChange={(event) => setRouteForm((prev) => ({ ...prev, enabled: event.target.value === "enabled" }))}
              >
                <option value="enabled">Kullanıcı rotasıyla analiz et</option>
                <option value="disabled">Sadece sipariş alanlarıyla analiz et</option>
              </select>
            </label>
            {routeForm.enabled && (
              <>
                <label className="field">
                  <span className="field-label">Hazır rota</span>
                  <select className="select" value={routeForm.preset} onChange={(event) => applyRoutePreset(event.target.value)}>
                    {ROUTE_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                    <option value="custom">Özel koordinat</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Çıkış noktası (Otomatik bul)</span>
                  <input className="input" value={routeForm.originName} onChange={(event) => setRouteField("originName", event.target.value)} onBlur={(event) => fetchCoordinates(event.target.value, "origin")} />
                </label>
                <label className="field">
                  <span className="field-label">Varış noktası (Otomatik bul)</span>
                  <input className="input" value={routeForm.destinationName} onChange={(event) => setRouteField("destinationName", event.target.value)} onBlur={(event) => fetchCoordinates(event.target.value, "destination")} />
                </label>
              </>
            )}
            <label className="field">
              <span className="field-label">Gönderim hızı</span>
              <select className="select" value={formData.shipping_mode} onChange={(event) => setField("shipping_mode", event.target.value)}>
                <option value="Standard Class">Standart</option>
                <option value="Second Class">Ekonomi</option>
                <option value="First Class">Öncelikli</option>
                <option value="Same Day">Aynı gün</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Sipariş bölgesi</span>
              <select className="select" value={formData.order_region} onChange={(event) => setField("order_region", event.target.value)}>
                <option value="Western Europe">Batı Avrupa</option>
                <option value="Eastern Europe">Doğu Avrupa</option>
                <option value="Central America">Orta Amerika</option>
                <option value="South America">Güney Amerika</option>
                <option value="Southeast Asia">Güneydoğu Asya</option>
                <option value="West Africa">Batı Afrika</option>
                <option value="US / Puerto Rico">ABD / Porto Riko</option>
                <option value="LATAM">Latin Amerika</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Planlanan süre</span>
              <input type="number" min={0} className="input" value={formData.days_scheduled} onChange={(event) => setField("days_scheduled", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">Gerçek/beklenen süre</span>
              <input type="number" min={0} className="input" value={formData.days_real} onChange={(event) => setField("days_real", Number(event.target.value))} />
              {formData.days_real > formData.days_scheduled && <span className="field-helper">Gerçek süre planın üzerinde.</span>}
            </label>
            <label className="field">
              <span className="field-label">Kategori</span>
              <select className="select" value={formData.category} onChange={(event) => setField("category", event.target.value)}>
                <option value="Sporting Goods">Spor ürünleri</option>
                <option value="Fan Shop">Taraftar ürünleri</option>
                <option value="Cleats">Krampon</option>
                <option value="Apparel">Giyim</option>
                <option value="Footwear">Ayakkabı</option>
                <option value="Fitness Equipment">Egzersiz ekipmanı</option>
                <option value="Electronics">Elektronik</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Pazar</span>
              <select className="select" value={formData.market} onChange={(event) => setField("market", event.target.value)}>
                <option value="Europe">Avrupa</option>
                <option value="LATAM">Latin Amerika</option>
                <option value="Pacific Asia">Pasifik Asya</option>
                <option value="Africa">Afrika</option>
                <option value="Canada">Kanada</option>
                <option value="USCA">ABD ve Kanada</option>
                <option value="US / Puerto Rico">ABD / Porto Riko</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Sipariş tutarı</span>
              <input type="number" min={0} step={0.01} className="input" value={formData.sales} onChange={(event) => setField("sales", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">Sipariş adedi</span>
              <input type="number" min={1} className="input" value={formData.quantity} onChange={(event) => setField("quantity", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">Sipariş karlılığı</span>
              <input type="number" step={0.01} className="input" value={formData.benefit_per_order} onChange={(event) => setField("benefit_per_order", Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">İndirim oranı: %{Math.round(formData.discount_rate * 100)}</span>
              <input type="range" min={0} max={0.5} step={0.01} value={formData.discount_rate} onChange={(event) => setField("discount_rate", Number(event.target.value))} />
            </label>
          </div>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? <InlineSpinner label={routeLoading ? "Rota sinyali alınıyor" : "Analiz ediliyor"} /> : "Teslimat riskini analiz et"}
          </button>
        </form>

        <div id="logistics-result" className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Karar özeti</h2>
              <p className="panel-subtitle">Skor, etki ve önerilen aksiyon.</p>
            </div>
            {score != null && <span className={`panel-header-badge ${adjustedLevel.cls === "high" ? "red" : adjustedLevel.cls === "medium" ? "amber" : "green"}`}>{adjustedLevel.label}</span>}
          </div>

          {!result ? (
            <EmptyState title="Analiz bekleniyor">
              Formu tamamlayıp risk analizini başlatın. Sonuç geldiğinde gerekçe ve rota görünümü burada açılır.
            </EmptyState>
          ) : (
            <div className="result-stack">
              <div className="decision-score-card">
                <span>Gecikme riski</span>
                <strong style={{ color: adjustedLevel.color }}>{formatPct(adjustedScore)}</strong>
                <p>Tahmini finansal maruziyet: {money(financialExposure)}</p>
              </div>

              {routeIntel && (
                <div className="route-intel-card">
                  <div className="route-intel-head">
                    <div>
                      <span>Canlı rota sinyali</span>
                      <h3>{routeIntel.origin.name} → {routeIntel.destination.name}</h3>
                    </div>
                    <strong>{formatPct(routeIntel.adjusted_late_risk_pct)}</strong>
                  </div>
                  <div className="route-intel-grid">
                    <div><span>Mesafe</span><strong>{routeIntel.distance_km} km</strong></div>
                    <div><span>Tahmini süre</span><strong>{routeIntel.eta_hours} saat</strong></div>
                    <div><span>Hava kaynağı</span><strong>{routeIntel.weather?.status === "online" ? "Canlı" : "Kesintili"}</strong></div>
                  </div>
                  <p>
                    Baz risk {formatPct(routeIntel.base_late_risk_pct)}; rota, mesafe ve hava sinyali sonrası fark {formatPct(Math.abs(routeIntel.risk_delta_pct))}.
                  </p>
                </div>
              )}

              <RecommendedActions score={score} />

              {score >= 0.4 && (
                <button type="button" className="pro-btn-outline" disabled={loading} onClick={handleCompareScenario}>
                  Öncelikli gönderim senaryosunu karşılaştır
                </button>
              )}

              {comparison && (
                <StatusBanner type="success" title="Senaryo karşılaştırması tamamlandı">
                  Mevcut risk {formatPct(adjustedScore)} iken öncelikli gönderim senaryosu {formatPct(comparison.result.score)} risk üretti.
                </StatusBanner>
              )}

              <div className="risk-result-box">
                <div className="panel-title-block">
                  <h3 className="panel-title">Risk faktörleri</h3>
                  <p className="panel-subtitle">Riski artıran veya azaltan model girdileri.</p>
                </div>
                <FactorChart factors={result.factors} />
              </div>
            </div>
          )}
        </div>
      </section>

      {result && (
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Rota görünümü</h2>
              <p className="panel-subtitle">Mevcut sipariş ve varsa karşılaştırılan senaryo aynı haritada gösterilir.</p>
            </div>
          </div>
          <DigitalTwinMap
            zones={[
              {
                order_region: formData.order_region,
                shipping_mode: formData.shipping_mode,
                late_risk_pct: score ?? 0,
                sku: categoryLabel(formData.category),
              },
              ...(comparison ? [{
                order_region: comparison.form.order_region,
                shipping_mode: comparison.form.shipping_mode,
                late_risk_pct: comparison.result.score,
                sku: `${categoryLabel(comparison.form.category)} önerilen`,
              }] : []),
            ]}
            customRoutes={routeMapData}
          />
        </section>
      )}

      {(skuLoading || skuItems.length > 0) && (
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Segmentteki riskli ürünler</h2>
              <p className="panel-subtitle">Kontrol kulesinden gelen bağlam için ürün kodu kırılımı.</p>
            </div>
          </div>
          {skuLoading ? (
            <InlineSpinner label="Ürün kodu listesi yükleniyor" />
          ) : (
            <div className="api-key-list">
              {skuItems.map((item) => (
                <article key={item.sku} className="api-key-card">
                  <div className="api-key-card-main">
                    <div>
                      <div className="api-key-card-title-row">
                        <h3>{item.product_name || item.sku}</h3>
                        <span className="api-key-status active">{formatPct(item.late_risk_pct)}</span>
                      </div>
                      <div className="api-key-meta">
                        <span>{item.sku}</span>
                        <span>{item.order_region}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
