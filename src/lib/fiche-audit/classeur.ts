import { creerClasseur, type Cellule, type Feuille, type Ligne } from "@/lib/xlsx/generateur";
import { assetTypeLabel } from "@/lib/patrimoine";
import { calculer } from "./calculs";
import type { Bien, Credit, FicheAudit, Personne } from "./schema";

/**
 * Le classeur d'audit du cabinet, construit à partir de la fiche.
 *
 * Six feuilles, une par chapitre de l'entretien, dans l'ordre où il se déroule :
 * ce qu'on retient (Synthèse), qui est en face (Foyer et revenus), ce qu'il
 * possède (Immobilier, Financier), ce qu'il vise (Objectifs), et ce qu'on lui
 * propose (Simulation).
 *
 * Aucune limite de lignes, contrairement au remplissage du gabarit : chaque
 * tableau fait la taille de la donnée. C'est toute la raison d'être de ce
 * module - un dossier avec six biens locatifs sortait amputé de cinq.
 */

const LARGE = 46;
const MOYEN = 22;

function texte(valeur: string | null | undefined): string | null {
  const propre = (valeur ?? "").trim();
  return propre === "" ? null : propre;
}

/** Un montant nul ne s'écrit pas : une case vide se lit mieux qu'un « 0 MAD ». */
function argent(valeur: number | null | undefined): number | null {
  return valeur && valeur > 0 ? valeur : null;
}

/** « 2026-03-14 » → « 14/03/2026 ». Les dates de la fiche sont des chaînes. */
function jour(valeur: string | null | undefined): string | null {
  const propre = (valeur ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(propre)) return texte(propre);
  const [a, m, j] = propre.split("-");
  return `${j}/${m}/${a}`;
}

function ouiNon(valeur: boolean): string {
  return valeur ? "Oui" : "Non";
}

function nomComplet(p: Personne): string {
  return [p.prenom, p.nom].filter(Boolean).join(" ").trim();
}

// ---------------------------------------------------------------------------
// Briques de mise en page
// ---------------------------------------------------------------------------

/** Le bandeau sombre qui ouvre chaque feuille. */
function enTeteFeuille(titre: string, sousTitre: string, colonnes: number): Ligne[] {
  return [
    { cellules: [{ v: titre, style: "titre", fusion: colonnes }], hauteur: 34 },
    { cellules: [{ v: sousTitre, style: "sousTitre", fusion: colonnes }], hauteur: 20 },
    { cellules: [] },
  ];
}

/** Un titre de section, sur fond bronze clair. */
function section(titre: string, colonnes: number): Ligne {
  return { cellules: [{ v: titre, style: "section", fusion: colonnes }], hauteur: 26 };
}

/** Une ligne d'en-têtes de tableau. */
function enTetes(libelles: string[]): Ligne {
  return {
    cellules: libelles.map((v) => ({ v, style: "enTete" }) as Cellule),
    hauteur: 22,
  };
}

/**
 * Une paire libellé / valeur. Le libellé occupe la première colonne, la valeur
 * s'étale sur le reste : c'est la forme la plus lisible pour de l'état civil,
 * où les valeurs sont longues et irrégulières.
 */
function paire(
  libelle: string,
  valeur: string | number | null,
  style: Cellule["style"] = "texte",
  colonnes = 3
): Ligne {
  return {
    cellules: [
      { v: libelle, style: "libelle" },
      { v: valeur, style, fusion: colonnes - 1 },
    ],
  };
}

/** Une ligne vide, pour respirer entre deux blocs. */
const vide: Ligne = { cellules: [] };

// ---------------------------------------------------------------------------
// Feuilles
// ---------------------------------------------------------------------------

function feuilleSynthese(fiche: FicheAudit, c: ReturnType<typeof calculer>, date: Date): Feuille {
  const lignes: Ligne[] = [
    ...enTeteFeuille(
      "Horkos Wealth Management",
      `Fiche d'audit patrimonial - ${nomComplet(fiche.titulaire) || "Client"} - ${jour(
        date.toISOString().slice(0, 10)
      )}`,
      4
    ),

    section("Patrimoine", 4),
    {
      cellules: [
        { v: "Patrimoine brut", style: "kpiLibelle" },
        { v: argent(c.patrimoineBrut), style: "kpiValeur" },
        { v: "Dettes en cours", style: "kpiLibelle" },
        { v: argent(c.totalDettes), style: "kpiValeur" },
      ],
      hauteur: 28,
    },
    {
      cellules: [
        { v: "Patrimoine net", style: "kpiLibelle" },
        { v: c.patrimoineNet !== 0 ? c.patrimoineNet : null, style: "kpiValeur" },
        { v: "Revenus nets du foyer / mois", style: "kpiLibelle" },
        { v: argent(c.endettement.revenuMensuelNet), style: "kpiValeur" },
      ],
      hauteur: 28,
    },
    vide,

    section("Répartition", 4),
    enTetes(["Poste", "Montant", "Part du brut", ""]),
    {
      cellules: [
        { v: "Immobilier", style: "texte" },
        { v: argent(c.totalImmobilier), style: "montant" },
        {
          v: c.patrimoineBrut > 0 ? c.totalImmobilier / c.patrimoineBrut : null,
          style: "pourcent",
        },
        { v: null, style: "texte" },
      ],
    },
    {
      cellules: [
        { v: "Financier", style: "texte" },
        { v: argent(c.totalFinancier), style: "montant" },
        {
          v: c.patrimoineBrut > 0 ? c.totalFinancier / c.patrimoineBrut : null,
          style: "pourcent",
        },
        { v: null, style: "texte" },
      ],
    },
    {
      cellules: [
        { v: "Patrimoine brut", style: "total" },
        { v: argent(c.patrimoineBrut), style: "totalMontant" },
        { v: null, style: "total" },
        { v: null, style: "total" },
      ],
    },
    vide,

    section("Endettement", 4),
    enTetes(["Lecture", "Taux", "Détail", ""]),
    {
      cellules: [
        { v: "Sur les seuls revenus du travail", style: "texte" },
        { v: c.endettement.apresRevenus, style: "pourcent" },
        { v: "Charge de logement / revenus nets", style: "texteGris" },
        { v: null, style: "texte" },
      ],
    },
    {
      cellules: [
        { v: "En tenant compte du locatif", style: "texte" },
        { v: c.endettement.apresAutresActifs, style: "pourcent" },
        { v: "Loyers retenus à 70 %", style: "texteGris" },
        { v: null, style: "texte" },
      ],
    },
    {
      cellules: [
        { v: "Toutes charges comprises", style: "total" },
        { v: c.endettement.total, style: "pourcent" },
        { v: "Y compris les autres crédits", style: "total" },
        { v: null, style: "total" },
      ],
    },
    vide,
    {
      cellules: [
        {
          v: "Montants en dirhams. Les taux et totaux sont calculés par la plateforme à partir de la fiche ; ils ne sont pas saisis.",
          style: "note",
          fusion: 4,
        },
      ],
    },
  ];

  return { nom: "Synthèse", colonnes: [34, MOYEN, 34, MOYEN], lignes, figer: 2 };
}

function blocPersonne(titre: string, p: Personne): Ligne[] {
  return [
    section(titre, 4),
    paire("Nom", texte(p.nom), "texte", 4),
    paire("Prénom", texte(p.prenom), "texte", 4),
    paire("Date de naissance", jour(p.naissance), "date", 4),
    paire("Email", texte(p.email), "texte", 4),
    paire("Téléphone", texte(p.telephone), "texte", 4),
    paire("Profession", texte(p.profession), "texte", 4),
    paire("Entreprise", texte(p.entreprise), "texte", 4),
    paire("Ancienneté", texte(p.anciennete), "texte", 4),
    paire("Statut", texte(p.statut), "texte", 4),
    paire("Revenu fixe (brut annuel)", argent(p.revenuFixe), "montant", 4),
    paire("Revenu variable (brut annuel)", argent(p.revenuVariable), "montant", 4),
    vide,
  ];
}

function feuilleFoyer(fiche: FicheAudit, c: ReturnType<typeof calculer>): Feuille {
  const { foyer, fiscalite } = fiche;

  const lignes: Ligne[] = [
    ...enTeteFeuille("Foyer et revenus", "État civil, situation familiale, revenus et fiscalité", 4),
    ...blocPersonne("Titulaire", fiche.titulaire),
  ];

  // Le conjoint n'apparaît que s'il existe : une colonne vide donne l'air d'un
  // dossier bâclé là où il n'y a simplement personne à inscrire.
  if (nomComplet(fiche.conjoint) || fiche.conjoint.email || fiche.conjoint.revenuFixe > 0) {
    lignes.push(...blocPersonne("Conjoint", fiche.conjoint));
  }

  lignes.push(
    section("Foyer", 4),
    paire("Situation familiale", texte(foyer.situationFamiliale), "texte", 4),
    paire("Régime matrimonial", texte(foyer.regimeMatrimonial), "texte", 4),
    paire("Enfants", foyer.nbEnfants > 0 ? foyer.nbEnfants : null, "nombre", 4),
    paire("Âges des enfants", texte(foyer.agesEnfants), "texte", 4),
    paire("Personnes à charge", foyer.personnesACharge > 0 ? foyer.personnesACharge : null, "nombre", 4),
    paire("Remarques", texte(foyer.remarques), "texte", 4),
    vide,

    section("Revenus consolidés", 4),
    paire("Brut annuel titulaire", argent(c.brutTitulaire), "montant", 4),
    paire("Brut annuel conjoint", argent(c.brutConjoint), "montant", 4),
    paire("Brut annuel du foyer", argent(c.brutFoyer), "montant", 4),
    paire("Net mensuel du foyer", argent(c.endettement.revenuMensuelNet), "montant", 4),
    vide,

    section("Fiscalité", 4),
    paire("Réductions d'impôt", texte(fiscalite.reductions), "texte", 4),
    paire("Investissements fiscaux", texte(fiscalite.investissementsFiscaux), "texte", 4),
    paire("Remarques", texte(fiscalite.remarques), "texte", 4),
    vide,
    {
      cellules: [
        {
          v: "Le net mensuel retient 77 % du brut, convention du cabinet.",
          style: "note",
          fusion: 4,
        },
      ],
    }
  );

  return { nom: "Foyer et revenus", colonnes: [32, MOYEN, MOYEN, MOYEN], lignes, figer: 2 };
}

/** Une ligne de tableau pour un bien immobilier. */
function ligneBien(b: Bien): Ligne {
  return {
    cellules: [
      { v: texte(b.adresse), style: "texte" },
      { v: argent(b.valeurEstimee), style: "montant" },
      { v: argent(b.valeurAchat), style: "montant" },
      { v: argent(b.capitalRestantDu), style: "montant" },
      { v: argent(b.mensualites), style: "montant" },
      { v: argent(b.loyersPercus), style: "montant" },
      { v: jour(b.dateAchat), style: "date" },
      { v: texte(b.remarques), style: "texteGris" },
    ],
  };
}

function ligneCredit(c: Credit): Ligne {
  return {
    cellules: [
      { v: texte(c.designation), style: "texte" },
      { v: argent(c.capitalEmprunte), style: "montant" },
      { v: argent(c.capitalRestantDu), style: "montant" },
      { v: argent(c.mensualites), style: "montant" },
      { v: texte(c.duree), style: "texte" },
      { v: null, style: "texte" },
      { v: null, style: "texte" },
      { v: null, style: "texte" },
    ],
  };
}

function feuilleImmobilier(fiche: FicheAudit, c: ReturnType<typeof calculer>): Feuille {
  const { residencePrincipale: rp, locatifs, credits } = fiche.immobilier;
  const somme = (v: number[]) => v.reduce((t, n) => t + n, 0);

  const lignes: Ligne[] = [
    ...enTeteFeuille(
      "Immobilier et crédits",
      "Résidence principale, biens locatifs et engagements en cours",
      8
    ),

    section("Résidence principale", 8),
    paire("Adresse", texte(rp.adresse), "texte", 8),
    paire("Situation", texte(rp.situation), "texte", 8),
    paire("Loyer ou mensualité", argent(rp.loyerMensualite), "montant", 8),
    paire("Valeur estimée", argent(rp.valeurEstimee), "montant", 8),
    paire("Valeur d'achat", argent(rp.valeurAchat), "montant", 8),
    paire("Capital emprunté", argent(rp.capitalEmprunte), "montant", 8),
    paire("Capital restant dû", argent(rp.capitalRestantDu), "montant", 8),
    paire("Date d'achat", jour(rp.dateAchat), "date", 8),
    paire("Durée d'emprunt", texte(rp.dureeEmprunt), "texte", 8),
    paire("Remarques", texte(rp.remarques), "texte", 8),
    vide,
  ];

  lignes.push(section(`Biens locatifs et secondaires (${locatifs.length})`, 8));
  if (locatifs.length === 0) {
    lignes.push({ cellules: [{ v: "Aucun bien déclaré.", style: "texteGris", fusion: 8 }] });
  } else {
    lignes.push(
      enTetes([
        "Adresse",
        "Valeur estimée",
        "Valeur d'achat",
        "Capital restant dû",
        "Mensualités",
        "Loyers perçus",
        "Date d'achat",
        "Remarques",
      ])
    );
    for (const bien of locatifs) lignes.push(ligneBien(bien));
    lignes.push({
      cellules: [
        { v: `Total - ${locatifs.length} bien(s)`, style: "total" },
        { v: argent(somme(locatifs.map((b) => b.valeurEstimee))), style: "totalMontant" },
        { v: argent(somme(locatifs.map((b) => b.valeurAchat))), style: "totalMontant" },
        { v: argent(somme(locatifs.map((b) => b.capitalRestantDu))), style: "totalMontant" },
        { v: argent(somme(locatifs.map((b) => b.mensualites))), style: "totalMontant" },
        { v: argent(somme(locatifs.map((b) => b.loyersPercus))), style: "totalMontant" },
        { v: null, style: "total" },
        { v: null, style: "total" },
      ],
    });
  }
  lignes.push(vide);

  lignes.push(section(`Autres crédits (${credits.length})`, 8));
  if (credits.length === 0) {
    lignes.push({ cellules: [{ v: "Aucun crédit déclaré.", style: "texteGris", fusion: 8 }] });
  } else {
    lignes.push(
      enTetes([
        "Désignation",
        "Capital emprunté",
        "Capital restant dû",
        "Mensualités",
        "Durée",
        "",
        "",
        "",
      ])
    );
    for (const credit of credits) lignes.push(ligneCredit(credit));
    lignes.push({
      cellules: [
        { v: `Total - ${credits.length} crédit(s)`, style: "total" },
        { v: argent(somme(credits.map((x) => x.capitalEmprunte))), style: "totalMontant" },
        { v: argent(somme(credits.map((x) => x.capitalRestantDu))), style: "totalMontant" },
        { v: argent(somme(credits.map((x) => x.mensualites))), style: "totalMontant" },
        { v: null, style: "total" },
        { v: null, style: "total" },
        { v: null, style: "total" },
        { v: null, style: "total" },
      ],
    });
  }

  lignes.push(
    vide,
    section("Ce que l'immobilier pèse", 8),
    paire("Valeur totale du parc", argent(c.totalImmobilier), "montant", 8),
    paire("Capital restant dû, tous crédits", argent(c.totalDettes), "montant", 8),
    paire("Loyers perçus par mois", argent(c.endettement.loyersPercus), "montant", 8),
    paire("Loyers retenus par les banques (70 %)", argent(c.endettement.loyersRetenus), "montant", 8)
  );

  return {
    nom: "Immobilier",
    colonnes: [LARGE, MOYEN, MOYEN, MOYEN, MOYEN, MOYEN, 16, 40],
    lignes,
    figer: 2,
  };
}

function feuilleFinancier(fiche: FicheAudit, c: ReturnType<typeof calculer>): Feuille {
  const lignes: Ligne[] = [
    ...enTeteFeuille(
      "Patrimoine financier",
      `Contrats, comptes et placements - ${fiche.financier.length} ligne(s)`,
      6
    ),
  ];

  if (fiche.financier.length === 0) {
    lignes.push({ cellules: [{ v: "Aucune ligne déclarée.", style: "texteGris", fusion: 6 }] });
  } else {
    lignes.push(enTetes(["Détenteur", "Type", "Libellé", "Valeur", "Souscrit le", "Remarques"]));
    for (const l of fiche.financier) {
      lignes.push({
        cellules: [
          { v: texte(l.detenteur) ?? texte(nomComplet(fiche.titulaire)), style: "texte" },
          { v: l.type ? assetTypeLabel(l.type) : null, style: "texte" },
          { v: texte(l.libelle), style: "texte" },
          { v: argent(l.valeur), style: "montant" },
          { v: jour(l.dateSouscription), style: "date" },
          { v: texte(l.remarques), style: "texteGris" },
        ],
      });
    }
    lignes.push({
      cellules: [
        { v: `Total - ${fiche.financier.length} ligne(s)`, style: "total", fusion: 3 },
        { v: argent(c.totalFinancier), style: "totalMontant" },
        { v: null, style: "total" },
        { v: null, style: "total" },
      ],
    });
  }

  return {
    nom: "Financier",
    colonnes: [26, 24, LARGE, MOYEN, 16, 40],
    lignes,
    figer: 2,
  };
}

function feuilleObjectifs(fiche: FicheAudit): Feuille {
  const { profil } = fiche;

  const lignes: Ligne[] = [
    ...enTeteFeuille("Objectifs et effort d'épargne", "Profil réglementaire et projets du client", 3),

    section("Profil réglementaire", 3),
    paire("US Person", ouiNon(profil.usPerson), "texte", 3),
    paire("Personne politiquement exposée", ouiNon(profil.politiquementExpose), "texte", 3),
    paire("Détient des biens divers", ouiNon(profil.biensDivers), "texte", 3),
    vide,

    section("Capacité d'épargne", 3),
    paire("Effort d'épargne mensuel", argent(profil.effortEpargne), "montant", 3),
    vide,

    section(`Objectifs (${profil.objectifs.length})`, 3),
  ];

  if (profil.objectifs.length === 0) {
    lignes.push({ cellules: [{ v: "Aucun objectif noté.", style: "texteGris", fusion: 3 }] });
  } else {
    profil.objectifs.forEach((objectif, i) => {
      lignes.push({
        cellules: [
          { v: i + 1, style: "nombre" },
          { v: objectif, style: "texte", fusion: 2 },
        ],
      });
    });
  }

  return { nom: "Objectifs", colonnes: [10, LARGE, LARGE], lignes, figer: 2 };
}

function feuilleSimulation(fiche: FicheAudit, c: ReturnType<typeof calculer>): Feuille {
  const { simulation } = fiche;
  const s = c.simulation;

  const lignes: Ligne[] = [
    ...enTeteFeuille("Simulation OPCI", "Hypothèse d'investissement et contrôles du cabinet", 4),

    section("Hypothèse", 4),
    paire("Montant investi", argent(simulation.montant), "montant", 4),
    paire("Taux hors assurance", simulation.tauxHorsAssurance || null, "pourcent", 4),
    paire("Durée (mois)", simulation.dureeMois || null, "nombre", 4),
    vide,

    section("Conséquences", 4),
    paire("Mensualité du prêt", argent(s.mensualite), "montant", 4),
    paire("Revenus du produit retenus", argent(s.revenusProduitRetenus), "montant", 4),
    paire("Taux d'endettement après opération", s.tauxEndettement, "pourcent", 4),
    paire("Restant à vivre", s.restantAVivre !== 0 ? Math.round(s.restantAVivre) : null, "montant", 4),
    vide,

    section("Contrôles", 4),
    enTetes(["Contrôle", "Valeur", "Attendu", "Verdict"]),
  ];

  for (const v of s.verdicts) {
    lignes.push({
      cellules: [
        { v: v.libelle, style: "texte" },
        { v: v.valeur, style: "texte" },
        { v: v.attendu, style: "texteGris" },
        {
          v: v.conforme === null ? "À compléter" : v.conforme ? "Conforme" : "Hors critère",
          style: v.conforme === null ? "texteGris" : v.conforme ? "conforme" : "nonConforme",
        },
      ],
    });
  }

  lignes.push(vide, {
    cellules: [
      {
        v: "Le rendement OPCI retenu est de 5,5 %, valeur du modèle du cabinet. Les seuils de restant à vivre proviennent du modèle d'origine et restent à arrêter en dirhams.",
        style: "note",
        fusion: 4,
      },
    ],
  });

  return { nom: "Simulation", colonnes: [42, MOYEN, 28, 20], lignes, figer: 2 };
}

/**
 * Le classeur complet. Rien n'est omis : c'est la promesse de ce module, et
 * c'est pourquoi il ne rend aucune liste d'omissions.
 */
export function classeurAudit(fiche: FicheAudit, date = new Date()): Uint8Array {
  const c = calculer(fiche);
  return creerClasseur([
    feuilleSynthese(fiche, c, date),
    feuilleFoyer(fiche, c),
    feuilleImmobilier(fiche, c),
    feuilleFinancier(fiche, c),
    feuilleObjectifs(fiche),
    feuilleSimulation(fiche, c),
  ]);
}
