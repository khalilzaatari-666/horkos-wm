import { AdminCard } from "@/components/admin/ui";
import { assetTypeLabel, formatMAD } from "@/lib/patrimoine";
import { formatDateLong } from "@/lib/dates";
import type { Bien, Credit, FicheAudit, LigneFinanciere, Personne } from "@/lib/fiche-audit/schema";
import { Recapitulatif } from "./fiche-form";

/**
 * Lecture seule de la fiche : ce qu'on montre une fois qu'il n'y a plus rien à
 * saisir - un audit clos, ou un dossier qu'on consulte sans le piloter.
 *
 * Volontairement une présentation différente du formulaire, pas le même
 * formulaire désactivé : un champ vide n'a rien à dire une fois la fiche
 * arrêtée, et un conseiller qui consulte cent fiches n'a pas à parcourir des
 * cases grisées pour trouver les trois lignes qui comptent.
 */

const grille = "grid gap-x-6 gap-y-4 sm:grid-cols-2";

function texteRempli(v: string): boolean {
  return v.trim() !== "";
}

function Section({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="p-5 sm:p-6">
      <h2 className="font-heading text-[17.5px] font-semibold text-ink">{titre}</h2>
      {aide && <p className="text-[12.5px] text-warm-grey leading-[1.6] mt-1 mb-4">{aide}</p>}
      <div className={aide ? "" : "mt-4"}>{children}</div>
    </AdminCard>
  );
}

function Champ({ label, valeur }: { label: string; valeur: string }) {
  if (!texteRempli(valeur)) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[1.2px] uppercase text-warm-grey">
        {label}
      </div>
      <div className="text-[13.5px] text-ink mt-0.5 leading-[1.5]">{valeur}</div>
    </div>
  );
}

function ChampMontant({ label, valeur }: { label: string; valeur: number }) {
  if (!(valeur > 0)) return null;
  return <Champ label={label} valeur={formatMAD(valeur)} />;
}

function ChampDate({ label, valeur }: { label: string; valeur: string }) {
  if (!texteRempli(valeur)) return null;
  return <Champ label={label} valeur={formatDateLong(valeur)} />;
}

/** Un jeu de champs vides ne mérite pas sa carte : ni titre, ni cadre pour rien. */
function personneRemplie(p: Personne): boolean {
  return (
    texteRempli(p.nom) ||
    texteRempli(p.prenom) ||
    texteRempli(p.email) ||
    texteRempli(p.telephone) ||
    texteRempli(p.naissance) ||
    texteRempli(p.profession) ||
    texteRempli(p.entreprise) ||
    texteRempli(p.statut) ||
    p.revenuFixe > 0 ||
    p.revenuVariable > 0
  );
}

function BlocPersonne({ titre, personne }: { titre: string; personne: Personne }) {
  if (!personneRemplie(personne)) return null;
  const nomComplet = [personne.prenom, personne.nom].filter(texteRempli).join(" ");
  return (
    <div>
      <h3 className="text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey mb-3">
        {titre}
      </h3>
      <div className={grille}>
        <Champ label="Nom" valeur={nomComplet} />
        <Champ label="Email" valeur={personne.email} />
        <Champ label="Téléphone" valeur={personne.telephone} />
        <ChampDate label="Date de naissance" valeur={personne.naissance} />
        <Champ
          label="Profession"
          valeur={[personne.profession, personne.entreprise].filter(texteRempli).join(" - ")}
        />
        <Champ label="Ancienneté" valeur={personne.anciennete} />
        <Champ label="Statut" valeur={personne.statut} />
        <ChampMontant label="Revenu fixe (brut annuel)" valeur={personne.revenuFixe} />
        <ChampMontant label="Revenu variable (brut annuel)" valeur={personne.revenuVariable} />
      </div>
    </div>
  );
}

function bienRempli(b: Bien): boolean {
  return (
    texteRempli(b.adresse) ||
    b.valeurEstimee > 0 ||
    b.valeurAchat > 0 ||
    b.capitalEmprunte > 0 ||
    b.capitalRestantDu > 0 ||
    b.mensualites > 0 ||
    b.loyersPercus > 0
  );
}

function BlocBien({ bien, avecLoyers }: { bien: Bien; avecLoyers?: boolean }) {
  return (
    <div className={grille}>
      <div className="sm:col-span-2">
        <Champ label="Adresse" valeur={bien.adresse} />
      </div>
      <ChampMontant label="Valeur estimée" valeur={bien.valeurEstimee} />
      <ChampMontant label="Valeur d'achat" valeur={bien.valeurAchat} />
      <ChampMontant label="Capital emprunté" valeur={bien.capitalEmprunte} />
      <ChampMontant label="Capital restant dû" valeur={bien.capitalRestantDu} />
      <ChampMontant label="Mensualité" valeur={bien.mensualites} />
      <Champ label="Durée d'emprunt" valeur={bien.dureeEmprunt} />
      {avecLoyers && <ChampMontant label="Loyers perçus (mensuels)" valeur={bien.loyersPercus} />}
      <ChampDate label="Date d'achat" valeur={bien.dateAchat} />
      <div className="sm:col-span-2">
        <Champ label="Remarques" valeur={bien.remarques} />
      </div>
    </div>
  );
}

function creditRempli(c: Credit): boolean {
  return texteRempli(c.designation) || c.capitalEmprunte > 0 || c.capitalRestantDu > 0 || c.mensualites > 0;
}

export function FicheVue({
  fiche,
  raison,
}: {
  fiche: FicheAudit;
  /** Pourquoi c'est en lecture seule - conditionne le message affiché. */
  raison: "clos" | "non-pilote";
}) {
  const locatifsRemplis = fiche.immobilier.locatifs.filter(bienRempli);
  const creditsRemplis = fiche.immobilier.credits.filter(creditRempli);
  const financierRempli = fiche.financier.filter((l) => l.valeur > 0);
  const rpRemplie = bienRempli(fiche.immobilier.residencePrincipale) ||
    texteRempli(fiche.immobilier.residencePrincipale.situation);
  const simulationRemplie = fiche.simulation.montant > 0;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-start">
      <div className="space-y-5 min-w-0">
        <AdminCard className="p-4 bg-cream-deep/40 border-transparent">
          <p className="text-[12.5px] text-charcoal leading-[1.6]">
            {raison === "clos"
              ? "Cet audit est clos - la fiche est en lecture seule."
              : "Lecture seule : ce dossier est piloté par son conseiller référent."}
          </p>
        </AdminCard>

        <Section titre="État civil">
          <div className="space-y-6">
            <BlocPersonne titre="Titulaire" personne={fiche.titulaire} />
            <BlocPersonne titre="Conjoint" personne={fiche.conjoint} />
          </div>
        </Section>

        <Section titre="Foyer">
          <div className={grille}>
            <Champ label="Situation familiale" valeur={fiche.foyer.situationFamiliale} />
            <Champ label="Régime matrimonial" valeur={fiche.foyer.regimeMatrimonial} />
            {fiche.foyer.nbEnfants > 0 && (
              <Champ label="Nombre d'enfants" valeur={String(fiche.foyer.nbEnfants)} />
            )}
            <Champ label="Âges des enfants" valeur={fiche.foyer.agesEnfants} />
            {fiche.foyer.personnesACharge > 0 && (
              <Champ label="Personnes à charge (IR)" valeur={String(fiche.foyer.personnesACharge)} />
            )}
            <div className="sm:col-span-2">
              <Champ label="Remarques" valeur={fiche.foyer.remarques} />
            </div>
          </div>
        </Section>

        {(texteRempli(fiche.fiscalite.reductions) ||
          texteRempli(fiche.fiscalite.investissementsFiscaux) ||
          texteRempli(fiche.fiscalite.remarques)) && (
          <Section titre="Fiscalité">
            <div className={grille}>
              <Champ label="Réductions" valeur={fiche.fiscalite.reductions} />
              <Champ label="Investissements fiscaux" valeur={fiche.fiscalite.investissementsFiscaux} />
              <div className="sm:col-span-2">
                <Champ label="Remarques" valeur={fiche.fiscalite.remarques} />
              </div>
            </div>
          </Section>
        )}

        {rpRemplie && (
          <Section titre="Résidence principale">
            <div className={grille}>
              <Champ label="Situation" valeur={fiche.immobilier.residencePrincipale.situation} />
              <ChampMontant
                label="Loyer ou mensualité"
                valeur={fiche.immobilier.residencePrincipale.loyerMensualite}
              />
            </div>
            <div className="mt-4">
              <BlocBien bien={fiche.immobilier.residencePrincipale} />
            </div>
          </Section>
        )}

        {locatifsRemplis.length > 0 && (
          <Section titre="Biens locatifs">
            <div className="space-y-5">
              {locatifsRemplis.map((bien, i) => (
                <div key={i} className="border border-cream-deep rounded-lg p-4">
                  <span className="block text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey mb-3">
                    Bien {i + 1}
                  </span>
                  <BlocBien bien={bien} avecLoyers />
                </div>
              ))}
            </div>
          </Section>
        )}

        {creditsRemplis.length > 0 && (
          <Section titre="Autres crédits">
            <div className="space-y-4">
              {creditsRemplis.map((credit, i) => (
                <div key={i} className="border border-cream-deep rounded-lg p-4">
                  <span className="block text-[11px] font-semibold tracking-[1.4px] uppercase text-warm-grey mb-3">
                    Crédit {i + 1}
                  </span>
                  <div className={grille}>
                    <div className="sm:col-span-2">
                      <Champ label="Désignation" valeur={credit.designation} />
                    </div>
                    <ChampMontant label="Capital emprunté" valeur={credit.capitalEmprunte} />
                    <ChampMontant label="Capital restant dû" valeur={credit.capitalRestantDu} />
                    <ChampMontant label="Mensualité" valeur={credit.mensualites} />
                    <Champ label="Durée" valeur={credit.duree} />
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {financierRempli.length > 0 && (
          <Section titre="Patrimoine financier">
            <div className="space-y-4">
              {financierRempli.map((ligne: LigneFinanciere, i) => (
                <div key={i} className="border border-cream-deep rounded-lg p-4">
                  <div className={grille}>
                    <Champ
                      label="Type"
                      valeur={ligne.type ? assetTypeLabel(ligne.type) : ""}
                    />
                    <Champ label="Libellé" valeur={ligne.libelle} />
                    <ChampMontant label="Valeur actuelle" valeur={ligne.valeur} />
                    <ChampDate label="Date de souscription" valeur={ligne.dateSouscription} />
                    <div className="sm:col-span-2">
                      <Champ label="Remarques" valeur={ligne.remarques} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section titre="Objectifs et profil">
          <div className="space-y-4">
            <div className={grille}>
              <Champ label="US person" valeur={fiche.profil.usPerson ? "Oui" : "Non"} />
              <Champ
                label="Personne politiquement exposée"
                valeur={fiche.profil.politiquementExpose ? "Oui" : "Non"}
              />
              <Champ label="Biens divers" valeur={fiche.profil.biensDivers ? "Oui" : "Non"} />
              <ChampMontant label="Effort d'épargne mensuel" valeur={fiche.profil.effortEpargne} />
            </div>
            {fiche.profil.objectifs.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold tracking-[1.2px] uppercase text-warm-grey mb-1.5">
                  Objectifs
                </div>
                <ul className="list-disc list-inside space-y-1">
                  {fiche.profil.objectifs.map((objectif, i) => (
                    <li key={i} className="text-[13.5px] text-ink leading-[1.5]">
                      {objectif}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        {simulationRemplie && (
          <Section titre="Simulation OPCI">
            <div className={grille}>
              <ChampMontant label="Montant d'investissement" valeur={fiche.simulation.montant} />
              {fiche.simulation.tauxHorsAssurance > 0 && (
                <Champ
                  label="Taux hors assurance"
                  valeur={`${(fiche.simulation.tauxHorsAssurance * 100).toFixed(2).replace(".", ",")} %`}
                />
              )}
              {fiche.simulation.dureeMois > 0 && (
                <Champ label="Durée du prêt" valeur={`${fiche.simulation.dureeMois} mois`} />
              )}
            </div>
          </Section>
        )}
      </div>

      <div className="lg:sticky lg:top-6">
        <Recapitulatif fiche={fiche} />
      </div>
    </div>
  );
}
