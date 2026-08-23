-- Horkos WM — Tests de la réservation de créneaux (migrations 010 + 011)
-- =====================================================================
--
-- À COLLER TEL QUEL dans le Supabase SQL Editor. Le script est enveloppé dans
-- une transaction terminée par ROLLBACK : il ne modifie AUCUNE donnée réelle.
-- Il pose des conseillers, des rendez-vous et des holds fictifs, vérifie le
-- comportement des fonctions, puis annule tout.
--
-- Chaque vérification est un ASSERT : au premier échec, le script s'arrête en
-- « ERROR: … » avec le message de l'assertion. S'il va jusqu'au bout, il
-- affiche « ✅ TOUS LES TESTS DE RÉSERVATION SONT PASSÉS ».
--
-- Prérequis : migrations 010_booking.sql et 011_appointment_mode.sql appliquées.
-- S'exécute en tant que `postgres` (le rôle du SQL Editor). Supabase interdit
-- `session_replication_role = replica`, donc pour insérer des profils fictifs
-- sans satisfaire la clé étrangère profiles.id -> auth.users, on retire cette
-- clé le temps de la transaction (annulée par ROLLBACK — rien de réel ne bouge).
-- Les contraintes NOT NULL et CHECK, elles, restent actives — c'est bien elles
-- qu'on teste. handle_new_user est un trigger sur auth.users : insérer
-- directement dans public.profiles ne le déclenche pas.

begin;

do $$
declare
  c1 uuid := gen_random_uuid();   -- conseiller « Amine »
  c2 uuid := gen_random_uuid();   -- conseiller « Sara »
  tokA uuid := gen_random_uuid();
  tokB uuid := gen_random_uuid();
  tok1 uuid := gen_random_uuid();
  tok2 uuid := gen_random_uuid();
  tok3 uuid := gen_random_uuid();
  tokReq uuid := gen_random_uuid();

  base_date date;
  wk_date date;                   -- un samedi de la même semaine

  s0900 timestamptz;
  s0930 timestamptz;
  s1030 timestamptz;
  s1400 timestamptz;
  s1500 timestamptz;
  s1600 timestamptz;
  lunch timestamptz;              -- 12:30, hors grille
  weekend timestamptz;            -- samedi 09:00
  past timestamptz;               -- même créneau, une semaine plus tôt (passé)

  rem int;
  cnt int;
  res jsonb;
  req_id uuid := gen_random_uuid();
  fk record;
begin
  -- Retire les clés étrangères de public.profiles (dont profiles.id -> auth.users)
  -- pour pouvoir insérer des conseillers fictifs. Tout est annulé par le ROLLBACK.
  for fk in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'profiles'
       and con.contype = 'f'
  loop
    execute format('alter table public.profiles drop constraint %I', fk.conname);
  end loop;

  -- La capacité d'un créneau = nombre GLOBAL de profils « conseiller ». Pour un
  -- test déterministe, on met de côté les conseillers déjà en base (rôle basculé
  -- vers 'client', valeur acceptée par la contrainte CHECK) : seuls nos deux
  -- conseillers fictifs comptent. Annulé par le ROLLBACK.
  update public.profiles set role = 'client' where role = 'conseiller';

  -- Deux conseillers ouvrent la disponibilité.
  insert into public.profiles (id, role, first_name, last_name, email) values
    (c1, 'conseiller', 'Amine', 'Benali',  'amine.test@horkos.local'),
    (c2, 'conseiller', 'Sara',  'Idrissi', 'sara.test@horkos.local');

  -- Premier jour ouvré au moins 3 jours devant : à l'abri de la marge de 2 h.
  select d::date into base_date
    from generate_series(current_date + 3, current_date + 12, interval '1 day') as g(d)
   where extract(isodow from d) between 1 and 5
   order by d
   limit 1;

  wk_date := base_date + (6 - extract(isodow from base_date))::int;  -- samedi

  s0900 := make_timestamptz(extract(year from base_date)::int, extract(month from base_date)::int, extract(day from base_date)::int,  9,  0, 0, 'Africa/Casablanca');
  s0930 := s0900 + interval '30 minutes';
  s1030 := s0900 + interval '90 minutes';
  s1400 := make_timestamptz(extract(year from base_date)::int, extract(month from base_date)::int, extract(day from base_date)::int, 14,  0, 0, 'Africa/Casablanca');
  s1500 := make_timestamptz(extract(year from base_date)::int, extract(month from base_date)::int, extract(day from base_date)::int, 15,  0, 0, 'Africa/Casablanca');
  s1600 := make_timestamptz(extract(year from base_date)::int, extract(month from base_date)::int, extract(day from base_date)::int, 16,  0, 0, 'Africa/Casablanca');
  lunch := make_timestamptz(extract(year from base_date)::int, extract(month from base_date)::int, extract(day from base_date)::int, 12, 30, 0, 'Africa/Casablanca');
  weekend := make_timestamptz(extract(year from wk_date)::int, extract(month from wk_date)::int, extract(day from wk_date)::int, 9, 0, 0, 'Africa/Casablanca');
  past := s0900 - interval '7 days';   -- même jour de semaine, même heure, dans le passé

  -- ================================================================
  -- 1. _is_valid_slot_start : jour ouvré, sur la grille, marge de 2 h
  -- ================================================================
  assert public._is_valid_slot_start(s0900),
    'Un lundi-vendredi à 09:00 devrait être un début valable.';
  assert not public._is_valid_slot_start(lunch),
    '12:30 (déjeuner, hors grille) ne devrait pas être valable.';
  assert not public._is_valid_slot_start(weekend),
    'Le samedi 09:00 ne devrait pas être valable.';
  assert not public._is_valid_slot_start(past),
    'Un créneau dans le passé (sous la marge de 2 h) ne devrait pas être valable.';
  assert not public._is_valid_slot_start(s0900 + interval '7 minutes'),
    'Un instant hors demi-heure ne devrait pas être valable.';

  -- ================================================================
  -- 2. get_slot_availability : 13 créneaux/jour, capacité = conseillers - occupés
  -- ================================================================
  select count(*) into cnt from public.get_slot_availability(base_date, base_date);
  assert cnt = 13, format('13 créneaux attendus pour une journée, obtenu %s.', cnt);

  select remaining into rem from public.get_slot_availability(base_date, base_date) where slot_start = s0900;
  assert rem = 2, format('Sans rendez-vous, 2 conseillers = 2 places à 09:00 ; obtenu %s.', rem);

  -- Aucun créneau le week-end.
  select count(*) into cnt from public.get_slot_availability(wk_date, wk_date);
  assert cnt = 0, format('Un samedi ne devrait offrir aucun créneau ; obtenu %s.', cnt);

  -- ================================================================
  -- 3. Occupation par intervalle réel (pas par égalité d'heure)
  -- ================================================================
  -- Un rendez-vous de 60 min à 09:00 occupe Amine sur [09:00, 10:00).
  insert into public.appointments (client_id, advisor_id, type, status, date, duration_minutes, mode)
  values (null, c1, 'R0', 'confirme', s0900, 60, 'presentiel');

  select remaining into rem from public.get_slot_availability(base_date, base_date) where slot_start = s0900;
  assert rem = 1, format('Un conseiller occupé à 09:00 devrait laisser 1 place ; obtenu %s.', rem);

  -- 09:30 chevauche le rendez-vous 09:00–10:00 : la place doit aussi tomber à 1.
  select remaining into rem from public.get_slot_availability(base_date, base_date) where slot_start = s0930;
  assert rem = 1, format('09:30 chevauche le rendez-vous 09:00–10:00 ; place attendue 1, obtenu %s.', rem);

  -- 10:30 ne chevauche plus (le rendez-vous finit à 10:00) : les 2 places reviennent.
  select remaining into rem from public.get_slot_availability(base_date, base_date) where slot_start = s1030;
  assert rem = 2, format('10:30 ne chevauche pas 09:00–10:00 ; 2 places attendues, obtenu %s.', rem);

  -- ================================================================
  -- 4. hold_slot : tient un créneau, retire une place, refuse le trop-plein
  -- ================================================================
  assert public.hold_slot(s0900, tokA),
    'Le premier hold sur 09:00 (1 place restante) devrait réussir.';

  -- Amine occupé (1) + hold de tokA (1) = 2 : plus de place pour tokB.
  assert not public.hold_slot(s0900, tokB),
    'Un second hold sur 09:00 désormais plein devrait échouer.';

  assert not public.hold_slot(lunch, tokB),
    'Un hold sur un créneau invalide (12:30) devrait échouer.';

  -- Un token = un seul hold : re-choisir déplace, n'additionne pas.
  assert public.hold_slot(s1400, tokA), 'Déplacer le hold de tokA vers 14:00 devrait réussir.';
  select count(*) into cnt from public.slot_holds where hold_token = tokA;
  assert cnt = 1, format('Un token ne doit tenir qu''un créneau ; tokA en tient %s.', cnt);

  -- Le hold exclut son propre token du calcul : tokA revoit 14:00 comme libre.
  select remaining into rem from public.get_slot_availability(base_date, base_date, tokA) where slot_start = s1400;
  assert rem = 2, format('Avec exclusion de son token, 14:00 doit montrer 2 places ; obtenu %s.', rem);
  -- Vu d'un autre token, le hold de tokA occupe bien une place.
  select remaining into rem from public.get_slot_availability(base_date, base_date, tokB) where slot_start = s1400;
  assert rem = 1, format('Vu d''un autre token, le hold occupe une place ; attendu 1, obtenu %s.', rem);

  -- ================================================================
  -- 5. book_slot : confirme, choisit le conseiller le moins chargé, insère
  -- ================================================================
  -- À 15:00, les deux sont libres ; Amine a déjà 1 rendez-vous ce jour, pas Sara.
  res := public.book_slot(s1500, tok1, 'R0', null, 'visio', 'https://meet.google.com/test');
  assert res is not null, 'La réservation de 15:00 devrait réussir.';
  assert (res->>'mode') = 'visio', format('Mode visio attendu ; obtenu %s.', res->>'mode');
  assert (res->>'advisor_first_name') = 'Sara',
    format('Le conseiller le moins chargé (Sara) est attendu ; obtenu %s.', res->>'advisor_first_name');

  select count(*) into cnt from public.appointments
   where date = s1500 and status = 'confirme' and mode = 'visio' and meeting_url = 'https://meet.google.com/test';
  assert cnt = 1, format('Un rendez-vous confirmé en visio devrait exister à 15:00 ; obtenu %s.', cnt);

  -- ================================================================
  -- 6. book_slot rattache la demande du questionnaire
  -- ================================================================
  insert into public.appointment_requests (id, first_name, last_name, email, besoins)
  values (req_id, 'Jean', 'Dupont', 'jean.test@horkos.local', array['Préparer ma retraite']);

  res := public.book_slot(s1030, tokReq, 'R0', req_id, 'presentiel', null);
  assert res is not null, 'La réservation de 10:30 avec demande devrait réussir.';

  assert (select appointment_id from public.appointment_requests where id = req_id) is not null,
    'La demande devrait être rattachée au rendez-vous créé.';
  assert (select status from public.appointment_requests where id = req_id) = 'planifie',
    'La demande devrait passer au statut « planifie » après réservation.';

  -- ================================================================
  -- 7. book_slot épuise la capacité puis refuse
  -- ================================================================
  assert public.book_slot(s1600, tok1, 'R0', null, 'presentiel', null) is not null,
    '1re réservation de 16:00 (2 places) devrait réussir.';
  assert public.book_slot(s1600, tok2, 'R0', null, 'presentiel', null) is not null,
    '2e réservation de 16:00 (1 place restante) devrait réussir.';
  assert public.book_slot(s1600, tok3, 'R0', null, 'presentiel', null) is null,
    '3e réservation de 16:00 (plus de place) devrait rendre null.';

  -- ================================================================
  -- 8. book_slot refuse les entrées invalides
  -- ================================================================
  assert public.book_slot(lunch, tok1, 'R0', null, 'presentiel', null) is null,
    'Réserver un créneau invalide (12:30) devrait rendre null.';
  assert public.book_slot(s1400, tok1, 'TYPE_INCONNU', null, 'presentiel', null) is null,
    'Un type de rendez-vous inconnu devrait rendre null.';
  assert public.book_slot(s1400, tok1, 'R0', null, 'mode_inconnu', null) is null,
    'Un mode inconnu devrait rendre null.';

  raise notice '✅ TOUS LES TESTS DE RÉSERVATION SONT PASSÉS (base_date = %).', base_date;
end $$;

rollback;
