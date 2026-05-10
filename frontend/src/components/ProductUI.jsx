export function StatusBanner({ type = "info", title, children, action }) {
  return (
    <div className={`pro-status pro-status-${type}`} role={type === "error" ? "alert" : "status"}>
      <div className="pro-status-body">
        {title && <div className="pro-status-title">{title}</div>}
        {children && <div className="pro-status-text">{children}</div>}
      </div>
      {action && <div className="pro-status-action">{action}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="pro-empty-state">
      <div className="pro-empty-mark" aria-hidden="true" />
      <div className="pro-empty-title">{title}</div>
      {children && <div className="pro-empty-text">{children}</div>}
      {action && <div className="pro-empty-action">{action}</div>}
    </div>
  );
}

export function PageIntro({ eyebrow, title, children, aside }) {
  return (
    <header className="page-header">
      {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
      <div className="page-title-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {children && <p className="page-subtitle">{children}</p>}
        </div>
        {aside}
      </div>
    </header>
  );
}

export function FieldHint({ tone = "neutral", children }) {
  return <p className={`pro-field-hint pro-field-hint-${tone}`}>{children}</p>;
}

export function InlineSpinner({ label = "Yükleniyor..." }) {
  return (
    <span className="pro-inline-spinner">
      <span className="pro-spinner-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
