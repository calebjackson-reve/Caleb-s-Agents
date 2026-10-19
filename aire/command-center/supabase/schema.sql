-- AIRE command center: Supabase migration for version two (cloud sync).
-- Paste into the Supabase SQL editor. Every table has row-level security scoped to Caleb's auth.uid().
-- Version one does not need this. It runs on data/store.json written by sync.py.

create table if not exists listings (
  id text primary key,                       -- listing_key(address), the same key sync.py uses
  address text not null,
  owner uuid not null default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists leads (
  id text primary key,                       -- email
  name text, email text, phone text, source text,
  received_at timestamptz, replied_at timestamptz, seconds_to_reply int, channels text, mode text,
  listing_id text references listings(id),
  called_at timestamptz,
  owner uuid not null default auth.uid()
);

create table if not exists followups (
  id text primary key,                       -- email + queue date
  name text, email text, stage text, day int, template int, subject text, body text,
  queue_date date, dropped_at timestamptz, sent_at timestamptz,
  owner uuid not null default auth.uid()
);

create table if not exists proposals (
  id text primary key,
  client text, address text, email text, prepared date, signed_at timestamptz, link text,
  price_range text, next_step text, needs_review boolean default false,
  listing_id text references listings(id),
  owner uuid not null default auth.uid()
);

create table if not exists events (
  id bigserial primary key,
  tool text, at timestamptz, level text, message text,
  owner uuid not null default auth.uid()
);

create table if not exists showings (
  id bigserial primary key,
  status text, property text, "when" text, at timestamptz,
  listing_id text references listings(id),
  owner uuid not null default auth.uid()
);

-- Seller view later: a per-listing token that grants read-only access to that listing's rows.
create table if not exists listing_tokens (
  token text primary key,
  listing_id text references listings(id) not null,
  expires_at timestamptz,
  owner uuid not null default auth.uid()
);

alter table listings enable row level security;
alter table leads enable row level security;
alter table followups enable row level security;
alter table proposals enable row level security;
alter table events enable row level security;
alter table showings enable row level security;
alter table listing_tokens enable row level security;

do $$
declare t text;
begin
  foreach t in array array['listings','leads','followups','proposals','events','showings','listing_tokens'] loop
    execute format('create policy "%1$s owner select" on %1$I for select using (owner = auth.uid());', t);
    execute format('create policy "%1$s owner insert" on %1$I for insert with check (owner = auth.uid());', t);
    execute format('create policy "%1$s owner update" on %1$I for update using (owner = auth.uid()) with check (owner = auth.uid());', t);
    execute format('create policy "%1$s owner delete" on %1$I for delete using (owner = auth.uid());', t);
  end loop;
end $$;
