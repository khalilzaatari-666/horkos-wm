# Horkos WM - Plateforme Wealth Management

## Context

Client: cabinet de gestion de patrimoine marocain (Horkos Wealth Management, horkos-wm.com).
Objectif: plateforme complete (site public + espace client + back-office admin) operationnelle fin aout / debut septembre 2026.
Source: mockup HTML interactif (horkos.html, 2436 lignes, SPA no-code) + Excel de decoupage technique (sprints.xlsx, 46 fonctionnalites, ~43 jours estimes).

---

## Analyse du mockup vs Excel

### Ce que le mockup couvre bien
Le mockup est **tres complet et bien pense**. Il definit clairement:
- **Design system**: Cormorant Garamond (headings) + Inter (body), palette ink/bronze/cream, style premium
- **15+ vues** fonctionnelles avec contenus reels en francais
- **Formulaires detailles** (questionnaire RDV, cession d'actif, partenariat avec 5 types de partenaires)
- **Espace client** avec sidebar (dashboard, accompagnement R0/R1/R2, patrimoine, cession, coffre-fort)
- **Back-office** avec sidebar (dashboard, insights, utilisateurs, conseillers, leads, recommandations, dossiers, calendrier)
- **UX/interactions**: dropdowns nav, step nav avec etats (done/active), expandable cards, tabs, toggles

### Ecarts mockup vs Excel
| Fonctionnalite Excel | Presence mockup | Risque |
|---|---|---|
| Chat conseiller (2j client + 1j admin) | CSS present (.chat-card, .bubble) mais pas visible dans flow principal | Moyen - besoin de clarifier le scope |
| Article detail page | Seulement la liste | Faible - standard |
| FAQ dynamique (admin CRUD) | FAQ presente sur home mais pas d'admin | Faible |
| Gestion contacts (admin) | Non mockee | Faible - CRUD standard |
| Soumissions actifs (admin) | Non mockee | Faible - CRUD standard |
| Soumissions partenariat (admin) | Non mockee | Faible - CRUD standard |
| Historique guides email (admin) | Non mockee | Faible - liste simple |
| Gestion audits patrimoniaux (admin) | Non mockee | Moyen - generation PDF |

### Points forts du mockup
1. **Architecture de l'information** tres coherente - le parcours R0 (audit) -> R1 (strategie) -> R2 (gouvernance) est bien pense
2. **Formulaires riches** avec des options metier precises (types d'actifs, motifs de cession, categories de partenaires)
3. **Back-office** deja bien structure avec KPIs, funnel, alertes, performance conseillers
4. **Coffre-fort documentaire** bien organise par categories

### Points d'attention
1. Le mockup est un SPA monolithique avec `showView()` - tout est dans un seul fichier HTML avec inline CSS. Il faut tout decomposer en composants React.
2. Le `contenteditable` et les `block-ctrl` sont du tooling pour le client (edition no-code) - a ignorer.
3. Pas de maquette mobile detaillee - juste des media queries basiques.
4. Pas de maquette pour les etats vides, loading, erreurs.

---

## Architecture technique

### Stack
- **Next.js 15** (App Router) - SSR/SSG pour le site public, CSR pour espace client/admin
- **Supabase** - Auth (3 roles), PostgreSQL, Storage (PDFs/docs), Realtime (chat)
- **Tailwind CSS + shadcn/ui** - respecter la palette du mockup via theme custom
- **Vercel** - hosting (recommandation du client)
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

## Planning par sprints

### Sprint 0 - Setup & Fondations (3 jours) — 25-29 juillet
- Init projet Next.js 15 + Tailwind + shadcn/ui
- Theme custom (palette ink/bronze/cream du mockup)
- Supabase project + schema DB initial
- Auth (inscription, connexion, 3 roles)
- Layout: Header public avec nav/dropdowns, Footer
- Deploy Vercel (CI/CD)

### Sprint 1 - Site Public: Pages statiques (4 jours) — 30 juil - 4 aout
- Accueil (hero, besoins grid, methode, philosophie, FAQ, trust)
- Notre approche
- Notre modele (frais, 3 etapes, equation)
- Nos produits (catalogue expandable)
- Structuration patrimoniale (process, services, cas d'usage apport)
- Reseau de professionnels + questionnaire partenariat
- Cas d'usage (3 cas expandables)
- Footer complet

### Sprint 2 - Site Public: Pages dynamiques + Formulaires (3 jours) — 5-7 aout
- Questionnaire "Prendre RDV" (4 etapes)
- Articles: liste + page detail
- Guides: liste + formulaire email + envoi via Resend
- Evenements: liste
- Formulaire soumission actifs (page publique)
- SEO: meta tags, sitemap, structured data

### Sprint 3 - Espace Client: Core (5 jours) — 8-14 aout
- Layout espace client (sidebar + main)
- Dashboard (KPIs, repartition patrimoine, a suivre)
- Mon accompagnement (step nav R0/R1/R2, RDV a venir/passes)
- Mon patrimoine (repartition, audit card, docs par categorie)
- Coffre-fort documentaire (4 categories, download)
- Ceder un actif (formulaire complet)
- Recommandations hub + page detail produit

### Sprint 4 - Espace Client: Features avancees (4 jours) — 15-20 aout
- Chat client/conseiller (Supabase Realtime)
- Telecharger rapport audit (PDF generation)
- Notifications email (RDV confirme, nouveau document, etc.)
- Integration analytics (tracking visiteurs)

### Sprint 5 - Back-Office: Core (5 jours) — 21-27 aout
- Layout admin (sidebar + topbar)
- Dashboard (KPIs, funnel, suivi recos, alertes, perf conseillers, activite recente)
- Insights (visiteurs, inscrits, guides, taux RDV, contenus consultes)
- Gestion utilisateurs (table, filtres, toggle acces)
- Gestion conseillers (table, ajout)
- Leads telephone (table, statuts, export CSV)

### Sprint 6 - Back-Office: CRUD & Gestion (5 jours) — 28 aout - 3 sept
- Recommandations: catalogue + detail + CRUD
- Dossiers de structuration: CRUD
- Calendrier RDV (vue semaine)
- Gestion audits patrimoniaux (creation + PDF)
- Gestion documents "Mon patrimoine" (par client, par categorie)

### Sprint 7 - Back-Office: Contenu & Finitions (3 jours) — 4-8 sept
- CRUD Articles de blog
- CRUD Guides + historique envois email
- CRUD Evenements
- CRUD FAQs
- Gestion contacts + soumissions actifs + soumissions partenariat
- Messagerie cote admin/conseiller

### Sprint 8 - Polish & QA (3 jours) — 9-11 sept
- Responsive mobile (toutes les pages)
- Etats vides, loading, erreurs
- Tests end-to-end critiques
- Performance (images, lazy loading, caching)
- Securite: validation inputs, RBAC, rate limiting
- Deploy final + domaine horkos-wm.com

---

## Resume

| | Jours | Dates estimees |
|---|:---:|---|
| Sprint 0 - Setup | 3 | 25-29 juil |
| Sprint 1 - Public statique | 4 | 30 juil - 4 aout |
| Sprint 2 - Public dynamique | 3 | 5-7 aout |
| Sprint 3 - Espace Client core | 5 | 8-14 aout |
| Sprint 4 - Client avance | 4 | 15-20 aout |
| Sprint 5 - Admin core | 5 | 21-27 aout |
| Sprint 6 - Admin CRUD | 5 | 28 aout - 3 sept |
| Sprint 7 - Admin contenu | 3 | 4-8 sept |
| Sprint 8 - Polish & QA | 3 | 9-11 sept |
| **Total** | **35** | **~7 semaines** |

**Jalon cle**: fin aout (Sprint 5) = site public + espace client operationnels.

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
