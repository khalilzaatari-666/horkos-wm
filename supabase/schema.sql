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
  -- Pas de patrimoine_total ici : le patrimoine est la somme de public.assets,
  -- calculée à la volée. Un total dénormalisé finirait par diverger du réel.
  -- Voir 009_drop_patrimoine_total.sql.
  advisor_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Role tests live in SECURITY DEFINER functions on purpose. Inlining
-- `select ... from profiles` into a policy ON profiles makes Postgres
-- re-evaluate that same policy forever (42P17), and because every other
-- table's staff policy also reads profiles, the recursion spreads to the
-- whole schema. Running the lookup as the function owner breaks the loop.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'conseiller')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_staff() from public;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;

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
  using (public.is_staff());

-- Admins can update any profile
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

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

  -- Rattache la demande de rendez-vous déposée avant l'inscription.
  update public.appointment_requests
     set client_id = new.id
   where client_id is null
     and lower(email) = lower(new.email);

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
  -- presentiel : au cabinet. visio : réunion Zoom, lien dans meeting_url.
  mode text not null default 'presentiel' check (mode in ('presentiel', 'visio')),
  meeting_url text,
  notes text,
  created_at timestamptz default now()
);

alter table public.appointments enable row level security;

create policy "Clients see own appointments"
  on public.appointments for select
  using (auth.uid() = client_id);

create policy "Staff see all appointments"
  on public.appointments for all
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

-- ============================================
-- ASSET VALUATIONS (historique)
-- ============================================
-- assets.value ne porte que la valeur courante, écrasée à chaque mise à jour.
-- L'indicateur « Performance 12 mois » a besoin d'une trace datée.
-- Voir 007_asset_valuations.sql.
create table public.asset_valuations (
  id uuid default gen_random_uuid() primary key,
  asset_id uuid references public.assets(id) on delete cascade not null,
  value numeric not null,
  -- Date du relevé, pas de la saisie.
  valued_at date not null default current_date,
  created_at timestamptz not null default now()
);

create unique index asset_valuations_unique_day
  on public.asset_valuations (asset_id, valued_at);
create index asset_valuations_asset_date_idx
  on public.asset_valuations (asset_id, valued_at desc);

alter table public.asset_valuations enable row level security;

-- La visibilité suit celle de l'actif parent : la sous-requête subit ses propres
-- policies, donc un actif invisible masque ses valorisations.
create policy "Clients see own asset valuations"
  on public.asset_valuations for select
  to authenticated
  using (
    exists (
      select 1 from public.assets a
       where a.id = asset_valuations.asset_id
         and a.client_id = auth.uid()
    )
  );

create policy "Staff read asset valuations"
  on public.asset_valuations for select
  to authenticated using (public.is_staff());
create policy "Staff insert asset valuations"
  on public.asset_valuations for insert
  to authenticated with check (public.is_staff());
create policy "Staff update asset valuations"
  on public.asset_valuations for update
  to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "Staff delete asset valuations"
  on public.asset_valuations for delete
  to authenticated using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

-- ============================================
-- DOCUMENTS (coffre-fort)
-- ============================================
-- Les rubriques classent par ORIGINE du document — reçu, souscrit,
-- réglementaire, produit par le cabinet — et non par thème administratif :
-- c'est ainsi qu'un client cherche une pièce. Voir 006_documents_categories.sql.
-- "autre" est un filet, accepté mais jamais affiché comme rubrique vide.
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  category text not null check (category in (
    'releves_situation', 'contrats', 'reglementaires', 'strategie', 'autre'
  )),
  name text not null,
  -- Chemin dans le bucket PRIVÉ "documents" : {client_id}/{document_id}-{nom}.
  -- Le premier segment porte le contrôle d'accès, voir 008_documents_storage.sql.
  file_path text not null,
  file_size int,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

create index documents_client_category_idx
  on public.documents (client_id, category, created_at desc);

alter table public.documents enable row level security;

create policy "Clients see own documents"
  on public.documents for select
  using (auth.uid() = client_id);

create policy "Staff manage documents"
  on public.documents for all
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_staff());

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
  using (public.is_admin());

create policy "System can insert audit logs"
  on public.audit_logs for insert
  with check (true);

-- Index for fast queries by user and date
create index idx_audit_logs_user on public.audit_logs(user_id, created_at desc);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- ============================================
-- APPOINTMENT REQUESTS (demandes de RDV visiteurs)
-- ============================================
-- Un visiteur n'a pas de profil et aucune date n'est encore fixée : c'est le
-- conseiller qui rappelle pour convenir du créneau. On stocke donc la date de
-- la DEMANDE (created_at), et on rattache l'appointment une fois planifié.
create table public.appointment_requests (
  id uuid default gen_random_uuid() primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  besoins text[] not null default '{}',
  -- Rempli quand besoins[] contient 'Autre besoin'.
  besoin_autre text,
  patrimoine text,
  investissement text,
  message text,
  -- Ville de résidence et canal de découverte (026_ville_source.sql).
  ville text,
  source text,
  status text not null default 'nouveau'
    -- "planifie" est posé automatiquement par book_slot quand le visiteur
    -- réserve lui-même son créneau. Voir 012_demande_statuts.sql.
    check (status in ('nouveau', 'contacte', 'planifie', 'honore', 'annule')),
  assigned_to uuid references public.profiles(id),
  notes text,
  client_id uuid references public.profiles(id),
  appointment_id uuid references public.appointments(id),
  created_at timestamptz not null default now()
);

create index appointment_requests_status_idx
  on public.appointment_requests (status, created_at desc);
create index appointment_requests_email_idx
  on public.appointment_requests (lower(email));

alter table public.appointment_requests enable row level security;

-- Une policy par commande : une policy "for all" sans "with check" réutilise
-- son "using" comme contrôle d'insertion et brouille le INSERT anonyme.
grant insert on public.appointment_requests to anon;
grant select, insert, update, delete on public.appointment_requests to authenticated;

create policy "Anyone can request an appointment"
  on public.appointment_requests for insert
  to anon, authenticated
  with check (true);

create policy "Clients see own requests"
  on public.appointment_requests for select
  to authenticated
  using (auth.uid() = client_id);

create policy "Staff read appointment requests"
  on public.appointment_requests for select
  to authenticated
  using (public.is_staff());

create policy "Staff update appointment requests"
  on public.appointment_requests for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "Staff delete appointment requests"
  on public.appointment_requests for delete
  to authenticated
  using (public.is_staff());

-- ============================================
-- Enable realtime for messages
-- ============================================
alter publication supabase_realtime add table public.messages;

-- ============================================
-- STORAGE : bucket du coffre-fort
-- ============================================
-- PRIVÉ, jamais public : un bucket public sert ses objets à quiconque connaît
-- l'URL, sans authentification. Le coffre passe exclusivement par des URLs
-- signées à durée courte, générées côté serveur.
-- Voir 008_documents_storage.sql pour le détail et l'auto-vérification.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

create policy "Clients read own documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Staff read all documents"
  on storage.objects for select
  to authenticated using (bucket_id = 'documents' and public.is_staff());
create policy "Staff upload documents"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'documents' and public.is_staff());
create policy "Staff update documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents' and public.is_staff())
  with check (bucket_id = 'documents' and public.is_staff());
create policy "Staff delete documents"
  on storage.objects for delete
  to authenticated using (bucket_id = 'documents' and public.is_staff());

-- ============================================
-- RÉSERVATION DE CRÉNEAUX (booking)
-- ============================================
-- Miroir de 010_booking.sql. La grille est la même que
-- src/components/booking/grille.ts ; si l'une change, changer l'autre.

-- ============================================
-- HOLDS : un créneau tenu 5 minutes
-- ============================================
create table if not exists public.slot_holds (
  id uuid default gen_random_uuid() primary key,
  -- Début du rendez-vous complet (60 min), pas d'une demi-heure.
  slot_start timestamptz not null,
  -- Généré par le navigateur, anonyme ou connecté. Un token = un seul hold :
  -- re-choisir un créneau déplace le hold, il ne s'additionne pas.
  hold_token uuid not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists slot_holds_active_idx
  on public.slot_holds (slot_start, expires_at);

-- RLS activée, AUCUNE policy : la table n'est accessible que par les fonctions
-- ci-dessous, qui s'exécutent en tant que propriétaire.
alter table public.slot_holds enable row level security;

-- ============================================
-- LA GRILLE CÔTÉ SQL
-- ============================================
-- Les 13 débuts d'une journée, en minutes depuis minuit, heure du cabinet.
-- Miroir de slotsOfDay() dans grille.ts.
create or replace function public._booking_starts()
returns int[]
language sql immutable
as $$
  select array[540, 570, 600, 630, 660, 690, 840, 870, 900, 930, 960, 990, 1020];
$$;

-- Un instant est un début valable : jour ouvré, sur la grille, et assez loin
-- dans le futur (marge de 2 h — pas de réservation dans dix minutes).
create or replace function public._is_valid_slot_start(p_start timestamptz)
returns boolean
language sql stable
set search_path = public
as $$
  select extract(isodow from p_start at time zone 'Africa/Casablanca') between 1 and 5
     and (extract(hour from p_start at time zone 'Africa/Casablanca') * 60
        + extract(minute from p_start at time zone 'Africa/Casablanca'))::int
         = any (public._booking_starts())
     and date_trunc('minute', p_start) = p_start
     and p_start >= now() + interval '2 hours';
$$;

-- Unités occupées sur l'intervalle [p_start, p_start + 60 min) :
-- conseillers ayant un rendez-vous chevauchant, plus les rendez-vous sans
-- conseiller assigné (saisis à la main), plus les holds actifs des autres.
-- Le chevauchement se calcule par intervalle réel (date + duration_minutes),
-- pas par égalité d'heure : un rendez-vous de 60 min bloque ses deux
-- demi-heures, un de 30 n'en bloque qu'une.
create or replace function public._booking_busy(p_start timestamptz, p_exclude_token uuid)
returns int
language sql stable
set search_path = public
as $$
  select (
    select count(distinct coalesce(a.advisor_id::text, a.id::text))
      from public.appointments a
     where a.status in ('planifie', 'confirme')
       and a.date < p_start + interval '60 minutes'
       and a.date + make_interval(mins => coalesce(a.duration_minutes, 60)) > p_start
  )::int
  + (
    select count(*)
      from public.slot_holds h
     where h.expires_at > now()
       and (p_exclude_token is null or h.hold_token <> p_exclude_token)
       and h.slot_start < p_start + interval '60 minutes'
       and h.slot_start + interval '60 minutes' > p_start
  )::int;
$$;

-- ============================================
-- DISPONIBILITÉ
-- ============================================
-- Rend, pour chaque début proposable entre from_date et to_date (heure du
-- cabinet), le nombre d'unités restantes. `p_token` exclut le hold de
-- l'appelant, pour que son propre créneau ne lui apparaisse pas comme pris.
create or replace function public.get_slot_availability(
  p_from date,
  p_to date,
  p_token uuid default null
)
returns table (slot_start timestamptz, remaining int)
language sql stable
security definer
set search_path = public
as $$
  with conseillers as (
    select count(*)::int as total from public.profiles where role = 'conseiller'
  ),
  starts as (
    select make_timestamptz(
             extract(year from d)::int,
             extract(month from d)::int,
             extract(day from d)::int,
             m / 60, m % 60, 0,
             'Africa/Casablanca'
           ) as s
      from generate_series(p_from, p_to, interval '1 day') as d
      cross join unnest(public._booking_starts()) as m
     where extract(isodow from d) between 1 and 5
  )
  select s as slot_start,
         greatest(0, (select total from conseillers) - public._booking_busy(s, p_token)) as remaining
    from starts
   where s >= now() + interval '2 hours'
   order by s;
$$;

-- ============================================
-- HOLD : tenir un créneau 5 minutes
-- ============================================
create or replace function public.hold_slot(p_slot_start timestamptz, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
begin
  if p_token is null or not public._is_valid_slot_start(p_slot_start) then
    return false;
  end if;

  -- La purge vit ici plutôt que dans un cron : chaque tentative nettoie.
  delete from public.slot_holds where expires_at <= now();

  -- Sérialise les prises concurrentes du même créneau.
  perform pg_advisory_xact_lock(hashtext('booking-' || p_slot_start::text));

  select count(*)::int into total from public.profiles where role = 'conseiller';
  if total - public._booking_busy(p_slot_start, p_token) <= 0 then
    return false;
  end if;

  insert into public.slot_holds (slot_start, hold_token, expires_at)
  values (p_slot_start, p_token, now() + interval '5 minutes')
  on conflict (hold_token)
  do update set slot_start = excluded.slot_start,
                expires_at = excluded.expires_at,
                created_at = now();

  return true;
end;
$$;

-- ============================================
-- RÉSERVATION
-- ============================================
-- Confirme immédiatement (décision client) : le rendez-vous est inséré au
-- statut 'confirme' avec le conseiller libre le moins chargé du jour.
-- Retourne un jsonb (id, créneau, mode, conseiller assigné) qui permet les
-- emails de confirmation sans clé privilégiée, ou null si le créneau n'est
-- plus disponible — la demande, elle, est déjà enregistrée.
create or replace function public.book_slot(
  p_slot_start timestamptz,
  p_token uuid,
  p_type text default 'R0',
  p_request_id uuid default null,
  p_mode text default 'presentiel',
  p_meeting_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
  chosen uuid;
  appt uuid;
  advisor record;
begin
  if not public._is_valid_slot_start(p_slot_start)
     or p_type not in ('R0', 'R1', 'R2', 'revue', 'autre')
     or p_mode not in ('presentiel', 'visio') then
    return null;
  end if;

  delete from public.slot_holds where expires_at <= now();

  -- Le point où une course créerait un double booking : deux réservations du
  -- même créneau s'exécutent ici l'une après l'autre, jamais ensemble.
  perform pg_advisory_xact_lock(hashtext('booking-' || p_slot_start::text));

  select count(*)::int into total from public.profiles where role = 'conseiller';
  if total - public._booking_busy(p_slot_start, p_token) <= 0 then
    return null;
  end if;

  -- Conseiller libre le moins chargé sur la journée. Il en existe au moins un :
  -- la capacité restante vient d'être vérifiée sous verrou.
  select p.id, p.first_name, p.last_name, p.email
    into advisor
    from public.profiles p
   where p.role = 'conseiller'
     and not exists (
       select 1 from public.appointments a
        where a.advisor_id = p.id
          and a.status in ('planifie', 'confirme')
          and a.date < p_slot_start + interval '60 minutes'
          and a.date + make_interval(mins => coalesce(a.duration_minutes, 60)) > p_slot_start
     )
   order by (
       select count(*) from public.appointments a
        where a.advisor_id = p.id
          and a.status in ('planifie', 'confirme')
          and a.date >= date_trunc('day', p_slot_start at time zone 'Africa/Casablanca')
                          at time zone 'Africa/Casablanca'
          and a.date <  (date_trunc('day', p_slot_start at time zone 'Africa/Casablanca')
                          + interval '1 day') at time zone 'Africa/Casablanca'
     ) asc, p.id
   limit 1;

  if advisor.id is null then
    return null;
  end if;
  chosen := advisor.id;

  insert into public.appointments
    (client_id, advisor_id, type, status, date, duration_minutes, mode, meeting_url)
  values
    (auth.uid(), chosen, p_type, 'confirme', p_slot_start, 60, p_mode,
     case when p_mode = 'visio' then p_meeting_url end)
  returning id into appt;

  delete from public.slot_holds where hold_token = p_token;

  -- Rattache la demande du questionnaire, si elle vient d'en créer une.
  if p_request_id is not null then
    update public.appointment_requests
       set appointment_id = appt,
           status = 'planifie'
     where id = p_request_id
       and appointment_id is null;
  end if;

  return jsonb_build_object(
    'appointment_id', appt,
    'slot_start', p_slot_start,
    'mode', p_mode,
    'advisor_first_name', advisor.first_name,
    'advisor_last_name', advisor.last_name,
    'advisor_email', advisor.email
  );
end;
$$;

-- ============================================
-- DROITS
-- ============================================
revoke all on function public.get_slot_availability(date, date, uuid) from public;
revoke all on function public.hold_slot(timestamptz, uuid) from public;
revoke all on function public.book_slot(timestamptz, uuid, text, uuid, text, text) from public;
revoke all on function public._booking_busy(timestamptz, uuid) from public;
revoke all on function public._is_valid_slot_start(timestamptz) from public;

grant execute on function public.get_slot_availability(date, date, uuid) to anon, authenticated;
grant execute on function public.hold_slot(timestamptz, uuid) to anon, authenticated;
grant execute on function public.book_slot(timestamptz, uuid, text, uuid, text, text) to anon, authenticated;
