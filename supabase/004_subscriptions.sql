-- ========================================================
-- COGNITIVE LOGIX - PLAN VE ABONELİK SİMÜLASYONU
-- ========================================================
-- Kullanım: Bu kodu Supabase panelinizde "SQL Editor"
-- bölümüne yapıştırın ve "RUN" butonuna basın.
-- ========================================================

-- 1. tenants tablosuna plan bilgilerini ekle
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise'));
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan_expires_at timestamp with time zone;

-- 2. usage_logs performansını artırmak için indeks (aylık kota sayımı için)
CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_created 
ON public.usage_logs(tenant_id, created_at);

-- 3. Mevcut tüm tenant'ları 'free' planına ata (eğer varsa)
UPDATE public.tenants SET plan = 'free' WHERE plan IS NULL;
