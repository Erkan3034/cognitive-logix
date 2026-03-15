import { useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { postForecast } from "../lib/api.js";

export default function Demand() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [horizon, setHorizon] = useState(30);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await postForecast({ horizon, series: [] });
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  const chartData =
    result?.points?.map((p) => ({
      ds: p.ds,
      yhat: p.yhat
    })) ?? [];

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Modül B · Talep istihbaratı</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Kategori talep tahmini</h1>
            <p className="page-subtitle">
              Envanter ve kapasite kararlarını uyumlu hâle getirmek için kategoriye ve zaman
              ufkuna göre kısa vadeli talep eğrilerini tahmin edin.
            </p>
          </div>
        </div>
      </header>

      <section className="two-column">
        <form className="panel" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Tahmin yapılandırması</h2>
              <p className="panel-subtitle">
                Günlük talep modeli için ufuk ve seri seçimi.
              </p>
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label className="field-label">Tahmin ufku (gün)</label>
              <input
                type="number"
                min={7}
                max={90}
                className="input"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
              />
              <span className="field-helper">Tipik aralık: 14–60 gün.</span>
            </div>

            <div className="field">
              <label className="field-label">Kategori / segment</label>
              <input
                className="input"
                placeholder="ör. Fan Shop · Batı Avrupa"
              />
              <span className="field-helper">
                Sonraki adımda bu alan, veri ambarından filtrelenmiş zaman serilerini yönlendirecektir.
              </span>
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Tahmin oluşturuluyor…" : "Tahmin oluştur"}
          </button>
        </form>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Tahmin çıktısı</h2>
              <p className="panel-subtitle">
                `/forecast` uç noktasından dönen tahmin noktaları, günlük talep eğrisi olarak görselleştirilmiştir.
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
                    {horizon} günlük ufuk için <strong>{result.points?.length ?? 0}</strong> tahmin
                    noktası alındı.
                  </p>
                  {chartData.length > 0 && (
                    <div style={{ height: 220, marginTop: "0.6rem" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis
                            dataKey="ds"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="yhat"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </>
              )}
              <pre className="result-code" style={{ marginTop: "0.7rem" }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </>
          ) : (
            <p className="card-caption">
              Soldaki ufuk ve kategoriyi yapılandırın, ardından ham JSON çıktısını incelemek
              için tahmini çalıştırın.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
