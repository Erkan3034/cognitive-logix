-- ========================================================
-- COGNITIVE LOGIX - SPRINT 2: MULTI-TENANCY & AUTH SQL
-- ========================================================
-- Kullanım: Bu kodu Supabase panelinizde "SQL Editor"
-- bölümüne yapıştırın ve "RUN" butonuna basın.
-- ========================================================

-- 1. Şirketler (Tenants) Tablosu
create table public.tenants (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    domain text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Kullanıcı Profilleri (Profiles) Tablosu
-- Supabase auth.users tablosu ile ilişkilidir
create table public.profiles (
    id uuid references auth.users not null primary key,
    tenant_id uuid references public.tenants(id),
    role text check (role in ('admin', 'manager', 'viewer')) default 'admin',
    full_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Row Level Security (RLS) Aktifleştirme
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;

-- 4. RLS Politikaları
-- Profiller sadece kendi verilerini okuyup güncelleyebilir
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Tenant'lar (Şirketler) sadece aynı şirketteki kişiler tarafından görülebilir
create policy "Users can view their tenant" on public.tenants for select using (
    id in (select tenant_id from public.profiles where id = auth.uid())
);

-- İlk şirketi oluşturabilmeleri için (kayıt olurken) açık ekleme yetkisi
create policy "Anyone can create a tenant during signup" on public.tenants for insert with check (true);

-- 5. Otomatik Profil Oluşturma (Trigger)
-- Biri kayıt (register) olduğunda profiles tablosuna adını yaz
create function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
