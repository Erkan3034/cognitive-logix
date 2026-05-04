import { useCallback, useEffect, useState } from "react";
import { createApiKey, getApiKeys, revokeApiKey } from "../lib/api.js";

function formatDate(v) {
  if (!v) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(v));
}

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(() => {
    setLoading(true); setError(null);
    getApiKeys().then(d => setKeys(d?.items ?? [])).catch(e => setError(e?.response?.data?.detail || "Anahtar listesi yüklenemedi.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setCreating(true); setNewKey(null);
    try { const r = await createApiKey({ label: newLabel.trim() }); setNewKey(r.raw_key); setNewLabel(""); fetchKeys(); }
    catch (e) { setError(e?.response?.data?.detail || "Anahtar oluşturulamadı."); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Bu bağlantı anahtarı kalıcı olarak devre dışı bırakılacak. Onaylıyor musunuz?")) return;
    try { await revokeApiKey(id); fetchKeys(); } catch (e) { setError(e?.response?.data?.detail || "Anahtar iptal edilemedi."); }
  };

  const handleCopy = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const activeCount = keys.filter(k => k.is_active).length;

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Dış Bağlantılar</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Bağlantı Anahtarları</h1>
            <p className="page-subtitle">
              ERP, muhasebe veya diğer sistemlerinizi platforma bağlamak için anahtar oluşturun.
              Her anahtar sadece oluşturulduğunda bir kez gösterilir — güvenli bir yere kaydedin.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Yükleniyor..." : `${activeCount} aktif bağlantı`}
          </div>
        </div>
      </header>

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: 10, marginBottom: 16, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>⚠️ {error}</p>
        </div>
      )}

      {/* Yeni anahtar */}
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Yeni Bağlantı Anahtarı Oluştur</h2>
            <p className="panel-subtitle">Bu anahtarı dış sisteminizde kullanarak platforma veri gönderebilirsiniz.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
            placeholder="örn: ERP Entegrasyonu, Muhasebe Sistemi"
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            className="input" style={{ flex: 1 }} />
          <button onClick={handleCreate} disabled={creating || !newLabel.trim()} className="btn"
            style={{ whiteSpace: "nowrap", opacity: (!newLabel.trim() || creating) ? 0.5 : 1 }}>
            {creating ? "⟳ Oluşturuluyor..." : "🔑 Anahtar Oluştur"}
          </button>
        </div>

        {newKey && (
          <div style={{ marginTop: 16, padding: "16px", borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>Anahtar Başarıyla Oluşturuldu!</span>
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
              ⚠️ Bu anahtarı şimdi kopyalayın. Sayfayı yeniledikten sonra bir daha göremezsiniz.
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", background: "rgba(0,0,0,0.3)", padding: "10px 14px", borderRadius: 8 }}>
              <code style={{ flex: 1, fontSize: 12, color: "#e2e8f0", wordBreak: "break-all", fontFamily: "monospace" }}>{newKey}</code>
              <button onClick={() => handleCopy(newKey)} style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: copied ? "rgba(16,185,129,0.15)" : "rgba(99,102,241,0.15)",
                color: copied ? "#10b981" : "#818cf8",
                border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(99,102,241,0.3)"}`,
                whiteSpace: "nowrap",
              }}>
                {copied ? "✓ Kopyalandı!" : "Kopyala"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Anahtarlar listesi */}
      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Mevcut Bağlantı Anahtarları</h2>
            <p className="panel-subtitle">Aktif ve devre dışı tüm anahtarlarınız</p>
          </div>
          <span className="panel-header-badge blue">{keys.length} anahtar</span>
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: 8 }}>
            {[1,2].map(k => <div key={k} className="skeleton" style={{ height: 64, borderRadius: 10 }} />)}
          </div>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔑</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 4 }}>Henüz bağlantı anahtarı yok</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Yukarıdan yeni bir anahtar oluşturun.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {keys.map(k => (
              <div key={k.id} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "12px 16px",
                borderRadius: 10, opacity: k.is_active ? 1 : 0.5,
                background: k.is_active ? "rgba(99,102,241,0.05)" : "rgba(148,163,184,0.04)",
                border: `1px solid ${k.is_active ? "rgba(99,102,241,0.2)" : "rgba(148,163,184,0.1)"}`,
              }}>
                <span style={{ fontSize: 20 }}>🔑</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{k.label}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "1px 8px", borderRadius: 12,
                      background: k.is_active ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.1)",
                      color: k.is_active ? "#10b981" : "#64748b",
                      border: `1px solid ${k.is_active ? "rgba(16,185,129,0.2)" : "rgba(148,163,184,0.15)"}`,
                    }}>{k.is_active ? "Aktif" : "Devre Dışı"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    Oluşturulma: {formatDate(k.created_at)}
                    {k.last_used_at && ` · Son kullanım: ${formatDate(k.last_used_at)}`}
                  </div>
                </div>
                <code style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace", flexShrink: 0 }}>{k.key_prefix}…</code>
                {k.is_active && (
                  <button onClick={() => handleRevoke(k.id)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                    background: "rgba(239,68,68,0.08)", color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", flexShrink: 0,
                  }}>İptal Et</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
