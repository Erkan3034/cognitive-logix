-- Cognitive Logix - SaaS operations: usage, audit, incident actions

create table if not exists public.usage_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.tenants(id),
    user_id uuid references auth.users(id),
    endpoint text not null,
    method text not null,
    status_code integer,
    duration_ms numeric,
    units integer default 1,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.tenants(id),
    user_id uuid references auth.users(id),
    action text not null,
    resource_type text not null,
    resource_id text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.incident_actions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.tenants(id),
    user_id uuid references auth.users(id),
    incident_id text not null,
    action text not null,
    status text check (status in ('approved', 'dismissed', 'queued')) default 'approved',
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.usage_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.incident_actions enable row level security;

create policy "Users can view tenant usage logs"
on public.usage_logs for select
using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can insert tenant usage logs"
on public.usage_logs for insert
with check (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can view tenant audit logs"
on public.audit_logs for select
using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can insert tenant audit logs"
on public.audit_logs for insert
with check (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can view tenant incident actions"
on public.incident_actions for select
using (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));

create policy "Users can insert tenant incident actions"
on public.incident_actions for insert
with check (tenant_id in (select tenant_id from public.profiles where id = auth.uid()));
