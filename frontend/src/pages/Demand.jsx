import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { postForecast } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="usage-tooltip">
      <strong>{label}</strong>
      <span>{Math.round(row.forecast)} adet</span>
      <small>{Math.round(row.lower)} - {Math.round(row.upper)} aralığı</small>
    </div>
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

function StockDecision({ result }) {
  if (!result) return null;
  const reorder = result.reorder_recommendation ?? {};
  const shouldReorder = Boolean(reorder.should_reorder);
  const orderQty = Math.max(0, Math.round(reorder.recommended_order_quantity ?? 0));
  const safetyStock = Math.max(0, Math.round(result.safety_stock ?? 0));
  const reorderPoint = Math.max(0, Math.round(result.reorder_point ?? 0));
  const tone = shouldReorder ? "warning" : "success";

  return (
    <StatusBanner type={tone} title={shouldReorder ? "Satın alma aksiyonu gerekli" : "Stok seviyesi yeterli görünüyor"}>
      <div className="decision-metric-grid">
        <div>
          <span>Güvenlik stoğu</span>
          <strong>{formatNumber(safetyStock)}</strong>
        </div>
        <div>
          <span>Sipariş tetik noktası</span>
          <strong>{formatNumber(reorderPoint)}</strong>
        </div>
        <div>
          <span>Önerilen sipariş</span>
          <strong>{orderQty > 0 ? formatNumber(orderQty) : "Gerek yok"}</strong>
        </div>
      </div>
    </StatusBanner>
  );
}

export default function Demand() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [horizon, setHorizon] = useState(30);
  const [category, setCategory] = useState("");
  const [market, setMarket] = useState("");
  const [orderRegion, setOrderRegion] = useState("");
  const [sku, setSku] = useState("");
  const [currentInventory, setCurrentInventory] = useState(0);
  const [leadTimeDays, setLeadTimeDays] = useState(7);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await postForecast({
        horizon,
        category: category || null,
        market: market || null,
        order_region: orderRegion || null,
        sku: sku || null,
        current_inventory: Number(currentInventory) || 0,
        service_level: 0.95,
        lead_time_days: Number(leadTimeDays) || 7,
        series: [],
      });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Talep tahmini oluşturulamadı.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const points = result?.points ?? [];
    const step = Math.max(1, Math.floor(points.length / 36));
    return points
      .filter((_, index) => index % step === 0)
      .map((point) => ({
        date: String(point.ds || "").slice(5),
        forecast: Math.max(0, Number(point.yhat ?? 0)),
        lower: Math.max(0, Number(point.yhat_lower ?? 0)),
        upper: Math.max(0, Number(point.yhat_upper ?? 0)),
      }));
  }, [result]);

  const summary = useMemo(() => {
    if (!chartData.length) return null;
    const avg = chartData.reduce((sum, item) => sum + item.forecast, 0) / chartData.length;
    const peak = Math.max(...chartData.map((item) => item.upper));
    const low = Math.min(...chartData.map((item) => item.lower));
    return { avg, peak, low };
  }, [chartData]);

  return (
    <div className="page-layout">
      <PageIntro eyebrow="Talep tahmini" title="Stok ve Talep Planlama">
        Ürün, pazar ve stok bilgisini kullanarak talep tahmini üretin; güven aralığı, güvenlik stoğu ve sipariş tetik noktasını birlikte değerlendirin.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Tahmin tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <section className="guide-grid">
        {[
          ["1", "Tahmin kapsamı", "Ürün, bölge ve dönem bilgisini seçin."],
          ["2", "Güven aralığı", "Tahmin çizgisini alt ve üst bantla birlikte okuyun."],
          ["3", "Stok kararı", "Güvenlik stoğu ve önerilen sipariş miktarını uygulayın."],
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
              <h2 className="panel-title">Tahmin ayarları</h2>
              <p className="panel-subtitle">Modelin tahmin ve stok hesaplaması için kullandığı alanlar.</p>
            </div>
          </div>

          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            <label className="field">
              <span className="field-label">Tahmin dönemi: {horizon} gün</span>
              <input type="range" min={7} max={90} value={horizon} onChange={(event) => setHorizon(Number(event.target.value))} />
              <span className="field-helper">Kısa vadeli operasyon için 14-30 gün, planlama için 45-90 gün önerilir.</span>
            </label>
            <label className="field">
              <span className="field-label">Ürün kategorisi</span>
              <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="">Tüm kategoriler</option>
                <option value="Fan Shop">Fan Shop</option>
                <option value="Sporting Goods">Sporting Goods</option>
                <option value="Cleats">Cleats</option>
                <option value="Women's Apparel">Women's Apparel</option>
                <option value="Men's Footwear">Men's Footwear</option>
                <option value="Fishing">Fishing</option>
                <option value="Water Sports">Water Sports</option>
                <option value="Camping & Hiking">Camping & Hiking</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Pazar</span>
              <select className="select" value={market} onChange={(event) => setMarket(event.target.value)}>
                <option value="">Tüm pazarlar</option>
                <option value="Europe">Europe</option>
                <option value="US / Puerto Rico">US / Puerto Rico</option>
                <option value="LATAM">LATAM</option>
                <option value="Pacific Asia">Pacific Asia</option>
                <option value="Africa">Africa</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Alt bölge</span>
              <input className="input" value={orderRegion} onChange={(event) => setOrderRegion(event.target.value)} placeholder="Örn. Western Europe" />
            </label>
            <label className="field">
              <span className="field-label">SKU</span>
              <input className="input" value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Örn. 1360" />
            </label>
            <label className="field">
              <span className="field-label">Mevcut stok</span>
              <input type="number" min={0} className="input" value={currentInventory} onChange={(event) => setCurrentInventory(Number(event.target.value))} />
            </label>
            <label className="field">
              <span className="field-label">Tedarik süresi</span>
              <input type="number" min={1} className="input" value={leadTimeDays} onChange={(event) => setLeadTimeDays(Number(event.target.value))} />
            </label>
          </div>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? <InlineSpinner label="Tahmin hesaplanıyor" /> : "Talep tahmini oluştur"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Tahmin sonucu</h2>
              <p className="panel-subtitle">Güven aralığı ve stok kararı.</p>
            </div>
            {chartData.length > 0 && <span className="panel-header-badge green">Hazır</span>}
          </div>

          {!result ? (
            <EmptyState title="Tahmin bekleniyor">
              Tahmini başlattığınızda grafik, güven aralığı ve satın alma aksiyonu burada görünür.
            </EmptyState>
          ) : chartData.length === 0 ? (
            <EmptyState title="Tahmin noktası bulunamadı">
              Parametreleri genişletip tekrar deneyin.
            </EmptyState>
          ) : (
            <div className="result-stack">
              {summary && (
                <div className="decision-metric-grid">
                  <div>
                    <span>Ortalama talep</span>
                    <strong>{formatNumber(summary.avg)}</strong>
                  </div>
                  <div>
                    <span>Üst senaryo</span>
                    <strong>{formatNumber(summary.peak)}</strong>
                  </div>
                  <div>
                    <span>Alt senaryo</span>
                    <strong>{formatNumber(summary.low)}</strong>
                  </div>
                </div>
              )}

              <div className="chart-wrapper" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#71717a" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="upper" stroke="rgba(245,158,11,0.38)" fill="url(#forecastBand)" dot={false} />
                    <Area type="monotone" dataKey="forecast" stroke="#ffffff" strokeWidth={2.5} fill="transparent" dot={false} />
                    <Area type="monotone" dataKey="lower" stroke="rgba(148,163,184,0.52)" strokeDasharray="4 3" fill="transparent" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <StockDecision result={result} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
