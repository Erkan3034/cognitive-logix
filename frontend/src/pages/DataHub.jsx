import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";
import { useAuth } from "../lib/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const EXPECTED_COLUMNS = [
  "Sipariş tarihi",
  "Bölge",
  "Kargo modu",
  "Sipariş tutarı",
  "Miktar",
  "Kategori",
  "Ürün kodu",
  "Kâr / zarar",
  "Müşteri tipi",
];

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
          accept=".csv"
          hidden
          onChange={(event) => acceptFile(event.target.files?.[0])}
        />
        <span className="data-dropzone-title">
          {file ? file.name : "CSV dosyanızı buraya bırakın veya seçin"}
        </span>
        <span className="data-dropzone-subtitle">
          {file
            ? `${(file.size / 1024).toFixed(1)} KB seçildi. Yüklemeden önce kolon eşleştirmesi yapılacak.`
            : "Kolon isimleri birebir aynı olmak zorunda değil; sistem eşleşmeleri incelemeniz için hazırlayacak."}
        </span>
      </button>

      <div className="data-format-card">
        <div className="panel-title" style={{ fontSize: 14 }}>Desteklenen alanlar</div>
        <p className="panel-subtitle" style={{ marginBottom: 12 }}>
          Aşağıdaki alanlar lojistik, talep ve finansal risk modüllerinin ortak veri sözlüğünü oluşturur.
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

function MappingReview({ mappingResult, previewData, sourceName, onConfirm, onReset }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const mapped = Object.entries(mappingResult?.mapped ?? {});
  const unmapped = mappingResult?.unmapped ?? [];

  async function confirm() {
    setSaving(true);
    setError("");
    try {
      await onConfirm();
      setSaved(true);
    } catch (err) {
      setError(err.message || "Veri kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <StatusBanner
        type="success"
        title="Veri kaynağı sisteme kaydedildi"
        action={<button type="button" className="pro-btn-ghost" onClick={onReset}>Yeni dosya yükle</button>}
      >
        {sourceName} dosyasındaki kayıtlar veri merkezine alındı. Bu kayıtlar artık izlenebilir ve sonraki model/veri kalitesi akışlarında kullanılabilir.
      </StatusBanner>
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
          <p className="card-caption">Kayda engel değil; rapora dahil edilmeyecek.</p>
        </article>
        <article className="card">
          <p className="card-title">Önizleme</p>
          <p className="card-value">{previewData.length}</p>
          <p className="card-caption">İlk satırlar doğrulama için gösteriliyor.</p>
        </article>
      </div>

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
                <strong>{target}</strong>
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
              <p className="panel-subtitle">Bu kolonlar veri kaydında atlanır; ham dosyada korunmaz.</p>
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
              <p className="panel-subtitle">İlk satırları kontrol edin; sayısal değerler ve tarih formatları doğru görünmeli.</p>
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

export default function DataHub() {
  const { session } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [mappingResult, setMappingResult] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [stagedRows, setStagedRows] = useState([]);
  const [sourceName, setSourceName] = useState("");

  if (!session) return <Navigate to="/login" replace />;

  const step = mappingResult ? 2 : 1;

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch(`${API_BASE}/api/v1/ingest/csv-preview`, {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "CSV okunamadı.");
      setMappingResult(data.mapping_result);
      setPreviewData(data.preview_data || []);
      setStagedRows(data.staged_rows || []);
      setSourceName(data.source_name || file.name);
    } catch (err) {
      setError(err.message || "Sunucuya bağlanılamadı.");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmMapping() {
    const response = await fetch(`${API_BASE}/api/v1/ingest/confirm-mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        final_mapping: mappingResult.mapped,
        data: stagedRows,
        source_name: sourceName,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Veri kaydedilemedi.");
  }

  function resetState() {
    setFile(null);
    setError("");
    setMappingResult(null);
    setPreviewData([]);
    setStagedRows([]);
    setSourceName("");
  }

  return (
    <div className="page-layout">
      <PageIntro eyebrow="Veri yönetimi" title="Veri Merkezi">
        CSV verinizi güvenli şekilde yükleyin, kolon eşleştirmelerini inceleyin ve sisteme kaydedin.
      </PageIntro>

      <StatusBanner type="info" title="Bu akış ne sağlar?">
        Veri Merkezi, müşterinin farklı kolon adlarıyla gelen dosyasını standart veri sözlüğüne bağlar. Kaydetmeden önce tüm eşleşmeler kullanıcıya gösterilir.
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
              previewData={previewData}
              sourceName={sourceName}
              onConfirm={handleConfirmMapping}
              onReset={resetState}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
