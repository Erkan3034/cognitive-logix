import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getDrilldownSkus, postPredict } from "../lib/api.js";

/* ── Helpers ─────────────────────────────────── */
function getRiskLevel(score) {
  if (score == null) return null;
  if (score > 0.7) return { label: "Yüksek Risk", cls: "high" };
  if (score > 0.4) return { label: "Orta Risk",   cls: "med" };
  return            { label: "Düşük Risk",  cls: "low" };
}

/* ── Risk Gauge Component ────────────────────── */
function RiskGauge({ score }) {
  const pct   = Math.round(score * 100);
  const level = getRiskLevel(score);

  return (
    <div className="risk-result-box">
      <div className="risk-score-header">
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Gecikme Riski Skoru</div>
          <div className={`risk-score-number ${level.cls}`}>{pct}<span style={{ fontSize: 22, fontWeight: 500 }}>%</span></div>
        </div>
        <span className={`risk-badge ${level.cls}`}>{level.label}</span>
      </div>

      <div>
        <div className="risk-bar-track">
          <div className={`risk-bar-fill ${level.cls}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="risk-label-row">
          <span>0%</span>
          <span>Düşük (&lt;40%)</span>
          <span>Orta</span>
          <span>Yüksek (&gt;70%)</span>
          <span>100%</span>
        </div>
      </div>

      <p className="card-caption">
        {level.cls === "high"
          ? "Bu siparis zamaninda ulasmama riski tasiyor. Alternatif tasiyici veya guzergah degerlendirin."
          : level.cls === "med"
            ? "Orta duzeyde gecikme riski var. Takip ve proaktif musteri bildirimi onerilir."
            : "Musteri teslimati buyuk olasilikla zamaninda gerceklesecek."}
      </p>
    </div>
  );
}

/* ── Empty State ─────────────────────────────── */
function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">LOJ</div>
      <div className="empty-state-title">Henüz sonuç yok</div>
      <div className="empty-state-desc">
        Soldaki formu doldurun ve "Gecikme Riskini Puanla" butonuna basın.
      </div>
    </div>
  );
}

export default function Logistics() {
  const [searchParams] = useSearchParams();
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [skuLoading, setSkuLoading] = useState(false);
  const [skuItems, setSkuItems] = useState([]);
  const [skuError, setSkuError] = useState(null);
  const [formData, setFormData] = useState({
    shipping_mode:  "Standard Class",
    order_region:   "Western Europe",
    days_scheduled: 4,
    category:       "Sporting Goods",
    market:         "Europe",
    sales:          150,
    quantity:       2,
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
      setSkuError(null);
      return () => {
        mounted = false;
      };
    }

    setSkuLoading(true);
    setSkuError(null);
    getDrilldownSkus({
      order_region: drilldownContext.order_region,
      shipping_mode: drilldownContext.shipping_mode,
      category: drilldownContext.category,
      limit: 8,
    })
      .then((data) => {
        if (!mounted) return;
        setSkuItems(data?.items ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setSkuItems([]);
        setSkuError("SKU listesi yuklenemedi.");
      })
      .finally(() => {
        if (mounted) setSkuLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [drilldownContext]);

  function set(key, val) {
    setFormData((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postPredict({ features: formData });
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Modül A · Tahmine Dayalı Lojistik</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Teslimat Gecikme Tahmini</h1>
            <p className="page-subtitle">
              Siparişleri yerine getirmeden önce gecikme riskine göre puanlayın; proaktif olarak taşıyıcı, güzergâh veya hizmet seviyesini değiştirin.
            </p>
          </div>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Kullanim Akisi</h2>
            <p className="panel-subtitle">Operasyon ekibinin risk puanini aksiyona cevirmesi icin net adimlar.</p>
          </div>
          <span className="panel-header-badge blue">3 Adim</span>
        </div>
        <div className="guide-grid">
          <article className="guide-card">
            <span className="guide-step">1</span>
            <h3 className="guide-title">Siparis Ozelliklerini Girin</h3>
            <p className="guide-text">Sevkiyat modu, bolge ve ticari degerler dogru girildiginde model guvenilir skor uretir.</p>
          </article>
          <article className="guide-card">
            <span className="guide-step">2</span>
            <h3 className="guide-title">Risk Seviyesini Degerlendirin</h3>
            <p className="guide-text">Skor cubugunda dusuk, orta ve yuksek bolgeyi okuyarak teslimat baskisini hizla anlayin.</p>
          </article>
          <article className="guide-card">
            <span className="guide-step">3</span>
            <h3 className="guide-title">Onleyici Karar Alin</h3>
            <p className="guide-text">Yuksek riskte tasiyici degisimi, rota guncellemesi veya hizmet seviyesi revizyonu planlayin.</p>
          </article>
        </div>
      </section>

      {drilldownContext && (
        <section className="panel" aria-label="Drill-down filtre ozeti">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Drill-down Sonucu</h2>
              <p className="panel-subtitle">Kontrol Kulesi risk bolgesinden otomatik filtreyle geldiniz.</p>
            </div>
            <span className="panel-header-badge amber">Progressive Disclosure</span>
          </div>
          <div className="chip-row" style={{ marginBottom: 10 }}>
            {drilldownContext.order_region && <span className="chip">Bolge: {drilldownContext.order_region}</span>}
            {drilldownContext.shipping_mode && <span className="chip">Tasima: {drilldownContext.shipping_mode}</span>}
            {drilldownContext.category && <span className="chip">Kategori: {drilldownContext.category}</span>}
            {drilldownContext.sku && <span className="chip risk-med">SKU: {drilldownContext.sku}</span>}
          </div>
          <div className="quick-note">
            <strong>SKU Odakli Inceleme:</strong> Bu filtre ile acilan siparis, ayni bolgedeki SKU risk grubu icinde oncelikli olarak isaretlendi.
          </div>

          <div className="divider" />
          <div className="panel-title-block" style={{ marginBottom: 8 }}>
            <h3 className="panel-title" style={{ fontSize: 14 }}>Gercek SKU Listesi</h3>
            <p className="panel-subtitle">Bu liste backend drill-down endpointinden canli cekilmektedir.</p>
          </div>

          {skuLoading ? (
            <div className="chip-row">
              <span className="chip">SKU listesi yukleniyor...</span>
            </div>
          ) : skuError ? (
            <div className="chip-row">
              <span className="chip risk-high">{skuError}</span>
            </div>
          ) : skuItems.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {skuItems.map((item) => (
                <div key={`${item.sku}-${item.sample_order_id}`} className="alert-item" style={{ animation: "none" }}>
                  <span className={`alert-indicator ${item.late_risk_pct > 0.66 ? "red" : item.late_risk_pct > 0.4 ? "amber" : "green"}`} />
                  <div className="alert-body">
                    <div className="alert-title">{item.sku} · {item.product_name}</div>
                    <div className="alert-desc">
                      Gecikme riski: {(item.late_risk_pct * 100).toFixed(1)}% · Ortalama satis: ${item.avg_sales_usd.toFixed(1)} · Ornek siparis: #{item.sample_order_id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="chip-row">
              <span className="chip">Filtreye uygun SKU bulunamadi.</span>
            </div>
          )}
        </section>
      )}

      <section className="two-column">
        {/* Form */}
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Sipariş Bilgileri</h2>
              <p className="panel-subtitle">XGBoost modeli tarafından kullanılan temel operasyonel özellikler.</p>
            </div>
            <span className="panel-header-badge blue">XGBoost</span>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Sevkiyat Modu</label>
              <select className="select" value={formData.shipping_mode}
                onChange={(e) => set("shipping_mode", e.target.value)}>
                <option>Standard Class</option>
                <option>Second Class</option>
                <option>First Class</option>
                <option>Same Day</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Sipariş Bölgesi</label>
              <input className="input" value={formData.order_region}
                onChange={(e) => set("order_region", e.target.value)}
                placeholder="ör. Western Europe" />
            </div>

            <div className="field">
              <label className="field-label">Planlanan Sevkiyat (gün)</label>
              <input type="number" min={0} className="input" value={formData.days_scheduled}
                onChange={(e) => set("days_scheduled", Number(e.target.value))} />
              <span className="field-helper">Sipariş tarihinden taahhüt edilen sevk tarihine kadar.</span>
            </div>

            <div className="field">
              <label className="field-label">Ürün Kategorisi</label>
              <input className="input" value={formData.category}
                onChange={(e) => set("category", e.target.value)} />
            </div>

            <div className="field">
              <label className="field-label">Pazar</label>
              <input className="input" value={formData.market}
                onChange={(e) => set("market", e.target.value)} />
            </div>

            <div className="field">
              <label className="field-label">Sipariş Tutarı ($)</label>
              <input type="number" min={0} step={0.01} className="input" value={formData.sales}
                onChange={(e) => set("sales", Number(e.target.value))} />
            </div>

            <div className="field">
              <label className="field-label">Miktar</label>
              <input type="number" min={1} className="input" value={formData.quantity}
                onChange={(e) => set("quantity", Number(e.target.value))} />
            </div>
          </div>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading
              ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Puanlaniyor…</>
              : "Gecikme Riskini Puanla"}
          </button>
        </form>

        {/* Result */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Model Çıktısı</h2>
              <p className="panel-subtitle">Gerçek zamanlı risk skoru ve öneri.</p>
            </div>
          </div>

          {result ? (
            result.error ? (
              <div style={{ padding: "12px", background: "var(--risk-high-soft)", borderRadius: "var(--radius-md)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <p className="badge-negative" style={{ fontSize: 13 }}>❌ {result.error}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <RiskGauge score={result.delay_risk} />
                <details className="result-details">
                  <summary>Tam API Yaniti</summary>
                  <pre className="result-code">{JSON.stringify(result, null, 2)}</pre>
                </details>
              </div>
            )
          ) : (
            <EmptyState />
          )}
        </div>
      </section>
    </div>
  );
}
