import { useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../lib/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* ── Adım göstergesi ───────────────────────────────────── */
function StepBar({ step }) {
  const steps = [
    { n: 1, label: "Dosya Seç" },
    { n: 2, label: "Kolon Eşleştir" },
    { n: 3, label: "Onayla & Kaydet" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => (
        <div key={s.n} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 13,
              background: step >= s.n ? "#6366f1" : "rgba(148,163,184,0.1)",
              color: step >= s.n ? "#fff" : "#64748b",
              border: step === s.n ? "2px solid #818cf8" : "2px solid transparent",
              transition: "all .3s",
              boxShadow: step === s.n ? "0 0 0 4px rgba(99,102,241,0.2)" : "none",
            }}>
              {step > s.n ? "✓" : s.n}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: step >= s.n ? "#818cf8" : "#64748b", whiteSpace: "nowrap" }}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 2, marginBottom: 14,
              background: step > s.n ? "#6366f1" : "rgba(148,163,184,0.1)",
              transition: "background .3s",
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Dosya yükleme alanı ───────────────────────────────── */
function DropZone({ file, setFile, onUpload, uploading }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.name.endsWith(".csv")) setFile(f);
    else alert("Lütfen .csv uzantılı bir dosya seçin.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Upload zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? "#6366f1" : file ? "#10b981" : "rgba(148,163,184,0.25)"}`,
          borderRadius: 16, padding: "48px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          cursor: "pointer", transition: "all .2s",
          background: dragging ? "rgba(99,102,241,0.05)" : file ? "rgba(16,185,129,0.04)" : "transparent",
        }}
      >
        <input ref={inputRef} type="file" accept=".csv" style={{ display: "none" }}
          onChange={e => setFile(e.target.files?.[0] ?? null)} />

        <div style={{ fontSize: 52, lineHeight: 1 }}>
          {file ? "📄" : dragging ? "📥" : "☁️"}
        </div>
        {file ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>✅ Dosya Seçildi</div>
            <div style={{
              fontSize: 13, color: "#94a3b8", padding: "6px 16px",
              background: "rgba(16,185,129,0.08)", borderRadius: 20,
              border: "1px solid rgba(16,185,129,0.2)",
            }}>{file.name} &nbsp;·&nbsp; {(file.size / 1024).toFixed(1)} KB</div>
            <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
              style={{ fontSize: 11, color: "#64748b", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Farklı dosya seç
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>
              CSV dosyasını buraya sürükleyin veya tıklayın
            </div>
            <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 1.7 }}>
              Sipariş, lojistik veya talep verilerinizi içeren .csv dosyasını seçin.<br />
              Kolon isimlerinin sistem şemasıyla birebir aynı olması gerekmez — AI otomatik eşleştirir.
            </div>
          </>
        )}
      </div>

      {/* Beklenen format bilgisi */}
      <div style={{
        background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)",
        borderRadius: 12, padding: "14px 16px",
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#818cf8", marginBottom: 8 }}>
          💡 Hangi kolonlar destekleniyor?
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Sipariş Tarihi", "Bölge / Ülke", "Kargo Modu", "Sipariş Tutarı", "Miktar",
            "Kategori", "Ürün Kodu", "Kâr / Zarar", "Müşteri Tipi"].map(col => (
            <span key={col} style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 12,
              background: "rgba(99,102,241,0.1)", color: "#94a3b8",
              border: "1px solid rgba(99,102,241,0.15)",
            }}>{col}</span>
          ))}
        </div>
      </div>

      <button onClick={onUpload} disabled={!file || uploading}
        className="btn btn-full"
        style={{ opacity: (!file || uploading) ? 0.5 : 1 }}>
        {uploading ? "⟳ CSV okunuyor ve eşleştiriliyor..." : "🚀 Yükle ve Kolon Eşleştirmesini Başlat"}
      </button>
    </div>
  );
}

/* ── Eşleştirme sonucu ─────────────────────────────────── */
function MappingResult({ mappingResult, previewData, sourceName, onConfirm, onReset }) {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const mapped = Object.entries(mappingResult.mapped ?? {});
  const unmapped = mappingResult.unmapped ?? [];

  const doConfirm = async () => {
    setConfirming(true);
    try { await onConfirm(); setDone(true); } finally { setConfirming(false); }
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981", marginBottom: 8 }}>
          Veri Başarıyla Sisteme Aktarıldı!
        </div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
          <strong style={{ color: "#94a3b8" }}>{sourceName}</strong> dosyasındaki veriler işlendi.<br />
          Modeller artık bu veriyi analiz için kullanabilir.
        </div>
        <button onClick={onReset} className="btn" style={{ margin: "0 auto" }}>
          ➕ Yeni Dosya Yükle
        </button>
      </motion.div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Özet */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {[
          { label: "Eşleşen Kolon", value: mapped.length, color: "#10b981", icon: "✅" },
          { label: "Eşleşmeyen Kolon", value: unmapped.length, color: "#f59e0b", icon: "⚠️" },
          { label: "Önizleme Satırı", value: previewData.length, color: "#6366f1", icon: "📋" },
        ].map(s => (
          <div key={s.label} style={{
            background: `${s.color}0d`, border: `1px solid ${s.color}25`,
            borderRadius: 10, padding: "12px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Eşleşmeler */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="panel">
          <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 12 }}>
            ✅ Otomatik Eşleşen Kolonlar
          </div>
          {mapped.length === 0 ? (
            <p style={{ fontSize: 12, color: "#64748b" }}>Eşleşen kolon bulunamadı.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mapped.map(([orig, target]) => (
                <div key={orig} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", borderRadius: 8,
                  background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)",
                }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{orig}</span>
                  <span style={{ fontSize: 10, color: "#64748b", margin: "0 6px" }}>→</span>
                  <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700, fontFamily: "monospace" }}>{target}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 12 }}>
            ⚠️ Eşleşmeyen Kolonlar
          </div>
          {unmapped.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px", borderRadius: 8,
              background: "rgba(16,185,129,0.07)" }}>
              <span>🎉</span>
              <span style={{ fontSize: 12, color: "#10b981" }}>Tüm kolonlar başarıyla eşleşti!</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {unmapped.map(col => (
                <div key={col} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", borderRadius: 8,
                  background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)",
                }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{col}</span>
                  <span style={{ fontSize: 10, color: "#f59e0b", padding: "2px 8px",
                    background: "rgba(245,158,11,0.1)", borderRadius: 10 }}>Atlanacak</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Önizleme tablosu */}
      {previewData.length > 0 && (
        <div className="panel">
          <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
            📋 Veri Önizlemesi (ilk {previewData.length} satır)
          </div>
          <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid rgba(148,163,184,0.1)" }}>
            <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(99,102,241,0.06)" }}>
                  {Object.keys(previewData[0] || {}).map(col => (
                    <th key={col} style={{ padding: "8px 12px", textAlign: "left", color: "#818cf8", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(148,163,184,0.07)" }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ padding: "7px 12px", color: "#94a3b8", whiteSpace: "nowrap", maxWidth: 180,
                        overflow: "hidden", textOverflow: "ellipsis" }}>
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Aksiyon butonları */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={onReset} style={{
          padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: "rgba(148,163,184,0.08)", color: "#94a3b8",
          border: "1px solid rgba(148,163,184,0.15)", cursor: "pointer",
        }}>
          ← İptal, Yeni Dosya Seç
        </button>
        <button onClick={doConfirm} disabled={confirming} className="btn"
          style={{ opacity: confirming ? 0.7 : 1 }}>
          {confirming ? "⟳ Kaydediliyor..." : "✅ Eşleştirmeyi Onayla ve Veriyi Sisteme Al"}
        </button>
      </div>
    </div>
  );
}

/* ── Ana sayfa ─────────────────────────────────────────── */
export default function DataHub() {
  const { session } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mappingResult, setMappingResult] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [stagedRows, setStagedRows] = useState([]);
  const [sourceName, setSourceName] = useState("");

  if (!session) return <Navigate to="/login" replace />;

  const step = mappingResult ? 2 : 1;

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/v1/ingest/csv-preview`, {
        method: "POST", body: form,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "CSV okunamadı.");
      setMappingResult(data.mapping_result);
      setPreviewData(data.preview_data || []);
      setStagedRows(data.staged_rows || []);
      setSourceName(data.source_name || file.name);
    } catch (err) { alert(err.message || "Sunucuya bağlanılamadı."); }
    finally { setUploading(false); }
  }

  async function handleConfirmMapping() {
    const res = await fetch(`${API_BASE}/api/v1/ingest/confirm-mapping`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        final_mapping: mappingResult.mapped, data: stagedRows,
        source_name: sourceName,
        uploaded_by: session.user?.id ?? null,
        tenant_id: session.user?.user_metadata?.tenant_id ?? null,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Veri kaydedilemedi.");
  }

  function resetState() {
    setFile(null); setMappingResult(null);
    setPreviewData([]); setStagedRows([]); setSourceName("");
  }

  return (
    <div className="page-layout">
      {/* Header */}
      <header className="page-header">
        <span className="page-eyebrow">Veri Yönetimi</span>
        <div className="page-title-row">
          <div>
            <h1 className="page-title">Veri Merkezi</h1>
            <p className="page-subtitle">
              Kendi formatınızdaki CSV verilerini yükleyin; sistem kolonları otomatik olarak standart şemaya eşleştirsin.
            </p>
          </div>
        </div>
      </header>

      {/* Nasıl çalışır */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Bu Sayfa Ne İşe Yarar?</h2>
            <p className="panel-subtitle">Verilerinizi modellere hazır hale getirin</p>
          </div>
          <span className="panel-header-badge blue">3 Adım</span>
        </div>
        <div className="guide-grid">
          {[
            { icon: "📂", title: "CSV Dosyanızı Seçin", desc: "ERP, Excel veya muhasebe sisteminizden aldığınız sipariş/lojistik/talep verisini .csv olarak dışa aktarın ve buraya yükleyin." },
            { icon: "🔗", title: "AI Kolonları Eşleştirir", desc: "Kolon isimleriniz farklı olsa bile sistem otomatik olarak doğru alanlarla eşleştirir. Eşleşmeyen kolonları size gösterir." },
            { icon: "✅", title: "Onaylayın ve Hazır!", desc: "Onay verdiğinizde veri sisteme aktarılır. Lojistik, Talep ve Fraud modelleri artık bu veriyi kullanmaya başlar." },
          ].map((s, i) => (
            <article key={i} className="guide-card">
              <span className="guide-step">{s.icon}</span>
              <h3 className="guide-title"><strong style={{ color: "#6366f1" }}>{i + 1}.</strong> {s.title}</h3>
              <p className="guide-text">{s.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Adım göstergesi */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <StepBar step={step} />

        <AnimatePresence mode="wait">
          {!mappingResult ? (
            <motion.div key="upload"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
              <DropZone file={file} setFile={setFile} onUpload={handleUpload} uploading={uploading} />
            </motion.div>
          ) : (
            <motion.div key="mapping"
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
              <MappingResult
                mappingResult={mappingResult} previewData={previewData}
                sourceName={sourceName}
                onConfirm={handleConfirmMapping} onReset={resetState}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Desteklenen format notu */}
      <div style={{
        padding: "12px 16px", borderRadius: 10,
        background: "rgba(148,163,184,0.04)", border: "1px solid rgba(148,163,184,0.1)",
        fontSize: 11, color: "#64748b", lineHeight: 1.7,
      }}>
        💡 <strong style={{ color: "#94a3b8" }}>İpucu:</strong> CSV dosyanızın ilk satırı kolon başlıklarını içermeli.
        Türkçe veya İngilizce kolon isimleri desteklenmektedir. Maksimum dosya boyutu: 50 MB.
        Desteklenen formatlar: UTF-8, Latin-1.
      </div>
    </div>
  );
}
