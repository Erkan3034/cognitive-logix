# 🚀 Cognitive Logix → Gerçek SaaS Dönüşüm Planı

## 📌 Mevcut Durum

**Cognitive Logix** şu anda bir **üniversite projesi** olarak çalışmaktadır:
- ML modelleri var (XGBoost, Prophet, Isolation Forest)
- FastAPI backend + React frontend mevcut
- Supabase auth entegre
- Ama: kullanıcı izolasyonu yok, faturalama yok, üretim altyapısı yok

**Hedef:** Bunu gerçek müşterilere para kazandıran bir **B2B SaaS** platformuna dönüştürmek.

---

## 🎯 SaaS Olmak İçin Ne Lazım?

Bir projenin gerçek SaaS sayılması için **6 temel katman** gereklidir:

| # | Katman | Mevcut | Hedef |
|---|--------|--------|-------|
| 1 | **Multi-tenancy** (çok kiracılı mimari) | ❌ | ✅ |
| 2 | **Subscription & Billing** (abonelik/faturalama) | ❌ | ✅ |
| 3 | **Onboarding & Self-serve** | ❌ | ✅ |
| 4 | **Production Infrastructure** | ❌ | ✅ |
| 5 | **Usage Analytics & Limits** | ❌ | ✅ |
| 6 | **Security & Compliance** | ⚠️ Kısmi | ✅ |

---

## 🏗️ Önerilen SaaS Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                     LANDING PAGE                            │
│  Next.js 14 (marketing) · Stripe Checkout · Crisp Chat     │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  APP (Mevcut React)                         │
│  + Plan seçimi · API key yönetimi · Usage dashboard         │
└───────────────────────┬─────────────────────────────────────┘
                        │ JWT + tenant_id
┌───────────────────────▼─────────────────────────────────────┐
│              BACKEND (FastAPI) — Genişletilmiş              │
│  + /auth/* routers    · Middleware: rate limit + tenant     │
│  + /billing/*         · Webhook: Stripe events             │
│  + /admin/*           · Background: usage tracking         │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
   Supabase          Stripe           Redis
  (PostgreSQL)     (Billing)        (Cache/Rate)
  Multi-tenant      Plans &          Limit
  RLS enabled       Invoices         Control
```

---

## 📋 Geliştirme Aşamaları (Öncelik Sırası)

### 🔴 FAZ 1 — Temel SaaS Altyapısı (Hafta 1-2)

**Bu olmadan SaaS olmaz.**

#### 1.1 Multi-Tenant Veritabanı Mimarisi
- Supabase'e `organizations` tablosu ekle
- Her tabloya `tenant_id` (UUID) foreign key ekle
- **Row Level Security (RLS)** politikaları: her kullanıcı sadece kendi datasını görür
- `api_keys` tablosu: programmatic erişim için

**Yeni Supabase Tabloları:**
```sql
-- organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',   -- free | starter | pro | enterprise
  stripe_customer_id TEXT,
  api_calls_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- api_keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  key_hash TEXT UNIQUE NOT NULL,  -- SHA256
  name TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- usage_logs
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  endpoint TEXT,
  tokens_used INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.2 Plan & Limit Sistemi

| Plan | Fiyat | AI Tahmin/Ay | Açıklama |
|------|-------|--------------|----------|
| **Free** | $0 | 100 | Demodan ürüne geçiş |
| **Starter** | $49/ay | 5.000 | KOBİ'ler |
| **Pro** | $149/ay | 50.000 | Büyüyen şirketler |
| **Enterprise** | Custom | Unlimited | Özel SLA |

#### 1.3 Backend Middleware

**Yeni dosyalar: `backend/app/middleware/`**
- `tenant_resolver.py` — JWT'den org_id çıkar
- `rate_limiter.py` — Plan bazlı API limit kontrolü (Redis)
- `usage_tracker.py` — Her API çağrısını logla

---

### 🟡 FAZ 2 — Stripe Faturalama (Hafta 3)

**Para kazanmak için kritik.**

#### 2.1 Stripe Entegrasyonu
- `stripe` Python SDK backend'e ekle
- `/billing/create-checkout-session` endpoint
- `/billing/webhook` — ödeme olayları (subscription.created, invoice.paid, etc.)
- `/billing/customer-portal` — fatura yönetimi

#### 2.2 Frontend — Pricing Page
- Güzel bir `/pricing` sayfası (mevcut Login.jsx'e alternatif)
- Plan karşılaştırma tablosu
- Stripe Checkout entegrasyonu

---

### 🟡 FAZ 3 — Onboarding & Self-Serve (Hafta 4)

**Kullanıcı kendi kendine başlamalı, sana sormamalı.**

#### 3.1 Yeni Sayfalar (Frontend)
- `/register` — Kayıt + organizasyon oluşturma
- `/onboarding` — 3 adımlı wizard (şirket bilgileri, plan seçimi, API key alma)
- `/settings` — API anahtarları, plan yönetimi, kullanım limitleri
- `/docs` — Basit dokümantasyon (Swagger UI embed veya özel)

#### 3.2 Email Otomasyonu
- Resend veya SendGrid ile:
  - Hoşgeldiniz emaili
  - Limit uyarısı (%80 dolduğunda)
  - Fatura bildirimi

---

### 🟢 FAZ 4 — Landing Page (Hafta 5)

**Satış yapmak için gerekli.**

#### 4.1 Marketing Landing Page
Ayrı bir sayfa veya mevcut uygulamanın `/` route'u:
- Hero bölümü: "AI-Powered Supply Chain Intelligence"
- Özellikler (3 modül)
- Pricing bölümü
- Social proof / demo CTA
- Footer

---

### 🟢 FAZ 5 — Production Deploy (Hafta 6)

#### 5.1 Altyapı
- **Backend:** Railway (zaten planlanmış) — Docker desteği var ✅
- **Frontend:** Vercel (zaten planlanmış) ✅
- **Redis:** Railway'de Redis eklentisi
- **Custom Domain:** cognitivelo.gix veya benzeri
- **SSL:** Otomatik (Vercel + Railway)

#### 5.2 CI/CD
- GitHub Actions: test + deploy pipeline
- Environment variables yönetimi

---

### 🔵 FAZ 6 — Güvenlik & Compliance (Sürekli)

- API key rotation
- Rate limiting (Redis ile)
- Input validation (mevcut Pydantic ✅)
- GDPR uyumu (veri silme endpoint'i)
- Audit log

---

## 📂 Yeni Dosya Yapısı

```
cognitive-logix/
├── frontend/src/
│   ├── pages/
│   │   ├── Landing.jsx          # [YENİ] Marketing page
│   │   ├── Pricing.jsx          # [YENİ] Plan seçimi
│   │   ├── Register.jsx         # [YENİ] Kayıt ol
│   │   ├── Onboarding.jsx       # [YENİ] 3 adımlı wizard
│   │   ├── Settings.jsx         # [YENİ] API key + plan
│   │   ├── Dashboard.jsx        # [Güncelle] Usage stats ekle
│   │   └── ...
│   └── lib/
│       ├── stripe.js            # [YENİ] Stripe client
│       └── api.js               # [Güncelle] Auth header ekle
│
├── backend/app/
│   ├── middleware/
│   │   ├── tenant_resolver.py   # [YENİ]
│   │   ├── rate_limiter.py      # [YENİ]
│   │   └── usage_tracker.py     # [YENİ]
│   ├── routers/
│   │   ├── auth.py              # [YENİ] Register, API keys
│   │   ├── billing.py           # [YENİ] Stripe webhooks
│   │   └── admin.py             # [YENİ] Kullanım istatistikleri
│   └── ...
│
├── supabase/
│   └── migrations/              # [YENİ] DB migration dosyaları
│       ├── 001_multi_tenant.sql
│       └── 002_api_keys.sql
│
└── .github/
    └── workflows/
        └── deploy.yml           # [YENİ] CI/CD
```

---

## 💰 Gelir Potansiyeli

| Segment | Hedef Müşteri | Aylık Değer |
|---------|---------------|-------------|
| KOBİ'ler (Starter) | 20 müşteri × $49 | $980 |
| Orta Ölçekli (Pro) | 10 müşteri × $149 | $1.490 |
| Kurumsal | 2 müşteri × $499 | $998 |
| **Toplam MRR** | | **~$3.468** |

---

## ❓ Açık Sorular (Karar Gerekiyor)

> [!IMPORTANT]
> Başlamadan önce şu kararları netleştir:

1. **Hangi fazdan başlamak istiyorsun?** (Önerim: Faz 1 → Faz 2 → Faz 5)
2. **Fiyatlandırma stratejisi:** Yukarıdaki fiyatlar uygun mu?
3. **Hedef pazar:** Türkiye mi, global mi?
4. **Stripe hesabı var mı?** (Türkiye'de Stripe kullanımı için ek adımlar gerekebilir — alternatif: Paddle, Lemon Squeezy)
5. **Domain var mı?** (cognitive-logix.com veya benzeri)
6. **Hangi adımları ben yapayım, hangileri sen yapacaksın?**

> [!WARNING]
> Stripe Türkiye'de doğrudan kullanılamaz. Alternatifler:
> - **Lemon Squeezy** (en kolay, vergi dahil)
> - **Paddle** (kurumsal)
> - **Patreon / Gumroad** (basit)

---

## 🔢 Öneri: İlk Sprint (Bu Hafta)

Eğer onay verirsen bu haftaki işleri şöyle planlıyorum:

1. ✅ Supabase'e multi-tenant tabloları ekle + RLS kur
2. ✅ Backend'e tenant middleware ekle
3. ✅ Basit bir `/register` + `/onboarding` sayfası yap
4. ✅ Lemon Squeezy ile pricing page + ödeme akışı
5. ✅ Landing page tasarla
