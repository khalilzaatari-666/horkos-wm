# Sécurité — mesures en place et procédures

Document de travail pour le dossier AMMC (circulaire 01/20). Il recense ce qui
est implémenté dans le code, ce qui se règle dans les tableaux de bord
(Vercel, Supabase, Cloudflare), et les procédures à connaître. Il servira de
base au document PSSI rédigé par le consultant.

Dernière mise à jour : 18 septembre 2026.

---

## 1. Architecture et hébergement

| Composant | Fournisseur | Région | Rôle |
| --- | --- | --- | --- |
| Application Next.js | Vercel | fonctions serverless (région à relever dans Vercel > Settings > Functions) | site public, espace client, back-office |
| Base de données, Auth, Storage | Supabase (plan Pro) | région du projet (Settings > General) | données clients, documents, sessions |
| DNS, WAF, anti-DDoS, CDN | Cloudflare (plan gratuit) | mondial | pare-feu applicatif devant Vercel |
| Emails transactionnels | Resend | — | codes de connexion, alertes, rappels |
| Agenda | Google Workspace (compte de service) | — | création des rendez-vous |
| Analytics | Umami (auto-hébergé, projet Vercel séparé) | — | statistiques sans cookie |

Tout le trafic est en HTTPS (certificats gérés par Vercel/Cloudflare). Les
données sont chiffrées au repos par Supabase (AES-256) et en transit (TLS 1.2+).

## 2. Gestion des accès et authentification

- **Trois rôles** : `client`, `conseiller`, `admin` (`profiles.role`). Le proxy
  (`src/proxy.ts` → `src/lib/supabase/middleware.ts`) protège `/espace/*`
  (connecté) et `/admin/*` (conseiller ou admin) ; les layouts revérifient le
  rôle côté serveur.
- **Clients** : connexion sans mot de passe (code à 6 chiffres par email, ou
  Google/Microsoft). Aucun mot de passe client n'est stocké.
- **Équipe** : mot de passe, via une server action (`connexion/equipe/actions.ts`)
  limitée à **5 tentatives par minute et par IP**.
- **Second facteur TOTP - prêt, désactivé** (`src/lib/mfa.ts`, page
  `/connexion/equipe/mfa`). Décision du 18 septembre 2026 : l'équipe n'est
  pas encore équipée d'une application d'authentification. Une fois activé,
  le proxy et le layout admin exigent une session `aal2` pour tout
  `/admin/*` ; un membre sans facteur inscrit est envoyé sur l'inscription
  (QR code) et ne peut pas entrer avant ; la vérification du code est
  plafonnée à 5 essais / minute / IP.
  **Risque assumé tant que c'est éteint** : la clé anon étant publique, le
  mot de passe d'un compte staff se devine depuis l'API Supabase Auth sans
  passer par notre formulaire ni notre plafond - seules les limites Supabase
  (ci-dessous) s'appliquent. À activer avant le dossier AMMC.
  **Activation** : 1) Authentication > Multi-Factor > TOTP ; 2) variable
  `STAFF_MFA_REQUIRED=true` sur Vercel ; 3) prévenir l'équipe (installer
  Google/Microsoft Authenticator, ou l'app Mots de passe d'Apple).
  Perte du téléphone : un admin supprime le facteur dans Authentication >
  Users > (utilisateur) > Factors ; l'intéressé se réinscrit à la prochaine
  connexion.
- **RLS** activée sur toutes les tables : un client ne lit que ses lignes, le
  staff passe par `is_staff()`. La clé `service_role` n'est utilisée que
  côté serveur (cron des rappels, opérations admin) et n'est jamais exposée.
- **Attribution des rôles verrouillée** (migration 027, revue du 18 septembre
  2026) : le rôle n'est jamais lu des métadonnées d'inscription (la clé anon
  est publique, un visiteur pouvait s'inscrire « admin ») ; un déclencheur
  `profiles_guard_sensitive_columns` refuse toute modification de `role`,
  `advisor_id` ou `email` qui ne vient pas d'un admin, de la clé de service
  ou du SQL Editor. Un compte staff naît « client » puis est promu par
  `inviteStaff` avec la clé de service.
- **Énumération d'adresses** : `email_has_account` n'est plus exécutable que
  par la clé de service (migration 028) ; le seul chemin est la server action
  plafonnée à 20 appels / 10 min / IP.
- **Clé anon = surface d'attaque** : tout ce que la clé anon peut appeler
  (Auth, PostgREST, RPC `security definer`) l'est aussi hors du site, sans
  passer par nos formulaires ni notre limitation de débit. Toute règle de
  sécurité doit donc vivre en base (policy, déclencheur, contrainte) et non
  seulement dans une server action. Exemple : `appointments.meeting_url`
  n'accepte qu'un lien Google Meet (contrainte), car `book_slot` est
  appelable directement.
- **Limites Supabase Auth à régler** (Dashboard > Authentication > Rate Limits) :
  - envoi d'emails (OTP) : 30 / heure par IP (valeur par défaut, à confirmer)
  - vérifications de code : 30 / 5 min par IP
  - connexions par mot de passe : 30 / 5 min par IP - **à baisser** (10 / 5
    min) tant que le second facteur est éteint : c'est la seule limite qu'un
    appel direct à l'API rencontre
  - vérifications MFA : valeur par défaut Supabase, en plus de nos 5 / min
  - durée de validité du code : 1 heure (voir `docs/auth-setup.md`)

## 3. Protection des entrées

- **Validation serveur** : chaque server action qui reçoit une saisie valide
  avec **zod** (`z.enum` pour les listes fermées, bornes de longueur, regex
  partagées dans `src/lib/validation.ts`). La validation navigateur n'est qu'un
  confort.
- **Limitation de débit** (`src/lib/rate-limit.ts`, migration
  `015_rate_limits.sql`) : compteur en base par « action + IP », fonction
  `security definer` atomique. Limites actuelles :

  | Action | Limite |
  | --- | --- |
  | connexion équipe (`login`) | 5 / min |
  | code MFA équipe (`mfa`) | 5 / min |
  | contact | 5 / 10 min |
  | partenariat | 5 / 10 min |
  | cession d'actif (`asset`) | 5 / 10 min |
  | rendez-vous (`rdv`) | 5 / 10 min |
  | tenue de créneau (`hold`) | 40 / 10 min |
  | vérification d'email (`email-check`) | 20 / 10 min |
  | téléchargement de guide | 10 / 10 min |
  | questionnaire d'entrée (`intake`) | 10 / 10 min |
  | échange sur une recommandation | 3 / 10 min |

  **Contrat d'échec : fail-open.** Si la RPC est absente ou la base injoignable,
  l'action passe. C'est un choix (ne jamais bloquer un vrai visiteur), mais il
  impose de **vérifier que la migration 015 est appliquée** sur le projet de
  production :

  ```sql
  select proname from pg_proc where proname = 'rate_limit_hit';
  ```

  Une ligne attendue. Sinon, exécuter `supabase/migrations/015_rate_limits.sql`
  dans le SQL Editor.

## 4. En-têtes de sécurité

Posés par `next.config.ts` (`securityHeaders`) sur toutes les réponses :

| En-tête | Valeur |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'` ; scripts : `'self'` + Umami ; connexions : Supabase + Umami ; `frame-ancestors 'none'` ; `form-action 'self'` ; `object-src 'none'` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | caméra, micro, géolocalisation désactivés |

La CSP est statique (sans nonce) et tolère `'unsafe-inline'` pour les scripts :
un nonce par requête rendrait toutes les pages dynamiques et ferait perdre au
site public son cache. Elle bloque néanmoins tout script tiers non listé,
l'encadrement du site par iframe et l'envoi de formulaires vers l'extérieur.

Vérification : `curl -sI https://horkos-wm.com | grep -i -E "content-security|strict-transport|x-frame"`.

## 5. Traçabilité

- Table `audit_logs` (schéma initial) : `user_id`, `action`, `entity_type`,
  `entity_id`, `ip_address`, horodatage. RLS : lecture réservée aux admins ;
  insertion réservée à l'utilisateur connecté **pour son propre `user_id`**
  (migration 027 — auparavant n'importe qui pouvait y écrire sous n'importe
  quelle identité). Ni mise à jour ni suppression : le journal est en ajout
  seul.
- **À compléter** (Sprint 4-5, `CLAUDE.md`) : journaliser chaque consultation de
  données sensibles (patrimoine, documents, audits) depuis les server actions.
- Journaux d'infrastructure : Vercel (requêtes, fonctions), Supabase (API,
  Postgres, Auth), Cloudflare (événements WAF). Durées de rétention selon le
  plan de chaque fournisseur — à relever pour le PSSI.

## 6. Cloudflare devant `horkos-wm.com` — procédure

Objectif : WAF, anti-DDoS et cache devant Vercel, sans rien changer à
l'application.

1. **Compte** : créer un compte Cloudflare (plan Free) avec l'adresse du cabinet.
2. **Ajouter le site** : « Add a site » → `horkos-wm.com` → plan Free.
   Cloudflare importe les enregistrements DNS existants ; vérifier qu'il n'en
   manque aucun (MX de la messagerie, TXT SPF/DKIM/DMARC, vérifications Google).
3. **Enregistrements Vercel** (Vercel > Project > Settings > Domains) :
   - `A` `@` → l'adresse indiquée par Vercel pour le domaine apex, **proxy activé (nuage orange)**
   - `CNAME` `www` → `cname.vercel-dns.com`, proxy activé
   - Ne pas déléguer les DNS à Vercel : les serveurs de noms restent Cloudflare.
4. **Serveurs de noms** : chez le registrar, remplacer les NS par les deux que
   Cloudflare indique. Propagation : quelques heures au plus.
5. **SSL/TLS** : mode **Full (strict)** (Vercel a un certificat valide). Activer
   « Always Use HTTPS » et « Automatic HTTPS Rewrites ». Ne pas activer HSTS
   côté Cloudflare : l'application l'envoie déjà.
6. **Sécurité** :
   - Security > WAF > Managed rules : activer le « Cloudflare Managed Ruleset »
     (gratuit).
   - Security > Bots : activer **Bot Fight Mode**.
   - Security > WAF > Rate limiting rules : une règle
     `(http.request.uri.path contains "/connexion")` → 10 requêtes / minute par IP
     → action Block 1 minute. Doublon volontaire de la limite applicative.
   - Security > Settings : Security Level « Medium », Challenge Passage 30 min.
7. **Cache / performance** : laisser les réglages par défaut. Ne **pas** activer
   « Cache Everything » : les pages `/espace` et `/admin` sont personnalisées.
   Vercel envoie déjà les bons `Cache-Control`.
8. **Vercel** : dans Settings > Domains, le domaine doit apparaître « Valid
   Configuration ». Si Vercel signale un conflit de proxy, vérifier le mode SSL
   (étape 5).
9. **Vérifier** : `curl -sI https://horkos-wm.com` doit montrer `server: cloudflare`
   et les en-têtes de la section 4 ; la connexion client (code email) et la
   connexion équipe fonctionnent ; les emails du cabinet arrivent toujours (MX).

Cocher la case « Cloudflare WAF » de `CLAUDE.md` une fois l'étape 9 validée.

## 7. Sauvegardes et restauration

### Ce qui est sauvegardé

- **Base Postgres** (données clients, rendez-vous, recommandations, audits) :
  sauvegardes quotidiennes Supabase (7 jours sur le plan Pro) + **PITR**
  (Point-in-Time Recovery) à activer : Dashboard > Database > Backups >
  Point in Time → Enable (add-on facturé, rétention 7 jours minimum).
- **Storage** (documents du coffre, couvertures) : hors PITR. Supabase réplique
  les objets, mais ne versionne pas. Un export mensuel manuel est décrit plus bas.
- **Code** : dépôt Git (GitHub) ; chaque déploiement Vercel est immuable et peut
  être ré-promu en production instantanément (Deployments > … > Promote).
- **Configuration** : variables d'environnement Vercel (exporter via
  `vercel env pull` dans un endroit sûr après chaque changement),
  `supabase/schema.sql` + migrations dans le dépôt.

### Vérification (à faire une fois par trimestre)

1. Dashboard Supabase > Database > Backups : la dernière sauvegarde date de moins
   de 24 h ; PITR affiche une fenêtre de restauration continue.
2. Télécharger la dernière sauvegarde et la restaurer sur un projet Supabase
   jetable ; ouvrir une page de l'espace client dessus. Noter la date du test.

### Restauration d'urgence (perte ou corruption de données)

1. **Figer** : mettre le site en maintenance (Vercel > Deployments > Promote
   d'une page de maintenance, ou règle Cloudflare « Under Attack ») pour éviter
   de nouvelles écritures.
2. **Choisir l'instant** : identifier l'heure (UTC) juste avant l'incident
   (journaux Supabase > Postgres, ou `audit_logs`).
3. **Restaurer** : Database > Backups > Point in Time > Restore → saisir la date
   et l'heure. Supabase restaure **en place** (le projet est indisponible
   quelques minutes) ; les données postérieures à l'instant choisi sont perdues.
4. **Vérifier** : `select count(*) from auth.users;`, `profiles`, `appointments`,
   la dernière ligne de `audit_logs` ; se connecter avec un compte de test ;
   ouvrir un document du coffre (Storage n'est pas touché par le PITR).
5. **Rouvrir** et informer les clients concernés si des saisies ont été perdues.
6. **Post-mortem** : cause, données perdues, durée, actions correctives — à
   conserver pour le dossier AMMC.

### Compromission d'une clé

- `SUPABASE_SERVICE_ROLE_KEY` ou `anon` : Supabase > Settings > API > « Reset »
  (ou rotation JWT), puis mettre à jour les variables Vercel et redéployer.
- `RESEND_API_KEY`, `CRON_SECRET`, clé du compte de service Google : révoquer
  chez le fournisseur, régénérer, mettre à jour Vercel, redéployer.
- Sessions : Supabase > Authentication > Users > « Sign out all » sur les comptes
  concernés.

### Export mensuel manuel (Storage + base)

- Base : Dashboard > Database > Backups > Download (fichier `.sql.gz`).
- Storage : téléchargement des buckets `documents` et `media` via le Dashboard
  (Storage > bucket > sélectionner tout > Download) ou la CLI Supabase
  (`supabase storage cp`, projet lié).

Conserver l'export chiffré hors Supabase (disque du cabinet chiffré ou coffre
cloud chiffré), 12 mois glissants.

## 8. Gestion des incidents

1. Détection : alertes Vercel (erreurs 5xx), Supabase (usage, santé), retours
   clients via `contact@horkos-wm.com`.
2. Qualification par l'admin technique : disponibilité, intégrité, confidentialité.
3. Confinement : couper l'accès concerné (rôle, clé, règle Cloudflare).
4. Restauration (section 7) puis retour à la normale.
5. Notification : clients touchés et, si des données personnelles sont
   concernées, la CNDP dans les délais légaux ; l'AMMC selon les obligations du
   statut CIF.
6. Rapport d'incident archivé (date, impact, cause, correctifs).

## 9. Reste à faire

Voir la checklist de `CLAUDE.md` : activer le second facteur de l'équipe
(section 2, deux réglages), journalisation des consultations sensibles, PITR
(section 7). MFA optionnelle
pour les clients : non commencée.
