import { useEffect, useMemo, useState } from "react";
import { getIngestHistory, previewCsvFile } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

function formatDate(value) {
  if (!value) return "Henüz yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function percent(value) {
  return `%${Math.round(Number(value || 0) * 100)}`;
}

function scoreTone(score) {
  if (score >= 85) return "success";
  if (score >= 65) return "warning";
  return "error";
}

function feedStatusLabel(row) {
  const status = row.model_feed_status || row.model_feed_report?.status;
  if (status === "ready") return "Hazır";
  if (status === "partial") return "Kısmi hazır";
  if (status === "blocked") return "Eksik alan";
  return row.status === "confirmed" ? "Kaydedildi" : row.status || "Kaydedildi";
}

export default function DataQuality() {
  const [history, setHistory] = useState([]);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await getIngestHistory({ limit: 25 });
      setHistory(data?.items ?? []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const report = preview?.quality_report;
  const mappedCount = useMemo(() => {
    const mapped = preview?.mapping_result?.mapped ?? {};
    return Object.keys(mapped).length;
  }, [preview]);

  const handleCheck = async () => {
    if (!file) {
      setError("Önce bir veri dosyası seçin.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      setPreview(await previewCsvFile(file));
    } catch (err) {
      setError(err?.response?.data?.detail || "Veri kalite analizi tamamlanamadı.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Veri operasyonları"
        title="Veri Kalitesi Merkezi"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loadingHistory ? <InlineSpinner label="Geçmiş yükleniyor" /> : `${history.length} kayıt`}
          </div>
        }
      >
        Model çıktısından önce veri kalitesini ölçün: eşleşen kolonlar, eksik değerler, tekrar eden satırlar ve boş kolonlar.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Kalite kontrolü tamamlanamadı">
          {error}
        </StatusBanner>
      )}

      <section className="two-column">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Dosya kalite kontrolü</h2>
              <p className="panel-subtitle">Dosya sunucu ön izleme bağlantısında okunur; kayıt yapılmadan analiz edilir.</p>
            </div>
          </div>

          <div className={`data-dropzone ${file ? "has-file" : ""}`}>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              style={{ width: "100%" }}
            />
            <div className="data-dropzone-title">{file ? file.name : "Veri dosyası seçin"}</div>
            <div className="data-dropzone-subtitle">
              Dosya seçildikten sonra kolon eşleme ve veri kalite raporu oluşturulur.
            </div>
          </div>

          <div className="data-actions end" style={{ marginTop: 16 }}>
            <button type="button" className="btn" disabled={checking || !file} onClick={handleCheck}>
              {checking ? <InlineSpinner label="Kontrol ediliyor" /> : "Kalite raporu oluştur"}
            </button>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title-block">
              <h2 className="panel-title">Kalite skoru</h2>
              <p className="panel-subtitle">Eksik veri, tekrar ve boş kolon sinyallerine göre hesaplanır.</p>
            </div>
          </div>

          {!report ? (
            <EmptyState title="Rapor bekleniyor">
              Bir veri dosyası seçip kalite raporu oluşturduğunuzda sonuçlar burada görünür.
            </EmptyState>
          ) : (
            <div className="result-stack">
              <StatusBanner type={scoreTone(report.score)} title={`Veri kalite skoru: ${report.score}/100`}>
                {report.row_count.toLocaleString("tr-TR")} satır, {report.column_count} kolon ve {mappedCount} standart kolon eşleşmesi bulundu.
              </StatusBanner>
              <div className="decision-metric-grid">
                <div>
                  <span>Eksik hücre</span>
                  <strong>{report.missing_cells}</strong>
                </div>
                <div>
                  <span>Eksik oranı</span>
                  <strong>{percent(report.missing_pct)}</strong>
                </div>
                <div>
                  <span>Tekrar eden satır</span>
                  <strong>{report.duplicate_rows}</strong>
                </div>
              </div>
              <div className="quality-issue-list">
                <div className="quality-issue-row">
                  <span>Model kolon eşleşmesi</span>
                  <strong>{mappedCount > 0 ? `${mappedCount} kolon eşleşti` : "Eşleşme bulunamadı"}</strong>
                </div>
                <div className="quality-issue-row">
                  <span>Boş kolonlar</span>
                  <strong>{report.empty_columns?.length ? report.empty_columns.join(", ") : "Yok"}</strong>
                </div>
                <div className="quality-issue-row">
                  <span>Kayda hazır mı?</span>
                  <strong>{report.score >= 65 && mappedCount > 0 ? "Evet" : "Önce veri temizliği önerilir"}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Veri alım geçmişi</h2>
            <p className="panel-subtitle">Supabase ingested_data kayıtlarından gelir.</p>
          </div>
          <button type="button" className="pro-btn-outline" onClick={loadHistory}>Yenile</button>
        </div>

        {loadingHistory ? (
          <div className="usage-skeleton-list">
            {[1, 2, 3].map((item) => <div key={item} className="skeleton" />)}
          </div>
        ) : history.length === 0 ? (
          <EmptyState title="Veri alım kaydı yok">
            Dosya yükleme veya otomatik veri alımı tamamlandığında geçmiş burada görünür.
          </EmptyState>
        ) : (
          <div className="pro-table">
            <div className="pro-table-head">
              <span className="pro-th" style={{ flex: 2 }}>Kaynak</span>
              <span className="pro-th" style={{ flex: 1 }}>Satır</span>
              <span className="pro-th" style={{ flex: 1 }}>Model besleme</span>
              <span className="pro-th" style={{ flex: 1 }}>Tarih</span>
            </div>
            {history.map((row) => (
              <div key={row.id ?? `${row.filename}-${row.created_at}`} className="pro-table-row">
                <span className="pro-td pro-td-name" style={{ flex: 2 }}>{row.filename || row.source || "Otomatik veri alımı"}</span>
                <span className="pro-td" style={{ flex: 1 }}>{Number(row.persisted_record_count || row.row_count || 0).toLocaleString("tr-TR")}</span>
                <span className="pro-td" style={{ flex: 1 }}>{feedStatusLabel(row)}</span>
                <span className="pro-td" style={{ flex: 1 }}>{formatDate(row.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
