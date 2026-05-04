import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { postForecast } from "../lib/api.js";

/* ── Chart tooltip ─────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const tahmin = payload.find(p => p.dataKey === "tahmin");
  const ust = payload.find(p => p.dataKey === "ustSinir");
  const alt = payload.find(p => p.dataKey === "altSinir");
  return (
    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", minWidth: 160 }}>
      <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>{label}</p>
      {tahmin && <p style={{ fontSize: 13, fontWeight: 700, color: "#818cf8", margin: "2px 0" }}>Tahmin: {Number(tahmin.value).toFixed(0)} adet</p>}
      {ust && <p style={{ fontSize: 11, color: "#f59e0b", margin: "2px 0" }}>En fazla: {Number(ust.value).toFixed(0)} adet</p>}
      {alt && <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0" }}>En az: {Number(alt.value).toFixed(0)} adet</p>}
    </div>
  );
}

/* ── Stok durum kartı ──────────────────────────────── */
function StockDecisionCard({ result }) {
  const reorder = result?.reorder_recommendation;
  const safetyStock = Math.round(result?.safety_stock ?? 0);
  const orderQty = Math.round(reorder?.recommended_order_quantity ?? 0);
  const shouldReorder = reorder?.should_reorder;
  const leadTime = result?.lead_time_days ?? 7;
  const color = shouldReorder ? "#ef4444" : "#10b981";
  const icon = shouldReorder ? "🔴" : "🟢";

  return (
    <div style={{
      background: `${color}08`, border: `1px solid ${color}25`,
      borderRadius: 14, padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color, marginBottom: 4 }}>
            {shouldReorder ? "Stok Kritik Seviyede — Sipariş Vermeniz Gerekiyor!" : "Stok Durumunuz İyi Görünüyor"}
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
            {shouldReorder
              ? `Talep tahminlerimize göre mevcut stoğunuz yetersiz kalabilir. Temin süresi yaklaşık ${leadTime} gün olduğunu düşünürseniz, şimdi sipariş vermeniz idealdir.`
              : "Mevcut stoğunuz yakın dönem talep tahminlerini karşılayabilir durumda. Rutin takibinize devam edin."}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: shouldReorder ? 14 : 0 }}>
        {[
          { label: "Güvenlik Stoğu", value: safetyStock + " adet", tip: "Beklenmedik talep artışlarına karşı tutmanız gereken minimum stok." },
          { label: "Sipariş Tetik Noktası", value: Math.round(result?.reorder_point ?? 0) + " adet", tip: "Stoğunuz bu seviyeye düşünce sipariş verin." },
          { label: "Önerilen Sipariş", value: orderQty ? orderQty + " adet" : "—", tip: "Bir sonraki dönem için sipariş etmenizi önerdiğimiz miktar." },
        ].map(m => (
          <div key={m.label} title={m.tip} style={{
            background: "rgba(148,163,184,0.05)", border: "1px solid rgba(148,163,184,0.1)",
            borderRadius: 10, padding: "12px 14px", cursor: "help",
          }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {shouldReorder && orderQty > 0 && (
        <div style={{
          padding: "12px 16px", background: "rgba(239,68,68,0.06)",
          borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <div style={{ fontSize: 12, color: "#fca5a5", lineHeight: 1.7 }}>
            ⚡ <strong>Önerimiz:</strong> En kısa sürede <strong style={{ color: "#ef4444" }}>{orderQty} adet</strong> sipariş verin.
            Tedarik süreniz ~{leadTime} gün olduğuna göre bugün harekete geçin.
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tahmin özet kutuları ──────────────────────────── */
function ForecastSummaryBadges({ chartData, horizon }) {
  if (!chartData.length) return null;
  const avg = (chartData.reduce((s, d) => s + d.tahmin, 0) / chartData.length).toFixed(0);
  const peak = Math.max(...chartData.map(d => d.ustSinir)).toFixed(0);
  const low = Math.min(...chartData.map(d => d.altSinir)).toFixed(0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
      {[
        { label: "Günlük Ortalama Talep", value: avg + " adet", color: "#6366f1", icon: "📊", tip: "Seçilen dönemde günde ortalama bu kadar ürün satılması bekleniyor." },
        { label: "Zirve Senaryo", value: peak + " adet", color: "#f59e0b", icon: "📈", tip: "En yüksek talep senaryosunda günlük bu kadar ürün talep edilebilir." },
        { label: "Düşük Senaryo", value: low + " adet", color: "#10b981", icon: "📉", tip: "En düşük talep senaryosunda beklenen günlük miktar." },
      ].map(b => (
        <div key={b.label} title={b.tip} style={{
          background: `${b.color}0d`, border: `1px solid ${b.color}25`,
          borderRadius: 10, padding: "14px 16px", cursor: "help",
        }}>
          <div style={{ fontSize: 16, marginBottom: 4 }}>{b.icon}</div>
          <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{b.label}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: b.color }}>{b.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function Demand() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState(30);
  const [category, setCategory] = useState("");
  const [market, setMarket] = useState("");
  const [orderRegion, setOrderRegion] = useState("");
  const [sku, setSku] = useState("");
  const [currentInventory, setCurrentInventory] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      setResult(await postForecast({
        horizon, category: category || null, market: market || null,
        order_region: orderRegion || null, sku: sku || null,
        current_inventory: Number(currentInventory) || 0,
        service_level: 0.95, lead_time_days: 7, series: [],
      }));
    } catch (err) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  }

  const chartData = (() => {
    const pts = result?.points ?? [];
    const step = Math.max(1, Math.floor(pts.length / 30));
    return pts.filter((_, i) => i % step === 0).map(p => ({
      ds: p.ds.slice(5),
      tahmin: Math.max(0, parseFloat((p.yhat ?? 0).toFixed(1))),
      altSinir: Math.max(0, parseFloat((p.yhat_lower ?? 0).toFixed(1))),
      ustSinir: Math.max(0, parseFloat((p.yhat_upper ?? 0).toFixed(1))),
    }));
  })();

  const horizonLabel = horizon <= 14 ? "Kısa vadeli" : horizon <= 45 ? "Orta vadeli" : "Uzun vadeli";

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Talep Tahmini Modülü</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Ne Kadar Ürün Satacağız?</h1>
            <p className="page-subtitle">
              Yapay zeka, geçmiş satış verilerinden yola çıkarak önümüzdeki günlerde ne kadar ürün talep
              edileceğini tahmin eder — böylece stoğunuzu önceden planlarsınız.
            </p>
          </div>
        </div>
      </header>

      {/* How-to guide */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Bu Modül Ne İşe Yarar?</h2>
            <p className="panel-subtitle">Talep tahminine dayalı stok planlama rehberi</p>
          </div>
          <span className="panel-header-badge blue">3 Adım</span>
        </div>
        <div className="guide-grid">
          {[
            { icon: "🗓️", title: "Dönem Seçin", desc: "Kaç günlük tahmin istediğinizi seçin. Örneğin 30 gün seçerseniz sistem önümüzdeki 1 aylık talebi tahmin eder." },
            { icon: "📈", title: "Grafiği Okuyun", desc: "Ortadaki çizgi en olası talebi gösterir. Sarı bant ise 'en az — en fazla' aralığıdır. Buna göre stok tutun." },
            { icon: "🛒", title: "Stok Kararı Alın", desc: "Sistem size ne kadar sipariş vermeniz gerektiğini doğrudan söyler. Tek yapmanız gerekeni okumak." },
          ].map((s, i) => (
            <article key={i} className="guide-card">
              <span className="guide-step">{s.icon}</span>
              <h3 className="guide-title"><strong style={{ color: "#6366f1" }}>{i + 1}.</strong> {s.title}</h3>
              <p className="guide-text">{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="two-column">
        {/* Config form */}
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Tahmin Ayarları</h2>
              <p className="panel-subtitle">Hangi ürün veya bölge için kaç günlük tahmin?</p>
            </div>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: "1fr" }}>
            {/* Horizon slider */}
            <div className="field">
              <label className="field-label">
                Tahmin Dönemi:
                <strong style={{ color: "var(--accent)", marginLeft: 6 }}>{horizon} gün</strong>
                <span style={{ fontSize: 10, color: "#64748b", marginLeft: 8 }}>({horizonLabel})</span>
              </label>
              <input type="range" min={7} max={90} step={1} value={horizon}
                onChange={e => setHorizon(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer", marginTop: 6 }} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span className="field-helper">7 gün</span>
                <span className="field-helper">30 gün</span>
                <span className="field-helper">90 gün</span>
              </div>
            </div>

            {/* Fields */}
            {[
            ].map(() => null)}
            {/* Category dropdown */}
            <div className="field">
              <label className="field-label">Ürün Kategorisi</label>
              <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Tüm Kategoriler</option>
                <option value="Fan Shop">Fan Ürünleri (Fan Shop)</option>
                <option value="Sporting Goods">Spor Malzemeleri (Sporting Goods)</option>
                <option value="Cleats">Krampon (Cleats)</option>
                <option value="Women's Apparel">Kadın Giyim</option>
                <option value="Men's Footwear">Erkek Ayakkabı</option>
                <option value="Fishing">Balıkçılık</option>
                <option value="Water Sports">Su Sporları</option>
                <option value="Camping &amp; Hiking">Kamp &amp; Yürüyüş</option>
              </select>
              <span className="field-helper">Boş bırakırsanız tüm kategoriler için tahmin yapılır.</span>
            </div>
            {/* Market dropdown */}
            <div className="field">
              <label className="field-label">Pazar</label>
              <select className="select" value={market} onChange={e => setMarket(e.target.value)}>
                <option value="">Tüm Pazarlar</option>
                <option value="Europe">Avrupa (Europe)</option>
                <option value="US / Puerto Rico">ABD (US / Puerto Rico)</option>
                <option value="LATAM">Latin Amerika (LATAM)</option>
                <option value="Pacific Asia">Asya Pasifik (Pacific Asia)</option>
                <option value="Africa">Afrika (Africa)</option>
              </select>
            </div>
            {/* Region text */}
            <div className="field">
              <label className="field-label">Alt Bölge (opsiyonel)</label>
              <input className="input" placeholder="örn. Western Europe" value={orderRegion} onChange={e => setOrderRegion(e.target.value)} />
              <span className="field-helper">Pazar içinde daha dar bir bölge seçmek için yazın.</span>
            </div>
            <div className="field">
              <label className="field-label">Ürün Kodu (SKU)</label>
              <input className="input" placeholder="örn. 1360 (SKU- olmadan)" value={sku} onChange={e => setSku(e.target.value)} />
              <span className="field-helper">Belirli bir ürün için analiz yapmak istiyorsanız kodunu girin.</span>
            </div>

            <div className="field">
              <label className="field-label">Mevcut Stok Adedi</label>
              <input type="number" min={0} className="input" value={currentInventory}
                onChange={e => setCurrentInventory(Number(e.target.value))} />
              <span className="field-helper">Şu an deponuzda ne kadar ürün var? Stok kararı için gerekli.</span>
            </div>
          </div>

          {/* Period summary */}
          <div style={{
            background: "var(--bg-surface-2)", borderRadius: 10, border: "1px solid var(--border)",
            padding: "12px 16px", marginBottom: 14, display: "flex", gap: 16, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Tahmin Edilecek Dönem</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>{horizon} Gün</div>
            </div>
            {category && (
              <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
                <div style={{ fontSize: 10, color: "#64748b" }}>Kategori</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>{category}</div>
              </div>
            )}
            {currentInventory > 0 && (
              <div style={{ borderLeft: "1px solid var(--border)", paddingLeft: 16 }}>
                <div style={{ fontSize: 10, color: "#64748b" }}>Mevcut Stok</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>{currentInventory} adet</div>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? "⟳ Tahmin hesaplanıyor..." : "📈 Talep Tahmini Oluştur"}
          </button>
        </form>

        {/* Result panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Tahmin Grafiği & Stok Kararı</h2>
              <p className="panel-subtitle">
                {chartData.length
                  ? `${horizon} günlük talep tahmini hazır`
                  : "Ayarları girin ve tahmini başlatın"}
              </p>
            </div>
            {chartData.length > 0 && (
              <span className="panel-header-badge green">✓ Tamamlandı</span>
            )}
          </div>

          {!result ? (
            <div className="empty-state" style={{ minHeight: 260 }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📊</div>
              <div className="empty-state-title">Talep grafiği burada görünecek</div>
              <div className="empty-state-desc">
                Soldaki formu doldurup <strong>"Talep Tahmini Oluştur"</strong> butonuna basın.
                Sistem önümüzdeki günlerin satış tahminini gösterecek.
              </div>
            </div>
          ) : result.error ? (
            <div style={{ padding: 14, background: "rgba(239,68,68,0.08)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)" }}>
              <p style={{ color: "#ef4444", margin: 0 }}>Bağlantı hatası. Lütfen tekrar deneyin.</p>
            </div>
          ) : chartData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Summary badges */}
              <ForecastSummaryBadges chartData={chartData} horizon={horizon} />

              {/* Chart */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>
                  Günlük Tahmin Eğrisi
                </div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
                      <XAxis dataKey="ds" tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#64748b" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="ustSinir" stroke="rgba(245,158,11,0.4)"
                        strokeWidth={1} fill="url(#bandFill)" dot={false} name="ustSinir" />
                      <Area type="monotone" dataKey="tahmin" stroke="#6366f1"
                        strokeWidth={2.5} fill="transparent" dot={false} name="tahmin"
                        activeDot={{ r: 4, fill: "#6366f1", stroke: "#0b1220", strokeWidth: 2 }} />
                      <Area type="monotone" dataKey="altSinir" stroke="rgba(99,102,241,0.3)"
                        strokeWidth={1} strokeDasharray="4 3" fill="transparent" dot={false} name="altSinir" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(99,102,241,0.05)",
                  border: "1px solid rgba(99,102,241,0.12)", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.7 }}>
                    <span style={{ color: "#818cf8", fontWeight: 600 }}>● Mor çizgi</span> = Tahmin edilen günlük satış &nbsp;|&nbsp;
                    <span style={{ color: "#f59e0b", fontWeight: 600 }}>● Sarı bant</span> = En az/en fazla senaryo (güven aralığı)
                  </p>
                </div>
              </div>

              {/* Stock decision */}
              <StockDecisionCard result={result} />
            </div>
          ) : (
            <div className="empty-state">
              <div style={{ fontSize: 40 }}>🔍</div>
              <div className="empty-state-title">Tahmin noktası bulunamadı</div>
              <div className="empty-state-desc">Farklı parametrelerle tekrar deneyin.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
