import { useState } from "react";
import { postFraud } from "../lib/api.js";

export default function Fraud() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState({
    sales: 200,
    benefit_per_order: 25,
    market: "US / Puerto Rico",
    customer_segment: "Consumer"
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postFraud({ features });
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
        <span className="page-eyebrow">Modül C · Finansal güvenlik</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Dolandırıcılık & negatif kâr riski</h1>
            <p className="page-subtitle">
              Sipariş onayından önce geliri korumak için anomali tespiti ve kâr bayraklarını
              birleştirin.
            </p>
          </div>
        </div>
      </header>

      <section className="two-column">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">İşlem özeti</h2>
              <p className="panel-subtitle">
                Isolation Forest dolandırıcılık modeli tarafından kullanılan temel finansal özellikler.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Satış tutarı ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={features.sales}
                onChange={(e) =>
                  setFeatures({ ...features, sales: Number(e.target.value) })
                }
              />
            </div>

            <div className="field">
              <label className="field-label">Sipariş başına kâr ($)</label>
              <input
                type="number"
                step={0.01}
                className="input"
                value={features.benefit_per_order}
                onChange={(e) =>
                  setFeatures({ ...features, benefit_per_order: Number(e.target.value) })
                }
              />
              <span className="field-helper">Negatif değerler zarar eden siparişleri gösterir.</span>
            </div>

            <div className="field">
              <label className="field-label">Pazar</label>
              <input
                className="input"
                value={features.market}
                onChange={(e) => setFeatures({ ...features, market: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label">Müşteri segmenti</label>
              <input
                className="input"
                value={features.customer_segment}
                onChange={(e) =>
                  setFeatures({ ...features, customer_segment: e.target.value })
                }
              />
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "İşlem puanlanıyor…" : "Dolandırıcılık riskini puanla"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Anomali skoru</h2>
              <p className="panel-subtitle">
                `/fraud` uç noktasının çıktısı; daha yüksek skor daha yüksek anomali anlamına gelir.
              </p>
            </div>
          </div>

          {result ? (
            <>
              {result.error ? (
                <p className="badge-negative">Hata: {result.error}</p>
              ) : (
                <p className="card-caption">
                  Anomali skoru:&nbsp;
                  <strong>{(result.anomaly_score * 100).toFixed(1)} / 100</strong>
                </p>
              )}
              <pre className="result-code" style={{ marginTop: "0.7rem" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </>
          ) : (
            <p className="card-caption">
              Soldaki işlem özetini doldurun ve geçmiş verilerinize kıyasla ne kadar anormal
              göründüğünü görmek için puanlama yapın.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
