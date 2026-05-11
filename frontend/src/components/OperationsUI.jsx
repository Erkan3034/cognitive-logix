import { InlineSpinner } from "./ProductUI.jsx";

export function formatPct(value) {
  if (value == null) return "-";
  return `${Math.round(Number(value) * 100)}%`;
}

export function formatMoney(value) {
  const amount = Number(value || 0);
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

export function severityMeta(severity = "medium") {
  if (severity === "critical") return { label: "Kritik", tone: "red" };
  if (severity === "high") return { label: "Yüksek", tone: "red" };
  if (severity === "medium") return { label: "Orta", tone: "amber" };
  return { label: "Düşük", tone: "green" };
}

export function typeLabel(type = "") {
  const map = {
    logistics: "Lojistik",
    fraud: "Finansal risk",
    inventory: "Stok",
    demand: "Talep",
    model: "Model",
  };
  return map[type] || "Operasyon";
}

export function translateIncidentTitle(title = "Risk olayı") {
  const known = {
    "Negative-profit order exposure": "Zarar eden sipariş riski",
    "Suspected fraud exposure cluster": "Şüpheli işlem kümesi",
  };
  if (known[title]) return known[title];
  return title
    .replace("lane delay risk", "hat gecikme riski")
    .replace("Standard Class", "Standart")
    .replace("First Class", "Öncelikli")
    .replace("Second Class", "Ekonomi")
    .replace("Same Day", "Aynı Gün");
}

export function translateIncidentDescription(description = "") {
  const logisticsMatch = description.match(/^(.+) segment has ([\d.]+)% late-delivery risk across ([\d,]+) orders\.$/);
  if (logisticsMatch) {
    return `${contextValueLabel(logisticsMatch[1])} segmentinde %${logisticsMatch[2]} gecikme riski var; ${logisticsMatch[3]} sipariş incelendi.`;
  }

  const fraudMatch = description.match(/^([\d,]+) suspected-fraud orders carry \$(.+) gross exposure\.$/);
  if (fraudMatch) {
    return `${fraudMatch[1]} şüpheli işlem $${fraudMatch[2]} brüt risk taşıyor.`;
  }

  const lossMatch = description.match(/^([\d,]+) loss-making orders represent \$(.+) revenue at risk\.$/);
  if (lossMatch) {
    return `${lossMatch[1]} zarar eden sipariş $${lossMatch[2]} gelir riski oluşturuyor.`;
  }

  return description
    .replace("late-delivery risk", "gecikme riski")
    .replace("suspected-fraud", "şüpheli işlem")
    .replace("loss-making", "zarar eden")
    .replace("gross exposure", "brüt risk")
    .replace("revenue at risk", "risk altındaki gelir");
}

export function translateAction(action = "") {
  const text = action.toLowerCase();
  if (text.includes("hold")) return "Sevkiyatı beklet";
  if (text.includes("review")) return "İncelemeye al";
  if (text.includes("upgrade")) return "Servis seviyesini yükselt";
  if (text.includes("notify")) return "Ekibi bilgilendir";
  if (text.includes("inspect")) return "Detaya bak";
  return action || "Aksiyon al";
}

function contextValueLabel(value) {
  const labels = {
    "Standard Class": "Standart",
    "Second Class": "Ekonomi",
    "First Class": "Öncelikli",
    "Same Day": "Aynı Gün",
    "Sporting Goods": "Spor ürünleri",
    "Fan Shop": "Taraftar ürünleri",
    Cleats: "Krampon",
    Apparel: "Giyim",
    Footwear: "Ayakkabı",
    "Fitness Equipment": "Egzersiz ekipmanı",
    Electronics: "Elektronik",
    "Western Europe": "Batı Avrupa",
    "Eastern Europe": "Doğu Avrupa",
    "Central America": "Orta Amerika",
    "South America": "Güney Amerika",
    "Southeast Asia": "Güneydoğu Asya",
    "West Africa": "Batı Afrika",
    "US / Puerto Rico": "ABD / Porto Riko",
    LATAM: "Latin Amerika",
  };
  return labels[value] || value;
}

export function CommandFilterBar({
  search,
  onSearch,
  severity,
  onSeverity,
  type,
  onType,
  right,
}) {
  return (
    <div className="command-filter-bar">
      <input
        className="input command-filter-search"
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder="Olay, bölge, aksiyon veya kategori ara"
      />
      <select className="select" value={severity} onChange={(event) => onSeverity(event.target.value)}>
        <option value="all">Tüm öncelikler</option>
        <option value="critical">Kritik</option>
        <option value="high">Yüksek</option>
        <option value="medium">Orta</option>
        <option value="low">Düşük</option>
      </select>
      <select className="select" value={type} onChange={(event) => onType(event.target.value)}>
        <option value="all">Tüm türler</option>
        <option value="logistics">Lojistik</option>
        <option value="fraud">Finansal risk</option>
        <option value="inventory">Stok</option>
        <option value="model">Model</option>
      </select>
      {right && <div className="command-filter-right">{right}</div>}
    </div>
  );
}

export function DecisionDrawer({ open, item, onClose, onAction, loadingAction, drilldownAction }) {
  if (!open || !item) return null;
  const severity = severityMeta(item.severity);
  const busy = Boolean(loadingAction);

  return (
    <>
      <button type="button" className="ct-drawer-overlay" aria-label="Detay panelini kapat" onClick={onClose} />
      <aside className="decision-drawer" role="dialog" aria-label="Olay detayları">
        <div className="decision-drawer-head">
          <div>
            <span className={`panel-header-badge ${severity.tone}`}>{severity.label}</span>
            <h2>{translateIncidentTitle(item.title)}</h2>
            <p>{translateIncidentDescription(item.description || "Bu olay için açıklama bulunamadı.")}</p>
          </div>
          <button type="button" className="ct-drawer-close" onClick={onClose}>Kapat</button>
        </div>

        <div className="decision-drawer-metrics">
          <div>
            <span>Tür</span>
            <strong>{typeLabel(item.type)}</strong>
          </div>
          <div>
            <span>Güven</span>
            <strong>{formatPct(item.confidence)}</strong>
          </div>
          <div>
            <span>Etki</span>
            <strong>{formatMoney(item.impact_usd)}</strong>
          </div>
        </div>

        <section className="decision-drawer-section">
          <h3>Önerilen aksiyon</h3>
          <p>{translateAction(item.recommended_action)}</p>
        </section>

        {item.drilldown_params && Object.keys(item.drilldown_params).length > 0 && (
          <section className="decision-drawer-section">
            <h3>Bağlam</h3>
            <div className="data-chip-list">
              {Object.entries(item.drilldown_params).map(([key, value]) => (
                value ? <span key={key} className="data-chip">{String(contextValueLabel(value))}</span> : null
              ))}
            </div>
          </section>
        )}

        <div className="decision-drawer-actions">
          <button type="button" className="btn" disabled={busy} onClick={() => onAction(item, "approved")}>
            {loadingAction === "approved" ? <InlineSpinner label="Kaydediliyor" /> : "Onayla"}
          </button>
          <button type="button" className="pro-btn-outline" disabled={busy} onClick={() => onAction(item, "queued")}>
            {loadingAction === "queued" ? "Kaydediliyor" : "Sıraya al"}
          </button>
          <button type="button" className="pro-btn-ghost" disabled={busy} onClick={() => onAction(item, "dismissed")}>
            {loadingAction === "dismissed" ? "Kaydediliyor" : "Reddet"}
          </button>
          {drilldownAction && (
            <button type="button" className="pro-btn-outline" onClick={() => drilldownAction(item)}>
              Modülde incele
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
