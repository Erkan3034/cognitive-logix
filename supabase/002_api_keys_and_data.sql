-- ========================================================
-- COGNITIVE LOGIX - API KEY MANAGEMENT & DATA STORAGE
-- ========================================================
-- Kullanım: Bu kodu Supabase panelinizde "SQL Editor"
-- bölümüne yapıştırın ve "RUN" butonuna basın.
-- ========================================================

-- 1. API Keys Tablosu
-- Firmalar kendi API key'lerini oluşturup dış sistemlerden (ERP, webhook) erişir
create table if not exists public.api_keys (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id),
    user_id uuid references auth.users(id),
    key_hash text not null,          -- SHA-256 hash (düz key saklanmaz)
    key_prefix text not null,        -- İlk 8 karakter (görüntüleme için: cl_abc1****)
    label text not null default 'Default Key',
    scopes text[] default '{"predict","forecast","fraud","ingest"}',
    is_active boolean default true,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Ingested Data (Yüklenen Veriler) Tablosu
-- Müşterilerin CSV/Webhook ile yüklediği ve eşleştirilen veriler burada saklanır
create table if not exists public.ingested_data (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid references public.tenants(id),
    user_id uuid references auth.users(id),
    source text check (source in ('csv', 'webhook', 'api')) default 'csv',
    filename text,
    row_count integer default 0,
    column_mapping jsonb default '{}',
    data_preview jsonb default '[]',
    status text check (status in ('pending', 'mapped', 'confirmed', 'failed')) default 'pending',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Usage Logs tablosu (eğer yoksa)
create table if not exists public.usage_logs (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid,
    user_id uuid,
    endpoint text,
    method text,
    status_code integer,
    duration_ms numeric,
    units integer default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Audit Logs tablosu (eğer yoksa)
create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid,
    user_id uuid,
    action text,
    resource_type text,
    resource_id text,
    metadata jsonb default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Incident Actions tablosu (eğer yoksa)
create table if not exists public.incident_actions (
    id uuid default gen_random_uuid() primary key,
    tenant_id uuid,
    user_id uuid,
    incident_id text,
    action text,
    status text,
    metadata jsonb default '{}',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. RLS Aktifleştirme
alter table public.api_keys enable row level security;
alter table public.ingested_data enable row level security;
alter table public.usage_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.incident_actions enable row level security;

-- 7. RLS Politikaları — API Keys
create policy "Users can view own api keys"
    on public.api_keys for select
    using (user_id = auth.uid());

create policy "Users can create api keys"
    on public.api_keys for insert
    with check (user_id = auth.uid());

create policy "Users can update own api keys"
    on public.api_keys for update
    using (user_id = auth.uid());

create policy "Users can delete own api keys"
    on public.api_keys for delete
    using (user_id = auth.uid());

-- 8. RLS Politikaları — Ingested Data
create policy "Users can view own ingested data"
    on public.ingested_data for select
    using (user_id = auth.uid());

create policy "Users can insert ingested data"
    on public.ingested_data for insert
    with check (user_id = auth.uid());

create policy "Users can update own ingested data"
    on public.ingested_data for update
    using (user_id = auth.uid());

-- 9. Service role erişimi (backend middleware için)
-- usage_logs, audit_logs, incident_actions backend service role ile yazılıyor
create policy "Service role full access usage_logs"
    on public.usage_logs for all
    using (true) with check (true);

create policy "Service role full access audit_logs"
    on public.audit_logs for all
    using (true) with check (true);

create policy "Service role full access incident_actions"
    on public.incident_actions for all
    using (true) with check (true);
