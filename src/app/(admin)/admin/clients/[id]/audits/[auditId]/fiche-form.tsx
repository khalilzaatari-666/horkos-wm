"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminCard } from "@/components/admin/ui";
import { ASSET_TYPES, formatMAD } from "@/lib/patrimoine";
import { calculer, SEUILS } from "@/lib/fiche-audit/calculs";
import {
  decouperObjectifs,
  MAX_OBJECTIFS,
  REGIMES_MATRIMONIAUX,
  SITUATIONS_FAMILIALES,
  SITUATIONS_LOGEMENT,
  STATUTS_PROFESSIONNELS,
  type Bien,
  type Credit,
  type FicheAudit,
  type LigneFinanciere,
  type Personne,
} from "@/lib/fiche-audit/schema";
import type { ActionState } from "@/lib/staff";
import { EMAIL_REGEX } from "@/lib/validation";
import { enregistrerFiche } from "./actions";

const initialState: ActionState = { status: "idle" };

const champStyle =
  "w-full h-10 px-3 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors";
const labelStyle = "block text-[12px] font-medium text-ink mb-1.5";

/* ---------------------------------------------------------------- formats */

/**
 * Filtre à la saisie plutôt qu'un message après coup - même logique que
 * `sanitizeName` pour les formulaires publics (`lib/validation.ts`) : un
 * caractère qu'un téléphone ne peut pas contenir ne s'affiche jamais, il n'y a
 * donc rien à signaler ensuite.
 */
const TELEPHONE_INTERDIT = /[^\d\s().+-]/g;
function filtrerTelephone(valeur: string): string {
  return valeur.replace(TELEPHONE_INTERDIT, "");
}

/**
 * Chiffres et un seul point décimal - les suivants sont ignorés plutôt que de
 * bloquer la saisie. Sans ce garde-fou, « 12.34.56 » passait le filtre
 * précédent (chaque caractère pris seul était valide), pour ne casser qu'au
 * `Number()` : la valeur devenait `NaN`, réaffichée telle quelle dans le
 * champ et invisible jusqu'à l'échec de l'enregistrement, tout en bas de la
 * fiche.
 */
function filtrerMontant(saisie: string): string {
  const brut = saisie.replace(/[^\d.]/g, "");
  const premierPoint = brut.indexOf(".");
  if (premierPoint === -1) return brut;
  return brut.slice(0, premierPoint + 1) + brut.slice(premierPoint + 1).replace(/\./g, "");
}

/** Champ optionnel : vide n'est jamais une erreur, seul un format reconnu l'est. */
function erreurEmail(valeur: string): string | null {
  const v = valeur.trim();
  if (!v) return null;
  return EMAIL_REGEX.test(v) ? null : "Format invalide, ex. nom@domaine.com";
}

/** Un conjoint qui partage l'email du titulaire, c'est la même personne saisie deux fois. */
function memeEmail(a: string, b: string): boolean {
  const v = a.trim().toLowerCase();
  return v !== "" && v === b.trim().toLowerCase();
}

/** Comparés chiffre à chiffre : la mise en forme ne doit pas cacher un doublon. */
function memeTelephone(a: string, b: string): boolean {
  const v = a.replace(/\D/g, "");
  return v !== "" && v === b.replace(/\D/g, "");
}

/**
 * Les taux se saisissent en pourcentage (« 4,95 ») mais le schéma les
 * contraint à une fraction ≤ 1 - sans ce garde-fou, une faute de frappe comme
 * « 495 » ne se découvrirait qu'à l'échec de l'enregistrement, tout en bas du
 * formulaire.
 */
function erreurPourcentage(pourcent: string): string | null {
  if (!pourcent) return null;
  const n = Number(pourcent.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n > 100 ? "Un taux ne dépasse pas 100 %." : null;
}

/** Chiffres et un seul séparateur décimal (point ou virgule) - même logique que `filtrerMontant`. */
function filtrerPourcentage(saisie: string): string {
  const brut = saisie.replace(/[^\d.,]/g, "");
  const premier = brut.search(/[.,]/);
  if (premier === -1) return brut;
  return brut.slice(0, premier + 1) + brut.slice(premier + 1).replace(/[.,]/g, "");
}

/* ------------------------------------------------------------------ champs */

function Champ({
  label,
  valeur,
  onChange,
  type = "text",
  placeholder,
  verrouille = false,
  erreur = null,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  /** Vient du compte client : affiché mais non modifiable depuis la fiche. */
  verrouille?: boolean;
  /** Message de format affiché sous le champ ; `null` ne change rien à l'affichage. */
  erreur?: string | null;
}) {
  return (
    <label className="block">
      <span className={labelStyle}>
        {label}
        {verrouille && (
          <span className="ml-1.5 font-normal normal-case tracking-normal text-warm-grey">
            (compte client)
          </span>
        )}
      </span>
      <input
        type={type}
        value={valeur}
        placeholder={placeholder}
        disabled={verrouille}
        aria-invalid={!!erreur}
        onChange={(e) => onChange(e.target.value)}
        className={`${champStyle} ${verrouille ? "bg-cream-deep/50 text-charcoal cursor-not-allowed" : ""} ${
          erreur ? "border-red-400 focus:border-red-500" : ""
        }`}
      />
      {erreur && (
        <span className="block mt-1 text-[11.5px] text-red-600" aria-live="polite">
          {erreur}
        </span>
      )}
    </label>
  );
}

/**
 * Un montant en dirhams.
 *
 * La valeur est tenue en nombre mais éditée en texte, avec un tampon de
 * saisie distinct de sa reformulation depuis le nombre : sans lui, un « . »
 * tapé en cours de frappe (« 1250. ») disparaissait aussitôt - `Number("1250.")`
 * vaut 1250, donc le rendu suivant réaffichait « 1250 » et effaçait le point
 * que le conseiller venait de taper, rendant impossible toute décimale. Le
 * tampon n'existe que pendant la frappe (`texte !== null`) ; au repos,
 * l'affichage repart du nombre, et un zéro s'y efface pour ne pas forcer une
 * sélection avant de saisir.
 */
function Montant({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: number;
  onChange: (v: number) => void;
}) {
  const formate = (v: number) => (v === 0 ? "" : String(v));
  const [texte, setTexte] = useState<string | null>(null);
  const affiche = texte ?? formate(valeur);

  return (
    <label className="block">
      <span className={labelStyle}>{label}</span>
      <div className="relative">
        <input
          inputMode="decimal"
          value={affiche}
          onChange={(e) => {
            const propre = filtrerMontant(e.target.value);
            setTexte(propre);
            const n = Number(propre);
            // `Number.isFinite` plutôt que `n || 0` : un montant en cours de
            // frappe comme « 12. » reste un nombre valide (12), on ne veut
            // écraser que du vraiment invalide (chaîne vide, simple point).
            onChange(Number.isFinite(n) ? n : 0);
          }}
          onBlur={() => setTexte(null)}
          className={`${champStyle} pr-12`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-warm-grey pointer-events-none">
          MAD
        </span>
      </div>
    </label>
  );
}

/**
 * Un taux en pourcentage, stocké en fraction (0,0495 = 4,95 %).
 *
 * Même tampon que `Montant`, pour la même raison : sans lui, taper le point
 * décimal de « 5,5 » s'effaçait aussitôt, ce qui interdisait toute saisie
 * autre qu'un nombre entier de pourcents.
 */
function Pourcentage({
  label,
  valeur,
  onChange,
  placeholder,
}: {
  label: string;
  /** Fraction telle que stockée par le schéma (0,0495 = 4,95 %). */
  valeur: number;
  onChange: (v: number) => void;
  placeholder?: string;
}) {
  const formate = (v: number) => (v === 0 ? "" : String(+(v * 100).toFixed(3)));
  const [texte, setTexte] = useState<string | null>(null);
  const affiche = texte ?? formate(valeur);
  const erreur = erreurPourcentage(affiche);

  return (
    <label className="block">
      <span className={labelStyle}>{label}</span>
      <div className="relative">
        <input
          inputMode="decimal"
          value={affiche}
          placeholder={placeholder}
          aria-invalid={!!erreur}
          onChange={(e) => {
            const propre = filtrerPourcentage(e.target.value);
            setTexte(propre);
            const n = Number(propre.replace(",", "."));
            onChange(Number.isFinite(n) ? n / 100 : 0);
          }}
          onBlur={() => setTexte(null)}
          className={`${champStyle} pr-8 ${erreur ? "border-red-400 focus:border-red-500" : ""}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11.5px] text-warm-grey pointer-events-none">
          %
        </span>
      </div>
      {erreur && (
        <span className="block mt-1 text-[11.5px] text-red-600" aria-live="polite">
          {erreur}
        </span>
      )}
    </label>
  );
}

function Liste({
  label,
  valeur,
  options,
  onChange,
}: {
  label: string;
  valeur: string;
  options: readonly string[] | { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const normalisees = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  return (
    <label className="block">
      <span className={labelStyle}>{label}</span>
      <select
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        className={`${champStyle} cursor-pointer`}
      >
        <option value="">—</option>
        {normalisees.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Zone({
  label,
  valeur,
  onChange,
  rows = 3,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className={labelStyle}>{label}</span>
      <textarea
        value={valeur}
        rows={rows}
        maxLength={2000}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-[13.5px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors resize-none"
      />
    </label>
  );
}

function Bascule({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer py-2">
      <input
        type="checkbox"
        checked={valeur}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-bronze cursor-pointer"
      />
      <span className="text-[13px] text-charcoal">{label}</span>
    </label>
  );
}

/**
 * Rien n'est jamais requis pour enregistrer la fiche - elle se remplit au fil
 * des rendez-vous (voir `lib/fiche-audit/schema.ts`). Ce badge ne change donc
 * aucun comportement : il dit juste au conseiller ce qui ne s'applique pas à
 * tout le monde (conjoint, biens locatifs...), pour qu'il ne cherche pas à
 * combler une section qui ne le concerne pas.
 */
function Optionnel() {
  return (
    <span className="ml-2 align-middle text-[10.5px] font-medium normal-case tracking-normal text-warm-grey border border-cream-deep rounded-full px-2 py-0.5">
      Optionnel
    </span>
  );
}

function Section({
  titre,
  aide,
  children,
  optionnelle = false,
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
  optionnelle?: boolean;
}) {
  return (
    <AdminCard className="p-5 sm:p-6">
      <h2 className="font-heading text-[17.5px] font-semibold text-ink">
        {titre}
        {optionnelle && <Optionnel />}
      </h2>
      {aide && <p className="text-[12.5px] text-warm-grey leading-[1.6] mt-1 mb-4">{aide}</p>}
      <div className={aide ? "" : "mt-4"}>{children}</div>
    </AdminCard>
  );
}

const grille = "grid gap-4 sm:grid-cols-2";

/* ------------------------------------------------------------- sous-formes */

function BlocPersonne({
  titre,
  personne,
  onChange,
  compte,
  optionnel = false,
  autrePersonne,
}: {
  titre: string;
  personne: Personne;
  onChange: (p: Personne) => void;
  /**
   * Le titulaire a un compte client : nom, prénom, email et téléphone en
   * viennent déjà et se modifient dans sa fiche, pas ici - les rejouer serait
   * la seule façon dont un audit pourrait finir par les contredire.
   *
   * Verrouillé au cas par cas, jamais en bloc : un champ que le compte n'a
   * jamais renseigné (téléphone manquant, par ex.) resterait sinon verrouillé
   * ET vide - une impasse pour le conseiller qui l'apprend pendant l'entretien.
   * Le conjoint n'a pas de compte, donc `compte` reste `undefined` pour lui.
   */
  compte?: CompteClient;
  /** Le conjoint n'existe pas pour tout le monde ; le titulaire, lui, l'est toujours. */
  optionnel?: boolean;
  /** Le titulaire, passé au conjoint pour repérer un email ou un téléphone dupliqué. */
  autrePersonne?: Personne;
}) {
  const set = <K extends keyof Personne>(cle: K, v: Personne[K]) =>
    onChange({ ...personne, [cle]: v });

  return (
    <div>
      <h3 className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey mb-3">
        {titre}
        {optionnel && <Optionnel />}
      </h3>
      <div className={grille}>
        <Champ
          label="Nom"
          valeur={personne.nom}
          onChange={(v) => set("nom", v)}
          verrouille={!!compte?.nom}
        />
        <Champ
          label="Prénom"
          valeur={personne.prenom}
          onChange={(v) => set("prenom", v)}
          verrouille={!!compte?.prenom}
        />
        <Champ
          label="Email"
          type="email"
          valeur={personne.email}
          onChange={(v) => set("email", v)}
          verrouille={!!compte?.email}
          erreur={
            compte?.email
              ? null
              : (erreurEmail(personne.email) ??
                (autrePersonne && memeEmail(personne.email, autrePersonne.email)
                  ? "Identique à l'email du titulaire."
                  : null))
          }
        />
        <Champ
          label="Téléphone"
          valeur={personne.telephone}
          onChange={(v) => set("telephone", filtrerTelephone(v))}
          verrouille={!!compte?.telephone}
          erreur={
            compte?.telephone
              ? null
              : autrePersonne && memeTelephone(personne.telephone, autrePersonne.telephone)
                ? "Identique au téléphone du titulaire."
                : null
          }
        />
        <Champ
          label="Date de naissance"
          type="date"
          valeur={personne.naissance}
          onChange={(v) => set("naissance", v)}
        />
        <Champ
          label="Profession"
          valeur={personne.profession}
          onChange={(v) => set("profession", v)}
        />
        <Champ
          label="Entreprise"
          valeur={personne.entreprise}
          onChange={(v) => set("entreprise", v)}
        />
        <Champ
          label="Ancienneté"
          valeur={personne.anciennete}
          onChange={(v) => set("anciennete", v)}
          placeholder="ex. 6 ans"
        />
        <Liste
          label="Statut"
          valeur={personne.statut}
          options={STATUTS_PROFESSIONNELS}
          onChange={(v) => set("statut", v as Personne["statut"])}
        />
        <div />
        <Montant
          label="Revenu fixe (brut annuel)"
          valeur={personne.revenuFixe}
          onChange={(v) => set("revenuFixe", v)}
        />
        <Montant
          label="Revenu variable (brut annuel)"
          valeur={personne.revenuVariable}
          onChange={(v) => set("revenuVariable", v)}
        />
      </div>
    </div>
  );
}

function BlocBien({
  bien,
  onChange,
  avecLoyers,
}: {
  bien: Bien;
  onChange: (b: Bien) => void;
  avecLoyers?: boolean;
}) {
  const set = <K extends keyof Bien>(cle: K, v: Bien[K]) => onChange({ ...bien, [cle]: v });
  return (
    <div className={grille}>
      <div className="sm:col-span-2">
        <Champ label="Adresse" valeur={bien.adresse} onChange={(v) => set("adresse", v)} />
      </div>
      <Montant
        label="Valeur estimée"
        valeur={bien.valeurEstimee}
        onChange={(v) => set("valeurEstimee", v)}
      />
      <Montant
        label="Valeur d'achat"
        valeur={bien.valeurAchat}
        onChange={(v) => set("valeurAchat", v)}
      />
      <Montant
        label="Capital emprunté"
        valeur={bien.capitalEmprunte}
        onChange={(v) => set("capitalEmprunte", v)}
      />
      <Montant
        label="Capital restant dû"
        valeur={bien.capitalRestantDu}
        onChange={(v) => set("capitalRestantDu", v)}
      />
      <Montant
        label="Mensualité"
        valeur={bien.mensualites}
        onChange={(v) => set("mensualites", v)}
      />
      <Champ
        label="Durée d'emprunt"
        valeur={bien.dureeEmprunt}
        onChange={(v) => set("dureeEmprunt", v)}
        placeholder="ex. 20 ans"
      />
      {avecLoyers && (
        <Montant
          label="Loyers perçus (mensuels)"
          valeur={bien.loyersPercus}
          onChange={(v) => set("loyersPercus", v)}
        />
      )}
      <Champ
        label="Date d'achat"
        type="date"
        valeur={bien.dateAchat}
        onChange={(v) => set("dateAchat", v)}
      />
      <div className="sm:col-span-2">
        <Zone label="Remarques" valeur={bien.remarques} onChange={(v) => set("remarques", v)} rows={2} />
      </div>
    </div>
  );
}

/** Bouton d'ajout ou de retrait d'une ligne répétable. */
function BoutonLigne({
  children,
  onClick,
  ton = "neutre",
}: {
  children: React.ReactNode;
  onClick: () => void;
  ton?: "neutre" | "retrait";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3.5 inline-flex items-center text-[12.5px] font-medium rounded-lg border transition-colors cursor-pointer ${
        ton === "retrait"
          ? "border-cream-deep text-warm-grey hover:text-red-600 hover:border-red-200"
          : "border-bronze/40 text-bronze-dark hover:bg-cream"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- récapitulatif */

function Chiffre({ label, valeur, note }: { label: string; valeur: string; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-cream-deep last:border-0">
      <span className="text-[12.5px] text-warm-grey">{label}</span>
      <span className="text-right">
        <span className="text-[13.5px] font-medium text-ink tabular-nums">{valeur}</span>
        {note && <span className="block text-[11px] text-warm-grey">{note}</span>}
      </span>
    </div>
  );
}

function pourcent(v: number | null): string {
  return v === null ? "—" : `${(v * 100).toFixed(1).replace(".", ",")} %`;
}

/**
 * Ce que la fiche donne à lire une fois saisie.
 *
 * Les mêmes fonctions que l'export : le conseiller voit à l'écran les chiffres
 * qui sortiront du classeur, et non une seconde implémentation qui pourrait en
 * différer.
 */
export function Recapitulatif({ fiche }: { fiche: FicheAudit }) {
  const c = useMemo(() => calculer(fiche), [fiche]);

  return (
    <div className="space-y-5">
      <AdminCard className="p-5">
        <h3 className="font-heading text-[15px] font-semibold text-ink mb-2">Patrimoine</h3>
        <Chiffre label="Financier" valeur={formatMAD(c.totalFinancier)} />
        <Chiffre label="Immobilier" valeur={formatMAD(c.totalImmobilier)} />
        <Chiffre label="Dettes" valeur={formatMAD(c.totalDettes)} />
        <Chiffre label="Patrimoine net" valeur={formatMAD(c.patrimoineNet)} />
      </AdminCard>

      <AdminCard className="p-5">
        <h3 className="font-heading text-[15px] font-semibold text-ink mb-2">Endettement</h3>
        <Chiffre
          label="Revenu net du foyer"
          valeur={`${formatMAD(c.endettement.revenuMensuelNet)} / mois`}
        />
        <Chiffre label="Après revenus" valeur={pourcent(c.endettement.apresRevenus)} />
        <Chiffre label="Avec les biens locatifs" valeur={pourcent(c.endettement.apresAutresActifs)} />
        <Chiffre label="Total" valeur={pourcent(c.endettement.total)} />
      </AdminCard>

      <AdminCard className="p-5">
        <h3 className="font-heading text-[15px] font-semibold text-ink mb-1">Simulation</h3>
        <p className="text-[11.5px] text-warm-grey leading-[1.5] mb-2">
          Mensualité estimée {formatMAD(c.simulation.mensualite)}.
        </p>
        {c.simulation.verdicts.map((v) => (
          <div
            key={v.libelle}
            className="flex items-baseline justify-between gap-3 py-2 border-b border-cream-deep last:border-0"
          >
            <span className="text-[12.5px] text-warm-grey">{v.libelle}</span>
            <span className="text-right">
              <span
                className={`text-[13.5px] font-medium tabular-nums ${
                  v.conforme === null
                    ? "text-warm-grey"
                    : v.conforme
                      ? "text-emerald-700"
                      : "text-red-600"
                }`}
              >
                {v.valeur}
              </span>
              <span className="block text-[11px] text-warm-grey">{v.attendu}</span>
            </span>
          </div>
        ))}
        <p className="text-[11px] text-warm-grey leading-[1.5] mt-3">
          Les seuils de restant à vivre sont ceux du classeur d&apos;origine
          ({SEUILS.restantSeul} seul, {SEUILS.restantCouple} en couple, +
          {SEUILS.restantParEnfant} par enfant) et restent à arrêter par le cabinet en dirhams.
        </p>
      </AdminCard>
    </div>
  );
}

/* -------------------------------------------------------------- formulaire */

export interface CompteClient {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
}

/**
 * Le compte fait autorité sur ces quatre champs du titulaire. On les impose à
 * l'ouverture - y compris sur une fiche déjà enregistrée - pour qu'une fiche
 * ancienne ne fige pas un nom ou un téléphone que le client a changé depuis.
 * Un champ vide côté compte (téléphone jamais renseigné, par ex.) laisse la
 * valeur déjà saisie dans la fiche plutôt que l'effacer.
 */
function avecInfosCompte(fiche: FicheAudit, compte: CompteClient): FicheAudit {
  return {
    ...fiche,
    titulaire: {
      ...fiche.titulaire,
      nom: compte.nom || fiche.titulaire.nom,
      prenom: compte.prenom || fiche.titulaire.prenom,
      email: compte.email || fiche.titulaire.email,
      telephone: compte.telephone || fiche.titulaire.telephone,
    },
  };
}

export function FicheForm({
  clientId,
  auditId,
  initiale,
  compte,
}: {
  clientId: string;
  auditId: string;
  initiale: FicheAudit;
  compte: CompteClient;
}) {
  const [fiche, setFiche] = useState<FicheAudit>(() => avecInfosCompte(initiale, compte));
  const [state, formAction, pending] = useActionState(enregistrerFiche, initialState);
  const router = useRouter();

  // Lequel des deux boutons a déclenché l'envoi : seul le bouton activé pose
  // son `name`/`value` dans le `FormData`, capturé ici pour décider, une fois
  // le résultat connu, s'il faut rester sur la fiche ou la quitter.
  const [cloture, setCloture] = useState(false);

  useEffect(() => {
    // Clore un dossier n'a rien à faire sur cette page, désormais verrouillée
    // en lecture seule : la table des audits, où le statut « Close » se voit
    // et d'où on peut rouvrir le rapport, est ce qu'un conseiller veut voir
    // ensuite - pas le même formulaire figé sous ses yeux.
    if (state.status === "success" && cloture) {
      router.push(`/admin/clients/${clientId}/patrimoine`);
    }
  }, [state, cloture, router, clientId]);

  const set = <K extends keyof FicheAudit>(cle: K, v: FicheAudit[K]) =>
    setFiche((f) => ({ ...f, [cle]: v }));

  const setImmo = (v: Partial<FicheAudit["immobilier"]>) =>
    setFiche((f) => ({ ...f, immobilier: { ...f.immobilier, ...v } }));

  const bienVide: Bien = {
    adresse: "",
    valeurEstimee: 0,
    valeurAchat: 0,
    capitalEmprunte: 0,
    capitalRestantDu: 0,
    mensualites: 0,
    dureeEmprunt: "",
    dateAchat: "",
    loyersPercus: 0,
    remarques: "",
  };
  const creditVide: Credit = {
    designation: "",
    capitalEmprunte: 0,
    capitalRestantDu: 0,
    mensualites: 0,
    duree: "",
  };
  const ligneVide: LigneFinanciere = {
    detenteur: "",
    type: "",
    libelle: "",
    valeur: 0,
    dateSouscription: "",
    remarques: "",
  };

  return (
    <form
      action={(formData) => {
        formData.set("fiche", JSON.stringify(fiche));
        setCloture(formData.get("terminer") === "1");
        formAction(formData);
        router.refresh();
      }}
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-start"
    >
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="auditId" value={auditId} />

      <fieldset disabled={pending} className="space-y-5 min-w-0">
        <Section
          titre="État civil"
          aide="Le titulaire et, s'il y a lieu, son conjoint. Le foyer ne se saisit qu'une fois."
        >
          <div className="space-y-6">
            <BlocPersonne
              titre="Titulaire"
              personne={fiche.titulaire}
              onChange={(p) => set("titulaire", p)}
              compte={compte}
            />
            <BlocPersonne
              titre="Conjoint"
              personne={fiche.conjoint}
              onChange={(p) => set("conjoint", p)}
              optionnel
              autrePersonne={fiche.titulaire}
            />
          </div>
        </Section>

        <Section titre="Foyer">
          <div className={grille}>
            <Liste
              label="Situation familiale"
              valeur={fiche.foyer.situationFamiliale}
              options={SITUATIONS_FAMILIALES}
              onChange={(v) =>
                set("foyer", {
                  ...fiche.foyer,
                  situationFamiliale: v as FicheAudit["foyer"]["situationFamiliale"],
                })
              }
            />
            <Liste
              label="Régime matrimonial"
              valeur={fiche.foyer.regimeMatrimonial}
              options={REGIMES_MATRIMONIAUX}
              onChange={(v) =>
                set("foyer", {
                  ...fiche.foyer,
                  regimeMatrimonial: v as FicheAudit["foyer"]["regimeMatrimonial"],
                })
              }
            />
            <Champ
              label="Nombre d'enfants"
              type="number"
              valeur={String(fiche.foyer.nbEnfants)}
              onChange={(v) => set("foyer", { ...fiche.foyer, nbEnfants: Number(v) || 0 })}
            />
            <Champ
              label="Âges des enfants"
              valeur={fiche.foyer.agesEnfants}
              onChange={(v) => set("foyer", { ...fiche.foyer, agesEnfants: v })}
              placeholder="ex. 8 et 12 ans"
            />
            <Champ
              label="Personnes à charge (IR)"
              type="number"
              valeur={String(fiche.foyer.personnesACharge)}
              onChange={(v) => set("foyer", { ...fiche.foyer, personnesACharge: Number(v) || 0 })}
            />
            <div />
            <div className="sm:col-span-2">
              <Zone
                label="Remarques"
                valeur={fiche.foyer.remarques}
                onChange={(v) => set("foyer", { ...fiche.foyer, remarques: v })}
              />
            </div>
          </div>
        </Section>

        <Section titre="Fiscalité" optionnelle>
          <div className={grille}>
            <Champ
              label="Réductions"
              valeur={fiche.fiscalite.reductions}
              onChange={(v) => set("fiscalite", { ...fiche.fiscalite, reductions: v })}
            />
            <Champ
              label="Investissements fiscaux"
              valeur={fiche.fiscalite.investissementsFiscaux}
              onChange={(v) =>
                set("fiscalite", { ...fiche.fiscalite, investissementsFiscaux: v })
              }
            />
            <div className="sm:col-span-2">
              <Zone
                label="Remarques"
                valeur={fiche.fiscalite.remarques}
                onChange={(v) => set("fiscalite", { ...fiche.fiscalite, remarques: v })}
              />
            </div>
          </div>
        </Section>

        <Section
          titre="Résidence principale"
          aide="« Loyer ou mensualité » porte ce que le logement coûte chaque mois : c'est le numérateur du taux d'endettement."
        >
          <div className={grille}>
            <Liste
              label="Situation"
              valeur={fiche.immobilier.residencePrincipale.situation}
              options={SITUATIONS_LOGEMENT}
              onChange={(v) =>
                setImmo({
                  residencePrincipale: {
                    ...fiche.immobilier.residencePrincipale,
                    situation: v as FicheAudit["immobilier"]["residencePrincipale"]["situation"],
                  },
                })
              }
            />
            <Montant
              label="Loyer ou mensualité"
              valeur={fiche.immobilier.residencePrincipale.loyerMensualite}
              onChange={(v) =>
                setImmo({
                  residencePrincipale: {
                    ...fiche.immobilier.residencePrincipale,
                    loyerMensualite: v,
                  },
                })
              }
            />
          </div>
          <div className="mt-4">
            <BlocBien
              bien={fiche.immobilier.residencePrincipale}
              onChange={(b) =>
                setImmo({
                  residencePrincipale: { ...b, ...{
                    situation: fiche.immobilier.residencePrincipale.situation,
                    loyerMensualite: fiche.immobilier.residencePrincipale.loyerMensualite,
                  } },
                })
              }
            />
          </div>
        </Section>

        <Section
          titre="Biens locatifs"
          aide="Le classeur du cabinet n'en imprime qu'un : les suivants restent sur la plateforme et sont signalés à l'export."
          optionnelle
        >
          <div className="space-y-5">
            {fiche.immobilier.locatifs.map((bien, i) => (
              <div key={i} className="border border-cream-deep rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey">
                    Bien {i + 1}
                  </span>
                  <BoutonLigne
                    ton="retrait"
                    onClick={() =>
                      setImmo({ locatifs: fiche.immobilier.locatifs.filter((_, j) => j !== i) })
                    }
                  >
                    Retirer
                  </BoutonLigne>
                </div>
                <BlocBien
                  bien={bien}
                  avecLoyers
                  onChange={(b) =>
                    setImmo({
                      locatifs: fiche.immobilier.locatifs.map((x, j) => (j === i ? b : x)),
                    })
                  }
                />
              </div>
            ))}
            <BoutonLigne
              onClick={() => setImmo({ locatifs: [...fiche.immobilier.locatifs, bienVide] })}
            >
              Ajouter un bien locatif
            </BoutonLigne>
          </div>
        </Section>

        <Section titre="Autres crédits" optionnelle>
          <div className="space-y-4">
            {fiche.immobilier.credits.map((credit, i) => (
              <div key={i} className="border border-cream-deep rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey">
                    Crédit {i + 1}
                  </span>
                  <BoutonLigne
                    ton="retrait"
                    onClick={() =>
                      setImmo({ credits: fiche.immobilier.credits.filter((_, j) => j !== i) })
                    }
                  >
                    Retirer
                  </BoutonLigne>
                </div>
                <div className={grille}>
                  <div className="sm:col-span-2">
                    <Champ
                      label="Désignation"
                      valeur={credit.designation}
                      onChange={(v) =>
                        setImmo({
                          credits: fiche.immobilier.credits.map((x, j) =>
                            j === i ? { ...x, designation: v } : x
                          ),
                        })
                      }
                    />
                  </div>
                  <Montant
                    label="Capital emprunté"
                    valeur={credit.capitalEmprunte}
                    onChange={(v) =>
                      setImmo({
                        credits: fiche.immobilier.credits.map((x, j) =>
                          j === i ? { ...x, capitalEmprunte: v } : x
                        ),
                      })
                    }
                  />
                  <Montant
                    label="Capital restant dû"
                    valeur={credit.capitalRestantDu}
                    onChange={(v) =>
                      setImmo({
                        credits: fiche.immobilier.credits.map((x, j) =>
                          j === i ? { ...x, capitalRestantDu: v } : x
                        ),
                      })
                    }
                  />
                  <Montant
                    label="Mensualité"
                    valeur={credit.mensualites}
                    onChange={(v) =>
                      setImmo({
                        credits: fiche.immobilier.credits.map((x, j) =>
                          j === i ? { ...x, mensualites: v } : x
                        ),
                      })
                    }
                  />
                  <Champ
                    label="Durée"
                    valeur={credit.duree}
                    onChange={(v) =>
                      setImmo({
                        credits: fiche.immobilier.credits.map((x, j) =>
                          j === i ? { ...x, duree: v } : x
                        ),
                      })
                    }
                  />
                </div>
              </div>
            ))}
            <BoutonLigne
              onClick={() => setImmo({ credits: [...fiche.immobilier.credits, creditVide] })}
            >
              Ajouter un crédit
            </BoutonLigne>
          </div>
        </Section>

        <Section
          titre="Patrimoine financier"
          aide="Chaque ligne valorisée alimente le patrimoine du client : elle apparaît dans l'onglet Patrimoine et sur son tableau de bord."
          optionnelle
        >
          <div className="space-y-4">
            {fiche.financier.map((ligne, i) => (
              <div key={i} className="border border-cream-deep rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey">
                    Ligne {i + 1}
                  </span>
                  <BoutonLigne
                    ton="retrait"
                    onClick={() => set("financier", fiche.financier.filter((_, j) => j !== i))}
                  >
                    Retirer
                  </BoutonLigne>
                </div>
                <div className={grille}>
                  <Liste
                    label="Type"
                    valeur={ligne.type}
                    options={ASSET_TYPES}
                    onChange={(v) =>
                      set(
                        "financier",
                        fiche.financier.map((x, j) => (j === i ? { ...x, type: v } : x))
                      )
                    }
                  />
                  <Champ
                    label="Libellé"
                    valeur={ligne.libelle}
                    placeholder="ex. OPCVM actions - Attijari"
                    onChange={(v) =>
                      set(
                        "financier",
                        fiche.financier.map((x, j) => (j === i ? { ...x, libelle: v } : x))
                      )
                    }
                  />
                  <Montant
                    label="Valeur actuelle"
                    valeur={ligne.valeur}
                    onChange={(v) =>
                      set(
                        "financier",
                        fiche.financier.map((x, j) => (j === i ? { ...x, valeur: v } : x))
                      )
                    }
                  />
                  <Champ
                    label="Date de souscription"
                    type="date"
                    valeur={ligne.dateSouscription}
                    onChange={(v) =>
                      set(
                        "financier",
                        fiche.financier.map((x, j) =>
                          j === i ? { ...x, dateSouscription: v } : x
                        )
                      )
                    }
                  />
                  <div className="sm:col-span-2">
                    <Champ
                      label="Remarques"
                      valeur={ligne.remarques}
                      onChange={(v) =>
                        set(
                          "financier",
                          fiche.financier.map((x, j) => (j === i ? { ...x, remarques: v } : x))
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <BoutonLigne onClick={() => set("financier", [...fiche.financier, ligneVide])}>
              Ajouter une ligne
            </BoutonLigne>
          </div>
        </Section>

        <Section titre="Objectifs et profil">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-8">
              <Bascule
                label="US person"
                valeur={fiche.profil.usPerson}
                onChange={(v) => set("profil", { ...fiche.profil, usPerson: v })}
              />
              <Bascule
                label="Personne politiquement exposée"
                valeur={fiche.profil.politiquementExpose}
                onChange={(v) => set("profil", { ...fiche.profil, politiquementExpose: v })}
              />
              <Bascule
                label="Biens divers"
                valeur={fiche.profil.biensDivers}
                onChange={(v) => set("profil", { ...fiche.profil, biensDivers: v })}
              />
            </div>
            <div className={grille}>
              <Montant
                label="Effort d'épargne mensuel"
                valeur={fiche.profil.effortEpargne}
                onChange={(v) => set("profil", { ...fiche.profil, effortEpargne: v })}
              />
            </div>
            <div>
              <span className={labelStyle}>Objectifs</span>
              <div className="space-y-2">
                {fiche.profil.objectifs.map((objectif, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={objectif}
                      placeholder="ex. Préparer la retraite"
                      onChange={(e) =>
                        set("profil", {
                          ...fiche.profil,
                          objectifs: fiche.profil.objectifs.map((x, j) =>
                            j === i ? e.target.value : x
                          ),
                        })
                      }
                      // Un objectif collé d'un bloc (« Retraite, études, diversifier. »)
                      // se répartit en plusieurs lignes dès qu'on le quitte, plutôt
                      // que de laisser une virgule ou un point traîner dans une
                      // seule case.
                      onBlur={() => {
                        const eclats = decouperObjectifs(objectif);
                        if (eclats.length > 1) {
                          set("profil", {
                            ...fiche.profil,
                            objectifs: [
                              ...fiche.profil.objectifs.slice(0, i),
                              ...eclats,
                              ...fiche.profil.objectifs.slice(i + 1),
                            ].slice(0, MAX_OBJECTIFS),
                          });
                        }
                      }}
                      className={`${champStyle} flex-1`}
                    />
                    <BoutonLigne
                      ton="retrait"
                      onClick={() =>
                        set("profil", {
                          ...fiche.profil,
                          objectifs: fiche.profil.objectifs.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Retirer
                    </BoutonLigne>
                  </div>
                ))}
                {fiche.profil.objectifs.length === 0 && (
                  <p className="text-[12.5px] text-warm-grey">Aucun objectif pour l&apos;instant.</p>
                )}
                {fiche.profil.objectifs.length < MAX_OBJECTIFS && (
                  <BoutonLigne
                    onClick={() =>
                      set("profil", {
                        ...fiche.profil,
                        objectifs: [...fiche.profil.objectifs, ""],
                      })
                    }
                  >
                    Ajouter un objectif
                  </BoutonLigne>
                )}
              </div>
            </div>
          </div>
        </Section>

        <Section
          titre="Simulation OPCI"
          aide="L'équivalent marocain de la SCPI du classeur d'origine. Les ratios se recalculent à droite pendant la saisie."
          optionnelle
        >
          <div className={grille}>
            <Montant
              label="Montant d'investissement"
              valeur={fiche.simulation.montant}
              onChange={(v) => set("simulation", { ...fiche.simulation, montant: v })}
            />
            <Pourcentage
              label="Taux hors assurance (%)"
              valeur={fiche.simulation.tauxHorsAssurance}
              onChange={(v) =>
                set("simulation", { ...fiche.simulation, tauxHorsAssurance: v })
              }
              placeholder="ex. 4,95"
            />
            <Champ
              label="Durée du prêt (mois)"
              type="number"
              valeur={fiche.simulation.dureeMois === 0 ? "" : String(fiche.simulation.dureeMois)}
              onChange={(v) =>
                set("simulation", { ...fiche.simulation, dureeMois: Number(v) || 0 })
              }
            />
          </div>
          <p className="text-[11.5px] text-warm-grey mt-3">
            Rendement locatif retenu : 5,5 % - fixé par le classeur d&apos;origine, non modifiable.
          </p>
        </Section>
      </fieldset>

      <div className="lg:sticky lg:top-6 space-y-5">
        <Recapitulatif fiche={fiche} />

        <AdminCard className="p-5">
          {state.status === "error" && state.message && (
            <p className="text-[12.5px] text-red-600 mb-3" aria-live="polite">
              {state.message}
            </p>
          )}
          {state.status === "success" && (
            <p className="text-[12.5px] text-emerald-700 mb-3" aria-live="polite">
              Fiche enregistrée.
            </p>
          )}
          <div className="flex flex-col gap-2.5">
            <button
              type="submit"
              disabled={pending}
              className="h-10 px-5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {pending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="submit"
              name="terminer"
              value="1"
              disabled={pending}
              className="h-10 px-5 text-[13px] font-medium text-ink border border-cream-deep rounded-lg hover:border-bronze disabled:opacity-40 transition-colors cursor-pointer"
            >
              Enregistrer et clore l&apos;audit
            </button>
          </div>
          <p className="text-[11.5px] text-warm-grey leading-[1.5] mt-3">
            L&apos;enregistrement met à jour le patrimoine du client à partir des lignes
            valorisées.
          </p>
        </AdminCard>
      </div>
    </form>
  );
}
