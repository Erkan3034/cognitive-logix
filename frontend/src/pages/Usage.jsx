import { useEffect, useMemo, useState } from "react";
import { getUsage } from "../lib/api.js";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function Usage() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    getUsage()
      .then((data) => {
        if (mounted) setUsage(data);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.detail || "Kullanim verisi okunamadi.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const endpointRows = useMemo(() => {
    const byEndpoint = usage?.by_endpoint ?? {};
    return Object.entries(byEndpoint)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count);
  }, [usage]);

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">SaaS Operasyonlari</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Kullanim ve Kota Izleme</h1>
            <p className="page-subtitle">
              Backend middleware tarafindan kaydedilen gercek API kullanimi, endpoint dagilimi ve son istekler.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Okunuyor..." : `${usage?.total_calls ?? 0} istek`}
          </div>
        </div>
      </header>

      {error && (
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Baglanti Durumu</h2>
              <p className="panel-subtitle">{error}</p>
            </div>
            <span className="panel-header-badge red">Ops Kapali</span>
          </div>
        </section>
      )}

      <section className="kpi-grid">
        <article className="card">
          <p className="card-title">Toplam API Istegi</p>
          <p className="card-value">{loading ? "--" : usage?.total_calls ?? 0}</p>
          <p className="card-caption">Tenant baglaminda filtrelenmis operasyon kaydi.</p>
        </article>
        <article className="card">
          <p className="card-title">Faturalama Birimi</p>
          <p className="card-value">{loading ? "--" : usage?.total_units ?? 0}</p>
          <p className="card-caption">Her takip edilen API cagrisi bir kullanim birimi yazar.</p>
        </article>
        <article className="card">
          <p className="card-title">Aktif Endpoint</p>
          <p className="card-value">{loading ? "--" : endpointRows.length}</p>
          <p className="card-caption">Tahmin, fraud, forecast, metrics ve ingest hatlari.</p>
        </article>
        <article className="card">
          <p className="card-title">Son Kayit</p>
          <p className="card-value" style={{ fontSize: 20 }}>
            {loading ? "--" : formatDate(usage?.recent?.[0]?.created_at)}
          </p>
          <p className="card-caption">Supabase usage_logs tablosundan okunur.</p>
        </article>
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Endpoint Dagilimi</h2>
              <p className="panel-subtitle">Faturalama ve kapasite planlama icin kullanim yogunlugu.</p>
            </div>
            <span className="panel-header-badge blue">{endpointRows.length} endpoint</span>
          </div>
          <div className="ops-list">
            {endpointRows.length === 0 && <p className="card-caption">Henuz kayitli kullanim yok.</p>}
            {endpointRows.map((row) => (
              <div className="ops-row" key={row.endpoint}>
                <span>{row.endpoint}</span>
                <strong>{row.count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Son API Cagrilari</h2>
              <p className="panel-subtitle">Tenant, kullanici, sure ve HTTP durum kodu gorunumu.</p>
            </div>
            <span className="panel-header-badge green">{usage?.recent?.length ?? 0} kayit</span>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Method</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Sure</th>
                </tr>
              </thead>
              <tbody>
                {(usage?.recent ?? []).map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.created_at)}</td>
                    <td>{row.method}</td>
                    <td>{row.endpoint}</td>
                    <td>{row.status_code}</td>
                    <td>{Math.round(row.duration_ms ?? 0)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
