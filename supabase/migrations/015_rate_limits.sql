-- Horkos WM - Limitation de débit (rate limiting) des actions publiques
-- Run this in the Supabase SQL Editor. Safe to re-run.
--
-- Les server actions publiques (contact, rendez-vous, cession, guides, hold de
-- créneau, vérification d'email) sont ouvertes à des visiteurs anonymes et
-- déclenchent des envois d'emails ou des écritures : sans garde-fou, elles sont
-- spammables. Vercel étant « serverless » (chaque requête peut tomber sur une
-- instance neuve), un compteur en mémoire ne sert à rien : le compteur vit donc
-- en base, derrière une fonction `security definer` atomique.
--
-- Fenêtre fixe : pour une clé donnée (action + IP), on compte les appels sur une
-- fenêtre de N secondes ; au-delà de p_max, on refuse jusqu'à expiration.

create table if not exists public.rate_limits (
  bucket text primary key,
  count int not null default 0,
  reset_at timestamptz not null
);

create index if not exists rate_limits_reset_idx on public.rate_limits (reset_at);

-- RLS activée, AUCUNE policy : la table n'est accessible que par la fonction
-- ci-dessous, qui s'exécute en tant que propriétaire.
alter table public.rate_limits enable row level security;

-- Enregistre un appel pour `p_key` et rend true s'il est autorisé, false s'il
-- dépasse `p_max` sur la fenêtre de `p_window_seconds` secondes.
create or replace function public.rate_limit_hit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cur public.rate_limits;
begin
  if p_key is null or p_max <= 0 or p_window_seconds <= 0 then
    return true;  -- entrée invalide : ne bloque pas (fail-open)
  end if;

  -- Sérialise les appels concurrents pour la même clé.
  perform pg_advisory_xact_lock(hashtext('rl-' || p_key));

  -- Purge opportuniste des fenêtres expirées : la table reste petite sans cron.
  delete from public.rate_limits where reset_at <= now();

  select * into cur from public.rate_limits where bucket = p_key;

  if cur.bucket is null then
    insert into public.rate_limits (bucket, count, reset_at)
    values (p_key, 1, now() + make_interval(secs => p_window_seconds));
    return true;
  end if;

  -- La fenêtre a expiré : on repart à un.
  if cur.reset_at <= now() then
    update public.rate_limits
       set count = 1, reset_at = now() + make_interval(secs => p_window_seconds)
     where bucket = p_key;
    return true;
  end if;

  if cur.count >= p_max then
    return false;
  end if;

  update public.rate_limits set count = count + 1 where bucket = p_key;
  return true;
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated;

do $$
begin
  if to_regprocedure('public.rate_limit_hit(text, int, int)') is null then
    raise exception 'rate_limit_hit n''a pas été créée.';
  end if;
  raise notice 'Rate limiting en place (table rate_limits + rate_limit_hit).';
end $$;
