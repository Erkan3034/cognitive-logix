import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { confirmMapping, getIngestHistory, previewCsvFile, deleteIngestHistory } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

const EXPECTED_COLUMNS = [
  "Sipariş tarihi",
  "Beklenen teslim tarihi",
  "Gerçek teslim tarihi",
  "Bölge",
  "Kargo modu",
  "Sipariş tutarı",
  "Miktar",
  "Kategori",
  "Ürün kodu",
  "Kâr / zarar",
  "Müşteri tipi",
];

const COLUMN_LABELS = {
  Order_ID: "Sipariş no",
  Product_ID: "Ürün kodu",
  Category: "Kategori",
  Quantity: "Miktar",
  Order_Date: "Sipariş tarihi",
  Expected_Delivery_Date: "Beklenen teslim",
  Actual_Delivery_Date: "Gerçek teslim",
  Origin: "Çıkış noktası",
  Destination: "Bölge / varış",
  Shipping_Mode: "Kargo modu",
  Sales: "Sipariş tutarı",
  Profit: "Kâr / zarar",
  Customer_Type: "Müşteri tipi",
  Payment_Type: "Ödeme tipi",
  Discount_Rate: "İndirim oranı",
};

const FEED_STATUS = {
  ready: { label: "Hazır", tone: "green", text: "Tüm ana model alanları tamam." },
  partial: { label: "Kısmi hazır", tone: "amber", text: "Bazı modeller için eksik alan var." },
  blocked: { label: "Eksik alan", tone: "amber", text: "Model besleme için zorunlu alanlar eksik." },
  unknown: { label: "Eski kayıt", tone: "blue", text: "Bu kayıtta besleme raporu yok." },
};

function formatDate(value) {
  if (!value) return "Henüz yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function feedInfo(reportOrStatus) {
  const status =
    typeof reportOrStatus === "string"
      ? reportOrStatus
      : reportOrStatus?.status || "unknown";
  return FEED_STATUS[status] || FEED_STATUS.unknown;
}

function columnLabel(value) {
  return COLUMN_LABELS[value] || value;
}

function StepBar({ step }) {
  const steps = ["Dosya seç", "Eşleştirmeyi incele", "Kaydet"];
  return (
    <div className="data-stepbar" aria-label="Veri yükleme adımları">
      {steps.map((label, index) => {
        const n = index + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={label} className={`data-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
            <span className="data-step-index">{done ? "✓" : n}</span>
            <span className="data-step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DropZone({ file, setFile, onUpload, uploading, onError }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function acceptFile(nextFile) {
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".csv")) {
      onError("Lütfen CSV formatında bir dosya seçin.");
      return;
    }
    onError("");
    setFile(nextFile);
  }

  return (
    <div className="data-upload-layout">
      <button
        type="button"
        className={`data-dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          acceptFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
        <span className="data-dropzone-title">
          {file ? file.name : "Veri dosyanızı buraya bırakın veya seçin"}
        </span>
        <span className="data-dropzone-subtitle">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB seçildi. Kaydetmeden önce kolon eşleştirmesi ve model besleme kontrolü yapılacak.`
            : "Kolon adları farklı olabilir; sistem alanları Türkçe veri sözlüğüne bağlayıp incelemeniz için hazırlayacak."}
        </span>
      </button>

      <div className="data-format-card">
        <div className="panel-title" style={{ fontSize: 14 }}>Beklenen veri alanları</div>
        <p className="panel-subtitle" style={{ marginBottom: 12 }}>
          Bu alanlar lojistik, talep ve finansal risk analizlerinin ortak veri sözlüğünü oluşturur.
        </p>
        <div className="data-chip-list">
          {EXPECTED_COLUMNS.map((column) => <span key={column} className="data-chip">{column}</span>)}
        </div>
      </div>

      <div className="data-actions">
        {file && (
          <button type="button" className="pro-btn-ghost" onClick={() => setFile(null)}>
            Dosyayı kaldır
          </button>
        )}
        <button type="button" className="btn" onClick={onUpload} disabled={!file || uploading}>
          {uploading ? <InlineSpinner label="Kolonlar inceleniyor..." /> : "Kolon eşleştirmesini başlat"}
        </button>
      </div>
    </div>
  );
}

function ModelFeedPanel({ report }) {
  const info = feedInfo(report);
  const domains = report?.domains || [];

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title-block">
          <h2 className="panel-title">Model besleme kontrolü</h2>
          <p className="panel-subtitle">
            Kaynak verinin lojistik, talep ve finansal risk katmanlarına uygunluğu.
          </p>
        </div>
        <span className={`panel-header-badge ${info.tone}`}>{info.label}</span>
      </div>

      <div className="feed-domain-grid">
        {domains.map((domain) => {
          const domainInfo = feedInfo(domain.status);
          return (
            <article key={domain.key} className={`feed-domain-card ${domain.status}`}>
              <div>
                <strong>{domain.label}</strong>
                <span>{domainInfo.text}</span>
              </div>
              {domain.missing_required?.length > 0 ? (
                <p>Eksik: {domain.missing_required.map(columnLabel).join(", ")}</p>
              ) : (
                <p>Zorunlu alanlar tamam.</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MappingReview({ mappingResult, modelFeedReport, previewData, sourceName, onConfirm, onReset }) {
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const [error, setError] = useState("");

  const mapped = Object.entries(mappingResult?.mapped ?? {});
  const unmapped = mappingResult?.unmapped ?? [];

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      const result = await onConfirm();
      setSavedResult(result);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Veri kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (savedResult) {
    const info = feedInfo(savedResult.model_feed_report);
    return (
      <div className="result-stack">
        <StatusBanner
          type={savedResult.persistence_warning ? "warning" : "success"}
          title="Veri kaynağı kalıcı havuza kaydedildi"
          action={<button type="button" className="pro-btn-ghost" onClick={onReset}>Yeni dosya yükle</button>}
        >
          {sourceName} için {Number(savedResult.persisted_records || 0).toLocaleString("tr-TR")} satır satır bazlı veri havuzuna yazıldı. Model besleme durumu: {info.label}.
          {savedResult.persistence_warning ? ` ${savedResult.persistence_warning}` : ""}
        </StatusBanner>
        <ModelFeedPanel report={savedResult.model_feed_report} />
      </div>
    );
  }

  return (
    <div className="data-review-layout">
      {error && <StatusBanner type="error" title="Kayıt tamamlanamadı">{error}</StatusBanner>}

      <div className="kpi-grid">
        <article className="card">
          <p className="card-title">Eşleşen kolon</p>
          <p className="card-value">{mapped.length}</p>
          <p className="card-caption">Standart veri sözlüğüne otomatik bağlandı.</p>
        </article>
        <article className="card">
          <p className="card-title">İncelenecek kolon</p>
          <p className="card-value">{unmapped.length}</p>
          <p className="card-caption">Kayda engel değil; model alanına bağlanmaz.</p>
        </article>
        <article className="card">
          <p className="card-title">Önizleme</p>
          <p className="card-value">{previewData.length}</p>
          <p className="card-caption">İlk satırlar doğrulama için gösteriliyor.</p>
        </article>
      </div>

      <ModelFeedPanel report={modelFeedReport} />

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Kolon eşleştirmeleri</h2>
              <p className="panel-subtitle">Kaydetmeden önce otomatik eşleşmeleri kontrol edin.</p>
            </div>
          </div>
          <div className="data-mapping-list">
            {mapped.map(([source, target]) => (
              <div key={source} className="data-mapping-row">
                <span>{source}</span>
                <strong>{columnLabel(target)}</strong>
              </div>
            ))}
            {mapped.length === 0 && (
              <EmptyState title="Eşleşme bulunamadı">
                Dosyadaki kolon adları sistem sözlüğüyle eşleşmedi. Kolon adlarını sadeleştirip tekrar yükleyin.
              </EmptyState>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Eşleşmeyen kolonlar</h2>
              <p className="panel-subtitle">Bu kolonlar kayda engel olmaz; model girdisi olarak kullanılmaz.</p>
            </div>
          </div>
          <div className="data-chip-list">
            {unmapped.map((column) => <span key={column} className="data-chip warning">{column}</span>)}
            {unmapped.length === 0 && <span className="data-chip success">Tüm kolonlar eşleşti</span>}
          </div>
        </div>
      </section>

      {previewData.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Veri önizlemesi</h2>
              <p className="panel-subtitle">İlk satırları kontrol edin; tutar ve tarih formatları doğru görünmeli.</p>
            </div>
          </div>
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  {Object.keys(previewData[0] ?? {}).map((column) => <th key={column}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, cellIndex) => <td key={cellIndex}>{String(value ?? "-")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="data-actions end">
        <button type="button" className="pro-btn-ghost" onClick={onReset}>Geri dön</button>
        <button type="button" className="btn" onClick={confirm} disabled={saving || mapped.length === 0}>
          {saving ? <InlineSpinner label="Kaydediliyor..." /> : "Eşleştirmeyi onayla ve kaydet"}
        </button>
      </div>
    </div>
  );
}

function SourceHistory({ history, loading, error, onRefresh, onDelete }) {
  const [expandedId, setExpandedId] = useState(null);

  const stats = useMemo(() => {
    const totalRows = history.reduce((sum, row) => sum + Number(row.persisted_record_count || row.row_count || 0), 0);
    const ready = history.filter((row) => feedInfo(row.model_feed_status || row.model_feed_report).label === "Hazır").length;
    return { totalRows, ready };
  }, [history]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-block">
          <h2 className="panel-title">Kaydedilen veri kaynakları</h2>
          <p className="panel-subtitle">Sayfadan çıksanız bile Supabase havuzundaki kayıtlar burada yeniden görünür.</p>
        </div>
        <button type="button" className="pro-btn-outline" onClick={onRefresh}>Yenile</button>
      </div>

      <div className="source-summary-grid">
        <article>
          <span>Kaynak</span>
          <strong>{history.length.toLocaleString("tr-TR")}</strong>
        </article>
        <article>
          <span>Kalıcı satır</span>
          <strong>{stats.totalRows.toLocaleString("tr-TR")}</strong>
        </article>
        <article>
          <span>Hazır kaynak</span>
          <strong>{stats.ready.toLocaleString("tr-TR")}</strong>
        </article>
      </div>

      {error && <StatusBanner type="warning" title="Geçmiş okunamadı">{error}</StatusBanner>}

      {loading ? (
        <div className="usage-skeleton-list">
          {[1, 2, 3].map((item) => <div key={item} className="skeleton" />)}
        </div>
      ) : history.length === 0 ? (
        <EmptyState title="Henüz kayıtlı veri yok">
          Dosya yükleyip eşleştirmeyi onayladığınızda kaynak burada kalıcı olarak listelenir.
        </EmptyState>
      ) : (
        <div className="source-history-list">
          {history.map((row) => {
            const info = feedInfo(row.model_feed_status || row.model_feed_report);
            const count = Number(row.persisted_record_count || row.row_count || 0);
            return (
              <article key={row.id ?? `${row.filename}-${row.created_at}`} className="source-history-row" style={{ flexDirection: "column", alignItems: "stretch", padding: 0, gap: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px" }}>
                  <div>
                    <strong>{row.filename || (row.source === "webhook" ? "API Webhook Entegrasyonu" : row.source) || "Otomatik veri alımı"}</strong>
                    <span>{formatDate(row.created_at)} tarihinde kaydedildi</span>
                  </div>
                  <div className="source-history-meta">
                    <span>{count.toLocaleString("tr-TR")} satır</span>
                    <span className={`panel-header-badge ${info.tone}`}>{info.label}</span>
                    <button 
                      type="button" 
                      className="pro-btn-ghost" 
                      style={{ padding: "4px 8px", minWidth: 0, color: "var(--fg)" }}
                      onClick={() => toggleExpand(row.id)}
                    >
                      {expandedId === row.id ? "Gizle" : "Detayları Gör"}
                    </button>
                    <button 
                      type="button" 
                      className="pro-btn-ghost" 
                      style={{ padding: "4px 8px", minWidth: 0, color: "var(--red)" }}
                      onClick={() => onDelete(row.id)}
                      title="Bu geçmiş kaydını sil"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
                {expandedId === row.id && (
                  <div style={{ padding: "16px", borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", fontSize: "13px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                      <div>
                        <strong style={{ color: "var(--fg-muted)", display: "block", marginBottom: "8px" }}>
                          {row.source === "webhook" ? "API Auto-Mapping (NLP) Raporu" : "Manuel Kolon Eşleştirmesi"}
                        </strong>
                        <pre style={{ margin: 0, padding: "12px", background: "#09090b", borderRadius: "8px", overflowX: "auto", color: "var(--green)", border: "1px solid var(--border)", maxHeight: "250px" }}>
                          {row.mapping && Object.keys(row.mapping).length > 0 
                            ? JSON.stringify(row.mapping, null, 2) 
                            : (row.source === "webhook" ? "{}" : "Arayüz üzerinden manuel eşleştirme yapıldı.")}
                        </pre>
                      </div>
                      <div>
                        <strong style={{ color: "var(--fg-muted)", display: "block", marginBottom: "8px" }}>Yapay Zeka Besleme (Model Feed) Durumu</strong>
                        <pre style={{ margin: 0, padding: "12px", background: "#09090b", borderRadius: "8px", overflowX: "auto", color: "var(--amber)", border: "1px solid var(--border)", maxHeight: "250px" }}>
                          {JSON.stringify(row.model_feed_report || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function DataHub() {
  const { session } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mappingResult, setMappingResult] = useState(null);
  const [modelFeedReport, setModelFeedReport] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [stagedRows, setStagedRows] = useState([]);
  const [sourceName, setSourceName] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await getIngestHistory({ limit: 50 });
      setHistory(data?.items ?? []);
    } catch (err) {
      setHistory([]);
      setHistoryError(err?.response?.data?.detail || "Veri alım geçmişi okunamadı.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDeleteHistory(id) {
    if (!id || !window.confirm("Bu geçmiş kaydını ve ilgili verileri silmek istediğinize emin misiniz?")) return;
    try {
      await deleteIngestHistory(id);
      loadHistory();
    } catch (err) {
      alert(err?.response?.data?.detail || "Kayıt silinemedi.");
    }
  }

  useEffect(() => {
    if (session) loadHistory();
  }, [session]);

  if (!session) return <Navigate to="/login" replace />;

  const step = mappingResult ? 2 : 1;

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await previewCsvFile(file);
      setMappingResult(data.mapping_result);
      setModelFeedReport(data.model_feed_report);
      setPreviewData(data.preview_data || []);
      setStagedRows(data.staged_rows || []);
      setSessionId(data.session_id || null);
      setSourceName(data.source_name || file.name);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || "Sunucuya bağlanılamadı.");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmMapping() {
    const result = await confirmMapping({
      final_mapping: mappingResult.mapped,
      data: stagedRows,
      session_id: sessionId,
      source_name: sourceName,
    });
    await loadHistory();
    return result;
  }

  function resetState() {
    setFile(null);
    setError("");
    setMappingResult(null);
    setModelFeedReport(null);
    setPreviewData([]);
    setStagedRows([]);
    setSessionId(null);
    setSourceName("");
  }

  return (
    <div className="page-layout">
      <PageIntro eyebrow="Veri yönetimi" title="Veri Merkezi">
        Veri dosyanızı yükleyin, kolon eşleştirmesini onaylayın ve kaynağın model/analitik katmanında kullanılabilirliğini görün.
      </PageIntro>

      <StatusBanner type="info" title="Kalıcı veri akışı">
        Onaylanan dosyalar özet olarak veri geçmişine, satır bazında ise standart veri havuzuna yazılır. Operasyon metrikleri tenant verisini bu havuzdan okuyarak güncellenir.
      </StatusBanner>

      {error && <StatusBanner type="error" title="İşlem tamamlanamadı">{error}</StatusBanner>}

      <div className="panel" style={{ marginBottom: 20 }}>
        <StepBar step={step} />
        {!mappingResult ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <DropZone
              file={file}
              setFile={setFile}
              uploading={uploading}
              onUpload={handleUpload}
              onError={setError}
            />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <MappingReview
              mappingResult={mappingResult}
              modelFeedReport={modelFeedReport}
              previewData={previewData}
              sourceName={sourceName}
              onConfirm={handleConfirmMapping}
              onReset={resetState}
            />
          </motion.div>
        )}
      </div>

      <SourceHistory
        history={history}
        loading={historyLoading}
        error={historyError}
        onRefresh={loadHistory}
        onDelete={handleDeleteHistory}
      />
    </div>
  );
}
