"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { sendPartenariatNotification } from "@/lib/email/partenariat";
import {
  partnerCategoryLabels,
  gestionFondsOptions,
  assureurProduitOptions,
  ouiNonOptions,
  immoBienOptions,
  fondsLeveeOptions,
  fondsStadeOptions,
  clubNatureOptions,
  COMPANY_MAX,
  SHORT_TEXT_MAX,
  DETAIL_MAX,
} from "@/lib/partenariat-options";
import { NAME_REGEX, NAME_MAX, EMAIL_MAX, MESSAGE_MAX, validatePhoneFull } from "@/lib/validation";

export interface PartenariatState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Montant en dirhams : entier positif, plafonné pour rester dans `numeric`. */
const montant = (label: string) =>
  z.coerce
    .number({ message: `${label} est obligatoire.` })
    .int(`${label} doit être un nombre entier.`)
    .min(0, `${label} doit être positif.`)
    .max(1e13, `${label} est trop élevé.`);

/** Pourcentage : 0 à 100, deux décimales au plus. */
const pourcentage = (label: string) =>
  z.coerce
    .number({ message: `${label} est obligatoire.` })
    .min(0, `${label} doit être positif.`)
    .max(100, `${label} ne peut pas dépasser 100.`);

const texteCourt = (label: string) =>
  z.string().trim().min(2, `${label} est trop court.`).max(SHORT_TEXT_MAX, `${label} est trop long.`);

const detail = (label: string) =>
  z.string().trim().min(10, `${label} est trop court.`).max(DETAIL_MAX, `${label} est trop long.`);

const commun = {
  name: z
    .string()
    .trim()
    .min(2, "Le nom est trop court.")
    .max(NAME_MAX, "Le nom est trop long.")
    .regex(NAME_REGEX, "Le nom ne doit contenir que des lettres."),
  company: z
    .string()
    .trim()
    .min(2, "Le nom de la société est trop court.")
    .max(COMPANY_MAX, "Le nom de la société est trop long."),
  email: z.email("Veuillez entrer une adresse email valide.").max(EMAIL_MAX),
  phone: z
    .string()
    .trim()
    .refine((v) => validatePhoneFull(v) === null, "Numéro de téléphone invalide."),
  description: z.string().trim().max(MESSAGE_MAX, "La description est trop longue."),
};

/**
 * Un schéma par catégorie, discriminé sur `category`. Les champs spécifiques
 * sont ceux affichés par le formulaire pour cette catégorie ; ceux des autres
 * catégories, absents du DOM, ne sont pas envoyés.
 */
const schema = z.discriminatedUnion("category", [
  z.object({
    category: z.literal("gestion"),
    ...commun,
    typeFonds: z.enum(gestionFondsOptions, { message: "Sélectionnez un type de fonds." }),
    encours: montant("L'encours sous gestion"),
    frais: pourcentage("Les frais de gestion"),
    performance: detail("Le track record"),
  }),
  z.object({
    category: z.literal("assureur"),
    ...commun,
    typeProduit: z.enum(assureurProduitOptions, { message: "Sélectionnez un type de produit." }),
    frais: pourcentage("Les frais de gestion"),
    fondsDirhams: z.enum(ouiNonOptions, { message: "Précisez si un fonds en dirhams est disponible." }),
    specificites: detail("Les spécificités du contrat"),
  }),
  z.object({
    category: z.literal("immo"),
    ...commun,
    typeBien: z.enum(immoBienOptions, { message: "Sélectionnez un type de bien." }),
    localisation: texteCourt("La localisation"),
    prix: montant("Le prix de vente"),
    rendement: pourcentage("Le rendement locatif"),
  }),
  z.object({
    category: z.literal("fonds"),
    ...commun,
    typeLevee: z.enum(fondsLeveeOptions, { message: "Sélectionnez un type de levée." }),
    stade: z.enum(fondsStadeOptions, { message: "Sélectionnez un stade." }),
    secteur: texteCourt("Le secteur cible"),
    montantRecherche: montant("Le montant recherché"),
    ticketMinimum: montant("Le ticket d'entrée"),
  }),
  z.object({
    category: z.literal("club"),
    ...commun,
    nature: z.enum(clubNatureOptions, { message: "Sélectionnez la nature du partenariat." }),
    montant: montant("Le montant à mobiliser"),
    coInvestisseurs: z.coerce
      .number({ message: "Le nombre de co-investisseurs est obligatoire." })
      .int()
      .min(1, "Il faut au moins un co-investisseur.")
      .max(10000, "Le nombre de co-investisseurs est trop élevé."),
  }),
]);

type Donnees = z.infer<typeof schema>;

const mad = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "MAD", maximumFractionDigits: 0 });
const pct = (n: number) => `${n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;

/**
 * `partner_submissions` n'a qu'une colonne `message` : les champs propres à la
 * catégorie y sont écrits en lignes « Libellé : valeur », lisibles telles
 * quelles dans le back-office et dans l'email d'alerte.
 */
function formaterDetails(d: Donnees): string {
  const lignes: [string, string][] = [];
  switch (d.category) {
    case "gestion":
      lignes.push(
        ["Type de fonds", d.typeFonds],
        ["Encours sous gestion", mad.format(d.encours)],
        ["Frais de gestion", pct(d.frais)],
        ["Track record", d.performance]
      );
      break;
    case "assureur":
      lignes.push(
        ["Type de produit", d.typeProduit],
        ["Frais de gestion", pct(d.frais)],
        ["Fonds en dirhams", d.fondsDirhams],
        ["Spécificités", d.specificites]
      );
      break;
    case "immo":
      lignes.push(
        ["Type de bien", d.typeBien],
        ["Localisation", d.localisation],
        ["Prix de vente", mad.format(d.prix)],
        ["Rendement locatif estimé", pct(d.rendement)]
      );
      break;
    case "fonds":
      lignes.push(
        ["Type de levée", d.typeLevee],
        ["Stade", d.stade],
        ["Secteur cible", d.secteur],
        ["Montant recherché", mad.format(d.montantRecherche)],
        ["Ticket d'entrée minimum", mad.format(d.ticketMinimum)]
      );
      break;
    case "club":
      lignes.push(
        ["Nature du partenariat", d.nature],
        ["Montant à mobiliser", mad.format(d.montant)],
        ["Co-investisseurs", String(d.coInvestisseurs)]
      );
      break;
  }
  if (d.description) lignes.push(["Description complémentaire", d.description]);
  return lignes.map(([k, v]) => `${k} : ${v}`).join("\n");
}

export async function submitPartenariat(
  _previous: PartenariatState,
  formData: FormData
): Promise<PartenariatState> {
  const brut: Record<string, FormDataEntryValue> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") brut[key] = value;
  });

  const parsed = schema.safeParse(brut);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  if (!(await rateLimit("partenariat", { max: 5, windowSeconds: 600 }))) {
    return {
      status: "error",
      message: "Trop de propositions envoyées. Merci de patienter quelques minutes avant de réessayer.",
    };
  }

  const d = parsed.data;
  const partnerType = partnerCategoryLabels[d.category];
  const message = formaterDetails(d);

  const supabase = await createClient();
  const { error } = await supabase.from("partner_submissions").insert({
    name: d.name,
    company: d.company,
    email: d.email,
    phone: d.phone,
    partner_type: partnerType,
    message,
    status: "nouveau",
  });

  if (error) {
    return {
      status: "error",
      message: "Une erreur est survenue. Veuillez réessayer dans un instant.",
    };
  }

  await sendPartenariatNotification({
    name: d.name,
    company: d.company,
    email: d.email,
    phone: d.phone,
    partnerType,
    message,
  });

  return { status: "success" };
}
