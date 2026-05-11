import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiKey, getApiKeys, revokeApiKey } from "../lib/api.js";
import { EmptyState, FieldHint, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

const SCOPE_OPTIONS = [
  {
    id: "predict",
    label: "Lojistik risk analizi",
    description: "Teslimat gecikmesi, rota riski ve operasyonel karar motoru.",
    endpoint: "/predict",
  },
  {
    id: "forecast",
    label: "Talep tahmini",
    description: "Ürün kodu bazlı tahmin, güven aralığı ve stok kararları.",
    endpoint: "/forecast",
  },
  {
    id: "fraud",
    label: "Finansal risk analizi",
    description: "Sipariş, ödeme ve müşteri risk sinyallerini değerlendirir.",
    endpoint: "/fraud",
  },
  {
    id: "ingest",
    label: "Veri gönderimi",
    description: "Dosya ön izleme, kolon eşleme ve veri içe aktarma akışları.",
    endpoint: "/api/v1/ingest",
  },
  {
    id: "metrics",
    label: "Metrik okuma",
    description: "Kontrol ekranı ve model içgörülerini sistem üzerinden okur.",
    endpoint: "/metrics",
  },
];

const DEFAULT_SCOPES = ["predict", "forecast", "fraud", "ingest"];

function formatDate(value) {
  if (!value) return "Henüz yok";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Geçersiz tarih";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function normalizeScopes(scopes) {
  if (Array.isArray(scopes)) return scopes;
  if (typeof scopes === "string") {
    try {
      const parsed = JSON.parse(scopes);
      return Array.isArray(parsed) ? parsed : scopes.split(",").map((item) => item.trim()).filter(Boolean);
    } catch {
      return scopes.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function scopeLabel(scope) {
  return SCOPE_OPTIONS.find((option) => option.id === scope)?.label ?? scope;
}

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [selectedScopes, setSelectedScopes] = useState(DEFAULT_SCOPES);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revokeCandidate, setRevokeCandidate] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApiKeys();
      setKeys(data?.items ?? []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Bağlantı anahtarları yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const activeCount = useMemo(() => keys.filter((key) => key.is_active).length, [keys]);

  const toggleScope = (scope) => {
    setSelectedScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope]
    );
  };

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) {
      setError("Anahtar adı boş bırakılamaz.");
      return;
    }
    if (selectedScopes.length === 0) {
      setError("En az bir yetki kapsamı seçmelisiniz.");
      return;
    }

    setCreating(true);
    setError(null);
    setNewKey(null);
    try {
      const response = await createApiKey({ label, scopes: selectedScopes });
      setNewKey(response?.raw_key ?? response?.key ?? null);
      setNewLabel("");
      setSelectedScopes(DEFAULT_SCOPES);
      await fetchKeys();
    } catch (err) {
      setError(err?.response?.data?.detail || "Bağlantı anahtarı oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  };

  const confirmRevoke = async () => {
    if (!revokeCandidate) return;
    setRevokingId(revokeCandidate.id);
    setError(null);
    try {
      await revokeApiKey(revokeCandidate.id);
      setRevokeCandidate(null);
      await fetchKeys();
    } catch (err) {
      setError(err?.response?.data?.detail || "Bağlantı anahtarı devre dışı bırakılamadı.");
    } finally {
      setRevokingId(null);
    }
  };

  const handleCopy = async (text) => {
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Güvenli entegrasyon"
        title="Bağlantı Anahtarları"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loading ? <InlineSpinner label="Yükleniyor" /> : `${activeCount} aktif anahtar`}
          </div>
        }
      >
        ERP, depo yönetimi, e-ticaret ve finans sistemlerine sadece ihtiyaç duydukları yetkileri verin.
        Her anahtar kapsam kontrollüdür ve düz metin anahtar yalnızca oluşturulduğu anda gösterilir.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="İşlem tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      {newKey && (
        <StatusBanner
          type="success"
          title="Anahtar oluşturuldu"
          action={
            <button className="pro-btn-outline" type="button" onClick={() => handleCopy(newKey)}>
              {copied ? "Kopyalandı" : "Kopyala"}
            </button>
          }
        >
          <span className="api-key-secret">{newKey}</span>
          <FieldHint tone="warning">
            Bu değer güvenlik nedeniyle bir daha gösterilmeyecek. Dış sisteminizde saklamadan sayfadan ayrılmayın.
          </FieldHint>
        </StatusBanner>
      )}

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Yeni anahtar oluştur</h2>
            <p className="panel-subtitle">
              Anahtarı hangi servislerin kullanacağını seçin. Fazla yetki vermek yerine en dar kapsamla başlayın.
            </p>
          </div>
        </div>

        <div className="api-key-create-grid">
          <label className="field">
            <span className="field-label">Anahtar adı</span>
            <input
              type="text"
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleCreate()}
              className="input"
              placeholder="Örn. ERP canlı entegrasyon"
              maxLength={100}
            />
            <span className="field-helper">Sistemde kimin neyi kullandığını ayırmak için anlaşılır bir ad kullanın.</span>
          </label>

          <div className="api-scope-grid" aria-label="Yetki kapsamları">
            {SCOPE_OPTIONS.map((option) => {
              const checked = selectedScopes.includes(option.id);
              return (
                <label key={option.id} className={`api-scope-card ${checked ? "selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleScope(option.id)}
                  />
                  <span className="api-scope-card-body">
                    <span className="api-scope-card-title">{option.label}</span>
                    <span className="api-scope-card-desc">{option.description}</span>
                    <code>{option.endpoint}</code>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="data-actions end">
          <button
            type="button"
            className="btn"
            disabled={creating || !newLabel.trim() || selectedScopes.length === 0}
            onClick={handleCreate}
          >
            {creating ? <InlineSpinner label="Oluşturuluyor" /> : "Anahtar oluştur"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Mevcut anahtarlar</h2>
            <p className="panel-subtitle">
              Aktif anahtarları izleyin, kapsamlarını doğrulayın ve artık kullanılmayan bağlantıları kapatın.
            </p>
          </div>
          <span className="panel-header-badge blue">{keys.length} kayıt</span>
        </div>

        {loading ? (
          <div className="api-key-list">
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton api-key-skeleton" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <EmptyState
            title="Henüz bağlantı anahtarı yok"
            action={
              <button type="button" className="pro-btn-outline" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Yeni anahtar alanına git
              </button>
            }
          >
            İlk canlı entegrasyonunuzu açmadan önce kullanılacak modülleri seçerek bir anahtar oluşturun.
          </EmptyState>
        ) : (
          <div className="api-key-list">
            {keys.map((key) => {
              const scopes = normalizeScopes(key.scopes);
              const isConfirming = revokeCandidate?.id === key.id;
              return (
                <article key={key.id} className={`api-key-card ${key.is_active ? "" : "muted"}`}>
                  <div className="api-key-card-main">
                    <div>
                      <div className="api-key-card-title-row">
                        <h3>{key.label}</h3>
                        <span className={`api-key-status ${key.is_active ? "active" : "inactive"}`}>
                          {key.is_active ? "Aktif" : "Devre dışı"}
                        </span>
                      </div>
                      <div className="api-key-meta">
                        <span>Oluşturulma: {formatDate(key.created_at)}</span>
                        <span>Son kullanım: {formatDate(key.last_used_at)}</span>
                      </div>
                    </div>
                    <code className="api-key-prefix">{key.key_prefix || "clx"}...</code>
                  </div>

                  <div className="api-key-scope-list">
                    {scopes.length > 0 ? (
                      scopes.map((scope) => (
                        <span key={scope} className="data-chip">
                          {scopeLabel(scope)}
                        </span>
                      ))
                    ) : (
                      <span className="data-chip warning">Kapsam bilgisi yok</span>
                    )}
                  </div>

                  {key.is_active && (
                    <div className="api-key-actions">
                      {isConfirming ? (
                        <>
                          <span className="api-key-confirm-text">Bu anahtar kalıcı olarak kapatılacak.</span>
                          <button type="button" className="pro-btn-ghost" onClick={() => setRevokeCandidate(null)}>
                            Vazgeç
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={revokingId === key.id}
                            onClick={confirmRevoke}
                          >
                            {revokingId === key.id ? <InlineSpinner label="Kapatılıyor" /> : "Devre dışı bırak"}
                          </button>
                        </>
                      ) : (
                        <button type="button" className="pro-btn-outline" onClick={() => setRevokeCandidate(key)}>
                          Devre dışı bırak
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
