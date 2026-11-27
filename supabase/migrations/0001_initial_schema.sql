-- Bismillah CCTV & Electronics Retail POS — Initial Schema, Indexes, RLS & Private Helpers
-- Target project: ltpkaonghjlijissazkz

create schema if not exists private;
create extension if not exists pgcrypto with schema extensions;

revoke all on schema private from public, anon, authenticated;

-- ============================================================================
-- 1. Core Identity & Session Tables
-- ============================================================================

create table if not exists public.pos_users (
  id text primary key,
  name text not null,
  phone text not null unique check (phone ~ '^01[0-9]{9}$'),
  role text not null check (role in ('admin', 'staff', 'servicing')),
  staff_id text,
  address text not null default '—',
  monthly_salary numeric(12,2) not null default 0 check (monthly_salary >= 0),
  joined_at timestamptz not null default now(),
  active boolean not null default true,
  password_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.pos_user_credentials (
  user_id text primary key references public.pos_users(id) on delete cascade,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.pos_sessions (
  token_hash text primary key,
  user_id text not null references public.pos_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pos_sessions_user_id_idx on public.pos_sessions (user_id);
create index if not exists pos_sessions_expires_at_idx on public.pos_sessions (expires_at);

-- ============================================================================
-- 2. Catalog, Parties, Accounts & Settings
-- ============================================================================

create table if not exists public.pos_categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.pos_companies (
  id text primary key,
  name text not null,
  code text not null,
  mobile text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.pos_products (
  id text primary key,
  name text not null,
  sku text not null,
  barcode text not null default '',
  category text not null default 'সাধারণ',
  company text not null default '',
  unit text not null default 'পিস',
  purchase_rate numeric(12,2) not null default 0 check (purchase_rate >= 0),
  sale_rate numeric(12,2) not null default 0 check (sale_rate >= 0),
  paid_stock integer not null default 0,
  free_stock integer not null default 0,
  min_stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pos_products_category_idx on public.pos_products (category);
create index if not exists pos_products_sku_idx on public.pos_products (sku);
create index if not exists pos_products_barcode_idx on public.pos_products (barcode);

create table if not exists public.pos_customers (
  id text primary key,
  name text not null,
  mobile text not null default '',
  area text not null default 'ঢাকা',
  due numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pos_customers_mobile_idx on public.pos_customers (mobile);

create table if not exists public.pos_suppliers (
  id text primary key,
  name text not null,
  mobile text not null default '',
  area text not null default 'ঢাকা',
  last_txn text not null default '',
  due numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pos_accounts (
  id text primary key,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'bkash', 'nagad')),
  balance numeric(12,2) not null default 0,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.pos_settings (
  id text primary key default 'default',
  org_id text not null default 'org-bismillah-cctv',
  org_name text not null,
  org_address text not null,
  org_phone text not null,
  org_email text not null,
  owner_name text not null,
  initials text not null,
  dealer_code text not null,
  trade_license text not null,
  bin text not null,
  invoice_prefix text not null default 'BCE',
  invoice_footer text not null,
  invoice_template text not null default 'compact' check (invoice_template in ('classic', 'compact')),
  allow_negative_stock boolean not null default false,
  vat_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 3. Transactional & Operations Tables (Clean Start = 0 rows)
-- ============================================================================

create table if not exists public.pos_invoices (
  id text primary key,
  number text not null,
  date timestamptz not null,
  time_label text not null,
  party_name text not null,
  party_mobile text not null default '—',
  items_count integer not null default 0,
  total numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  due numeric(12,2) not null default 0,
  method text not null default 'cash',
  status text not null check (status in ('paid', 'partial', 'due')),
  service_job_id text,
  service_job_no text,
  service_charge numeric(12,2),
  parts_subtotal numeric(12,2),
  discount numeric(12,2),
  created_by text references public.pos_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pos_invoices_date_idx on public.pos_invoices (date desc);
create index if not exists pos_invoices_service_job_id_idx on public.pos_invoices (service_job_id);
create index if not exists pos_invoices_created_by_idx on public.pos_invoices (created_by);

create table if not exists public.pos_invoice_items (
  id bigint generated always as identity primary key,
  invoice_id text not null references public.pos_invoices(id) on delete cascade,
  product_id text not null,
  name text not null,
  unit text not null default 'পিস',
  qty integer not null default 1,
  rate numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0
);

create index if not exists pos_invoice_items_invoice_id_idx on public.pos_invoice_items (invoice_id);
create index if not exists pos_invoice_items_product_id_idx on public.pos_invoice_items (product_id);

create table if not exists public.pos_purchases (
  id text primary key,
  number text not null,
  date timestamptz not null,
  time_label text not null,
  party_name text not null,
  party_mobile text not null default '—',
  items_count integer not null default 0,
  total numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  due numeric(12,2) not null default 0,
  method text not null default 'cash',
  status text not null check (status in ('paid', 'partial', 'due')),
  items jsonb not null default '[]'::jsonb,
  discount numeric(12,2),
  created_by text references public.pos_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists pos_purchases_date_idx on public.pos_purchases (date desc);
create index if not exists pos_purchases_created_by_idx on public.pos_purchases (created_by);

create table if not exists public.pos_ledger_entries (
  id text primary key,
  party text not null,
  date timestamptz not null,
  amount numeric(12,2) not null default 0,
  direction text not null check (direction in ('in', 'out')),
  kind text not null check (kind in ('collection', 'payment', 'expense', 'sale')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists pos_ledger_entries_date_idx on public.pos_ledger_entries (date desc);

create table if not exists public.pos_salary_payments (
  id text primary key,
  employee_id text not null,
  employee_name text not null,
  month text not null,
  amount numeric(12,2) not null default 0,
  paid_at timestamptz not null,
  account_id text not null default 'acc-cash',
  method text not null default 'cash',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists pos_salary_payments_employee_id_idx on public.pos_salary_payments (employee_id);
create index if not exists pos_salary_payments_paid_at_idx on public.pos_salary_payments (paid_at desc);

create table if not exists public.pos_service_jobs (
  id text primary key,
  job_no text not null,
  title text not null,
  device_name text not null,
  problem_description text not null,
  description text not null default '',
  customer_name text not null,
  customer_mobile text not null default '—',
  location text not null default 'সিলেট',
  entry_date text not null,
  entry_time text not null,
  expected_delivery_date text,
  staff_ids text[] not null default '{}',
  staff_names text[] not null default '{}',
  status text not null check (status in ('pending', 'ongoing', 'completed', 'delivered')),
  payment_status text not null check (payment_status in ('paid', 'partial', 'due')),
  service_charge numeric(12,2) not null default 0,
  paid_charge numeric(12,2) not null default 0,
  due_charge numeric(12,2) not null default 0,
  payment_method text,
  account_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  linked_invoice_ids text[] not null default '{}'
);

create index if not exists pos_service_jobs_staff_ids_gin_idx on public.pos_service_jobs using gin (staff_ids);
create index if not exists pos_service_jobs_created_at_idx on public.pos_service_jobs (created_at desc);

create table if not exists public.pos_notifications (
  id text primary key,
  type text not null check (type in ('assignment', 'new_entry', 'status_update', 'pending_task', 'deadline', 'completed')),
  title text not null,
  message text not null,
  service_job_id text,
  job_no text,
  assigned_staff_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  read_by_user_ids text[] not null default '{}'
);

create index if not exists pos_notifications_staff_ids_gin_idx on public.pos_notifications using gin (assigned_staff_ids);
create index if not exists pos_notifications_created_at_idx on public.pos_notifications (created_at desc);

create table if not exists public.pos_returns (
  id text primary key,
  number text not null,
  customer_name text not null,
  invoice_no text not null,
  amount numeric(12,2) not null default 0,
  date timestamptz not null,
  status text not null check (status in ('completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists pos_returns_date_idx on public.pos_returns (date desc);

-- ============================================================================
-- 4. Row-Level Security & Least-Privilege Table Grants
-- ============================================================================

alter table private.pos_user_credentials enable row level security;
revoke all on all tables in schema private from public, anon, authenticated;

do $$
declare
  tbl text;
  tables text[] := array[
    'pos_users',
    'pos_sessions',
    'pos_categories',
    'pos_companies',
    'pos_products',
    'pos_customers',
    'pos_suppliers',
    'pos_accounts',
    'pos_settings',
    'pos_invoices',
    'pos_invoice_items',
    'pos_purchases',
    'pos_ledger_entries',
    'pos_salary_payments',
    'pos_service_jobs',
    'pos_notifications',
    'pos_returns'
  ];
begin
  foreach tbl in array tables loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on table public.%I from public, anon, authenticated', tbl);
    execute format('drop policy if exists deny_direct_client_access on public.%I', tbl);
    execute format(
      'create policy deny_direct_client_access on public.%I for all to anon, authenticated using (false) with check (false)',
      tbl
    );
  end loop;
end $$;

-- ============================================================================
-- 5. Private Normalization & Session Verification Helpers
-- ============================================================================

create or replace function private.normalize_bd_phone(p_raw text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text;
begin
  v := coalesce(p_raw, '');
  v := translate(v, '০১২৩৪৫৬৭৮৯', '0123456789');
  v := regexp_replace(v, '[\s\-()]+', '', 'g');
  v := btrim(v);
  if v like '+880%' then
    v := '0' || substr(v, 5);
  elsif v like '880%' and length(v) = 13 then
    v := '0' || substr(v, 4);
  end if;
  return v;
end;
$$;

create or replace function private.normalize_pos_password(p_raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(translate(coalesce(p_raw, ''), '০১২৩৪৫৬৭৮৯', '0123456789'));
$$;

create or replace function private.hash_session_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function private.resolve_session_user(p_token text)
returns public.pos_users
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean text := btrim(coalesce(p_token, ''));
  v_hash text;
  v_user public.pos_users;
begin
  if v_clean = '' then
    return null;
  end if;
  v_hash := private.hash_session_token(v_clean);

  select u.*
    into v_user
    from public.pos_sessions s
    join public.pos_users u on u.id = s.user_id
   where s.token_hash = v_hash
     and s.expires_at > now()
     and u.active = true
   limit 1;

  return v_user;
end;
$$;

revoke all on function private.normalize_bd_phone(text) from public, anon, authenticated;
revoke all on function private.normalize_pos_password(text) from public, anon, authenticated;
revoke all on function private.hash_session_token(text) from public, anon, authenticated;
revoke all on function private.resolve_session_user(text) from public, anon, authenticated;
