# Tests de la réservation de rendez-vous

La réservation touche trois couches, chacune testée à son niveau :

| Couche | Fichier(s) | Outil |
| --- | --- | --- |
| Grille horaire (logique pure) | `src/components/booking/grille.test.ts` | Vitest |
| Composant `CreneauPicker` | `src/components/booking/creneau-picker.test.tsx` | Vitest + Testing Library |
| Actions serveur + orchestration | `src/app/(public)/rendez-vous/actions.test.ts`, `src/app/(client)/espace/rendez-vous/actions.test.ts`, `src/lib/booking.test.ts` | Vitest |
| Fonctions SQL (source de vérité) | `supabase/tests/booking_test.sql` | Supabase SQL Editor |
| Parcours de bout en bout | Ce document, section « Recette manuelle » | À la main dans le navigateur |

## Tests automatisés (Vitest)

```bash
npm test              # une passe, tout le suite
npm run test:watch    # en continu pendant le développement
npm run test:coverage # avec couverture
```

Ces tests ne touchent aucune base : le composant et les actions serveur tournent
avec `./actions`, Supabase, Google Agenda et l'email **mockés**. Ils vérifient la
logique côté client et serveur, pas la disponibilité réelle.

Ce qui est couvert :

- **Grille** — les 13 débuts d'une journée sont verrouillés à l'identique de
  `public._booking_starts()` côté SQL ; bornes du déjeuner, de l'ouverture, de la
  fermeture ; week-ends fermés ; formatage.
- **CreneauPicker** — chargement, créneau complet grisé, tenue d'un créneau
  (hold), expiration du hold au bout de 5 min, créneau repris entre l'affichage
  et le clic, grille entièrement vide, bascule de jour, persistance du token.
- **Action publique** (`submitAppointmentRequest`) — validation serveur, demande
  enregistrée quoi qu'il arrive, réservation optionnelle, succès même si le
  créneau est parti entre-temps.
- **Action espace** (`bookEspaceSlot`) — session requise, type déduit du parcours
  (R0 vs revue), créneau indisponible.
- **`bookAndNotify`** — ordre créer l'événement → réserver → rattacher le
  conseiller → emails ; suppression de l'événement orphelin si la réservation
  échoue ; réservation sans lien quand Google est indisponible.

## Tests SQL (la vraie autorité)

Toute la décision de disponibilité vit dans Postgres. Le script les vérifie sans
rien modifier : il est enveloppé dans `begin … rollback`.

1. Ouvrir le **SQL Editor** du projet Supabase.
2. Coller le contenu de `supabase/tests/booking_test.sql`.
3. Exécuter.

- Succès → `✅ TOUS LES TESTS DE RÉSERVATION SONT PASSÉS`.
- Échec → `ERROR:` avec le message de l'assertion qui a cédé.

Prérequis : migrations `010_booking.sql` et `011_appointment_mode.sql` appliquées.
Le script s'exécute en tant que `postgres` (le rôle du SQL Editor).

Ce qui est couvert : validité d'un début (jour ouvré, grille, marge de 2 h),
capacité par créneau, occupation calculée par intervalle réel (un rendez-vous de
60 min bloque ses deux demi-heures), hold qui retire une place et se déplace sans
s'additionner, exclusion de son propre token, réservation qui confirme et choisit
le conseiller le moins chargé, rattachement de la demande, épuisement de la
capacité, refus des entrées invalides.

## Recette manuelle (parcours réel)

Les tests automatisés mockent le réseau ; cette recette vérifie le vrai chemin
(Supabase, Google Agenda, emails Resend). À faire une fois avant une mise en
production, ou après un changement des migrations de réservation.

### Préparation

1. Renseigner `.env.local` (aucun `.env` n'est versionné) avec au minimum :
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - la clé service, les identifiants Google Agenda et Resend si l'on veut voir
     les emails et l'invitation calendrier partir réellement.
2. En base, s'assurer qu'il existe **au moins un profil `conseiller`** — sans lui,
   tous les créneaux sont complets (c'est le comportement attendu, cf. scénario 6).
3. Lancer l'application : `npm run dev`, puis ouvrir http://localhost:3000.

### Scénarios à dérouler

Parcours public — `/rendez-vous` :

- [ ] **1. Réservation nominale.** Répondre au questionnaire, choisir un format
      (présentiel/visio), prendre un créneau, remplir les coordonnées, envoyer.
      → Écran de confirmation avec l'heure ; en visio, un lien Meet arrive par
      email ; l'invitation calendrier est reçue.
- [ ] **2. Le compte à rebours.** Après avoir pris un créneau, attendre : au bout
      de 5 minutes le créneau se libère et un message invite à en reprendre un.
- [ ] **3. Créneau pris en concurrence.** Dans deux onglets, tenir le **dernier**
      créneau d'un jour dans l'un, puis tenter le même dans l'autre.
      → Le second reçoit « Ce créneau vient d'être pris » et la grille se met à jour.
- [ ] **4. Créneau perdu au dernier moment.** Choisir un créneau, laisser le hold
      expirer (ou le faire prendre dans un autre onglet), puis envoyer.
      → La réservation échoue proprement : message « Ce créneau vient d'être pris,
      revenez en choisir un autre » et **aucune** demande n'est enregistrée (pas
      d'orpheline sans rendez-vous). Le créneau est désormais obligatoire.
- [ ] **5. Validation.** Tenter un email invalide, un téléphone trop court, cocher
      « Autre besoin » sans préciser. → Le bouton reste bloqué / message clair.
- [ ] **6. Aucun conseiller.** Mettre temporairement le rôle du seul conseiller à
      autre chose (ou tout est complet). → L'étape créneau affiche « Aucun créneau
      ouvert » et **ne se franchit pas** : sans créneau, pas de demande.

Parcours espace client — `/espace/rendez-vous` (connecté) :

- [ ] **7. Première réservation (R0).** Un client sans R0 terminé réserve.
      → Rendez-vous confirmé, visible sur `/espace` et `/espace/accompagnement`.
- [ ] **8. Revue.** Pour un client dont un R0 est déjà `termine`, la réservation
      crée un rendez-vous de type `revue` (vérifiable en base sur `appointments.type`).
- [ ] **9. Session expirée.** Se déconnecter dans un autre onglet puis confirmer.
      → Message « Votre session a expiré. Reconnectez-vous. »

### Vérifications en base après un test

```sql
select id, type, status, date, mode, meeting_url, advisor_id
  from public.appointments order by created_at desc limit 5;

select id, status, appointment_id, email
  from public.appointment_requests order by created_at desc limit 5;

-- Les holds expirent seuls ; il ne devrait rester que des holds récents.
select slot_start, expires_at from public.slot_holds order by created_at desc;
```
