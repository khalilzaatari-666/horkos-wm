import { z } from "zod";

/**
 * La fiche d'audit patrimonial, telle que le conseiller la remplit au R0.
 *
 * Elle reprend le classeur Excel du cabinet (`docs/modele-audit.xlsx`), adapté
 * au marché marocain : dirham plutôt qu'euro, OPCI plutôt que SCPI, personnes à
 * charge plutôt que parts fiscales - le quotient familial est une notion
 * française sans équivalent dans l'IR marocain.
 *
 * Ce qui se calcule n'est pas ici : le taux d'endettement, les totaux et les
 * ratios du simulateur se déduisent de ces champs (voir `calculs.ts`). Les
 * stocker reviendrait à laisser une saisie contredire son propre résultat.
 *
 * La fiche est enregistrée telle quelle dans `audits.data` (jsonb). `version`
 * permet de reconnaître les fiches d'un ancien modèle si le formulaire change.
 */

export const VERSION_FICHE = 1;

const texte = (max = 300) => z.string().trim().max(max);
const texteLong = z.string().trim().max(2000);

/**
 * Un montant en dirhams.
 *
 * Le formulaire envoie des chaînes : un champ vide devient 0 plutôt qu'une
 * erreur, un conseiller n'ayant aucune raison de saisir un zéro explicite pour
 * dire « pas de crédit ». Les négatifs sont refusés - une valeur d'actif ou une
 * mensualité négative n'est jamais une saisie volontaire.
 */
const montant = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
  z.number().min(0, "Montant négatif").max(1e12).finite()
);

const entier = (max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
    z.number().int().min(0).max(max)
  );

/** Un taux exprimé en fraction (0,0495 = 4,95 %). */
const taux = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : Number(v)),
  z.number().min(0).max(1)
);

/** Date `YYYY-MM-DD`, ou vide. Les dates du modèle sont souvent approximatives. */
const dateIso = z.union([z.iso.date(), z.literal("")]).default("");

/**
 * Un objectif par ligne du classeur (`OBJECTIFS ET EFFORT`, B12:B41) : trente
 * lignes au maximum, voir `export.ts`.
 */
export const MAX_OBJECTIFS = 30;

/**
 * Éclate un texte en objectifs distincts, sur la ponctuation ou un retour à la
 * ligne. Sert deux fois : une fois pour relire une fiche d'avant ce champ
 * répétable (l'ancien champ libre était une seule chaîne), une fois pour
 * répartir un paragraphe collé dans une seule ligne du formulaire.
 */
export function decouperObjectifs(contenu: string): string[] {
  return contenu
    .replace(/\r?\n/g, ".")
    .split(/[.,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_OBJECTIFS);
}

/** Une fiche enregistrée avant ce champ répétable portait une seule chaîne. */
const objectifsSchema = z.preprocess(
  (v) => (typeof v === "string" ? decouperObjectifs(v) : v),
  z.array(texte(300)).max(MAX_OBJECTIFS).default([])
);

export const SITUATIONS_FAMILIALES = [
  "Célibataire",
  "Marié(e)",
  "Divorcé(e)",
  "Veuf(ve)",
] as const;

export const REGIMES_MATRIMONIAUX = [
  "Séparation de biens",
  "Communauté des biens",
  "Sans contrat",
] as const;

export const STATUTS_PROFESSIONNELS = [
  "Salarié(e) CDI",
  "Salarié(e) CDD",
  "Fonctionnaire",
  "Indépendant(e)",
  "Chef d'entreprise",
  "Profession libérale",
  "Retraité(e)",
  "Sans activité",
] as const;

export const SITUATIONS_LOGEMENT = [
  "Propriétaire",
  "Locataire",
  "Logé(e) à titre gratuit",
] as const;

const personneSchema = z.object({
  nom: texte(120).default(""),
  prenom: texte(120).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  telephone: texte(40).default(""),
  naissance: dateIso,
  profession: texte(160).default(""),
  entreprise: texte(160).default(""),
  anciennete: texte(60).default(""),
  statut: z.enum(STATUTS_PROFESSIONNELS).or(z.literal("")).default(""),
  /** Brut annuel : le modèle sépare la part fixe de la part variable. */
  revenuFixe: montant.default(0),
  revenuVariable: montant.default(0),
});

const bienSchema = z.object({
  adresse: texte(300).default(""),
  valeurEstimee: montant.default(0),
  valeurAchat: montant.default(0),
  capitalEmprunte: montant.default(0),
  capitalRestantDu: montant.default(0),
  mensualites: montant.default(0),
  dureeEmprunt: texte(60).default(""),
  dateAchat: dateIso,
  loyersPercus: montant.default(0),
  remarques: texteLong.default(""),
});

const creditSchema = z.object({
  designation: texte(200).default(""),
  capitalEmprunte: montant.default(0),
  capitalRestantDu: montant.default(0),
  mensualites: montant.default(0),
  duree: texte(60).default(""),
});

const ligneFinanciereSchema = z.object({
  detenteur: texte(120).default(""),
  /** Aligné sur `ASSET_TYPES` : c'est ce qui permet d'alimenter le patrimoine. */
  type: texte(40).default(""),
  libelle: texte(200).default(""),
  valeur: montant.default(0),
  dateSouscription: dateIso,
  remarques: texte(300).default(""),
});

export const ficheAuditSchema = z.object({
  version: z.number().int().default(VERSION_FICHE),

  titulaire: personneSchema,
  /** Le modèle prévoit deux colonnes : le conjoint reste facultatif. */
  conjoint: personneSchema,

  foyer: z.object({
    situationFamiliale: z.enum(SITUATIONS_FAMILIALES).or(z.literal("")).default(""),
    regimeMatrimonial: z.enum(REGIMES_MATRIMONIAUX).or(z.literal("")).default(""),
    nbEnfants: entier(15).default(0),
    agesEnfants: texte(120).default(""),
    /**
     * Personnes à charge au sens de l'IR marocain (déduction plafonnée à six),
     * là où le modèle français comptait des parts fiscales.
     */
    personnesACharge: entier(6).default(0),
    remarques: texteLong.default(""),
  }),

  fiscalite: z.object({
    reductions: texte(300).default(""),
    investissementsFiscaux: texte(300).default(""),
    remarques: texteLong.default(""),
  }),

  immobilier: z.object({
    residencePrincipale: bienSchema.extend({
      situation: z.enum(SITUATIONS_LOGEMENT).or(z.literal("")).default(""),
      /** Loyer si locataire, mensualité de crédit si propriétaire. */
      loyerMensualite: montant.default(0),
    }),
    locatifs: z.array(bienSchema).max(10).default([]),
    credits: z.array(creditSchema).max(10).default([]),
  }),

  financier: z.array(ligneFinanciereSchema).max(40).default([]),

  profil: z.object({
    usPerson: z.boolean().default(false),
    politiquementExpose: z.boolean().default(false),
    biensDivers: z.boolean().default(false),
    /** Capacité d'épargne mensuelle. */
    effortEpargne: montant.default(0),
    objectifs: objectifsSchema,
  }),

  simulation: z.object({
    /** Montant envisagé en OPCI - l'équivalent marocain de la SCPI du modèle. */
    montant: montant.default(0),
    tauxHorsAssurance: taux.default(0),
    dureeMois: entier(480).default(0),
    /**
     * Pas de rendement locatif ici : le classeur d'origine l'écrit en dur
     * dans sa formule (5,5 %, `RENDEMENT_OPCI_DEFAUT` dans `calculs.ts`),
     * sans cellule d'entrée à lui faire correspondre. Un champ modifiable
     * ferait diverger le résultat de celui du classeur.
     */
  }),
}).superRefine((fiche, ctx) => {
  // Un conjoint qui partage l'email ou le téléphone du titulaire n'est pas un
  // second contact : c'est la même personne saisie deux fois, ce que le
  // classeur d'origine ne permettait pas de repérer.
  const email1 = fiche.titulaire.email.trim().toLowerCase();
  const email2 = fiche.conjoint.email.trim().toLowerCase();
  if (email1 && email1 === email2) {
    ctx.addIssue({
      code: "custom",
      path: ["conjoint", "email"],
      message: "Identique à l'email du titulaire.",
    });
  }

  // Comparés chiffre à chiffre : « 06 12 34 56 78 » et « 0612345678 » sont le
  // même numéro sous deux mises en forme différentes.
  const tel1 = fiche.titulaire.telephone.replace(/\D/g, "");
  const tel2 = fiche.conjoint.telephone.replace(/\D/g, "");
  if (tel1 && tel1 === tel2) {
    ctx.addIssue({
      code: "custom",
      path: ["conjoint", "telephone"],
      message: "Identique au téléphone du titulaire.",
    });
  }
});

export type FicheAudit = z.infer<typeof ficheAuditSchema>;
export type Personne = z.infer<typeof personneSchema>;
export type Bien = z.infer<typeof bienSchema>;
export type Credit = z.infer<typeof creditSchema>;
export type LigneFinanciere = z.infer<typeof ligneFinanciereSchema>;

/**
 * Une fiche vide, complète et typée.
 *
 * Zod remplit tous les défauts à partir d'un objet vide : la valeur initiale du
 * formulaire et celle d'un audit jamais rempli sortent donc du même endroit que
 * la validation, et ne peuvent pas diverger.
 */
export function ficheVide(): FicheAudit {
  return ficheAuditSchema.parse({
    titulaire: {},
    conjoint: {},
    foyer: {},
    fiscalite: {},
    immobilier: { residencePrincipale: {} },
    profil: {},
    simulation: {},
  });
}

/**
 * Relit ce qui a été stocké dans `audits.data`.
 *
 * Une fiche enregistrée par une version antérieure du formulaire peut manquer
 * de champs ; les défauts la complètent. Un contenu illisible rend une fiche
 * vide plutôt qu'une erreur : le conseiller doit pouvoir rouvrir et corriger,
 * pas se heurter à une page morte.
 */
export function lireFiche(data: unknown): FicheAudit {
  const parsed = ficheAuditSchema.safeParse(data ?? {});
  return parsed.success ? parsed.data : ficheVide();
}
