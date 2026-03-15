import { useState } from "react";
import { postPredict } from "../lib/api.js";

export default function Logistics() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shipping_mode: "Standard Class",
    order_region: "Western Europe",
    days_scheduled: 4,
    category: "Sporting Goods",
    market: "Europe",
    sales: 150,
    quantity: 2
  });

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
        <span className="page-eyebrow">Modül A · Tahmine dayalı lojistik</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Teslimat gecikme tahmini</h1>
            <p className="page-subtitle">
              Siparişleri yerine getirmeden önce gecikme riskine göre puanlayın ve proaktif olarak
              taşıyıcı, güzergâh veya hizmet seviyesini değiştirin.
            </p>
          </div>
        </div>
      </header>

      <section className="two-column">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Sipariş bilgileri</h2>
              <p className="panel-subtitle">
                XGBoost gecikme riski modeli tarafından kullanılan temel operasyonel özellikler.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Sevkiyat modu</label>
              <select
                className="select"
                value={formData.shipping_mode}
                onChange={(e) => setFormData({ ...formData, shipping_mode: e.target.value })}
              >
                <option>Standard Class</option>
                <option>Second Class</option>
                <option>First Class</option>
                <option>Same Day</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Sipariş bölgesi</label>
              <input
                className="input"
                value={formData.order_region}
                onChange={(e) => setFormData({ ...formData, order_region: e.target.value })}
                placeholder="ör. Western Europe"
              />
            </div>

            <div className="field">
              <label className="field-label">Planlanan sevkiyat günü</label>
              <input
                type="number"
                min={0}
                className="input"
                value={formData.days_scheduled}
                onChange={(e) =>
                  setFormData({ ...formData, days_scheduled: Number(e.target.value) })
                }
              />
              <span className="field-helper">Sipariş tarihinden taahhüt edilen sevk tarihine kadar.</span>
            </div>

            <div className="field">
              <label className="field-label">Kategori</label>
              <input
                className="input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label">Pazar</label>
              <input
                className="input"
                value={formData.market}
                onChange={(e) => setFormData({ ...formData, market: e.target.value })}
              />
            </div>

            <div className="field">
              <label className="field-label">Sipariş tutarı ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                value={formData.sales}
                onChange={(e) => setFormData({ ...formData, sales: Number(e.target.value) })}
              />
            </div>

            <div className="field">
              <label className="field-label">Miktar</label>
              <input
                type="number"
                min={1}
                className="input"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: Number(e.target.value) })
                }
              />
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Sipariş puanlanıyor…" : "Gecikme riskini puanla"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Model çıktısı</h2>
              <p className="panel-subtitle">
                FastAPI `/predict` uç noktası tarafından doğrudan döndürülen JSON verisi.
              </p>
            </div>
          </div>

          {result ? (
            <>
              {result.error ? (
                <p className="badge-negative">Hata: {result.error}</p>
              ) : (
                <>
                  <p className="card-caption">
                    Gecikme riski:&nbsp;
                    <strong>{(result.delay_risk * 100).toFixed(1)}%</strong>
                  </p>
                  <p className="card-caption">
                    Risk seviyesi:&nbsp;
                    <strong>
                      {result.delay_risk > 0.7
                        ? "Yüksek"
                        : result.delay_risk > 0.4
                          ? "Orta"
                          : "Düşük"}
                    </strong>
                  </p>
                </>
              )}
              <pre className="result-code" style={{ marginTop: "0.7rem" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </>
          ) : (
            <p className="card-caption">
              Soldaki sipariş bilgilerini doldurun ve model çıktısını görmek için puanlama yapın.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
