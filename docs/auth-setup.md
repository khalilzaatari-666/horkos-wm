# Configuration de l'authentification Supabase

Le site utilise une authentification **sans mot de passe** pour les clients :

- un fournisseur (Google ou Microsoft), ou
- un **code à 6 chiffres** envoyé par email.

Les administrateurs et conseillers gardent un accès par mot de passe sur `/connexion/equipe`.

Le code applicatif est prêt. Les cinq réglages ci-dessous se font dans le tableau
de bord Supabase et **sont indispensables** : sans eux, aucun code ne part.

---

## 1. Afficher le code dans les emails (obligatoire)

Par défaut, Supabase envoie un **lien magique**, pas un code. Il faut ajouter le
jeton dans les gabarits d'email.

**Authentication → Emails → Templates**

Deux gabarits sont concernés, parce que Supabase n'envoie pas le même selon les cas :

| Gabarit | Quand il part |
|---|---|
| **Confirm signup** | Première demande de code pour une adresse inconnue (création de compte) |
| **Magic Link** | Demande de code pour une adresse déjà enregistrée (connexion) |

Dans **les deux**, insérer `{{ .Token }}` là où le code doit apparaître :

```html
<h2>Votre code de connexion Horkos</h2>
<p>Saisissez ce code sur le site pour accéder à votre espace client :</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:600">{{ .Token }}</p>
<p>Ce code expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
```

> Si l'un des deux gabarits n'est pas modifié, la moitié des utilisateurs
> recevra un lien au lieu d'un code.

## 2. Configurer un SMTP personnalisé (obligatoire en production)

**Authentication → Emails → SMTP Settings**

Le service d'envoi intégré de Supabase est **limité à quelques emails par heure**
et n'est pas prévu pour la production. Il faut brancher un vrai SMTP.

Resend est déjà prévu dans le plan du projet :

| Champ | Valeur |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la clé API Resend |
| Sender email | une adresse du domaine vérifié, ex. `bonjour@horkos-wm.com` |
| Sender name | `Horkos Wealth Management` |

Le domaine `horkos-wm.com` doit être vérifié côté Resend (enregistrements SPF et
DKIM à publier dans le DNS).

> **Username vaut littéralement `resend`**, ce n'est ni une adresse email ni la
> clé API. Toute autre valeur fait échouer l'envoi avec
> `535 "Invalid username"`, visible dans *Logs → Auth Logs*. La clé API va dans
> le champ *Password*.

Ensuite, remonter la limite dans **Authentication → Rate Limits → Rate limit for
sending emails** (30 par heure par défaut une fois le SMTP branché).

## 3. Durée de validité du code

**Authentication → Providers → Email → Email OTP Expiration**

Valeur par défaut : `3600` secondes. L'interface annonce « valable 1 heure », donc
si cette valeur change, ajuster le texte dans
`src/components/auth/email-code-form.tsx`.

## 4. Google

**Authentication → Sign In / Providers → Google**

1. Google Cloud Console → *APIs & Services* → *Credentials* → *OAuth client ID*,
   type « Application Web ».
2. Dans *Authorized redirect URIs*, ajouter :
   `https://tbeppmwwwpphuqluexuc.supabase.co/auth/v1/callback`
3. Coller le *Client ID* et le *Client Secret* dans Supabase, activer le
   fournisseur.

## 5. Microsoft / Outlook

**Authentication → Sign In / Providers → Azure**

1. Portail Azure → *Microsoft Entra ID* → *App registrations* → *New registration*.
2. *Supported account types* : « Accounts in any organizational directory and
   personal Microsoft accounts » — c'est ce qui autorise les adresses Outlook et
   Hotmail personnelles en plus des comptes professionnels.
3. *Redirect URI* (type Web) :
   `https://tbeppmwwwpphuqluexuc.supabase.co/auth/v1/callback`
4. *Certificates & secrets* → créer un *client secret*.
5. Dans Supabase : *Application (client) ID*, le secret, et comme **Azure Tenant
   URL** laisser `https://login.microsoftonline.com/common` pour accepter les
   comptes personnels comme professionnels.

## 6. URL autorisées

**Authentication → URL Configuration**

- *Site URL* : `https://horkos-wm.com` (ou l'URL Vercel en attendant le domaine)
- *Redirect URLs* : ajouter les deux
  - `http://localhost:3000/auth/callback`
  - `https://horkos-wm.com/auth/callback`

Sans ça, le retour des fournisseurs OAuth est rejeté.

> **Saisir ces URL à la main, ne pas les coller.** Un copier-coller depuis une
> page web ou un document peut entraîner un caractère invisible (espace de
> largeur nulle, `U+200B`) en début de chaîne. Le champ paraît alors
> parfaitement normal, mais Supabase échoue au retour OAuth avec :
> `Unhandled server error: parse "​https://...": first path segment in URL
> cannot contain colon`. En cas de doute : tout sélectionner, supprimer, retaper.

---

## Vérifier que tout fonctionne

1. `/inscription` avec une adresse jamais utilisée → un code à 6 chiffres arrive
   → l'espace client s'ouvre.
2. `/connexion` avec la même adresse → un code arrive → connexion.
3. `/connexion` avec une adresse inconnue → message « Aucun compte n'est associé
   à cette adresse », **aucun compte n'est créé**.
4. Les deux boutons fournisseurs redirigent et reviennent sur `/espace`.
5. `/connexion/equipe` avec un compte `admin` → accès au back-office.
6. Le parcours complet : `/rendez-vous` → questionnaire → écran de confirmation
   → redirection vers `/inscription` avec prénom, nom et email déjà remplis.
   Après création du compte, la ligne dans `appointment_requests` doit avoir son
   `client_id` renseigné (le trigger `handle_new_user` s'en charge).
