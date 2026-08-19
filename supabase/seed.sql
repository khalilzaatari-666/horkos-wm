-- Horkos WM - Jeu d'essai de l'espace client
-- ============================================================================
-- À NE JAMAIS EXÉCUTER EN PRODUCTION.
--
-- Remplit l'espace d'un compte EXISTANT pour voir les six écrans peuplés avant
-- que le back-office n'existe (Sprint 6). On ne fabrique pas d'utilisateur : la
-- création d'une ligne auth.users à la main contourne le hachage du mot de
-- passe et la confirmation d'email. Connectez-vous normalement, puis lancez ce
-- script avec votre adresse.
--
-- PRÉREQUIS
--   Les migrations 006 à 009 doivent être appliquées. La 009 supprime
--   profiles.patrimoine_total : ce script ne l'écrit plus.
--
-- MODE D'EMPLOI
--   1. Créez ou utilisez un compte client sur le site.
--   2. Remplacez l'adresse ci-dessous par la sienne.
--   3. Lancez ce script dans l'éditeur SQL Supabase.
--   4. Pour tout retirer : voir le bloc NETTOYAGE en fin de fichier, où
--      l'adresse est à reporter une seconde fois.
--
-- LIMITE CONNUE
--   Les documents du coffre-fort sont créés en base mais AUCUN fichier n'est
--   déposé dans le bucket. Les rubriques s'affichent, le bouton « Ouvrir »
--   échouera proprement (« Impossible d'ouvrir ce document »). Pour tester le
--   téléchargement de bout en bout, déposez un PDF dans le bucket privé
--   "documents" aux chemins que le script affiche en fin d'exécution, dans
--   l'onglet des messages.
-- ============================================================================

do $$
declare
  -- >>> À MODIFIER <<<
  cible_email text := 'khalilzaatari1@gmail.com';

  -- Facultatif : l'email d'un AUTRE compte existant à promouvoir conseiller.
  -- Sans au moins un profil "conseiller", le calendrier de réservation est
  -- complet en permanence (capacité zéro). Laisser null pour ne rien changer.
  conseiller_email text := null;

  cible uuid;
  a_immo uuid; a_av uuid; a_opcvm uuid; a_liq uuid; a_pe uuid;
  reco_av uuid; reco_struct uuid; reco_immo uuid;
  d_id uuid;
  mois int;
  chemin text;
begin
  select id into cible from public.profiles where lower(email) = lower(cible_email);

  if cible is null then
    raise exception
      'Aucun profil pour %. Créez le compte sur le site, puis relancez.', cible_email;
  end if;

  raise notice 'Jeu d''essai pour % (%)', cible_email, cible;

  -- ==========================================================================
  -- CONSEILLER (capacité du calendrier de réservation)
  -- ==========================================================================
  if conseiller_email is not null then
    update public.profiles set role = 'conseiller'
     where lower(email) = lower(conseiller_email) and id <> cible;
    if not found then
      raise notice 'Aucun profil (autre que la cible) pour % — pas de promotion.', conseiller_email;
    end if;
  end if;

  if not exists (select 1 from public.profiles where role = 'conseiller') then
    raise notice 'ATTENTION : aucun conseiller en base. Le calendrier de réservation restera complet. Renseignez conseiller_email ci-dessus, ou : update public.profiles set role = ''conseiller'' where email = ''...'';';
  end if;

  -- ==========================================================================
  -- PROFIL
  -- ==========================================================================
  -- `coalesce` : on ne remplace jamais un nom ou un téléphone déjà saisis.
  -- Aucun total de patrimoine n'est écrit ici — il se déduit des actifs.
  update public.profiles
     set first_name = coalesce(first_name, 'Othmane'),
         last_name  = coalesce(last_name, 'Benzakour'),
         phone      = coalesce(phone, '+212 661234567')
   where id = cible;

  -- ==========================================================================
  -- ACTIFS
  -- ==========================================================================
  delete from public.assets where client_id = cible;

  insert into public.assets (client_id, type, label, value) values
    (cible, 'immobilier',    'Appartement Casablanca - Anfa',      1800000) returning id into a_immo;
  insert into public.assets (client_id, type, label, value) values
    (cible, 'assurance_vie', 'Contrat multisupport - Luxembourg',  1200000) returning id into a_av;
  insert into public.assets (client_id, type, label, value) values
    (cible, 'opcvm',         'Portefeuille OPCVM diversifié',       750000) returning id into a_opcvm;
  insert into public.assets (client_id, type, label, value) values
    (cible, 'liquidites',    'Comptes courants et à terme',         350000) returning id into a_liq;
  insert into public.assets (client_id, type, label, value) values
    (cible, 'private_equity','Participation - société de services', 150000) returning id into a_pe;

  -- ==========================================================================
  -- VALORISATIONS : 24 mois d'historique mensuel
  -- ==========================================================================
  -- Sans au moins un relevé autour de M-12, l'indicateur de performance affiche
  -- « Pas encore d'historique ». Une progression régulière et différenciée par
  -- classe donne un chiffre crédible plutôt qu'un pourcentage rond.
  for mois in 0..23 loop
    -- L'immobilier progresse lentement, les OPCVM plus vite, les liquidités pas.
    insert into public.asset_valuations (asset_id, value, valued_at) values
      (a_immo,  round(1800000 / power(1.04, mois / 12.0)), (current_date - (mois || ' months')::interval)::date),
      (a_av,    round(1200000 / power(1.06, mois / 12.0)), (current_date - (mois || ' months')::interval)::date),
      (a_opcvm, round( 750000 / power(1.11, mois / 12.0)), (current_date - (mois || ' months')::interval)::date),
      (a_liq,   350000,                                    (current_date - (mois || ' months')::interval)::date),
      (a_pe,    round( 150000 / power(1.02, mois / 12.0)), (current_date - (mois || ' months')::interval)::date)
    on conflict (asset_id, valued_at) do nothing;
  end loop;

  -- ==========================================================================
  -- RENDEZ-VOUS : R0 passé et terminé, R1 à venir
  -- ==========================================================================
  delete from public.appointments where client_id = cible;

  insert into public.appointments (client_id, type, status, date, duration_minutes, notes) values
    (cible, 'R0', 'termine',  now() - interval '38 days', 60,
     'Audit patrimonial. Situation familiale, actifs détenus, objectifs à cinq ans.'),
    (cible, 'R1', 'confirme', now() + interval '9 days',  90,
     'Présentation de la structuration proposée et des solutions retenues.'),
    (cible, 'revue', 'planifie', now() + interval '95 days', 45,
     'Revue trimestrielle du portefeuille.');

  -- ==========================================================================
  -- AUDIT
  -- ==========================================================================
  delete from public.audits where client_id = cible;

  insert into public.audits (client_id, status, data, created_at, updated_at) values
    (cible, 'termine',
     jsonb_build_object(
       'synthese', 'Patrimoine concentré sur l''immobilier marocain, fiscalité non optimisée.',
       'points', jsonb_build_array(
         'Absence de structure de détention pour l''immobilier locatif',
         'Liquidités excédentaires non rémunérées',
         'Aucun dispositif de transmission en place'
       )
     ),
     now() - interval '35 days', now() - interval '30 days');

  -- ==========================================================================
  -- DOCUMENTS (métadonnées seulement, voir LIMITE CONNUE en tête de fichier)
  -- ==========================================================================
  delete from public.documents where client_id = cible;

  insert into public.documents (client_id, category, name, file_path, file_size, created_at)
  values (cible, 'releves_situation', 'Relevé assurance-vie - juillet 2026', 'placeholder', 284000, now() - interval '12 days')
  returning id into d_id;
  update public.documents set file_path = cible || '/' || d_id || '-releve-av.pdf' where id = d_id;

  insert into public.documents (client_id, category, name, file_path, file_size, created_at)
  values (cible, 'releves_situation', 'Relevé portefeuille OPCVM - juillet 2026', 'placeholder', 196000, now() - interval '12 days')
  returning id into d_id;
  update public.documents set file_path = cible || '/' || d_id || '-releve-opcvm.pdf' where id = d_id;

  insert into public.documents (client_id, category, name, file_path, file_size, created_at)
  values (cible, 'contrats', 'Contrat assurance-vie multisupport - signé', 'placeholder', 1420000, now() - interval '26 days')
  returning id into d_id;
  update public.documents set file_path = cible || '/' || d_id || '-contrat-av.pdf' where id = d_id;

  insert into public.documents (client_id, category, name, file_path, file_size, created_at)
  values (cible, 'reglementaires', 'Lettre de mission Horkos - signée', 'placeholder', 312000, now() - interval '37 days')
  returning id into d_id;
  update public.documents set file_path = cible || '/' || d_id || '-lettre-mission.pdf' where id = d_id;

  insert into public.documents (client_id, category, name, file_path, file_size, created_at)
  values (cible, 'reglementaires', 'Questionnaire profil de risque - signé', 'placeholder', 205000, now() - interval '37 days')
  returning id into d_id;
  update public.documents set file_path = cible || '/' || d_id || '-profil-risque.pdf' where id = d_id;

  insert into public.documents (client_id, category, name, file_path, file_size, created_at)
  values (cible, 'strategie', 'Compte rendu - audit patrimonial', 'placeholder', 468000, now() - interval '30 days')
  returning id into d_id;
  update public.documents set file_path = cible || '/' || d_id || '-cr-audit.pdf' where id = d_id;

  -- ==========================================================================
  -- RECOMMANDATIONS
  -- ==========================================================================
  -- Le catalogue est partagé : on réutilise une fiche existante si elle est
  -- déjà là, pour ne pas empiler des doublons à chaque exécution.
  select id into reco_av from public.recommendations where title = 'Assurance-vie multisupport';
  if reco_av is null then
    insert into public.recommendations (title, category, description, details, is_active) values (
      'Assurance-vie multisupport',
      'Épargne',
      'Une enveloppe souple pour faire travailler un capital sur le moyen terme, avec une fiscalité avantageuse à la sortie.',
      jsonb_build_object(
        'resume', 'Un contrat luxembourgeois multisupport, qui combine la souplesse d''une enveloppe d''épargne et un cadre de protection renforcé pour l''épargnant.',
        'pourquoi', jsonb_build_array(
          'Vos liquidités excédentaires ne rapportent rien aujourd''hui',
          'La fiscalité s''allège nettement après huit ans de détention',
          'Le capital reste disponible à tout moment, sans blocage'
        ),
        'fonctionnement', jsonb_build_array(
          jsonb_build_object('titre', 'Versements', 'texte', 'Libres ou programmés, sans montant imposé après le versement initial.'),
          jsonb_build_object('titre', 'Supports', 'texte', 'Fonds en euros pour la partie sécurisée, unités de compte pour la recherche de rendement. La répartition est arbitrable à tout moment.'),
          jsonb_build_object('titre', 'Sortie', 'texte', 'Rachat partiel ou total, ou sortie en rente. Seuls les gains sont imposés, jamais le capital versé.')
        ),
        'points_attention', jsonb_build_array(
          'Les unités de compte ne garantissent pas le capital investi',
          'L''avantage fiscal suppose une détention d''au moins huit ans',
          'Des frais d''arbitrage s''appliquent au-delà de quatre mouvements par an'
        ),
        'frais', 'Frais d''entrée négociés à 1,5 %. Frais de gestion annuels de 0,8 % sur les unités de compte, 0,6 % sur le fonds en euros. Aucun frais de sortie.'
      ),
      true
    ) returning id into reco_av;
  end if;

  select id into reco_struct from public.recommendations where title = 'Structuration de la succession';
  if reco_struct is null then
    insert into public.recommendations (title, category, description, details, is_active) values (
      'Structuration de la succession',
      'Transmission',
      'Organiser la transmission de l''immobilier locatif avant qu''elle ne s''impose dans l''urgence.',
      jsonb_build_object(
        'resume', 'La détention en nom propre de vos biens locatifs rend la transmission coûteuse et rigide. Une société civile permet de céder des parts progressivement.',
        'pourquoi', jsonb_build_array(
          'Vos trois biens locatifs sont détenus en direct',
          'Une transmission en l''état imposerait une indivision entre vos enfants'
        ),
        'points_attention', jsonb_build_array(
          'La constitution de la société suppose des frais de notaire et d''apport',
          'La gestion comptable devient obligatoire et annuelle'
        )
      ),
      true
    ) returning id into reco_struct;
  end if;

  -- Fiche volontairement sans `details` : elle vérifie que la page détail tient
  -- debout quand l'admin n'a pas encore rédigé le contenu.
  select id into reco_immo from public.recommendations where title = 'Immeuble de bureaux - Casablanca';
  if reco_immo is null then
    insert into public.recommendations (title, category, description, is_active) values (
      'Immeuble de bureaux - Casablanca',
      'Immobilier',
      'Une opportunité d''investissement locatif tertiaire, présentée à un nombre restreint de clients.',
      true
    ) returning id into reco_immo;
  end if;

  delete from public.client_recommendations where client_id = cible;

  insert into public.client_recommendations (client_id, recommendation_id, status, notes, created_at) values
    (cible, reco_av, 'proposee',
     'Je vous propose d''y placer 400 000 MAD de vos liquidités, en gardant six mois de dépenses disponibles sur vos comptes courants.',
     now() - interval '28 days'),
    (cible, reco_struct, 'proposee',
     'À aborder au prochain rendez-vous. Le notaire que nous vous recommanderons connaît bien ce montage.',
     now() - interval '28 days'),
    (cible, reco_immo, 'acceptee', null, now() - interval '20 days');

  raise notice 'Jeu d''essai en place : 5 actifs, % valorisations, 3 rendez-vous, 1 audit, 6 documents, 3 recommandations.',
    (select count(*) from public.asset_valuations v join public.assets a on a.id = v.asset_id where a.client_id = cible);

  -- Les chemins sont affichés ici plutôt que par une requête séparée, qui
  -- aurait exigé de recopier l'adresse une fois de plus.
  raise notice '--- Chemins à alimenter dans le bucket privé "documents" ---';
  for chemin in
    select d.name || '  ->  ' || d.file_path
      from public.documents d
     where d.client_id = cible
     order by d.created_at desc
  loop
    raise notice '%', chemin;
  end loop;
end $$;

-- ============================================================================
-- NETTOYAGE
-- ============================================================================
-- Décommentez et exécutez pour tout retirer. Les recommandations du catalogue
-- ne sont pas supprimées : elles sont partagées et pourraient servir ailleurs.
--
-- >>> REMETTRE LA MÊME ADRESSE QU'EN TÊTE DE FICHIER <<<
--
-- do $$
-- declare cible uuid;
-- begin
--   select id into cible from public.profiles where lower(email) = lower('a-modifier@exemple.com');
--   delete from public.client_recommendations where client_id = cible;
--   delete from public.documents            where client_id = cible;
--   delete from public.audits               where client_id = cible;
--   delete from public.appointments         where client_id = cible;
--   delete from public.asset_valuations     where asset_id in (select id from public.assets where client_id = cible);
--   delete from public.assets               where client_id = cible;
--   raise notice 'Jeu d''essai retiré.';
-- end $$;
