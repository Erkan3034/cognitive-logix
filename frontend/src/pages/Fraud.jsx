import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { postFraud } from "../lib/api.js";

/* ── Faktör çevirileri ─────────────────────────────── */
const REASON_TR = {
  "High sales amount": "Sipariş tutarı normalin çok üzerinde",
  "Negative profit margin": "Sipariş kârsız — zarar eden bir satış",
  "Low profit margin": "Kâr marjı anormalleşmiş şekilde düşük",
  "High order value relative to segment": "Bu müşteri segmenti için alışılmadık yüksek tutar",
  "Unusual payment pattern": "Ödeme deseninde beklenmedik sapma",
  "Market mismatch": "Pazar ve segment kombinasyonu olağandışı",
  "raises_risk": "Bu özellik şüphe yaratıyor",
  "lowers_risk": "Bu özellik güven veriyor",
};
const toTR = (text) => REASON_TR[text] || text;
const dirTR = (d) => d === "raises_risk" ? "Şüphe yaratıyor" : "Güven veriyor";

/* ── Canvas Gauge ──────────────────────────────────── */
function AnomalyGauge({ score }) {
  const canvasRef = useRef(null);
  const pct = Math.round((score ?? 0) * 100);
  const color = pct <= 33 ? "#10b981" : pct <= 66 ? "#f59e0b" : "#ef4444";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.72;
    const r = W * 0.38;
    let frame, progress = 0;
    const target = pct / 100;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // Track
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
      ctx.lineWidth = 18; ctx.strokeStyle = "rgba(148,163,184,0.1)"; ctx.lineCap = "round"; ctx.stroke();
      // Filled arc
      const fillEnd = Math.PI + (Math.PI * progress);
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, fillEnd);
      ctx.lineWidth = 18; ctx.strokeStyle = color; ctx.lineCap = "round";
      ctx.shadowColor = color; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
      // Number
      ctx.textAlign = "center"; ctx.fillStyle = color;
      ctx.font = `bold ${W * 0.15}px system-ui`; ctx.fillText(Math.round(progress * 100), cx, cy - 2);
      ctx.fillStyle = "rgba(148,163,184,0.6)"; ctx.font = `${W * 0.07}px system-ui`; ctx.fillText("/ 100", cx, cy + W * 0.1);
    };

    const animate = () => {
      if (progress < target) { progress = Math.min(progress + 0.02, target); draw(); frame = requestAnimationFrame(animate); }
      else { progress = target; draw(); }
    };
    animate();
    return () => cancelAnimationFrame(frame);
  }, [pct, color]);

  return <canvas ref={canvasRef} width={200} height={120} style={{ display: "block", margin: "0 auto" }} />;
}

/* ── Risk sonuç kartı ──────────────────────────────── */
function RiskResultCard({ score }) {
  const pct = Math.round((score ?? 0) * 100);
  const config =
    pct <= 33
      ? {
          icon: "✅", color: "#10b981", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.25)",
          badge: "Normal İşlem",
          headline: "Bu işlem güvenli görünüyor",
          desc: "Yapay zeka, bu siparişin geçmiş normal işlemlerle uyumlu olduğunu tespit etti. Otomatik olarak onaylayabilirsiniz.",
          steps: [
            { icon: "✔️", text: "Otomatik onay verilebilir" },
            { icon: "📋", text: "Standart işlem akışını sürdürün" },
          ],
        }
      : pct <= 66
      ? {
          icon: "⚠️", color: "#f59e0b", bg: "rgba(245,158,11,0.07)", border: "rgba(245,158,11,0.25)",
          badge: "Dikkat Edilmeli",
          headline: "Bu işlemde bazı olağandışı özellikler var",
          desc: "Sipariş tamamen anormal değil, ancak geçmiş işlem kalıplarından sapma var. Onaylamadan önce hızlıca kontrol edin.",
          steps: [
            { icon: "👀", text: "Müşteri hesap geçmişini kısaca inceleyin" },
            { icon: "📞", text: "Gerekirse müşteriyle teyit görüşmesi yapın" },
            { icon: "⏸️", text: "Onayı birkaç saat geciktirip izleyin" },
          ],
        }
      : {
          icon: "🚨", color: "#ef4444", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.25)",
          badge: "Yüksek Risk",
          headline: "Bu işlem şüpheli görünüyor!",
          desc: "Yapay zeka, bu siparişin geçmiş işlem kalıplarıyla ciddi şekilde uyuşmadığını tespit etti. İşlemi durdurup manuel inceleme başlatın.",
          steps: [
            { icon: "🚫", text: "İşlemi geçici olarak askıya alın" },
            { icon: "📋", text: "Müşteri kimlik ve ödeme bilgilerini doğrulayın" },
            { icon: "🔍", text: "Risk ekibine ilet ve onay bekle" },
          ],
        };

  return (
    <div style={{ background: config.bg, border: `1px solid ${config.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>{config.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: config.color }}>{config.headline}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
              background: `${config.color}20`, color: config.color,
            }}>{config.badge}</span>
          </div>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{config.desc}</p>
        </div>
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 8 }}>Ne Yapmalısınız?</div>
      <div style={{ display: "grid", gap: 6 }}>
        {config.steps.map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "9px 12px", borderRadius: 8,
            background: "rgba(148,163,184,0.04)", border: "1px solid rgba(148,163,184,0.08)",
          }}>
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Neden şüpheli? (faktör grafiği) ─────────────────── */
function ReasonChart({ reasons }) {
  if (!reasons?.length) return null;
  const data = reasons.slice(0, 5).map(r => ({
    name: toTR(r.reason)?.length > 32 ? toTR(r.reason).slice(0, 29) + "..." : toTR(r.reason),
    fullName: toTR(r.reason),
    etki: parseFloat(Math.abs(r.shap_value ?? 0.05).toFixed(3)),
    dir: r.impact,
  }));

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>
        Bu İşlemi Şüpheli Yapan Nedenler
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>
        Yapay zekanın bu işlemde dikkat çekici bulduğu özellikler aşağıda sıralandı.
      </div>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 120)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false} axisLine={false} />
          <Tooltip content={({ payload }) => payload?.[0] ? (
            <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px", maxWidth: 240 }}>
              <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6 }}>{payload[0].payload.fullName}</p>
              <p style={{
                color: payload[0].payload.dir === "raises_risk" ? "#ef4444" : "#10b981",
                fontWeight: 700, fontSize: 13, margin: 0,
              }}>
                {dirTR(payload[0].payload.dir)}
              </p>
            </div>
          ) : null} />
          <Bar dataKey="etki" radius={[0, 5, 5, 0]}>
            {data.map((e, i) => (
              <Cell key={i} fill={e.dir === "raises_risk" ? "#ef4444" : "#10b981"} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
        <span style={{ fontSize: 11, color: "#ef4444", display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#ef4444", display: "inline-block" }} />
          Şüphe yaratıyor
        </span>
        <span style={{ fontSize: 11, color: "#10b981", display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: "#10b981", display: "inline-block" }} />
          Güven veriyor
        </span>
      </div>
    </div>
  );
}

export default function Fraud() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState({
    sales: 200,
    benefit_per_order: 25,
    market: "US / Puerto Rico",
    customer_segment: "Consumer",
    order_region: "US / Puerto Rico",
    category: "Fan Shop",
    quantity: 1,
    discount_rate: 0.0,
    payment_type: "DEBIT",
  });

  function set(key, val) { setFeatures(p => ({ ...p, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { setResult(await postFraud({ features })); }
    catch (err) { setResult({ error: err.message }); }
    finally { setLoading(false); }
  }

  const isLoss = features.benefit_per_order < 0;
  const margin = features.sales > 0 ? ((features.benefit_per_order / features.sales) * 100).toFixed(1) : "—";
  const score = result && !result.error ? (result.combined_risk_score ?? result.anomaly_score) : null;
  const pct = score != null ? Math.round(score * 100) : null;
  const riskColor = pct == null ? "#6366f1" : pct <= 33 ? "#10b981" : pct <= 66 ? "#f59e0b" : "#ef4444";

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Finansal Güvenlik Modülü</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Bu Sipariş Güvenli Mi?</h1>
            <p className="page-subtitle">
              Yapay zeka, siparişi geçmiş milyonlarca işlemle kıyaslayarak dolandırıcılık veya anormal ödeme
              riski olup olmadığını saniyeler içinde belirler.
            </p>
          </div>
        </div>
      </header>

      {/* How-to */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Bu Modül Ne İşe Yarar?</h2>
            <p className="panel-subtitle">Siparişi onaylamadan önce finansal riski 3 saniyede öğrenin</p>
          </div>
          <span className="panel-header-badge blue">3 Adım</span>
        </div>
        <div className="guide-grid">
          {[
            { icon: "💳", title: "İşlem Bilgilerini Girin", desc: "Sipariş tutarı, kâr ve müşteri tipi gibi temel bilgileri girin. Ne kadar doğru girerseniz analiz o kadar isabetli olur." },
            { icon: "🎯", title: "Risk Skorunu Okuyun", desc: "0-33: Normal (yeşil), 34-66: Dikkatli olun (sarı), 67-100: Durdurun ve inceleyin (kırmızı). Çok basit!" },
            { icon: "⚡", title: "Doğru Kararı Verin", desc: "Sistem size tam olarak ne yapmanız gerektiğini söyler. Onaylayın, bekletin veya durdurun." },
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
        {/* Form */}
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Sipariş Bilgileri</h2>
              <p className="panel-subtitle">Analiz edilecek işlemin özeti</p>
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label">Sipariş Tutarı ($)</label>
              <input type="number" min={0} step={0.01} className="input"
                value={features.sales} onChange={e => set("sales", Number(e.target.value))} />
              <span className="field-helper">Bu siparişin toplam değeri ne kadar?</span>
            </div>
            <div className="field">
              <label className="field-label">Bu Siparişten Ne Kadar Kazanıyorsunuz? ($)</label>
              <input type="number" step={0.01} className="input"
                value={features.benefit_per_order}
                onChange={e => set("benefit_per_order", Number(e.target.value))}
                style={isLoss ? { borderColor: "rgba(239,68,68,0.5)", boxShadow: "0 0 0 3px rgba(239,68,68,0.12)" } : {}} />
              <span className="field-helper" style={{ color: isLoss ? "#ef4444" : undefined }}>
                {isLoss ? "⚠ Zarar eden sipariş — negatif kâr yüksek risk işareti!" : "Sipariş başına net kâr (negatif = zarar)."}
              </span>
            </div>
            <div className="field">
              <label className="field-label">Sipariş Adedi</label>
              <input type="number" min={1} max={200} className="input"
                value={features.quantity} onChange={e => set("quantity", Number(e.target.value))} />
              <span className="field-helper">Tek sipariş kalemindeki ürün adedi.</span>
            </div>
            <div className="field">
              <label className="field-label">
                Uygulanan İndirim Oranı: <strong style={{ color: features.discount_rate > 0.25 ? "#ef4444" : "var(--accent)" }}>
                  %{Math.round(features.discount_rate * 100)}
                </strong>
              </label>
              <input type="range" min={0} max={0.5} step={0.01}
                value={features.discount_rate}
                onChange={e => set("discount_rate", Number(e.target.value))}
                style={{ width: "100%", accentColor: features.discount_rate > 0.25 ? "#ef4444" : "var(--accent)", cursor: "pointer" }} />
              <span className="field-helper" style={{ color: features.discount_rate > 0.25 ? "#ef4444" : undefined }}>
                {features.discount_rate > 0.25 ? "⚠ %25 üzeri indirim anormal kabul edilir" : "Normal aralık: %0 – %25"}
              </span>
            </div>
            <div className="field">
              <label className="field-label">Ödeme Türü</label>
              <select className="select" value={features.payment_type} onChange={e => set("payment_type", e.target.value)}>
                <option value="DEBIT">Banka Kartı (Debit)</option>
                <option value="TRANSFER">Havale / EFT</option>
                <option value="CASH">Nakit</option>
                <option value="PAYMENT">Diğer Ödeme</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Sipariş Bölgesi</label>
              <select className="select" value={features.order_region} onChange={e => set("order_region", e.target.value)}>
                <option value="US / Puerto Rico">ABD / Porto Riko</option>
                <option value="Western Europe">Batı Avrupa</option>
                <option value="Central America">Orta Amerika</option>
                <option value="South America">Güney Amerika</option>
                <option value="Southeast Asia">Güneydoğu Asya</option>
                <option value="West Africa">Batı Afrika</option>
                <option value="Eastern Europe">Doğu Avrupa</option>
                <option value="LATAM">LATAM</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Ürün Kategorisi</label>
              <select className="select" value={features.category} onChange={e => set("category", e.target.value)}>
                <option value="Fan Shop">Fan Ürünleri</option>
                <option value="Sporting Goods">Spor Malzemeleri</option>
                <option value="Cleats">Krampon</option>
                <option value="Apparel">Giyim</option>
                <option value="Footwear">Ayakkabı</option>
                <option value="Fitness Equipment">Fitness Ekipmanı</option>
                <option value="Electronics">Elektronik</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Müşterinin Bulunduğu Pazar</label>
              <select className="select" value={features.market} onChange={e => set("market", e.target.value)}>
                <option value="US / Puerto Rico">ABD / Porto Riko</option>
                <option value="Europe">Avrupa</option>
                <option value="LATAM">Latin Amerika</option>
                <option value="Pacific Asia">Asya Pasifik</option>
                <option value="Africa">Afrika</option>
                <option value="Canada">Kanada</option>
                <option value="USCA">Kuzey Amerika</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Müşteri Tipi</label>
              <select className="select" value={features.customer_segment} onChange={e => set("customer_segment", e.target.value)}>
                <option value="Consumer">Bireysel Müşteri</option>
                <option value="Corporate">Kurumsal (Şirket)</option>
                <option value="Home Office">Küçük Ofis</option>
              </select>
            </div>
          </div>

          {/* Live margin preview */}
          {features.sales > 0 && (
            <div style={{
              borderRadius: 10, padding: "12px 16px", marginBottom: 14,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: isLoss ? "rgba(239,68,68,0.07)" : "rgba(16,185,129,0.07)",
              border: `1px solid ${isLoss ? "rgba(239,68,68,0.22)" : "rgba(16,185,129,0.22)"}`,
            }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Anlık Kâr Marjı</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: isLoss ? "#ef4444" : "#10b981" }}>
                  %{margin}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Sipariş Durumu</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: isLoss ? "#ef4444" : "#10b981" }}>
                  {isLoss ? "💸 Zarar Ediyor" : "✅ Kârlı Sipariş"}
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-full" disabled={loading}>
            {loading ? "⟳ Analiz ediliyor..." : "🔍 Siparişi Güvenlik Analizinden Geçir"}
          </button>
        </form>

        {/* Result */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Güvenlik Analiz Sonucu</h2>
              <p className="panel-subtitle">Yapay zeka değerlendirmesi</p>
            </div>
            {pct != null && (
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
                background: `${riskColor}15`, color: riskColor, border: `1px solid ${riskColor}35`,
              }}>
                Risk Skoru: {pct}/100
              </span>
            )}
          </div>

          {!result ? (
            <div className="empty-state">
              <div style={{ fontSize: 52, marginBottom: 14 }}>🛡️</div>
              <div className="empty-state-title">Güvenlik analizi bekleniyor</div>
              <div className="empty-state-desc">
                Soldaki sipariş bilgilerini doldurun ve
                <strong> "Siparişi Güvenlik Analizinden Geçir"</strong> butonuna basın.
              </div>
            </div>
          ) : result.error ? (
            <div style={{ padding: 14, background: "rgba(239,68,68,0.08)", borderRadius: 12, border: "1px solid rgba(239,68,68,0.3)" }}>
              <p style={{ color: "#ef4444", margin: 0 }}>Bağlantı hatası. Lütfen tekrar deneyin.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Gauge */}
              <div style={{ padding: "16px 0 4px" }}>
                <AnomalyGauge score={score} />
                {/* Segment bar */}
                <div style={{ display: "flex", gap: 3, height: 7, borderRadius: 6, overflow: "hidden", margin: "12px 20px 4px" }}>
                  {[["#10b981", 33], ["#f59e0b", 33], ["#ef4444", 34]].map(([c, w], i) => (
                    <div key={i} style={{ flex: w, borderRadius: 4, overflow: "hidden", background: `${c}20` }}>
                      {((i === 0 && pct <= 33) || (i === 1 && pct > 33 && pct <= 66) || (i === 2 && pct > 66)) && (
                        <div style={{ width: "100%", height: "100%", background: c }} />
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0 20px" }}>
                  {[["#10b981", "Güvenli"], ["#f59e0b", "Dikkatli"], ["#ef4444", "Tehlikeli"]].map(([c, l]) => (
                    <span key={l} style={{ fontSize: 10, color: c, fontWeight: 600 }}>{l}</span>
                  ))}
                </div>
              </div>

              {/* User-friendly result card */}
              <RiskResultCard score={score} />

              {/* Reason chart */}
              {result.reason_codes?.length > 0 && (
                <div className="risk-result-box">
                  <ReasonChart reasons={result.reason_codes} />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
