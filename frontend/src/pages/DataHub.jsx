import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../lib/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DataHub() {
  const { session } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mappingResult, setMappingResult] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [stagedRows, setStagedRows] = useState([]);
  const [sourceName, setSourceName] = useState("");

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/api/v1/ingest/csv-preview`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "CSV okunamadı.");
      }

      setMappingResult(data.mapping_result);
      setPreviewData(data.preview_data || []);
      setStagedRows(data.staged_rows || []);
      setSourceName(data.source_name || file.name);
    } catch (error) {
      alert(error.message || "Sunucuya bağlanılamadı.");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmMapping() {
    try {
      const response = await fetch(`${API_BASE}/api/v1/ingest/confirm-mapping`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          final_mapping: mappingResult.mapped,
          data: stagedRows,
          source_name: sourceName,
          uploaded_by: session.user?.id ?? null,
          tenant_id: session.user?.user_metadata?.tenant_id ?? null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Veri kaydedilemedi.");
      }
      alert(data.message);
      resetState();
    } catch (error) {
      alert(error.message || "Eşleştirme onaylanamadı.");
    }
  }

  function resetState() {
    setFile(null);
    setMappingResult(null);
    setPreviewData([]);
    setStagedRows([]);
    setSourceName("");
  }

  return (
    <div className="landing-container" style={{ minHeight: "100vh", padding: "4rem 2rem" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 mb-4">
            Veri Merkezi
          </h1>
          <p className="text-slate-400 text-lg">
            Kendi formatınızdaki CSV verilerini yükleyin; sistem kolonları standart şemaya eşleştirsin.
          </p>
        </div>

        {!mappingResult ? (
          <div className="glass-card p-10 flex flex-col items-center justify-center border-dashed border-2 border-slate-600 rounded-2xl">
            <h3 className="text-2xl font-bold text-white mb-2">CSV dosyanızı yükleyin</h3>
            <p className="text-slate-400 mb-6 text-center max-w-md">
              Sipariş, talep veya lojistik verilerinizi içeren CSV dosyasını seçin. Kolon isimlerinizin sistem şemasıyla aynı olması gerekmez.
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mb-4 block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />

            <button onClick={handleUpload} disabled={!file || uploading} className="premium-button mt-4 disabled:opacity-50">
              {uploading ? "İnceleniyor..." : "Yükle ve Eşleştir"}
            </button>
          </div>
        ) : (
          <div className="glass-card p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
              Kolon Eşleştirmesi
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-emerald-400 font-semibold mb-4">Başarılı eşleşmeler</h4>
                <div className="space-y-3">
                  {Object.entries(mappingResult.mapped).map(([original, mapped]) => (
                    <div key={original} className="bg-white/5 p-3 rounded-lg border border-emerald-500/30 flex justify-between items-center">
                      <span className="text-slate-300 font-mono text-sm">{original}</span>
                      <span className="text-blue-300 font-mono font-bold text-sm">{mapped}</span>
                    </div>
                  ))}
                  {Object.keys(mappingResult.mapped).length === 0 && <p className="text-slate-500 text-sm">Eşleşen kolon bulunamadı.</p>}
                </div>
              </div>

              <div>
                <h4 className="text-amber-400 font-semibold mb-4">Manuel bekleyenler</h4>
                <div className="space-y-3">
                  {mappingResult.unmapped.map((original) => (
                    <div key={original} className="bg-white/5 p-3 rounded-lg border border-amber-500/30">
                      <span className="text-slate-300 font-mono text-sm">{original}</span>
                      <span className="ml-3 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Dikkate alınmayacak</span>
                    </div>
                  ))}
                  {mappingResult.unmapped.length === 0 && <p className="text-slate-500 text-sm">Tüm kolonlar başarıyla eşleşti.</p>}
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <h4 className="text-white font-semibold mb-4">Veri önizlemesi</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs uppercase bg-white/5 text-slate-400">
                    <tr>{Object.keys(previewData[0] || {}).map((key) => <th key={key} className="px-4 py-3">{key}</th>)}</tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-white/5">
                        {Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="px-4 py-3">{String(value)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button onClick={resetState} className="px-6 py-2 rounded-full font-semibold text-white border border-white/20 hover:bg-white/10 transition-colors">
                İptal ve Yeniden Yükle
              </button>
              <button onClick={handleConfirmMapping} className="premium-button">
                Eşleştirmeyi Onayla ve Veriyi Al
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
