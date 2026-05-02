-- Cognitive Logix - real customer data ingestion records

create table if not exists public.ingested_records (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.tenants(id),
    uploaded_by uuid references auth.users(id),
    source_name text not null,
    standard_payload jsonb not null,
    original_payload jsonb not null,
    mapping jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.ingested_records enable row level security;

create policy "Users can view tenant ingested records"
on public.ingested_records for select
using (
    tenant_id in (select tenant_id from public.profiles where id = auth.uid())
);

create policy "Users can insert tenant ingested records"
on public.ingested_records for insert
with check (
    tenant_id in (select tenant_id from public.profiles where id = auth.uid())
);
