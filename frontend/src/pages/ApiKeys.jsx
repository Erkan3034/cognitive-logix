import { useCallback, useEffect, useState } from "react";
import { createApiKey, getApiKeys, revokeApiKey } from "../lib/api.js";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null); // Sadece bir kez gösterilen raw key
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(() => {
    setLoading(true);
    setError(null);
    getApiKeys()
      .then((data) => setKeys(data?.items ?? []))
      .catch((err) => setError(err?.response?.data?.detail || "API key listesi alinamadi."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async () => {
    if (!newLabel.trim()) return;
    setCreating(true);
    setNewKey(null);
    try {
      const result = await createApiKey({ label: newLabel.trim() });
      setNewKey(result.raw_key);
      setNewLabel("");
      fetchKeys();
    } catch (err) {
      setError(err?.response?.data?.detail || "Key uretilemedi.");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId) => {
    if (!window.confirm("Bu API key iptal edilecek. Devam etmek istiyor musunuz?")) return;
    try {
      await revokeApiKey(keyId);
      fetchKeys();
    } catch (err) {
      setError(err?.response?.data?.detail || "Key iptal edilemedi.");
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-layout">
      <header className="page-header">
        <span className="page-eyebrow">Entegrasyon</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">API Key Yonetimi</h1>
            <p className="page-subtitle">
              Dis sistemler (ERP, webhook) icin API key uretin. Key ile <code>X-API-Key</code> header'i
              kullanarak tum endpointlere erisebilirsiniz.
            </p>
          </div>
          <div className="pill">
            <span className="pill-dot" />
            {loading ? "Okunuyor..." : `${keys.filter((k) => k.is_active).length} aktif key`}
          </div>
        </div>
      </header>

      {error && (
        <section className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Hata</h2>
              <p className="panel-subtitle">{error}</p>
            </div>
            <span className="panel-header-badge red">Hata</span>
          </div>
        </section>
      )}

      {/* Yeni key oluşturma */}
      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Yeni API Key Olustur</h2>
            <p className="panel-subtitle">
              Bir etiket girin ve key'inizi uretin. Key sadece bir kez gosterilir!
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "0 0 16px" }}>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ornek: ERP Entegrasyonu"
            className="form-input"
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface-alt, #1a1c2e)",
              color: "var(--text-primary)",
              fontSize: 14,
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button className="btn-action green" onClick={handleCreate} disabled={creating || !newLabel.trim()}>
            {creating ? "Uretiliyor..." : "Key Uret"}
          </button>
        </div>

        {/* Yeni üretilen key — sadece bir kez gösterilir */}
        {newKey && (
          <div
            className="risk-result-box"
            style={{ borderColor: "var(--risk-low)", background: "rgba(34,197,94,0.06)" }}
          >
            <p className="panel-title" style={{ color: "var(--risk-low)", marginBottom: 8 }}>
              Key Basariyla Uretildi!
            </p>
            <p className="card-caption" style={{ marginBottom: 12 }}>
              Bu key'i simdi guvenli bir yere kaydedin. Sayfa yenilendikten sonra bir daha goremezsiniz.
            </p>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: "rgba(0,0,0,0.3)",
                padding: "10px 14px",
                borderRadius: 8,
                fontFamily: "monospace",
                fontSize: 13,
                wordBreak: "break-all",
              }}
            >
              <span style={{ flex: 1, color: "var(--text-primary)" }}>{newKey}</span>
              <button
                className="btn-action blue"
                onClick={() => handleCopy(newKey)}
                style={{ whiteSpace: "nowrap" }}
              >
                {copied ? "Kopyalandi!" : "Kopyala"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Kullanım örneği */}
      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Kullanim Ornegi</h2>
            <p className="panel-subtitle">
              ERP sisteminizden asagidaki gibi istek gonderebilirsiniz.
            </p>
          </div>
          <span className="panel-header-badge blue">cURL</span>
        </div>
        <pre
          style={{
            background: "rgba(0,0,0,0.3)",
            padding: 16,
            borderRadius: 8,
            fontSize: 13,
            overflowX: "auto",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >{`curl -X POST http://localhost:8000/api/v1/ingest/webhook \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: cl_YOUR_KEY_HERE" \\
  -d '{"SiparisNo": "ORD-001", "Miktar": 50, "Hedef": "Istanbul"}'`}</pre>
      </section>

      {/* Key listesi */}
      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Mevcut API Key'ler</h2>
            <p className="panel-subtitle">Aktif ve iptal edilmis tum key'leriniz.</p>
          </div>
          <span className="panel-header-badge green">{keys.length} key</span>
        </div>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Etiket</th>
                <th>Key Onizleme</th>
                <th>Yetkiler</th>
                <th>Durum</th>
                <th>Son Kullanim</th>
                <th>Olusturulma</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} style={{ opacity: k.is_active ? 1 : 0.4 }}>
                  <td>{k.label}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 13 }}>{k.key_prefix}</td>
                  <td>{(k.scopes || []).join(", ")}</td>
                  <td>
                    <span className={`panel-header-badge ${k.is_active ? "green" : "red"}`}>
                      {k.is_active ? "Aktif" : "Iptal"}
                    </span>
                  </td>
                  <td>{formatDate(k.last_used_at)}</td>
                  <td>{formatDate(k.created_at)}</td>
                  <td>
                    {k.is_active && (
                      <button
                        className="btn-action red"
                        style={{ fontSize: 12, padding: "4px 10px" }}
                        onClick={() => handleRevoke(k.id)}
                      >
                        Iptal Et
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                    Henuz API key olusturulmamis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
