import { motion } from "framer-motion";

export function StatusBanner({ type = "info", title, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`pro-status pro-status-${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      <div className="pro-status-body">
        {title && <div className="pro-status-title">{title}</div>}
        {children && <div className="pro-status-text">{children}</div>}
      </div>
      {action && <div className="pro-status-action">{action}</div>}
    </motion.div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring", bounce: 0.3 }}
      className="pro-empty-state"
    >
      <div className="pro-empty-mark" aria-hidden="true" />
      <div className="pro-empty-title">{title}</div>
      {children && <div className="pro-empty-text">{children}</div>}
      {action && <div className="pro-empty-action">{action}</div>}
    </motion.div>
  );
}

export function PageIntro({ eyebrow, title, children, aside, onTourStart }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="page-header"
    >
      {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
      <div className="page-title-row">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h1 className="page-title">{title}</h1>
          {onTourStart && (
            <button
              type="button"
              onClick={onTourStart}
              className="tour-help-btn"
              title="Bu sayfa nasıl çalışır?"
              aria-label="Eğitim turunu başlat"
            >
              ?
            </button>
          )}
        </div>
        {children && <p className="page-subtitle">{children}</p>}
        {aside}
      </div>
    </motion.header>
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
