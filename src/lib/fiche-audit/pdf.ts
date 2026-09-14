import "server-only";

import { DocumentPdf, type Colonne } from "@/lib/pdf/document";
import { assetTypeLabel } from "@/lib/patrimoine";
import { SITE_NAME } from "@/lib/site";
import { calculer, type Calculs } from "./calculs";
import type { Bien, FicheAudit, Personne } from "./schema";

/**
 * La fiche d'audit en PDF - le document que le conseiller remet ou archive.
 *
 * Il porte la même donnée que le classeur, mais pas le même usage : le classeur
 * se retravaille, le PDF se lit et se signe. D'où deux partis pris qui les
 * séparent - ici, ce qui est vide n'est pas imprimé (une fiche d'audit remise à
 * un client n'a pas à être une colonne de tirets), et la synthèse ouvre le
 * document au lieu de le clore.
 *
 * Comme le classeur, il n'a aucune limite de lignes : tous les biens, tous les
 * crédits, toutes les lignes financières.
 */

const LARGEUR = DocumentPdf.largeurUtile;

const montantFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function mad(valeur: number | null | undefined): string {
  if (!valeur || valeur === 0) return "—";
  return `${montantFmt.format(Math.round(valeur))} MAD`;
}

function pourcent(valeur: number | null | undefined): string {
  if (valeur === null || valeur === undefined) return "—";
  return `${(valeur * 100).toFixed(1).replace(".", ",")} %`;
}

function jour(valeur: string | null | undefined): string {
  const propre = (valeur ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(propre)) return propre;
  const [a, m, j] = propre.split("-");
  return `${j}/${m}/${a}`;
}

function nomComplet(p: Personne): string {
  return [p.prenom, p.nom].filter(Boolean).join(" ").trim();
}

/** Les paires non renseignées sont écartées ici, pas dans la mise en page. */
function paires(doc: DocumentPdf, entrees: [string, string | number | null | undefined][]) {
  let ecrites = 0;
  for (const [libelle, valeur] of entrees) {
    const texte = typeof valeur === "number" ? String(valeur) : (valeur ?? "").trim();
    if (!texte || texte === "—" || texte === "0") continue;
    doc.paire(libelle, texte);
    ecrites += 1;
  }
  if (ecrites === 0) doc.rien("Non renseigné.");
}

function colonnes(parts: number[], options: Partial<Colonne>[] = []): Colonne[] {
  const total = parts.reduce((t, p) => t + p, 0);
  return parts.map((part, i) => ({
    largeur: (part / total) * LARGEUR,
    ...options[i],
  }));
}

// ---------------------------------------------------------------------------
// Chapitres
// ---------------------------------------------------------------------------

function synthese(doc: DocumentPdf, c: Calculs) {
  doc.section("Synthèse patrimoniale");
  doc.kpis([
    { libelle: "Patrimoine brut", valeur: mad(c.patrimoineBrut) },
    { libelle: "Patrimoine net", valeur: mad(c.patrimoineNet) },
    { libelle: "Dettes en cours", valeur: mad(c.totalDettes) },
    { libelle: "Revenus nets du foyer / mois", valeur: mad(c.endettement.revenuMensuelNet) },
  ]);

  doc.tableau(
    colonnes([3, 1.4, 1.2], [{ fort: true }, { align: "droite" }, { align: "droite" }]),
    ["Poste", "Montant", "Part"],
    [
      [
        "Immobilier",
        mad(c.totalImmobilier),
        pourcent(c.patrimoineBrut > 0 ? c.totalImmobilier / c.patrimoineBrut : null),
      ],
      [
        "Financier",
        mad(c.totalFinancier),
        pourcent(c.patrimoineBrut > 0 ? c.totalFinancier / c.patrimoineBrut : null),
      ],
    ],
    ["Patrimoine brut", mad(c.patrimoineBrut), ""]
  );

  doc.section("Endettement");
  doc.tableau(
    colonnes([3, 1.4, 1.2], [{ fort: true }, { align: "droite" }, { align: "droite", gris: true }]),
    ["Lecture", "Taux", ""],
    [
      ["Sur les seuls revenus du travail", pourcent(c.endettement.apresRevenus), ""],
      ["En tenant compte du locatif", pourcent(c.endettement.apresAutresActifs), "loyers à 70 %"],
    ],
    ["Toutes charges comprises", pourcent(c.endettement.total), ""]
  );
}

function personne(doc: DocumentPdf, titre: string, p: Personne) {
  doc.section(titre);
  paires(doc, [
    ["Nom et prénom", nomComplet(p)],
    ["Date de naissance", jour(p.naissance)],
    ["Email", p.email],
    ["Téléphone", p.telephone],
    ["Profession", p.profession],
    ["Entreprise", p.entreprise],
    ["Ancienneté", p.anciennete],
    ["Statut", p.statut],
    ["Revenu fixe (brut annuel)", p.revenuFixe > 0 ? mad(p.revenuFixe) : ""],
    ["Revenu variable (brut annuel)", p.revenuVariable > 0 ? mad(p.revenuVariable) : ""],
  ]);
}

function foyer(doc: DocumentPdf, fiche: FicheAudit, c: Calculs) {
  personne(doc, "Titulaire", fiche.titulaire);

  // Le conjoint n'existe que s'il a été saisi : une section vide laisserait
  // croire à un dossier incomplet là où il n'y a personne.
  const conjoint = fiche.conjoint;
  if (nomComplet(conjoint) || conjoint.email.trim() || conjoint.revenuFixe > 0) {
    personne(doc, "Conjoint", conjoint);
  }

  doc.section("Foyer");
  paires(doc, [
    ["Situation familiale", fiche.foyer.situationFamiliale],
    ["Régime matrimonial", fiche.foyer.regimeMatrimonial],
    ["Enfants", fiche.foyer.nbEnfants > 0 ? String(fiche.foyer.nbEnfants) : ""],
    ["Âges des enfants", fiche.foyer.agesEnfants],
    [
      "Personnes à charge",
      fiche.foyer.personnesACharge > 0 ? String(fiche.foyer.personnesACharge) : "",
    ],
    ["Remarques", fiche.foyer.remarques],
  ]);

  doc.section("Revenus consolidés");
  paires(doc, [
    ["Brut annuel du foyer", c.brutFoyer > 0 ? mad(c.brutFoyer) : ""],
    ["Net mensuel du foyer", mad(c.endettement.revenuMensuelNet)],
  ]);
  doc.note("Le net retient 77 % du brut, convention du cabinet.");

  const f = fiche.fiscalite;
  if (f.reductions.trim() || f.investissementsFiscaux.trim() || f.remarques.trim()) {
    doc.section("Fiscalité");
    paires(doc, [
      ["Réductions d'impôt", f.reductions],
      ["Investissements fiscaux", f.investissementsFiscaux],
      ["Remarques", f.remarques],
    ]);
  }
}

function immobilier(doc: DocumentPdf, fiche: FicheAudit, c: Calculs) {
  const { residencePrincipale: rp, locatifs, credits } = fiche.immobilier;
  const somme = (v: number[]) => v.reduce((t, n) => t + n, 0);

  doc.section("Résidence principale");
  paires(doc, [
    ["Adresse", rp.adresse],
    ["Situation", rp.situation],
    ["Loyer ou mensualité", rp.loyerMensualite > 0 ? mad(rp.loyerMensualite) : ""],
    ["Valeur estimée", rp.valeurEstimee > 0 ? mad(rp.valeurEstimee) : ""],
    ["Valeur d'achat", rp.valeurAchat > 0 ? mad(rp.valeurAchat) : ""],
    ["Capital restant dû", rp.capitalRestantDu > 0 ? mad(rp.capitalRestantDu) : ""],
    ["Date d'achat", jour(rp.dateAchat)],
    ["Durée d'emprunt", rp.dureeEmprunt],
    ["Remarques", rp.remarques],
  ]);

  doc.section(`Biens locatifs et secondaires (${locatifs.length})`);
  if (locatifs.length === 0) {
    doc.rien("Aucun bien déclaré.");
  } else {
    const ligne = (b: Bien) => [
      b.adresse.trim() || "Bien sans adresse",
      mad(b.valeurEstimee),
      mad(b.capitalRestantDu),
      mad(b.mensualites),
      mad(b.loyersPercus),
    ];
    doc.tableau(
      colonnes(
        [2.6, 1.2, 1.2, 1, 1],
        [{ fort: true }, { align: "droite" }, { align: "droite" }, { align: "droite" }, { align: "droite" }]
      ),
      ["Adresse", "Valeur", "Restant dû", "Mensualité", "Loyers"],
      locatifs.map(ligne),
      [
        `${locatifs.length} bien(s)`,
        mad(somme(locatifs.map((b) => b.valeurEstimee))),
        mad(somme(locatifs.map((b) => b.capitalRestantDu))),
        mad(somme(locatifs.map((b) => b.mensualites))),
        mad(somme(locatifs.map((b) => b.loyersPercus))),
      ]
    );
  }

  doc.section(`Autres crédits (${credits.length})`);
  if (credits.length === 0) {
    doc.rien("Aucun crédit déclaré.");
  } else {
    doc.tableau(
      colonnes(
        [2.6, 1.4, 1.4, 1.2],
        [{ fort: true }, { align: "droite" }, { align: "droite" }, { align: "droite" }]
      ),
      ["Désignation", "Emprunté", "Restant dû", "Mensualité"],
      credits.map((x) => [
        x.designation.trim() || "Crédit",
        mad(x.capitalEmprunte),
        mad(x.capitalRestantDu),
        mad(x.mensualites),
      ]),
      [
        `${credits.length} crédit(s)`,
        mad(somme(credits.map((x) => x.capitalEmprunte))),
        mad(somme(credits.map((x) => x.capitalRestantDu))),
        mad(somme(credits.map((x) => x.mensualites))),
      ]
    );
  }

  if (c.endettement.loyersPercus > 0) {
    doc.note(
      `Loyers perçus : ${mad(c.endettement.loyersPercus)} par mois, dont ${mad(
        c.endettement.loyersRetenus
      )} retenus par les banques (70 %).`
    );
  }
}

function financier(doc: DocumentPdf, fiche: FicheAudit, c: Calculs) {
  doc.section(`Patrimoine financier (${fiche.financier.length})`);
  if (fiche.financier.length === 0) {
    doc.rien("Aucune ligne déclarée.");
    return;
  }

  doc.tableau(
    colonnes([1.6, 2.6, 1.4, 1], [{}, { fort: true }, { align: "droite" }, { gris: true }]),
    ["Type", "Libellé", "Valeur", "Souscrit le"],
    fiche.financier.map((l) => [
      l.type ? assetTypeLabel(l.type) : "—",
      l.libelle.trim() || (l.type ? assetTypeLabel(l.type) : "Ligne"),
      mad(l.valeur),
      jour(l.dateSouscription),
    ]),
    [`${fiche.financier.length} ligne(s)`, "", mad(c.totalFinancier), ""]
  );
}

function objectifs(doc: DocumentPdf, fiche: FicheAudit) {
  const { profil } = fiche;

  doc.section("Objectifs et effort d'épargne");
  if (profil.effortEpargne > 0) {
    doc.paire("Effort d'épargne mensuel", mad(profil.effortEpargne));
  }

  if (profil.objectifs.length === 0) {
    doc.rien("Aucun objectif noté.");
  } else {
    doc.espace(4);
    profil.objectifs.forEach((objectif, i) => {
      doc.paire(`Objectif ${i + 1}`, objectif);
    });
  }

  doc.section("Profil réglementaire");
  const ouiNon = (v: boolean) => (v ? "Oui" : "Non");
  doc.paire("US Person", ouiNon(profil.usPerson));
  doc.paire("Personne politiquement exposée", ouiNon(profil.politiquementExpose));
  doc.paire("Détient des biens divers", ouiNon(profil.biensDivers));
}

function simulation(doc: DocumentPdf, fiche: FicheAudit, c: Calculs) {
  const { montant, tauxHorsAssurance, dureeMois } = fiche.simulation;
  // Sans montant, il n'y a pas d'hypothèse : le chapitre entier disparaît
  // plutôt que d'afficher une colonne de zéros.
  if (montant <= 0) return;

  doc.section("Simulation OPCI");
  paires(doc, [
    ["Montant investi", mad(montant)],
    ["Taux hors assurance", tauxHorsAssurance > 0 ? pourcent(tauxHorsAssurance) : ""],
    ["Durée", dureeMois > 0 ? `${dureeMois} mois` : ""],
    ["Mensualité du prêt", mad(c.simulation.mensualite)],
    ["Revenus du produit retenus", mad(c.simulation.revenusProduitRetenus)],
    ["Restant à vivre", mad(c.simulation.restantAVivre)],
  ]);

  doc.espace(6);
  for (const v of c.simulation.verdicts) {
    doc.verdict(v.libelle, v.valeur, v.attendu, v.conforme);
  }
  doc.note(
    "Rendement OPCI retenu : 5,5 %, valeur du modèle du cabinet. Les seuils de restant à vivre proviennent du modèle d'origine et restent à arrêter en dirhams."
  );
}

// ---------------------------------------------------------------------------

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Produit le PDF de la fiche d'audit. */
export async function pdfAudit(fiche: FicheAudit, date = new Date()): Promise<Uint8Array> {
  const c = calculer(fiche);
  const doc = await DocumentPdf.creer();

  doc.couverture(
    SITE_NAME,
    "Fiche d'audit patrimonial",
    nomComplet(fiche.titulaire) || "Client",
    dateFmt.format(date)
  );

  synthese(doc, c);
  foyer(doc, fiche, c);
  immobilier(doc, fiche, c);
  financier(doc, fiche, c);
  objectifs(doc, fiche);
  simulation(doc, fiche, c);

  return doc.terminer(`${SITE_NAME} — Document confidentiel`);
}
