# Horkos WM - Instructions projet

## Sécurité AMMC (circulaire 01/20)

Ce projet est une plateforme pour un cabinet CIF régulé par l'AMMC au Maroc. Les mesures de sécurité suivantes DOIVENT être implémentées. Cocher au fur et à mesure.

### Déjà en place
- [x] RLS (Row Level Security) sur toutes les tables — chaque client ne voit que ses données
- [x] Table `audit_logs` pour la traçabilité (qui a consulté quoi, quand)
- [x] Auth avec 3 rôles (client, conseiller, admin) + middleware de protection des routes

### À implémenter (Sprint 4-5)
- [ ] **MFA obligatoire pour admin/conseiller** — Activer dans Supabase Auth > MFA, puis forcer l'enrollment côté code pour les rôles admin et conseiller. Les clients peuvent l'activer optionnellement.
- [ ] **Logging des accès** — À chaque consultation de données sensibles (patrimoine, documents, audits), insérer une entrée dans `audit_logs` avec user_id, action, entity_type, entity_id, ip_address. Implémenter via des server actions ou des API routes.

### À implémenter (Sprint 8 - Polish)
- [x] **Cloudflare WAF** — Mettre Cloudflare devant le domaine horkos-wm.com (plan gratuit). Configurer le DNS pour pointer vers Vercel via Cloudflare. Cela donne : pare-feu applicatif (WAF), protection anti-DDoS, cache CDN. → procédure pas-à-pas dans `docs/securite.md` §6 (action dashboard).
- [x] **Rate limiting** — Limiter les tentatives de connexion (max 5/min par IP). Limiter les soumissions de formulaires publics (contact, partenariat, cession). → `src/lib/rate-limit.ts` (Postgres, migration 015) ; login staff via server action `connexion/equipe/actions.ts`.
- [x] **Validation des inputs** — Valider côté serveur tous les formulaires avec zod. Ne jamais faire confiance aux données client. → toutes les server actions qui prennent une saisie.
- [x] **Headers de sécurité** — Configurer dans next.config.ts : Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security. → `next.config.ts` (`securityHeaders`, CSP statique sans nonce).
- [ ] **Sauvegardes** — Vérifier que le PITR (Point-in-Time Recovery) est activé sur Supabase Pro. Documenter la procédure de restauration. → procédure rédigée dans `docs/securite.md` §7 ; reste à activer le PITR (action dashboard).

### Document PSSI (post-livraison)
Un document "Politique de Sécurité des Systèmes d'Information" doit être rédigé pour le dossier AMMC. Il formalise toutes les mesures ci-dessus. Ce document est à produire par un consultant sécurité ou le consultant qui monte le dossier CIF. Il doit couvrir :
- Architecture technique et hébergement
- Gestion des accès et authentification
- Chiffrement (au repos et en transit)
- Traçabilité et journaux d'accès
- Sauvegardes et plan de reprise
- Gestion des incidents

## Conventions techniques

- **Stack** : Next.js 15 (App Router) + Supabase + Tailwind v4 + shadcn/ui
- **Langue UI** : Français avec accents (é, è, ê, à, ù, etc.) — ne jamais écrire sans accents
- **Fonts** : Cormorant Garamond (headings via font-heading) + Inter (body via font-sans)
- **Couleurs** : ink #0B1A2E, bronze #A9784F, cream #F8F4EC, cream-deep #EFE7D8, charcoal #3B3A36, warm-grey #7A7468
- **Route groups** : (public) pour le site, (client) pour l'espace client, (admin) pour le back-office
- **Ne pas push** sans confirmation explicite de l'utilisateur
