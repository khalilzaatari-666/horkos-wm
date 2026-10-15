# Graph Report - horkos  (2026-10-13)

## Corpus Check
- 472 files · ~494,509 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .woff2 6, .ttf 4, (none) 1)

## Summary
- 2090 nodes · 6631 edges · 88 communities (84 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.85)
- Token cost: 94,797 input · 0 output

## Community Hubs (Navigation)
- Client Space Pages
- Supabase Auth & Routing
- Client Booking Actions
- E2E Tests & Scripts
- Client Dossier Pages
- Public Content Listings
- App Shells & Layouts
- Transactional Emails
- Follow-up Scheduling
- Article & Category Admin
- Security Headers & Config
- Landing Page & Motion
- Audit Management
- Partnership Form
- Booking Core & Calendar
- Intake & Public Booking
- Reminders
- Content Editor Forms
- Client Overview & Wealth
- Appointment Constants
- Admin Content Actions
- Recommendations Admin
- Weekly Calendar View
- Admin Dashboard Activity
- Public Forms & SMS
- Gated Article & Guide Pages
- Weekly Schedule Admin
- Requests Inbox
- Reader Gate Actions
- Audit Export Schema
- Audit Fiche Form
- Staff User Management
- Financial Calculations
- Runtime Dependencies
- Contact & Exchange Requests
- Audit Fiche Actions
- shadcn Config
- Client Dossier Export
- Recommendation Assignment
- Lint & Package Config
- UI Primitives
- XLSX Generator
- Audit Fiche & Follow-up Pages
- Legal Pages & Navigation
- Audit Workbook Sheets
- Events Admin
- Demo Content Seeder
- Advisor Stats
- Structuring & Use Cases
- TypeScript Config
- Dev Dependencies
- PDF Preview & Reader
- Document Management
- Model & Network Pages
- Loading Skeletons
- Recommendation Categories
- Auth Split Layouts
- Audit Fiche Read View
- Appointment Detail Modal
- Phone Input & Countries
- AMMC Security Controls
- Project Plan & Quote
- Needs Icons
- Security Procedures & Templates
- Contact Requests Status
- Products Catalogue
- Input Validation Helpers
- npm Scripts
- Partner Requests Status
- Auth & Project Docs
- Request Row Tests
- Audit Create Form
- Error Boundaries
- Asset Sale Form
- ICS Calendar Export
- Contact & Booking Pages
- Client Vault Documents
- Fonts & Root Layout
- Public Booking Tests
- Booking Test Strategy
- Requests Tabs
- Audit Report Download
- Reduced Motion Hook
- Typography & Design
- Vercel Cron Config
- Misc 86

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 201 edges
2. `next` - 168 edges
3. `AnimateIn()` - 123 edges
4. `react` - 99 edges
5. `requireStaff()` - 59 edges
6. `formatDateLong()` - 43 edges
7. `param()` - 43 edges
8. `trier()` - 43 edges
9. `FiltresListe()` - 42 edges
10. `pick()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `Design conventions (Zodiak/Switzer, ink/bronze/cream palette, French UI)` --semantically_similar_to--> `Initial design system (Cormorant Garamond + Inter)`  [INFERRED] [semantically similar]
  CLAUDE.md → docs/plan-horkos-wm.md
- `Hosting architecture (Vercel, Supabase Pro, Cloudflare, Resend, Google Workspace, Umami)` --semantically_similar_to--> `Tech stack (Next.js 16, Supabase, Tailwind v4, Resend, Google Calendar, Umami, Vercel)`  [INFERRED] [semantically similar]
  docs/securite.md → README.md
- `SQL booking tests (Postgres as source of truth)` --conceptually_related_to--> `Anon key = attack surface (security rules must live in DB)`  [INFERRED]
  TESTING.md → docs/securite.md
- `Sprint plan (Sprints 0-8, 3 milestones, 41 days)` --conceptually_related_to--> `AMMC security checklist (sprint tracking)`  [INFERRED]
  docs/plan-horkos-wm.md → CLAUDE.md
- `Sécurité - measures and procedures (AMMC working doc)` --references--> `PSSI - Politique de Sécurité des Systèmes d'Information`  [EXTRACTED]
  docs/securite.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AMMC security controls documented for the PSSI** — claude_ammc_circulaire_01_20, docs_securite_rbac_rls, docs_securite_rate_limiting, docs_securite_security_headers, docs_securite_audit_logs, docs_securite_backups_restore, docs_securite_cloudflare_procedure, claude_staff_mfa, claude_pssi_document [EXTRACTED 1.00]
- **Staff onboarding and access flow** — supabase_email_templates_invitation_equipe, supabase_email_templates_acces_equipe, docs_securite_role_assignment_lock, claude_staff_mfa, docs_securite_rate_limiting [INFERRED 0.85]
- **Layered booking test strategy** — testing_vitest_unit_tests, testing_playwright_e2e, testing_sql_booking_tests, testing_manual_acceptance [EXTRACTED 1.00]

## Communities (88 total, 4 thin omitted)

### Community 0 - "Client Space Pages"
Cohesion: 0.11
Nodes (70): DocumentOpenButton(), ClientDocumentsPage(), formatSize(), metadata, RUBRIQUES, TRIS, ClientRecommandationsPage(), ClientSoumissionsPage() (+62 more)

### Community 1 - "Supabase Auth & Routing"
Cohesion: 0.06
Nodes (48): @supabase/ssr, @supabase/supabase-js, AdminLayout(), GET(), ALLOWED, GET(), ConnexionEquipeState, seConnecterEquipe() (+40 more)

### Community 2 - "Client Booking Actions"
Cohesion: 0.05
Nodes (54): ParcoursBar(), bookEspaceSlot(), EspaceBookingState, schema, booked, IDLE, liste(), mockBook (+46 more)

### Community 3 - "E2E Tests & Scripts"
Cohesion: 0.08
Nodes (30): envLocal(), rateLimitRpcExists(), @pdf-lib/fontkit, @playwright/test, @vitejs/plugin-react-swc, [src, dest], colonnes(), dateFmt (+22 more)

### Community 4 - "Client Dossier Pages"
Cohesion: 0.10
Nodes (43): AccompagnementPage(), Appointment, metadata, RendezVousGroup(), STATUS_LABELS, CederPage(), DossierLigne(), metadata (+35 more)

### Community 5 - "Public Content Listings"
Cohesion: 0.09
Nodes (40): FaqPublique, Publication, HomePage(), metadata, revalidate, ArticlesPage(), Cover(), Meta() (+32 more)

### Community 6 - "App Shells & Layouts"
Cohesion: 0.08
Nodes (34): lenis, ClientLayout(), PublicLayout(), AdminSection, adminSections, isAdminSectionActive(), AdminProfile, AdminShell() (+26 more)

### Community 7 - "Transactional Emails"
Cohesion: 0.14
Nodes (34): resend, server-only, sendAccountLink(), AppointmentEmailInput, dateFmt, formatSlot(), Motif, sendCancellationEmail() (+26 more)

### Community 8 - "Follow-up Scheduling"
Cohesion: 0.10
Nodes (44): annulerRappel(), autoriser(), Conflit, dansLesHoraires(), deplacerRendezVous(), Disponibilite, heureFmt, inscrireAuCalendrier() (+36 more)

### Community 9 - "Article & Category Admin"
Cohesion: 0.09
Nodes (39): createArticle(), parse(), revalidate(), schema, updateArticle(), enregistrerCategorie(), nom, revalidate() (+31 more)

### Community 10 - "Security Headers & Config"
Cohesion: 0.05
Nodes (17): csp, nextConfig, securityHeaders, supabaseHost, umamiOrigin, next, ContenuLayout(), metadata (+9 more)

### Community 11 - "Landing Page & Motion"
Cohesion: 0.12
Nodes (30): gsap, lucide-react, react, ApprochePage(), fragments, philosophie, principes, ENGAGEMENTS (+22 more)

### Community 12 - "Audit Management"
Cohesion: 0.09
Nodes (31): AUDIT_STATUS, auditSchema, AuditUrlState, createAudit(), deleteAudit(), getStaffAuditUrl(), logAccess(), revalidate() (+23 more)

### Community 13 - "Partnership Form"
Cohesion: 0.09
Nodes (30): commun, Donnees, formaterDetails(), mad, PartenariatState, pct(), schema, submitPartenariat() (+22 more)

### Community 14 - "Booking Core & Calendar"
Cohesion: 0.09
Nodes (32): google-auth-library, fetchAvailability(), annulerEtPrevenir(), bookAndNotify(), BookAndNotifyInput, BookSlotResult, occupationsAdmin(), participants() (+24 more)

### Community 15 - "Intake & Public Booking"
Cohesion: 0.11
Nodes (33): completerProfil(), IntakeState, schema, initialState, Option(), Section(), adresseDejaInscrite(), emailHasAccount() (+25 more)

### Community 16 - "Reminders"
Cohesion: 0.10
Nodes (28): vitest, poserRappel(), r0Ouvert(), relanceOuverte(), apercuFmt, initialState, RappelForm(), poser() (+20 more)

### Community 17 - "Content Editor Forms"
Cohesion: 0.12
Nodes (23): setAvatar(), ArticleForm(), ArticleInitial, EMPTY, initialState, metadata, PageProps, CategorieSelect() (+15 more)

### Community 18 - "Client Overview & Wealth"
Cohesion: 0.18
Nodes (29): AuditRowActions(), ClientOverviewPage(), metadata, ClientPatrimoinePage(), metadata, TRIS_ACTIF, TRIS_AUDIT, EspacePage() (+21 more)

### Community 19 - "Appointment Constants"
Cohesion: 0.13
Nodes (29): DEFAULTS, MAX_ROWS, MODE_LABELS, MODES, Periode, PERIODE_LABELS, PERIODES, RDV_STATUTS (+21 more)

### Community 20 - "Admin Content Actions"
Cohesion: 0.11
Nodes (23): marquerDemandeTraitee(), setPhone(), deleteDocument(), deleteArticle(), setArticlePublished(), ArticleEditPage(), ETATS, metadata (+15 more)

### Community 21 - "Recommendations Admin"
Cohesion: 0.11
Nodes (24): createRecommendation(), deleteRecommendation(), parse(), readDetails(), schema, toggleRecommendationActive(), updateRecommendation(), RecommendationCreate() (+16 more)

### Community 22 - "Weekly Calendar View"
Cohesion: 0.13
Nodes (23): RdvDetailData, BlocSemaine, Calendrier(), JourSemaine, plafond(), planche(), bloc(), detail() (+15 more)

### Community 23 - "Admin Dashboard Activity"
Cohesion: 0.14
Nodes (26): GrapheActivite(), Serie, SERIE_INSCRIPTIONS, SERIE_RENDEZ_VOUS, TuileActivite(), TuileTaux(), Variation(), AdminDashboardPage() (+18 more)

### Community 24 - "Public Forms & SMS"
Cohesion: 0.19
Nodes (28): submitAsset(), IntakeForm(), PartenariatForm(), ContactForm(), RdvForm(), renvoyerCode(), sendCode(), AssetForm() (+20 more)

### Community 25 - "Gated Article & Guide Pages"
Cohesion: 0.14
Nodes (25): ArticlePage(), generateMetadata(), PageProps, Extrait(), FilAriane(), generateMetadata(), GuidePage(), Meta() (+17 more)

### Community 26 - "Weekly Schedule Admin"
Cohesion: 0.17
Nodes (25): AdminSemainePage(), Demande, fullName(), JOURS_COURTS, libelleJour(), metadata, one(), Personne (+17 more)

### Community 27 - "Requests Inbox"
Cohesion: 0.11
Nodes (22): metadata, ORDRES, statutDe(), STATUTS_CONNUS, apercu(), DemandeLigne(), DemandeLigneData, BADGES (+14 more)

### Community 28 - "Reader Gate Actions"
Cohesion: 0.13
Nodes (23): schema, schema, Admin, codeSchema, DemandeCode, demanderCode(), demandeSchema, leadSchema (+15 more)

### Community 29 - "Audit Export Schema"
Cohesion: 0.08
Nodes (21): pdf-lib, DATE, fiche, bienSchema, Credit, creditSchema, dateIso, decouperObjectifs() (+13 more)

### Community 30 - "Audit Fiche Form"
Cohesion: 0.16
Nodes (26): avecInfosCompte(), Bascule(), BlocBien(), BlocPersonne(), BoutonLigne(), Champ(), Chiffre(), CompteClient (+18 more)

### Community 31 - "Staff User Management"
Cohesion: 0.14
Nodes (20): inviteSchema, inviteStaff(), InviteState, resendSchema, resendSetPasswordLink(), ResendState, RoleState, schema (+12 more)

### Community 32 - "Financial Calculations"
Cohesion: 0.14
Nodes (21): fiche(), brutAnnuel(), calculer(), calculerEndettement(), calculerSimulation(), Calculs, Endettement, formatPourcent() (+13 more)

### Community 33 - "Runtime Dependencies"
Cohesion: 0.09
Nodes (23): dependencies, @base-ui/react, class-variance-authority, clsx, fflate, google-auth-library, gsap, lenis (+15 more)

### Community 34 - "Contact & Exchange Requests"
Cohesion: 0.15
Nodes (16): zod, demanderEchange(), EchangeState, DemanderEchange(), initialState, schema, ContactState, submitContact() (+8 more)

### Community 35 - "Audit Fiche Actions"
Cohesion: 0.15
Nodes (20): autoriser(), cloreLeR0(), completerLeCompte(), enregistrerFiche(), enregistrerSchema, journaliser(), OuvertureState, ouvrirFiche() (+12 more)

### Community 36 - "shadcn Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 37 - "Client Dossier Export"
Cohesion: 0.20
Nodes (13): setClientAdvisor(), fichier(), Lecture, lireFichePourExport(), GET(), GET(), ClientDossierLayout(), GET() (+5 more)

### Community 38 - "Recommendation Assignment"
Cohesion: 0.19
Nodes (14): assignRecommendation(), removeAssignment(), revalidate(), STATUS, updateAssignment(), AssignCreate(), AssignForm(), initialState (+6 more)

### Community 39 - "Lint & Package Config"
Cohesion: 0.10
Nodes (19): eslintConfig, name, private, version, eslint, eslint-config-next, jsdom, react-dom (+11 more)

### Community 40 - "UI Primitives"
Cohesion: 0.18
Nodes (16): @base-ui/react, class-variance-authority, clsx, tailwind-merge, Button(), buttonVariants, Card(), CardAction() (+8 more)

### Community 41 - "XLSX Generator"
Cohesion: 0.15
Nodes (18): fflate, Cellule, COULEURS, creerClasseur(), ECHAPPEMENTS, echapper(), Feuille, indexStyle() (+10 more)

### Community 42 - "Audit Fiche & Follow-up Pages"
Cohesion: 0.14
Nodes (19): FicheAuditPage(), metadata, OuvrirFicheButton(), badgeEtape(), CIBLES, ClientSuiviPage(), ETAT_LABELS, ETAT_TONES (+11 more)

### Community 43 - "Legal Pages & Navigation"
Cohesion: 0.20
Nodes (14): MentionsLegalesPage(), metadata, ConfidentialitePage(), metadata, LEGAL_LINKS, NAV, NavGroup, NavLink (+6 more)

### Community 44 - "Audit Workbook Sheets"
Cohesion: 0.36
Nodes (20): argent(), blocPersonne(), classeurAudit(), enTeteFeuille(), enTetes(), feuilleFinancier(), feuilleFoyer(), feuilleImmobilier() (+12 more)

### Community 45 - "Events Admin"
Cohesion: 0.18
Nodes (16): createEvent(), deleteEvent(), parse(), revalidate(), schema, setEventPublished(), toIso(), updateEvent() (+8 more)

### Community 46 - "Demo Content Seeder"
Cohesion: 0.15
Nodes (17): ARTICLE_CATS, articles, BRONZE, clean(), db, events, GREY, GUIDE_CATS (+9 more)

### Community 47 - "Advisor Stats"
Cohesion: 0.18
Nodes (15): Compteur(), NIVEAU_CLASSES, NIVEAU_LABELS, StatsConseillers(), RdvStat, SupabaseServerClient, agregerStats(), ETAPES (+7 more)

### Community 48 - "Structuring & Use Cases"
Cohesion: 0.16
Nodes (15): CaseDetail, cases, CasUsagePage(), UseCase, apportSteps, processSteps, SECTIONS, services (+7 more)

### Community 49 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 50 - "Dev Dependencies"
Cohesion: 0.11
Nodes (18): devDependencies, eslint, eslint-config-next, jsdom, @playwright/test, tailwindcss, @tailwindcss/postcss, @testing-library/dom (+10 more)

### Community 51 - "PDF Preview & Reader"
Cohesion: 0.23
Nodes (13): pdfjs-dist, Page(), PdfReader(), apercuGuide(), chargerPdf(), choisirPage(), flouter(), hauteurNette() (+5 more)

### Community 52 - "Document Management"
Cohesion: 0.19
Nodes (12): attachDocument(), attachSchema, getStaffDocumentUrl(), logAccess(), OpenState, DocumentCreate(), initialState, DocumentUploadForm() (+4 more)

### Community 53 - "Model & Network Pages"
Cohesion: 0.21
Nodes (11): etapes, ModelePage(), ReseauPage(), Arches(), CtaBand(), CtaBandProps, NetworkOrbit(), NODES (+3 more)

### Community 54 - "Loading Skeletons"
Cohesion: 0.30
Nodes (9): Loading(), Loading(), Loading(), Loading(), Loading(), Skeleton(), SkeletonCard(), SkeletonHead() (+1 more)

### Community 55 - "Recommendation Categories"
Cohesion: 0.18
Nodes (10): metadata, one(), STATUTS, TRIS, collator, GroupeCategorie, grouperParCategorie(), SANS_CATEGORIE (+2 more)

### Community 56 - "Auth Split Layouts"
Cohesion: 0.27
Nodes (10): Layout(), metadata, Layout(), metadata, AuthSplit(), FragDocument(), FragJalons(), FragRdv() (+2 more)

### Community 57 - "Audit Fiche Read View"
Cohesion: 0.44
Nodes (13): bienRempli(), BlocBien(), BlocPersonne(), Champ(), ChampDate(), ChampMontant(), creditRempli(), FicheVue() (+5 more)

### Community 58 - "Appointment Detail Modal"
Cohesion: 0.22
Nodes (12): RDV_STATUT_STYLES, RdvStatut, Champ(), ETAT_PASTILLE, ETAT_TEXTE, MODE_LABEL, RdvContexte, RdvDetailModal() (+4 more)

### Community 59 - "Phone Input & Countries"
Cohesion: 0.19
Nodes (12): PhoneInputProps, suggested, BY_ISO, COUNTRIES, Country, DATA, DEFAULT_ISO, flagOf() (+4 more)

### Community 60 - "AMMC Security Controls"
Cohesion: 0.23
Nodes (8): AMMC security checklist (sprint tracking), PSSI - Politique de Sécurité des Systèmes d'Information, Cloudflare WAF setup procedure (Full strict SSL, Bot Fight, /connexion rate rule), Content reader gate (SMS code via Twilio Verify, horkos_lecteur cookie, content_leads), Email enumeration protection (email_has_account, migration 028), Three roles + RLS (is_staff) + proxy route protection, Server-side zod input validation, Playwright end-to-end tests

### Community 61 - "Project Plan & Quote"
Cohesion: 0.21
Nodes (13): Route groups (public)/(client)/(admin), Setup guide & cost estimate (devis), Client pre-start checklist (domain, Vercel, Supabase, Google Workspace, content), Setup guide & cost estimate (PDF, 26 July 2026), Setup guide & cost estimate v2 (PDF), horkos.html - original no-code SPA mockup export, Horkos WM mockup (public site, espace client, back-office), Positioning: structure wealth, not sell products (+5 more)

### Community 62 - "Needs Icons"
Cohesion: 0.18
Nodes (10): BesoinIconName, BesoinIconProps, BesoinIconVariant, geometry, IconGeometry, strokeWidths, Besoin, besoinsEntreprises (+2 more)

### Community 63 - "Security Procedures & Templates"
Cohesion: 0.18
Nodes (10): Sensitive data access logging (todo), OAuth providers (Google, Microsoft/Azure common tenant), Allowed redirect URLs (/auth/callback, zero-width space pitfall), audit_logs append-only journal, Backups, PITR and restore procedure, Incident management process (CNDP/AMMC notification), Key compromise rotation procedure, Vercel deployment procedure (cron /api/cron/rappels) (+2 more)

### Community 64 - "Contact Requests Status"
Cohesion: 0.29
Nodes (9): deleteContact(), marquerContactLu(), revalidate(), setContactStatus(), statutSchema, CONTACT_STATUT_LABELS, CONTACT_STATUTS, CONTACT_TRANSITIONS (+1 more)

### Community 65 - "Products Catalogue"
Cohesion: 0.24
Nodes (10): Catalogue(), Category, entreprises, individuelles, Product, ProduitsPage(), HashScroll(), HashScrollProps (+2 more)

### Community 66 - "Input Validation Helpers"
Cohesion: 0.20
Nodes (10): CompleterProfilPage(), metadata, capitaliseName(), lengthError(), PHONE_FULL_REGEX, PHONE_MAX, PHONE_NATIONAL_REGEX, phoneDigits() (+2 more)

### Community 67 - "npm Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, start, test, test:coverage, test:e2e (+3 more)

### Community 68 - "Partner Requests Status"
Cohesion: 0.25
Nodes (9): deletePartenaire(), marquerPartenaireLu(), revalidate(), setPartenaireStatus(), statutSchema, PARTENAIRE_STATUT_LABELS, PARTENAIRE_STATUTS, PARTENAIRE_TRANSITIONS (+1 more)

### Community 69 - "Auth & Project Docs"
Cohesion: 0.29
Nodes (10): CLAUDE.md - Horkos WM project instructions, AMMC circulaire 01/20 (CIF security regulation), Supabase Auth configuration guide, Email OTP expiration (3600 s), Passwordless client auth (6-digit email OTP, Google/Microsoft), Resend custom SMTP for Supabase Auth, Sécurité - measures and procedures (AMMC working doc), README - Horkos WM (+2 more)

### Community 70 - "Request Row Tests"
Cohesion: 0.20
Nodes (6): @testing-library/jest-dom, @testing-library/react, changerStatut, marquerLue, poser(), supprimer

### Community 71 - "Audit Create Form"
Cohesion: 0.29
Nodes (6): AuditCreate(), AuditForm(), AuditInitial, initialState, DocumentUpload(), onChange()

### Community 72 - "Error Boundaries"
Cohesion: 0.38
Nodes (5): Error(), Error(), Error(), Error(), ErrorView()

### Community 73 - "Asset Sale Form"
Cohesion: 0.31
Nodes (8): AssetState, schema, assetGroups, assetTypeOptions, cessionReasonOptions, DESCRIPTION_MAX, ESTIMATED_VALUE_MAX, HORIZON_MAX

### Community 74 - "ICS Calendar Export"
Cohesion: 0.33
Nodes (7): RFC-5545, buildIcs(), escapeIcsText(), foldIcsLine(), IcsEvent, base, toUtcStamp()

### Community 75 - "Contact & Booking Pages"
Cohesion: 0.33
Nodes (6): ContactPage(), metadata, metadata, RendezVousPage(), ConciergeAside(), SUITE

### Community 76 - "Client Vault Documents"
Cohesion: 0.43
Nodes (6): DownloadState, getDocumentUrl(), logAccess(), DocumentRow(), formatSize(), initialState

### Community 77 - "Fonts & Root Layout"
Cohesion: 0.32
Nodes (4): alpina, america, metadata, SITE_DESCRIPTION

### Community 78 - "Public Booking Tests"
Cohesion: 0.25
Nodes (4): IDLE, mockBook, mockCreateAdminClient, mockCreateClient

### Community 79 - "Booking Test Strategy"
Cohesion: 0.33
Nodes (5): Main DB schema (profiles, appointments, audits, documents, guides...), bookAndNotify orchestration (event -> book -> advisor -> emails), Manual acceptance (recette manuelle) scenarios, Slot hold (5-minute reservation of a booking slot), Vitest unit/component tests (mocked Supabase, Google, email)

### Community 80 - "Requests Tabs"
Cohesion: 0.47
Nodes (4): DemandesTabs(), OngletDemandes, ONGLETS, pathname

### Community 81 - "Audit Report Download"
Cohesion: 0.53
Nodes (4): AuditReportState, getAuditReportUrl(), AuditReportButton(), initialState

### Community 83 - "Reduced Motion Hook"
Cohesion: 0.70
Nodes (4): getServerSnapshot(), getSnapshot(), subscribe(), usePrefersReducedMotion()

### Community 84 - "Typography & Design"
Cohesion: 0.67
Nodes (3): Design conventions (Zodiak/Switzer, ink/bronze/cream palette, French UI), Initial design system (Cormorant Garamond + Inter), ITF Free Font License (Fontshare) v2.0

## Knowledge Gaps
- **22 isolated node(s):** `shadcn`, `tw-animate-css`, `@tailwindcss/postcss`, `@testing-library/dom`, `@testing-library/user-event` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 645 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Security Headers & Config` to `Client Space Pages`, `Supabase Auth & Routing`, `Client Booking Actions`, `Client Dossier Pages`, `Public Content Listings`, `App Shells & Layouts`, `Transactional Emails`, `Follow-up Scheduling`, `Article & Category Admin`, `Landing Page & Motion`, `Audit Management`, `Intake & Public Booking`, `Content Editor Forms`, `Client Overview & Wealth`, `Appointment Constants`, `Admin Content Actions`, `Recommendations Admin`, `Admin Dashboard Activity`, `Public Forms & SMS`, `Gated Article & Guide Pages`, `Weekly Schedule Admin`, `Requests Inbox`, `Reader Gate Actions`, `Audit Fiche Form`, `Staff User Management`, `Contact & Exchange Requests`, `Audit Fiche Actions`, `Client Dossier Export`, `Recommendation Assignment`, `Lint & Package Config`, `Audit Fiche & Follow-up Pages`, `Legal Pages & Navigation`, `Events Admin`, `Advisor Stats`, `Structuring & Use Cases`, `Document Management`, `Model & Network Pages`, `Recommendation Categories`, `Auth Split Layouts`, `Appointment Detail Modal`, `Contact Requests Status`, `Products Catalogue`, `Input Validation Helpers`, `Partner Requests Status`, `Audit Create Form`, `Error Boundaries`, `Contact & Booking Pages`, `Client Vault Documents`, `Fonts & Root Layout`, `Requests Tabs`, `Audit Report Download`?**
  _High betweenness centrality (0.274) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createClient()` (e.g. with `espace/rendez-vous/actions.test.ts` and `reseau/actions.test.ts`) actually correct?**
  _`createClient()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `shadcn`, `tw-animate-css`, `@tailwindcss/postcss` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Client Space Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.1120144534778681 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `Admin Content Actions` to `Client Space Pages`, `Supabase Auth & Routing`, `Client Booking Actions`, `Client Dossier Pages`, `App Shells & Layouts`, `Follow-up Scheduling`, `Article & Category Admin`, `Audit Management`, `Partnership Form`, `Booking Core & Calendar`, `Intake & Public Booking`, `Content Editor Forms`, `Client Overview & Wealth`, `Appointment Constants`, `Recommendations Admin`, `Admin Dashboard Activity`, `Public Forms & SMS`, `Gated Article & Guide Pages`, `Weekly Schedule Admin`, `Requests Inbox`, `Staff User Management`, `Contact & Exchange Requests`, `Audit Fiche Actions`, `Client Dossier Export`, `Recommendation Assignment`, `Audit Fiche & Follow-up Pages`, `Events Admin`, `Advisor Stats`, `Document Management`, `Recommendation Categories`, `Contact Requests Status`, `Input Validation Helpers`, `Partner Requests Status`, `Asset Sale Form`, `Client Vault Documents`, `Public Booking Tests`, `Audit Report Download`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Should `Supabase Auth & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Landing Page & Motion` to `Supabase Auth & Routing`, `Client Booking Actions`, `Client Dossier Pages`, `App Shells & Layouts`, `Follow-up Scheduling`, `Article & Category Admin`, `Audit Management`, `Partnership Form`, `Intake & Public Booking`, `Reminders`, `Content Editor Forms`, `Appointment Constants`, `Recommendations Admin`, `Weekly Calendar View`, `Public Forms & SMS`, `Gated Article & Guide Pages`, `Requests Inbox`, `Audit Fiche Form`, `Staff User Management`, `Contact & Exchange Requests`, `Audit Fiche Actions`, `Recommendation Assignment`, `Lint & Package Config`, `UI Primitives`, `Legal Pages & Navigation`, `Events Admin`, `Structuring & Use Cases`, `PDF Preview & Reader`, `Document Management`, `Model & Network Pages`, `Auth Split Layouts`, `Appointment Detail Modal`, `Phone Input & Countries`, `Products Catalogue`, `Audit Create Form`, `Error Boundaries`, `Client Vault Documents`, `Audit Report Download`, `Reduced Motion Hook`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._