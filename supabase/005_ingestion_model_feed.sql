-- Cognitive Logix - ingestion persistence and model feed metadata

alter table public.ingested_data
    add column if not exists quality_report jsonb default '{}',
    add column if not exists model_feed_report jsonb default '{}',
    add column if not exists model_feed_status text default 'unknown',
    add column if not exists persisted_record_count integer default 0;

create index if not exists idx_ingested_data_tenant_created
    on public.ingested_data (tenant_id, created_at desc);

create index if not exists idx_ingested_records_tenant_created
    on public.ingested_records (tenant_id, created_at desc);
