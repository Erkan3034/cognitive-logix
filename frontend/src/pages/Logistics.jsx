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
import { getDrilldownSkus, postPredict } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

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
  Market: "Pazar",
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
        : ["Mevcut planla devam edin.", "Standart teslimat bildirimlerini sürdürün.", "Aynı segmentteki riskli SKU'ları periyodik izleyin."];

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
    try {
      setResult(await runPrediction(formData));
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
  const level = riskLevel(score);
  const financialExposure = score != null ? Number(formData.sales || 0) * Number(formData.quantity || 1) * score * 0.3 : 0;

  return (
    <div className="page-layout">
      <PageIntro eyebrow="Lojistik" title="Teslimat Risk Analizi">
        Sipariş bazında gecikme olasılığını hesaplayın, gerekçeleri görün ve alternatif gönderim senaryosunu gerçek model çağrısıyla karşılaştırın.
      </PageIntro>

      {drilldownContext && (
        <StatusBanner type="warning" title="Kontrol kulesinden gelen filtre">
          {[
            drilldownContext.order_region,
            drilldownContext.shipping_mode,
            drilldownContext.category,
            drilldownContext.sku,
          ].filter(Boolean).join(" · ")}
        </StatusBanner>
      )}

      {error && (
        <StatusBanner type="error" title="Analiz tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <section className="guide-grid">
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
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Sipariş detayları</h2>
              <p className="panel-subtitle">Modelin beklediği operasyon alanları.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Gönderim hızı</span>
              <select className="select" value={formData.shipping_mode} onChange={(event) => setField("shipping_mode", event.target.value)}>
                <option value="Standard Class">Standard Class</option>
                <option value="Second Class">Second Class</option>
                <option value="First Class">First Class</option>
                <option value="Same Day">Same Day</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Sipariş bölgesi</span>
              <input className="input" value={formData.order_region} onChange={(event) => setField("order_region", event.target.value)} />
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
              <input className="input" value={formData.category} onChange={(event) => setField("category", event.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Pazar</span>
              <input className="input" value={formData.market} onChange={(event) => setField("market", event.target.value)} />
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
            {loading ? <InlineSpinner label="Analiz ediliyor" /> : "Teslimat riskini analiz et"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Karar özeti</h2>
              <p className="panel-subtitle">Skor, etki ve önerilen aksiyon.</p>
            </div>
            {score != null && <span className={`panel-header-badge ${level.cls === "high" ? "red" : level.cls === "medium" ? "amber" : "green"}`}>{level.label}</span>}
          </div>

          {!result ? (
            <EmptyState title="Analiz bekleniyor">
              Formu tamamlayıp risk analizini başlatın. Sonuç geldiğinde gerekçe ve rota görünümü burada açılır.
            </EmptyState>
          ) : (
            <div className="result-stack">
              <div className="decision-score-card">
                <span>Gecikme riski</span>
                <strong style={{ color: level.color }}>{formatPct(score)}</strong>
                <p>Tahmini finansal maruziyet: {money(financialExposure)}</p>
              </div>

              <RecommendedActions score={score} />

              {score >= 0.4 && (
                <button type="button" className="pro-btn-outline" disabled={loading} onClick={handleCompareScenario}>
                  First Class senaryosunu karşılaştır
                </button>
              )}

              {comparison && (
                <StatusBanner type="success" title="Senaryo karşılaştırması tamamlandı">
                  Mevcut risk {formatPct(score)} iken First Class senaryosu {formatPct(comparison.result.score)} risk üretti.
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
                sku: formData.category,
              },
              ...(comparison ? [{
                order_region: comparison.form.order_region,
                shipping_mode: comparison.form.shipping_mode,
                late_risk_pct: comparison.result.score,
                sku: `${comparison.form.category} önerilen`,
              }] : []),
            ]}
          />
        </section>
      )}

      {(skuLoading || skuItems.length > 0) && (
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Segmentteki riskli ürünler</h2>
              <p className="panel-subtitle">Kontrol kulesinden gelen bağlam için SKU kırılımı.</p>
            </div>
          </div>
          {skuLoading ? (
            <InlineSpinner label="SKU listesi yükleniyor" />
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
