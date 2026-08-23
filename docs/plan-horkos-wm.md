# Horkos WM - Plateforme Wealth Management

## Context

Client: cabinet de gestion de patrimoine marocain (Horkos Wealth Management, horkos-wm.com).
Objectif: plateforme complete (site public + espace client + back-office admin) operationnelle fin aout / debut septembre 2026.
Source: mockup HTML interactif (horkos.html, 2436 lignes, SPA no-code) + Excel de decoupage technique (sprints.xlsx, 46 fonctionnalites, ~43 jours estimes).

---

## Architecture technique

### Stack
- **Next.js 15** (App Router) - SSR/SSG pour le site public, CSR pour espace client/admin
- **Supabase** - Auth (3 roles), PostgreSQL, Storage (PDFs/docs), Realtime (chat)
- **Tailwind CSS v4 + shadcn/ui** - respecter la palette du mockup via theme custom
- **Vercel** - hosting
- **Resend** - emails transactionnels (guides, notifications)
- **Umami** (self-hosted) - analytics (pour la page Insights)

### Structure du projet
```
horkos/
  src/
    app/
      (public)/           # Site public (SSG/SSR)
        page.tsx           # Accueil
        contact/
        cabinet/
          approche/
          modele/
          produits/
        conseil/
          structuration/
          reseau/
          cas-usage/
        ressources/
          articles/
          guides/
          evenements/
        questionnaire/
      (client)/            # Espace client (auth required, role: client)
        espace/
          page.tsx         # Dashboard
          accompagnement/
          patrimoine/
          ceder/
          coffre/
          recommandations/
      (admin)/             # Back-office (auth required, role: admin/conseiller)
        admin/
          page.tsx         # Dashboard
          insights/
          utilisateurs/
          conseillers/
          leads/
          recommandations/
          dossiers/
          calendrier/
          articles/
          guides/
          evenements/
          faq/
          contacts/
          soumissions/
    components/
      ui/                  # shadcn/ui components
      layout/              # Header, Footer, Sidebar
      public/              # Composants site public
      client/              # Composants espace client
      admin/               # Composants back-office
    lib/
      supabase/            # Client, auth helpers, types
      email/               # Resend integration
      pdf/                 # PDF generation (audits, rapports)
```

### Design system
- Fonts: Cormorant Garamond (headings) + Inter (body)
- Colors: ink #0B1A2E, bronze #A9784F, cream #F8F4EC, cream-deep #EFE7D8, charcoal #3B3A36, warm-grey #7A7468

### Schema DB (tables principales)
- `profiles` (extends auth.users) - role, nom, telephone, patrimoine
- `advisors` - conseillers avec portefeuille
- `appointments` - RDV (R0, R1, R2, revues)
- `audits` - audits patrimoniaux avec data JSON
- `assets` - actifs des clients
- `recommendations` - catalogue de recommandations
- `client_recommendations` - recommandations attribuees
- `documents` - coffre-fort (metadata + storage ref)
- `messages` - chat client/conseiller
- `leads` - leads telephone
- `contacts` - soumissions formulaire contact
- `asset_submissions` - demandes de cession
- `partner_submissions` - questionnaire partenariat
- `articles`, `guides`, `events` - contenu CMS
- `guide_downloads` - historique envois guides
- `faqs` - questions/reponses

---

## Planning par sprints (ordonne par priorite de production)

### Phase 1 — Site public

#### Sprint 0 - Setup & Fondations (3 jours) — Lun 28 – Mer 30 juillet
- [x] Init projet Next.js 15 + Tailwind v4 + shadcn/ui
- [x] Theme custom (palette ink/bronze/cream du mockup)
- [x] Structure projet (route groups, folders)
- [x] Layout: Header public avec nav/dropdowns, Footer
- [x] Supabase project + schema DB initial
- [x] Auth (inscription, connexion, 3 roles)
- [x] Deploy Vercel (CI/CD)

#### Sprint 1 - Site Public: Pages statiques (4 jours) — Jeu 31 juil – Mar 5 aout
- Accueil (hero, besoins grid, methode, philosophie, FAQ, trust)
- Notre approche
- Notre modele (frais, 3 etapes, equation)
- Nos produits (catalogue expandable)
- Structuration patrimoniale (process, services, cas d'usage apport)
- Reseau de professionnels + questionnaire partenariat
- Cas d'usage (3 cas expandables)

#### Sprint 2 - Site Public: Pages dynamiques + Formulaires (3 jours) — Mer 6 – Ven 8 aout
- Questionnaire "Prendre RDV" (4 etapes)
- Articles: liste + page detail
- Guides: liste + formulaire email + envoi via Resend
- Evenements: liste
- Formulaire soumission actifs (page publique)
- SEO: meta tags, sitemap, structured data

#### Marge (2 jours) — Lun 11 – Mar 12 aout
> **Jalon 1 — 12 aout : Site public en ligne**

---

### Phase 2 — Espace client & Administration essentielle

#### Sprint 3 - Espace Client: Core (5 jours) — Mer 13 – Mar 19 aout
- Layout espace client (sidebar + main)
- Dashboard (KPIs, repartition patrimoine, a suivre)
- Mon accompagnement (step nav R0/R1/R2, RDV a venir/passes)
- Mon patrimoine (repartition, audit card, docs par categorie)
- Coffre-fort documentaire (4 categories, download)
- Ceder un actif (formulaire complet)
- Recommandations hub + page detail produit

#### Sprint 4 - Back-Office: Core (5 jours) — Mer 20 – Mar 26 aout
- Layout admin (sidebar + topbar)
- Dashboard (KPIs, funnel, suivi recos, alertes, perf conseillers, activite recente)
- Insights (visiteurs, inscrits, guides, taux RDV, contenus consultes)
- Gestion utilisateurs (table, filtres, toggle acces)
- Gestion conseillers (table, ajout)
- Leads telephone (table, statuts, export CSV)

#### Marge (2 jours) — Mer 27 – Jeu 28 aout
> **Jalon 2 — 28 aout : Plateforme lancable (site + client + admin essentiel)**

---

### Phase 3 — Fonctionnalites avancees & Contenu

#### Sprint 5 - Espace Client: Features avancees (4 jours) — Ven 29 aout – Mer 3 sept
- Chat client/conseiller (Supabase Realtime)
- Telecharger rapport audit (PDF generation)
- Notifications email (RDV confirme, nouveau document, etc.)
- Integration analytics (tracking visiteurs)

#### Sprint 6 - Back-Office: CRUD & Gestion (5 jours) — Jeu 4 – Mer 10 sept
- Recommandations: catalogue + detail + CRUD
- Dossiers de structuration: CRUD
- Calendrier RDV (vue semaine)
- Gestion audits patrimoniaux (creation + PDF)
- Gestion documents "Mon patrimoine" (par client, par categorie)

#### Sprint 7 - Back-Office: Contenu (3 jours) — Jeu 11 – Lun 15 sept
- CRUD Articles de blog
- CRUD Guides + historique envois email
- CRUD Evenements
- CRUD FAQs
- Gestion contacts + soumissions actifs + soumissions partenariat
- Messagerie cote admin/conseiller

---

### Phase 4 — Finitions & mise en production

#### Sprint 8 - Polish & QA (3 jours) — Mar 16 – Jeu 18 sept
- Responsive mobile (toutes les pages)
- Etats vides, loading, erreurs
- Tests end-to-end critiques
- Performance (images, lazy loading, caching)
- Securite: validation inputs, RBAC, rate limiting
- Deploy final + domaine horkos-wm.com

#### Marge (2 jours) — Ven 19 – Lun 22 sept
> **Jalon 3 — 22 septembre : Plateforme complete**

---

## Resume

| Phase | Sprint | Jours | Calendrier |
|---|---|:---:|---|
| Site public | Sprint 0 - Setup | 3 | 28-30 juil |
| | Sprint 1 - Pages statiques | 4 | 31 juil - 5 aout |
| | Sprint 2 - Pages dynamiques | 3 | 6-8 aout |
| | Marge | 2 | 11-12 aout |
| Client + Admin | Sprint 3 - Espace client | 5 | 13-19 aout |
| | Sprint 4 - Admin core | 5 | 20-26 aout |
| | Marge | 2 | 27-28 aout |
| Avance | Sprint 5 - Client avance | 4 | 29 aout - 3 sept |
| | Sprint 6 - Admin CRUD | 5 | 4-10 sept |
| | Sprint 7 - Admin contenu | 3 | 11-15 sept |
| Finitions | Sprint 8 - Polish & QA | 3 | 16-18 sept |
| | Marge | 2 | 19-22 sept |
| **Total** | | **41** | **~8,5 semaines** |

**Jalon cle**: 28 aout = site public + espace client + admin essentiel (plateforme lancable).

---

## Couts recurrents

| Service | Plan | Mensuel | Annuel |
|---|---|---:|---:|
| Vercel | Pro | 200 MAD | 2 400 MAD |
| Supabase | Pro | 250 MAD | 3 000 MAD |
| Google Workspace (2 users) | Business Starter | 144 MAD | 1 728 MAD |
| Domaine | — | — | 120 MAD |
| Resend | Gratuit | 0 | 0 |
| Umami (analytics) | Self-hosted | 0 | 0 |
| **Total** | | **~594 MAD** | **~7 248 MAD** |
