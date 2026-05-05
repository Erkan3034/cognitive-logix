import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { getDrilldownSkus, postPredict } from "../lib/api.js";
import DigitalTwinMap from "../components/DigitalTwinMap";

/* ── Türkçe çeviriler ─────────────────────────────── */
const FACTOR_TR = {
  shipping_mode: "Gönderim Hızı",
  days_for_shipment_scheduled: "Planlanan Sevkiyat Süresi",
  days_for_shipping_real: "Gerçek Teslimat Süresi",
  order_region: "Sipariş Bölgesi",
  category_name: "Ürün Kategorisi",
  category: "Ürün Kategorisi",
  market: "Hedef Pazar",
  sales: "Sipariş Değeri",
  quantity: "Sipariş Miktarı",
  benefit_per_order: "Kâr Marjı",
  customer_segment: "Müşteri Tipi",
  "Shipping Mode": "Gönderim Hızı",
  "Days for shipment Scheduled": "Planlanan Süre",
  "Days for shipment scheduled": "Planlanan Süre",
  "Order Region": "Sipariş Bölgesi",
  "Category Name": "Ürün Kategorisi",
  "Market": "Hedef Pazar",
};
const toTR = (key) => FACTOR_TR[key] || key;

/* ── Risk seviyesi ─────────────────────────────────── */
function getRiskLevel(score) {
  if (score == null) return null;
  if (score > 0.7) return { label: "Yüksek Risk", cls: "high", color: "#ef4444" };
  if (score > 0.4) return { label: "Orta Risk", cls: "med", color: "#f59e0b" };
  return { label: "Düşük Risk", cls: "low", color: "#10b981" };
}

/* ── Yarım daire gauge ─────────────────────────────── */
function RiskGauge({ score }) {
  const pct = Math.round((score ?? 0) * 100);
  const level = getRiskLevel(score);
  const data = [{ name: "Risk", value: pct, fill: level?.color ?? "#6366f1" }];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 200, height: 110 }}>
        <RadialBarChart width={200} height={200} innerRadius={65} outerRadius={95}
          data={data} startAngle={180} endAngle={180 - pct * 1.8}>
          <RadialBar dataKey="value" cornerRadius={6}
            background={{ fill: "rgba(148,163,184,0.1)" }} />
        </RadialBarChart>
        <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: level?.color, lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Gecikme İhtimali</div>
        </div>
      </div>
      <span style={{
        padding: "5px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700,
        background: `${level?.color}18`, color: level?.color,
        border: `1px solid ${level?.color}40`,
      }}>
        {level?.label}
      </span>
    </div>
  );
}

/* ── Kullanıcı dostu sonuç ─────────────────────────── */
function RiskSummaryCard({ score, level }) {
  const pct = Math.round((score ?? 0) * 100);
  const configs = {
    high: {
      icon: "🚨", color: "#ef4444", bg: "rgba(239,68,68,0.06)",
      border: "rgba(239,68,68,0.2)",
      headline: "Bu sipariş gecikme riski taşıyor!",
      text: `Siparişin zamanında ulaşma ihtimali düşük (%${100 - pct}). Şu an harekete geçerseniz teslimattaki aksaklığı önleyebilirsiniz.`,
      actions: [
        { icon: "🚀", text: "Ekspres kargo seçeneğine geçin" },
        { icon: "📞", text: "Müşteriyi önceden bilgilendirin" },
        { icon: "🔄", text: "Alternatif tedarikçi/güzergah araştırın" },
      ],
    },
    med: {
      icon: "⚠️", color: "#f59e0b", bg: "rgba(245,158,11,0.06)",
      border: "rgba(245,158,11,0.2)",
      headline: "Dikkat: Olası gecikme sinyali var",
      text: `Sipariş büyük olasılıkla ulaşır, ancak %${pct} gecikme riski göz ardı edilmemeli.`,
      actions: [
        { icon: "📋", text: "Siparişi takip listesine alın" },
        { icon: "📩", text: "Müşteriye hazırlık mesajı gönderin" },
      ],
    },
    low: {
      icon: "✅", color: "#10b981", bg: "rgba(16,185,129,0.06)",
      border: "rgba(16,185,129,0.2)",
      headline: "Teslimat zamanında gerçekleşecek",
      text: "Sipariş normal seyrinde ilerliyor. Herhangi bir özel önlem almanız gerekmiyor.",
      actions: [
        { icon: "👍", text: "Mevcut planla devam edin" },
      ],
    },
  };
  const c = configs[level?.cls ?? "low"];

  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 14, padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>{c.icon}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: c.color }}>{c.headline}</span>
      </div>
      <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 14px", lineHeight: 1.7 }}>{c.text}</p>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Önerilen Adımlar:</div>
      <div style={{ display: "grid", gap: 6 }}>
        {c.actions.map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", borderRadius: 8,
            background: "rgba(148,163,184,0.05)",
            border: "1px solid rgba(148,163,184,0.1)",
          }}>
            <span style={{ fontSize: 16 }}>{a.icon}</span>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinancialImpactCard({ score, sales, quantity }) {
  if (score == null || score < 0.35) return null; // Sadece orta ve yüksek riskte zarar hesapla
  // Finansal hasar formülü: (Sipariş Değeri * Miktar) * %30 SLA Cezası * Risk İhtimali
  const orderValue = sales * quantity;
  const estimatedPenalty = (orderValue * 0.3 * score).toFixed(2);
  
  return (
    <div style={{ padding: 16, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>⚠️ Tahmini Finansal Hasar (SLA & Envanter)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#ef4444" }}>${estimatedPenalty}</div>
        </div>
        <div style={{ fontSize: 32 }}>💸</div>
      </div>
    </div>
  );
}

/* ── Faktör grafiği ───────────────────────────────── */
function FactorChart({ factors }) {
  if (!factors?.length) return null;
  const data = factors.map(f => ({
    name: toTR(f.feature),
    etki: parseFloat(Math.abs(f.impact).toFixed(3)),
    dir: f.direction,
    tip: f.direction === "raises_risk" ? "Riski Artırıyor" : "Riski Azaltıyor",
  }));

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>
        Riski Etkileyen Başlıca Faktörler
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>
        Bu sipariş için AI modeli hangi değerlerin riski artırdığını veya azalttığını hesapladı.
      </div>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 120)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
          <YAxis dataKey="name" type="category" width={160}
            tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
          <Tooltip content={({ payload }) => payload?.[0] ? (
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px" }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 4 }}>{payload[0].payload.name}</p>
              <p style={{
                color: payload[0].payload.dir === "raises_risk" ? "#ef4444" : "#10b981",
                fontWeight: 700, fontSize: 13, margin: 0
              }}>
                {payload[0].payload.tip}
              </p>
            </div>
          ) : null} />
          <Bar dataKey="etki" radius={[0, 5, 5, 0]}>
            {data.map((e, i) => (
              <Cell key={i}
                fill={e.dir === "raises_risk" ? "#ef4444" : "#10b981"}
                fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: "#ef4444", display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444", display: "inline-block" }} />
          Riski Artırıyor
        </span>
        <span style={{ fontSize: 11, color: "#10b981", display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981", display: "inline-block" }} />
          Riski Azaltıyor
        </span>
      </div>
    </div>
  );
}

export default function Logistics() {
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuItems, setSkuItems] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState(null); // Tutulan eski rota
  const [formData, setFormData] = useState({
    shipping_mode: "Standard Class", order_region: "Western Europe",
    days_scheduled: 4, days_real: 4, category: "Sporting Goods",
    market: "Europe", sales: 150, quantity: 2,
    benefit_per_order: 20, discount_rate: 0.0,
  });

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
    setFormData(p => ({
      ...p,
      order_region: drilldownContext.order_region || p.order_region,
      shipping_mode: drilldownContext.shipping_mode || p.shipping_mode,
      category: drilldownContext.category || p.category,
    }));
  }, [drilldownContext]);

  useEffect(() => {
    let mounted = true;
    if (!drilldownContext) { setSkuItems([]); return () => { mounted = false; }; }
    setSkuLoading(true);
    getDrilldownSkus({ order_region: drilldownContext.order_region, shipping_mode: drilldownContext.shipping_mode, category: drilldownContext.category, limit: 6 })
      .then(d => { if (mounted) setSkuItems(d?.items ?? []); })
      .catch(() => { if (mounted) setSkuItems([]); })
      .finally(() => { if (mounted) setSkuLoading(false); });
    return () => { mounted = false; };
  }, [drilldownContext]);

  function set(key, val) { setFormData(p => ({ ...p, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setOptimizedRoute(null);
    try { setResult(await postPredict({ features: formData })); }
    catch (err) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  }

  async function handleAIOptimize() {
    setLoading(true);
    const originalFormData = { ...formData };
    const originalScore = score;
    
    // AI Önerisi: Kargo hızını First Class yap ve sevkiyat süresini düşür
    const newFormData = { ...formData, shipping_mode: "First Class", days_scheduled: 2, days_real: 2 };
    try { 
      const optimizedResult = await postPredict({ features: newFormData }); 
      setFormData(newFormData);
      setResult(optimizedResult);
      setOptimizedRoute({
        order_region: originalFormData.order_region,
        shipping_mode: originalFormData.shipping_mode,
        late_risk_pct: originalScore
      });
    }
    catch (err) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  }

  const score = result && !result.error ? (result.calibrated_delay_risk ?? result.delay_risk) : null;
  const level = getRiskLevel(score);

  return (
    <div className="page-layout">
      {/* Header */}
      <header className="page-header">
        <span className="page-eyebrow">Lojistik Modülü</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Sipariş Teslimat Risk Analizi</h1>
            <p className="page-subtitle">
              Siparişin zamanında ulaşıp ulaşmayacağını yapay zeka ile önceden öğrenin ve gerekli önlemi alın.
            </p>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Bu Modül Ne İşe Yarar?</h2>
            <p className="panel-subtitle">Siparişi onaylamadan önce teslimat riskini öğrenin</p>
          </div>
          <span className="panel-header-badge blue">3 Adım</span>
        </div>
        <div className="guide-grid">
          {[
            { icon: "📝", step: "1", title: "Sipariş Bilgilerini Girin", desc: "Kargo tipi, bölge ve sipariş değeri gibi temel bilgileri soldaki forma girin." },
            { icon: "🤖", step: "2", title: "Yapay Zeka Analiz Eder", desc: "Sistem bu siparişin geç kalıp kalmayacağını geçmiş binlerce siparişten öğrendiği kalıplarla tahmin eder." },
            { icon: "⚡", step: "3", title: "Önlem Alın", desc: "Yüksek risk çıkarsa hemen alternatif kargo seçin veya müşteriyi bilgilendirin." },
          ].map((s, i) => (
            <article key={i} className="guide-card">
              <span className="guide-step">{s.icon}</span>
              <h3 className="guide-title"><strong style={{ color: "#6366f1" }}>{s.step}.</strong> {s.title}</h3>
              <p className="guide-text">{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Drilldown alert */}
      {drilldownContext && (
        <div style={{
          marginBottom: 16, padding: "12px 18px", borderRadius: 10,
          background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ fontSize: 13, color: "#fbbf24", fontWeight: 600 }}>Kontrol Kulesinden Yönlendirildiniz:</span>
          {drilldownContext.order_region && <span className="chip">📍 {drilldownContext.order_region}</span>}
          {drilldownContext.shipping_mode && <span className="chip">🚚 {drilldownContext.shipping_mode}</span>}
          {drilldownContext.category && <span className="chip">📦 {drilldownContext.category}</span>}
        </div>
      )}

      {/* Main content */}
      <section className="two-column">
        {/* Form */}
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Sipariş Detayları</h2>
              <p className="panel-subtitle">Analiz edilecek siparişin bilgileri</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Kargo Hızı</label>
              <select className="select" value={formData.shipping_mode} onChange={e => set("shipping_mode", e.target.value)}>
                <option value="Standard Class">Standart (3-5 gün)</option>
                <option value="Second Class">Ekonomi (4-7 gün)</option>
                <option value="First Class">Hızlı (2-3 gün)</option>
                <option value="Same Day">Aynı Gün</option>
              </select>
              <span className="field-helper">Seçtiğiniz kargo hızı teslimat riskini doğrudan etkiler.</span>
            </div>
            <div className="field">
              <label className="field-label">Teslimat Bölgesi</label>
              <input className="input" value={formData.order_region}
                onChange={e => set("order_region", e.target.value)} placeholder="örn. Western Europe" />
            </div>
            <div className="field">
              <label className="field-label">Tahmini Sevkiyat Süresi (gün)</label>
              <input type="number" min={0} className="input" value={formData.days_scheduled}
                onChange={e => set("days_scheduled", Number(e.target.value))} />
              <span className="field-helper">Siparişi teslim etmek için planladığınız gün sayısı.</span>
            </div>
            <div className="field">
              <label className="field-label">Gerçek Sevkiyat Süresi (gün)</label>
              <input type="number" min={0} className="input" value={formData.days_real}
                onChange={e => set("days_real", Number(e.target.value))} />
              <span className="field-helper" style={{ color: formData.days_real > formData.days_scheduled ? "#ef4444" : undefined }}>
                {formData.days_real > formData.days_scheduled ? "⚠ Gerçek süre plandan uzun — gecikme mevcut!" : "Fiilen geçen veya beklenen gerçek süre."}
              </span>
            </div>
            <div className="field">
              <label className="field-label">Ürün Kategorisi</label>
              <input className="input" value={formData.category} onChange={e => set("category", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Pazar / Ülke Grubu</label>
              <input className="input" value={formData.market} onChange={e => set("market", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Sipariş Tutarı ($)</label>
              <input type="number" min={0} step={0.01} className="input" value={formData.sales}
                onChange={e => set("sales", Number(e.target.value))} />
            </div>
            <div className="field">
              <label className="field-label">Sipariş Başına Kâr ($)</label>
              <input type="number" step={0.01} className="input" value={formData.benefit_per_order}
                onChange={e => set("benefit_per_order", Number(e.target.value))} />
              <span className="field-helper" style={{ color: formData.benefit_per_order < 0 ? "#ef4444" : undefined }}>
                {formData.benefit_per_order < 0 ? "⚠ Zarar eden sipariş!" : "Net kâr tutarı (negatif = zarar)."}
              </span>
            </div>
            <div className="field">
              <label className="field-label">Sipariş Adedi</label>
              <input type="number" min={1} className="input" value={formData.quantity}
                onChange={e => set("quantity", Number(e.target.value))} />
            </div>
            <div className="field">
              <label className="field-label">
                İndirim Oranı: <strong style={{ color: formData.discount_rate > 0.25 ? "#ef4444" : "var(--accent)" }}>
                  %{Math.round(formData.discount_rate * 100)}
                </strong>
              </label>
              <input type="range" min={0} max={0.5} step={0.01}
                value={formData.discount_rate}
                onChange={e => set("discount_rate", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
            </div>
          </div>
          <button type="submit" className="btn btn-full" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "⟳ Analiz ediliyor..." : "🔍 Teslimat Riskini Analiz Et"}
          </button>
        </form>

        {/* Result panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Analiz Sonucu</h2>
              <p className="panel-subtitle">Yapay zeka değerlendirmesi</p>
            </div>
          </div>

          {!result ? (
            <div className="empty-state">
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <div className="empty-state-title">Sipariş analizi bekleniyor</div>
              <div className="empty-state-desc">
                Soldaki formu doldurun ve <strong>"Teslimat Riskini Analiz Et"</strong> butonuna basın.
              </div>
            </div>
          ) : result.error ? (
            <div style={{ padding: 16, background: "rgba(239,68,68,0.08)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)" }}>
              <p style={{ color: "#ef4444", margin: 0 }}>Bağlantı hatası. Lütfen tekrar deneyin.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Gauge */}
              <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 8px" }}>
                <RiskGauge score={score} />
              </div>

              {/* Financial Impact */}
              <FinancialImpactCard score={score} sales={formData.sales} quantity={formData.quantity} />

              {/* User-friendly summary */}
              <RiskSummaryCard score={score} level={level} />

              {/* AI Optimize Button */}
              {score > 0.5 && !optimizedRoute && (
                <button 
                  onClick={handleAIOptimize}
                  disabled={loading}
                  className="btn" 
                  style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)", border: "none", width: "100%", padding: "12px", fontSize: "14px", fontWeight: "700" }}
                >
                  ✨ AI Rota Optimizasyonu Uygula
                </button>
              )}

              {/* Factor chart */}
              {result.top_factors?.length > 0 && (
                <div className="risk-result-box">
                  <FactorChart factors={result.top_factors} />
                </div>
              )}

              {/* SKU list if drilldown */}
              {skuItems.length > 0 && (
                <div className="risk-result-box">
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>
                    📋 Bu Segmentteki Riskli Ürünler
                  </div>
                  {skuItems.map(item => (
                    <div key={item.sku} style={{ display: "flex", justifyContent: "space-between",
                      padding: "8px 0", borderBottom: "1px solid rgba(148,163,184,0.08)", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{item.product_name}</div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>{item.sku}</div>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 12,
                        background: item.late_risk_pct > 0.6 ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                        color: item.late_risk_pct > 0.6 ? "#ef4444" : "#f59e0b",
                      }}>
                        %{(item.late_risk_pct * 100).toFixed(0)} risk
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="risk-result-box" style={{ padding: "0", overflow: "hidden", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>🌐 Sipariş Güzergah Simülasyonu</div>
                  {optimizedRoute && <div style={{ fontSize: 11, color: "#10b981", fontWeight: "bold" }}>✨ AI Optimizasyonu Aktif</div>}
                </div>
                <DigitalTwinMap 
                  zones={[
                    ...(optimizedRoute ? [{
                      order_region: optimizedRoute.order_region,
                      shipping_mode: optimizedRoute.shipping_mode,
                      late_risk_pct: optimizedRoute.late_risk_pct,
                      sku: formData.category + " (Eski Rota)"
                    }] : []),
                    { 
                      order_region: formData.order_region, 
                      shipping_mode: formData.shipping_mode,
                      late_risk_pct: score ?? 0, 
                      sku: formData.category + (optimizedRoute ? " (Önerilen)" : "")
                    }
                  ]} 
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
