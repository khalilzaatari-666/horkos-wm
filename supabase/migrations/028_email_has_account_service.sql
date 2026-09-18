-- `email_has_account` réservée à la clé de service
--
-- La fonction (migration 013) était exécutable par `anon` : la server action
-- qui l'appelle est plafonnée par IP, mais la RPC elle-même ne l'était pas -
-- un script muni de la clé anon (publique) pouvait énumérer sans limite les
-- adresses ayant un espace client. Chez un cabinet de gestion de patrimoine,
-- la liste des clients est en soi une donnée sensible.
--
-- Les deux appelants (`rendez-vous/actions.ts`) sont des server actions : ils
-- passent désormais par le client à clé de service, et la fonction n'est plus
-- accessible qu'à lui.

revoke execute on function public.email_has_account(text) from public, anon, authenticated;
grant execute on function public.email_has_account(text) to service_role;

do $$
begin
  if has_function_privilege('anon', 'public.email_has_account(text)', 'execute') then
    raise exception 'email_has_account reste exécutable par anon.';
  end if;
  raise notice 'email_has_account réservée à service_role.';
end $$;
