import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIncidentActions, getIncidents, postIncidentAction } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";
import {
  CommandFilterBar,
  DecisionDrawer,
  formatMoney,
  formatPct,
  severityMeta,
  translateIncidentDescription,
  translateIncidentTitle,
  typeLabel,
} from "../components/OperationsUI.jsx";

function actionStatusLabel(status) {
  const map = {
    approved: "Onaylandı",
    queued: "Sırada",
    dismissed: "Reddedildi",
  };
  return map[status] || "Bekliyor";
}

export default function ExceptionInbox() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [actions, setActions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [type, setType] = useState("all");
  const [saving, setSaving] = useState({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [incidentData, actionData] = await Promise.all([
        getIncidents({ limit: 20 }),
        getIncidentActions({ limit: 100 }),
      ]);
      setIncidents(incidentData?.items ?? []);
      setActions(actionData?.items ?? []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Operasyon kuyruğu yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const actionByIncident = useMemo(() => {
    const map = {};
    actions.forEach((action) => {
      if (!map[action.incident_id]) map[action.incident_id] = action;
    });
    return map;
  }, [actions]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return incidents.filter((item) => {
      const matchesSearch = !needle || [
        item.title,
        item.description,
        item.type,
        item.severity,
        item.recommended_action,
        ...Object.values(item.drilldown_params ?? {}),
      ].filter(Boolean).join(" ").toLowerCase().includes(needle);
      const matchesSeverity = severity === "all" || item.severity === severity;
      const matchesType = type === "all" || item.type === type;
      return matchesSearch && matchesSeverity && matchesType;
    });
  }, [incidents, search, severity, type]);

  const stats = useMemo(() => {
    const open = incidents.filter((item) => !actionByIncident[item.id]).length;
    const critical = incidents.filter((item) => ["critical", "high"].includes(item.severity)).length;
    const exposure = incidents.reduce((sum, item) => sum + Number(item.impact_usd || 0), 0);
    return { open, critical, exposure };
  }, [incidents, actionByIncident]);

  const handleAction = async (item, status) => {
    setSaving((prev) => ({ ...prev, [item.id]: status }));
    try {
      await postIncidentAction({
        incident_id: item.id,
        action: item.recommended_action,
        status,
        metadata: {
          title: item.title,
          type: item.type,
          severity: item.severity,
          impact_usd: item.impact_usd,
          confidence: item.confidence,
          source: "exception_inbox",
        },
      });
      await fetchData();
      setSelected(null);
    } catch (err) {
      setError(err?.response?.data?.detail || "Karar kaydedilemedi.");
    } finally {
      setSaving((prev) => ({ ...prev, [item.id]: null }));
    }
  };

  const drilldown = (item) => {
    const params = item.drilldown_params ?? {};
    if (Object.keys(params).length > 0) {
      navigate(`/app/logistics?${new URLSearchParams(params).toString()}`);
      return;
    }
    if (item.type === "fraud") navigate("/app/fraud");
    else if (item.type === "inventory") navigate("/app/demand");
  };

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Operasyon kuyruğu"
        title="Olay Kutusu"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loading ? <InlineSpinner label="Yükleniyor" /> : `${stats.open} açık olay`}
          </div>
        }
      >
        Lojistik, finansal risk ve stok uyarılarını tek bir karar kuyruğunda toplayın.
        Her karar denetim kaydına yazılır.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="İşlem tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <section className="usage-kpi-grid">
        <article className="usage-kpi">
          <span>Açık olay</span>
          <strong>{loading ? "..." : stats.open}</strong>
          <p>Aksiyon bekleyen kayıtlar</p>
        </article>
        <article className="usage-kpi usage-kpi-warning">
          <span>Kritik/yüksek</span>
          <strong>{loading ? "..." : stats.critical}</strong>
          <p>Öncelikli ele alınmalı</p>
        </article>
        <article className="usage-kpi usage-kpi-muted">
          <span>Toplam etki</span>
          <strong>{loading ? "..." : formatMoney(stats.exposure)}</strong>
          <p>Risk altındaki finansal değer</p>
        </article>
        <article className="usage-kpi usage-kpi-success">
          <span>Kaydedilen karar</span>
          <strong>{loading ? "..." : actions.length}</strong>
          <p>Denetim izi ile izlenir</p>
        </article>
      </section>

      <CommandFilterBar
        search={search}
        onSearch={setSearch}
        severity={severity}
        onSeverity={setSeverity}
        type={type}
        onType={setType}
        right={<button type="button" className="pro-btn-outline" onClick={fetchData}>Yenile</button>}
      />

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Karar bekleyen olaylar</h2>
            <p className="panel-subtitle">Satıra tıklayarak detay panelini açın.</p>
          </div>
          <span className="panel-header-badge blue">{filtered.length} sonuç</span>
        </div>

        {loading ? (
          <div className="usage-skeleton-list">
            {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Filtreye uygun olay yok">
            Filtreleri genişletin veya yeni veri geldikten sonra kuyruğu yenileyin.
          </EmptyState>
        ) : (
          <div className="exception-card-list">
            {filtered.map((item) => {
              const severityInfo = severityMeta(item.severity);
              const action = actionByIncident[item.id];
              return (
                <button key={item.id} type="button" className="exception-card" onClick={() => setSelected(item)}>
                  <div>
                    <h3>{translateIncidentTitle(item.title)}</h3>
                    <p>{translateIncidentDescription(item.description)}</p>
                    <div className="exception-card-meta">
                      <span className={`panel-header-badge ${severityInfo.tone}`}>{severityInfo.label}</span>
                      <span className="data-chip">{typeLabel(item.type)}</span>
                      <span className="data-chip">Güven {formatPct(item.confidence)}</span>
                      {action && <span className="data-chip success">{actionStatusLabel(action.status)}</span>}
                    </div>
                  </div>
                  <div className="exception-card-impact">
                    {formatMoney(item.impact_usd)}
                    <span className="pro-btn-outline">Detay</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <DecisionDrawer
        open={Boolean(selected)}
        item={selected}
        onClose={() => setSelected(null)}
        onAction={handleAction}
        loadingAction={selected ? saving[selected.id] : null}
        drilldownAction={drilldown}
      />
    </div>
  );
}
