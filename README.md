# Horkos WM

Plateforme du cabinet Horkos Wealth Management (conseil en investissements financiers, Maroc) : site public, espace client et back-office conseiller/admin.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, TypeScript
- **Supabase** : Postgres + RLS, Auth (code par email, Google/Microsoft, mot de passe pour l'équipe), Storage
- **Tailwind v4** + shadcn/ui, GSAP pour les animations
- **Resend** (emails), **Google Calendar** (rendez-vous), **Umami** (analytics auto-hébergé)
- Hébergement **Vercel** (cron horaire des rappels dans `vercel.json`)

Route groups : `(public)` site, `(client)` espace client `/espace`, `(admin)` back-office `/admin`.

## Démarrer

```bash
cp .env.example .env.local   # puis remplir (voir les commentaires du fichier)
npm install
npm run dev                  # http://localhost:3000
```

### Base de données

Le schéma initial est dans `supabase/schema.sql` ; les évolutions sont des migrations numérotées dans `supabase/migrations/`, **à exécuter à la main dans le SQL Editor de Supabase, dans l'ordre**. Chaque fichier est idempotent (`if not exists`, `create or replace`) et peut être rejoué sans risque.

Pour vérifier qu'une migration est passée : la plupart créent une table ou une fonction nommée en tête de fichier ; une requête `select * from pg_proc where proname = '…'` ou l'onglet Table Editor suffit. La migration `015_rate_limits.sql` est indispensable en production : sans elle, la limitation de débit est **fail-open** (voir `docs/securite.md`).

Auth (templates d'email, SMTP, fournisseurs OAuth, URL autorisées) : `docs/auth-setup.md`.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | `tsc --noEmit` **puis** `next build` — toujours passer par ce script, `next build` seul ne vérifie plus les types (voir `next.config.ts`) |
| `npm run lint` | ESLint |
| `npm test` | tests unitaires et de composants (Vitest) |
| `npm run test:e2e` | parcours de bout en bout (Playwright, Chromium desktop + mobile) — voir `TESTING.md` |

## Déploiement

1. Projet Vercel relié au dépôt, branche `main` → production.
2. Variables d'environnement : toutes celles de `.env.example`, en Production et Preview (`NEXT_PUBLIC_SITE_URL` = `https://horkos-wm.com` en production).
3. Domaine `horkos-wm.com` ajouté dans Vercel, DNS géré par Cloudflare (WAF, anti-DDoS) : procédure dans `docs/securite.md`.
4. Supabase : URL du site et URL de redirection `/auth/callback` dans Auth > URL Configuration ; PITR activé sur le plan Pro.
5. Le cron `/api/cron/rappels` est déclaré dans `vercel.json` ; Vercel l'appelle chaque heure avec `CRON_SECRET`.

## Sécurité

Le cabinet est régulé par l'AMMC (circulaire 01/20). Les mesures en place et celles qui relèvent des tableaux de bord (Cloudflare, sauvegardes, limites Supabase Auth) sont décrites dans `docs/securite.md` ; la checklist de suivi est dans `CLAUDE.md`.

## Documentation

- `docs/plan-horkos-wm.md` — plan de projet et sprints
- `docs/auth-setup.md` — configuration Supabase Auth
- `docs/securite.md` — mesures de sécurité, Cloudflare, sauvegardes et restauration
- `TESTING.md` — stratégie de test et recette manuelle
