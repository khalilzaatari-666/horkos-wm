-- Horkos WM - Database Schema
-- Run this in the Supabase SQL Editor after creating the project

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null default 'client' check (role in ('client', 'admin', 'conseiller')),
  first_name text,
  last_name text,
  email text,
  phone text,
  patrimoine_total numeric default 0,
  advisor_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins and conseillers can view all profiles
create policy "Staff can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- Admins can update any profile
create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- APPOINTMENTS (RDV)
-- ============================================
create table public.appointments (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id),
  advisor_id uuid references public.profiles(id),
  type text not null check (type in ('R0', 'R1', 'R2', 'revue', 'autre')),
  status text not null default 'planifie' check (status in ('planifie', 'confirme', 'termine', 'annule')),
  date timestamptz not null,
  duration_minutes int default 60,
  notes text,
  created_at timestamptz default now()
);

alter table public.appointments enable row level security;

create policy "Clients see own appointments"
  on public.appointments for select
  using (auth.uid() = client_id);

create policy "Staff see all appointments"
  on public.appointments for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- AUDITS
-- ============================================
create table public.audits (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  advisor_id uuid references public.profiles(id),
  status text not null default 'en_cours' check (status in ('en_cours', 'termine')),
  data jsonb default '{}',
  pdf_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.audits enable row level security;

create policy "Clients see own audits"
  on public.audits for select
  using (auth.uid() = client_id);

create policy "Staff manage audits"
  on public.audits for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- ASSETS
-- ============================================
create table public.assets (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  type text not null,
  label text not null,
  value numeric default 0,
  details jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.assets enable row level security;

create policy "Clients see own assets"
  on public.assets for select
  using (auth.uid() = client_id);

create policy "Staff manage assets"
  on public.assets for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- RECOMMENDATIONS
-- ============================================
create table public.recommendations (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null,
  description text,
  details jsonb default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.recommendations enable row level security;

create policy "Anyone can view active recommendations"
  on public.recommendations for select
  using (is_active = true);

create policy "Staff manage recommendations"
  on public.recommendations for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- CLIENT RECOMMENDATIONS
-- ============================================
create table public.client_recommendations (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  recommendation_id uuid references public.recommendations(id) not null,
  status text default 'proposee' check (status in ('proposee', 'acceptee', 'rejetee', 'mise_en_place')),
  advisor_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz default now()
);

alter table public.client_recommendations enable row level security;

create policy "Clients see own recommendations"
  on public.client_recommendations for select
  using (auth.uid() = client_id);

create policy "Staff manage client recommendations"
  on public.client_recommendations for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- DOCUMENTS (coffre-fort)
-- ============================================
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  category text not null check (category in ('identite', 'fiscal', 'patrimoine', 'autre')),
  name text not null,
  file_path text not null,
  file_size int,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.documents enable row level security;

create policy "Clients see own documents"
  on public.documents for select
  using (auth.uid() = client_id);

create policy "Staff manage documents"
  on public.documents for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- MESSAGES (chat)
-- ============================================
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  content text not null,
  read boolean default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users see own messages"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Staff see all messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- LEADS
-- ============================================
create table public.leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  email text,
  source text,
  status text default 'nouveau' check (status in ('nouveau', 'contacte', 'qualifie', 'converti', 'perdu')),
  notes text,
  assigned_to uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.leads enable row level security;

create policy "Staff manage leads"
  on public.leads for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- CONTACTS (form submissions)
-- ============================================
create table public.contacts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  phone text,
  message text not null,
  status text default 'nouveau' check (status in ('nouveau', 'lu', 'traite')),
  created_at timestamptz default now()
);

alter table public.contacts enable row level security;

-- Anyone can submit a contact form (no auth required)
create policy "Anyone can insert contacts"
  on public.contacts for insert
  with check (true);

create policy "Staff manage contacts"
  on public.contacts for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- ASSET SUBMISSIONS (cession requests)
-- ============================================
create table public.asset_submissions (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id),
  asset_type text not null,
  description text,
  estimated_value numeric,
  reason text,
  status text default 'soumis' check (status in ('soumis', 'en_revue', 'accepte', 'rejete')),
  data jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.asset_submissions enable row level security;

create policy "Clients see own submissions"
  on public.asset_submissions for select
  using (auth.uid() = client_id);

create policy "Clients can submit"
  on public.asset_submissions for insert
  with check (auth.uid() = client_id);

create policy "Staff manage submissions"
  on public.asset_submissions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- PARTNER SUBMISSIONS
-- ============================================
create table public.partner_submissions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  company text,
  email text not null,
  phone text,
  partner_type text not null,
  message text,
  status text default 'nouveau' check (status in ('nouveau', 'en_revue', 'accepte', 'rejete')),
  created_at timestamptz default now()
);

alter table public.partner_submissions enable row level security;

create policy "Anyone can submit partner form"
  on public.partner_submissions for insert
  with check (true);

create policy "Staff manage partner submissions"
  on public.partner_submissions for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- ARTICLES (CMS)
-- ============================================
create table public.articles (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  cover_url text,
  category text,
  is_published boolean default false,
  author_id uuid references public.profiles(id),
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.articles enable row level security;

create policy "Anyone can view published articles"
  on public.articles for select
  using (is_published = true);

create policy "Staff manage articles"
  on public.articles for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- GUIDES
-- ============================================
create table public.guides (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  description text,
  cover_url text,
  pdf_url text,
  is_published boolean default false,
  created_at timestamptz default now()
);

alter table public.guides enable row level security;

create policy "Anyone can view published guides"
  on public.guides for select
  using (is_published = true);

create policy "Staff manage guides"
  on public.guides for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- GUIDE DOWNLOADS
-- ============================================
create table public.guide_downloads (
  id uuid default gen_random_uuid() primary key,
  guide_id uuid references public.guides(id) not null,
  email text not null,
  sent_at timestamptz default now()
);

alter table public.guide_downloads enable row level security;

create policy "Anyone can request guide"
  on public.guide_downloads for insert
  with check (true);

create policy "Staff see downloads"
  on public.guide_downloads for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- EVENTS
-- ============================================
create table public.events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  date timestamptz not null,
  location text,
  is_published boolean default false,
  created_at timestamptz default now()
);

alter table public.events enable row level security;

create policy "Anyone can view published events"
  on public.events for select
  using (is_published = true);

create policy "Staff manage events"
  on public.events for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- FAQS
-- ============================================
create table public.faqs (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  answer text not null,
  sort_order int default 0,
  is_published boolean default true,
  created_at timestamptz default now()
);

alter table public.faqs enable row level security;

create policy "Anyone can view published FAQs"
  on public.faqs for select
  using (is_published = true);

create policy "Staff manage FAQs"
  on public.faqs for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'conseiller')
    )
  );

-- ============================================
-- AUDIT LOG (traçabilité AMMC)
-- ============================================
create table public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb default '{}',
  ip_address text,
  created_at timestamptz default now()
);

alter table public.audit_logs enable row level security;

create policy "Only admins can view audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "System can insert audit logs"
  on public.audit_logs for insert
  with check (true);

-- Index for fast queries by user and date
create index idx_audit_logs_user on public.audit_logs(user_id, created_at desc);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- ============================================
-- Enable realtime for messages
-- ============================================
alter publication supabase_realtime add table public.messages;
