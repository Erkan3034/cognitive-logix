import { useEffect, useState } from "react";
import { getAuditLogs, getIncidentActions } from "../lib/api.js";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function stringifyMeta(value) {
  if (!value || Object.keys(value).length === 0) return "-";
  return JSON.stringify(value);
}

export default function AuditLog() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [incidentActions, setIncidentActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.all([getAuditLogs({ limit: 150 }), getIncidentActions({ limit: 150 })])
      .then(([auditData, actionData]) => {
        if (!mounted) return;
        setAuditLogs(auditData?.items ?? []);
        setIncidentActions(actionData?.items ?? []);
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.detail || "Audit kayitlari okunamadi.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Uyumluluk ve Izlenebilirlik</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Audit Log ve Incident Aksiyonlari</h1>
            <p className="page-subtitle">
              Kullanici aksiyonlari, onaylanan incident kararlar ve Supabase uzerindeki operasyon izi.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Okunuyor..." : `${auditLogs.length + incidentActions.length} kayit`}
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

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Incident Aksiyonlari</h2>
              <p className="panel-subtitle">Kontrol kulesinden onaylanan, reddedilen veya siraya alinan kararlar.</p>
            </div>
            <span className="panel-header-badge amber">{incidentActions.length} aksiyon</span>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Incident</th>
                  <th>Status</th>
                  <th>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {incidentActions.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.created_at)}</td>
                    <td>{row.incident_id}</td>
                    <td>{row.status}</td>
                    <td>{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {incidentActions.length === 0 && <p className="card-caption">Henuz incident aksiyonu yok.</p>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Audit Kayitlari</h2>
              <p className="panel-subtitle">Kullanici, kaynak, aksiyon ve metadata izleri.</p>
            </div>
            <span className="panel-header-badge blue">{auditLogs.length} log</span>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Aksiyon</th>
                  <th>Kaynak</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.created_at)}</td>
                    <td>{row.action}</td>
                    <td>{row.resource_type}/{row.resource_id}</td>
                    <td>{stringifyMeta(row.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && <p className="card-caption">Henuz audit kaydi yok.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
