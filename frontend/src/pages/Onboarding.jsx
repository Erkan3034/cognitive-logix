import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiKeys, getBillingStatus, getIngestHistory, getUsage } from "../lib/api.js";
import { EmptyState, InlineSpinner, PageIntro, StatusBanner } from "../components/ProductUI.jsx";

function SetupStep({ index, title, text, done, to, action }) {
  return (
    <article className={`onboarding-step ${done ? "done" : ""}`}>
      <span className="onboarding-step-index">{done ? "✓" : index}</span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <Link to={to} className={done ? "pro-btn-ghost" : "pro-btn-outline"}>
        {done ? "Görüntüle" : action}
      </Link>
    </article>
  );
}

export default function Onboarding() {
  const [state, setState] = useState({
    billing: null,
    apiKeys: [],
    ingests: [],
    usage: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    Promise.allSettled([
      getBillingStatus(),
      getApiKeys(),
      getIngestHistory({ limit: 10 }),
      getUsage(),
    ])
      .then(([billing, keys, ingests, usage]) => {
        if (!mounted) return;
        setState({
          billing: billing.status === "fulfilled" ? billing.value : null,
          apiKeys: keys.status === "fulfilled" ? keys.value?.items ?? [] : [],
          ingests: ingests.status === "fulfilled" ? ingests.value?.items ?? [] : [],
          usage: usage.status === "fulfilled" ? usage.value : null,
        });
      })
      .catch((err) => {
        if (mounted) setError(err?.response?.data?.detail || "Kurulum durumu alınamadı.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const steps = useMemo(() => {
    const activeKeys = state.apiKeys.filter((key) => key.is_active);
    return [
      {
        title: "Plan ve tenant doğrulandı",
        text: "Abonelik durumu ve tenant bağlamı okunabiliyor.",
        done: Boolean(state.billing?.plan),
        to: "/app/billing",
        action: "Planı aç",
      },
      {
        title: "Veri kaynağı hazır",
        text: "Dosya yükleme veya otomatik veri alımı üzerinden en az bir kayıt alınmış olmalı.",
        done: state.ingests.length > 0,
        to: "/app/data",
        action: "Veri yükle",
      },
      {
        title: "Bağlantı entegrasyonu güvenli",
        text: "Dış sistemler için kapsam kontrollü aktif bağlantı anahtarı oluşturun.",
        done: activeKeys.length > 0,
        to: "/app/api-keys",
        action: "Anahtar oluştur",
      },
      {
        title: "İlk operasyon sinyali üretildi",
        text: "Analiz veya metrik bağlantıları kullanıldığında ürün canlı davranışını gösterir.",
        done: Number(state.usage?.total_calls || 0) > 0,
        to: "/app",
        action: "Kontrol kulesine git",
      },
      {
        title: "Karar kuyruğu izleniyor",
        text: "Olay Kutusu ile olayları onaylayın, sıraya alın veya reddedin.",
        done: false,
        to: "/app/inbox",
        action: "Kuyruğu aç",
      },
    ];
  }, [state]);

  const completed = steps.filter((step) => step.done).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <div className="page-layout">
      <PageIntro
        eyebrow="Kurulum"
        title="Kurulum"
        aside={
          <div className="pill">
            <span className="pill-dot" />
            {loading ? <InlineSpinner label="Kontrol ediliyor" /> : `%${progress} tamamlandı`}
          </div>
        }
      >
        Cognitive Logix’i canlı operasyona almak için gerekli ürün adımlarını gerçek hesap durumunuzla izleyin.
      </PageIntro>

      {error && (
        <StatusBanner type="error" title="Kurulum durumu alınamadı">
          {error}
        </StatusBanner>
      )}

      <section className="command-hero">
        <div className="command-hero-panel">
          <div>
            <h2 className="command-hero-title">Canlı SaaS kurulum akışı</h2>
            <p className="command-hero-text">
              Amaç sadece ekranları gezmek değil; veri, bağlantı, kota ve karar kayıtlarının birlikte çalıştığını doğrulamak.
            </p>
          </div>
          <div className="onboarding-progress" aria-label="Kurulum ilerlemesi">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="command-hero-panel">
          <div className="command-signal-list">
            <div className="command-signal-row">
              <span>Plan</span>
              <strong>{loading ? "..." : state.billing?.plan || "Okunamadı"}</strong>
            </div>
            <div className="command-signal-row">
              <span>Aktif bağlantı anahtarı</span>
              <strong>{loading ? "..." : state.apiKeys.filter((key) => key.is_active).length}</strong>
            </div>
            <div className="command-signal-row">
              <span>Veri alımı</span>
              <strong>{loading ? "..." : state.ingests.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div className="panel-title-block">
            <h2 className="panel-title">Kurulum adımları</h2>
            <p className="panel-subtitle">Tamamlanan adımlar gerçek bağlantı yanıtlarından hesaplanır.</p>
          </div>
        </div>

        {loading ? (
          <div className="usage-skeleton-list">
            {[1, 2, 3, 4, 5].map((item) => <div key={item} className="skeleton" />)}
          </div>
        ) : steps.length === 0 ? (
          <EmptyState title="Kurulum adımı yok" />
        ) : (
          <div className="onboarding-step-list">
            {steps.map((step, index) => (
              <SetupStep key={step.title} index={index + 1} {...step} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
