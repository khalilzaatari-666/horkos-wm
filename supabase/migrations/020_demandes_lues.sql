-- Demandes entrantes : état de lecture partagé par l'équipe
--
-- Le back-office regroupe les messages de contact et les demandes de
-- partenariat sous une même section, avec une pastille rouge qui répond à une
-- seule question : quelqu'un a-t-il déjà ouvert ceci ? La réponse doit être la
-- même pour tout le cabinet - dès qu'un conseiller ouvre un message, la
-- pastille tombe pour tous les autres. Sans ça, trois personnes lisent le même
-- message pendant qu'un quatrième reste sur le carreau.
--
-- On n'utilise pas `status` pour ça. « Lu » et « traité » ne sont pas le même
-- fait : un message peut avoir été lu par trois personnes sans que personne n'y
-- ait répondu, et `partner_submissions` n'a même pas de statut « lu » - ses
-- statuts (nouveau → en_revue → accepte / rejete) sont des décisions, pas des
-- accusés de réception. La pastille dit « quelqu'un l'a-t-il vu ? », le badge de
-- statut dit « quelqu'un s'en est-il occupé ? ».

alter table public.contacts
  add column if not exists read_at timestamptz;

-- Qui l'a ouvert en premier. `on delete set null` : le départ d'un conseiller
-- ne doit pas faire repasser d'anciens messages pour non lus.
alter table public.contacts
  add column if not exists read_by uuid references public.profiles(id) on delete set null;

alter table public.partner_submissions
  add column if not exists read_at timestamptz;

alter table public.partner_submissions
  add column if not exists read_by uuid references public.profiles(id) on delete set null;

comment on column public.contacts.read_at is
  'Premier instant où un membre de l''équipe a ouvert ce message. Null = non lu, ce qui allume la pastille du back-office.';
comment on column public.partner_submissions.read_at is
  'Premier instant où un membre de l''équipe a ouvert cette demande. Null = non lue.';

-- Rattrapage : ce qui a déjà été trié a forcément été lu. Sans cette passe, la
-- première ouverture de la section afficherait un compteur rouge sur tout
-- l'historique, et la pastille perdrait son sens dès le premier jour.
-- `read_by` reste null : on ne sait pas qui, et l'inventer serait faux.
update public.contacts
   set read_at = now()
 where read_at is null
   and status is distinct from 'nouveau';

update public.partner_submissions
   set read_at = now()
 where read_at is null
   and status is distinct from 'nouveau';

-- Les compteurs de pastille ne comptent que les non-lus, et sont relus à chaque
-- page du back-office : l'index partiel ne porte que sur eux, et reste donc
-- minuscule quel que soit le volume d'archives.
create index if not exists contacts_non_lus_idx
  on public.contacts (created_at desc)
  where read_at is null;

create index if not exists partner_submissions_non_lus_idx
  on public.partner_submissions (created_at desc)
  where read_at is null;

-- Aucune policy à ajouter : « Staff manage contacts » et « Staff manage partner
-- submissions » sont déjà des `for all using (public.is_staff())`, qui couvrent
-- la mise à jour de ces colonnes.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'contacts' and column_name = 'read_at'
  ) then
    raise exception 'Colonne contacts.read_at absente.';
  end if;

  raise notice 'contacts et partner_submissions : état de lecture partagé en place.';
end $$;
