import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminCard } from "@/components/admin/ui";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { DemandeLigne, type DemandeLigneData } from "../demande-ligne";
import {
  PARTENAIRE_STATUTS,
  PARTENAIRE_STATUT_LABELS,
  PARTENAIRE_TRANSITIONS,
  type PartenaireStatut,
} from "./constants";
import { marquerPartenaireLu, setPartenaireStatus, deletePartenaire } from "./actions";
import { param, pick, recherche, trier, instant, contient, LIMITE_LISTE } from "@/lib/liste";

export const metadata: Metadata = { title: "Demandes de partenariat" };

const STATUTS_CONNUS = new Set<string>(Object.keys(PARTENAIRE_STATUT_LABELS));

/** Un statut inconnu - valeur écrite à la main en base - reste lisible. */
function statutDe(valeur: string): PartenaireStatut {
  return (STATUTS_CONNUS.has(valeur) ? valeur : "nouveau") as PartenaireStatut;
}

/** Liste de cartes : le tri est un choix unique, pas des en-têtes cliquables. */
const ORDRES = [
  { value: "ancien", label: "Du plus ancien" },
  { value: "nom", label: "Par nom" },
  { value: "societe", label: "Par société" },
];

export default async function AdminPartenariatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const ordre = pick(param(raw, "ordre"), ["ancien", "nom", "societe"] as const, null);
  const statut = pick(param(raw, "statut"), PARTENAIRE_STATUTS, null);
  const lecture = pick(param(raw, "lecture"), ["non-lus", "lus"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();
  const maintenant = new Date();

  const { data } = await supabase
    .from("partner_submissions")
    .select("id, name, company, email, phone, partner_type, message, status, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTE);

  const toutes = data ?? [];
  // Le compteur porte sur l'ensemble : filtrer la vue ne change pas le nombre
  // de demandes que personne n'a ouvertes.
  const nonLues = toutes.filter((p) => !p.read_at).length;

  const rows = trier(
    toutes.filter(
      (p) =>
        (statut === null || statutDe(p.status) === statut) &&
        (lecture === null || (lecture === "lus") === Boolean(p.read_at)) &&
        contient([p.name, p.company, p.email, p.partner_type, p.message], q)
    ),
    (p) => (ordre === "nom" ? p.name : ordre === "societe" ? p.company : instant(p.created_at)),
    ordre === null ? "desc" : "asc",
    (p) => p.name
  );

  const lignes: DemandeLigneData[] = rows.map((p) => {
    const statut = statutDe(p.status);
    return {
      id: p.id,
      nom: p.name,
      soustitre: p.company,
      objet: p.partner_type,
      message: p.message,
      email: p.email,
      telephone: p.phone,
      recuLe: formatDateTime(p.created_at),
      recuRelatif: formatRelative(p.created_at, maintenant),
      nonLue: !p.read_at,
      statut: PARTENAIRE_STATUT_LABELS[statut],
      transitions: PARTENAIRE_TRANSITIONS[statut],
      sujetReponse: "Votre demande de partenariat - Horkos Wealth Management",
    };
  });

  return (
    <>
      <AdminHead
        title="Demandes de partenariat"
        desc="Les professionnels qui proposent de rejoindre le réseau Horkos. Accepter une demande n'ouvre aucun accès : c'est une décision de suivi."
      />

      {toutes.length > 0 && (
        <p className="text-[12.5px] text-warm-grey -mt-2 mb-4 tabular-nums">
          {nonLues > 0
            ? `${nonLues} demande${nonLues > 1 ? "s" : ""} que personne n'a encore ouverte${nonLues > 1 ? "s" : ""}, sur ${toutes.length}.`
            : `${toutes.length} demande${toutes.length > 1 ? "s" : ""}, toutes ouvertes.`}
        </p>
      )}

      {toutes.length > 0 && (
        <AnimateIn variant="fade-up" delay={40}>
          <FiltresListe
            champs={[
              {
                cle: "statut",
                aria: "Statut",
                toutes: "Tous les statuts",
                options: PARTENAIRE_STATUTS.map((v) => ({
                  value: v,
                  label: PARTENAIRE_STATUT_LABELS[v].label,
                })),
              },
              {
                cle: "lecture",
                aria: "Lecture",
                toutes: "Lues et non lues",
                options: [
                  { value: "non-lus", label: "Non ouvertes" },
                  { value: "lus", label: "Déjà ouvertes" },
                ],
              },
              { cle: "ordre", aria: "Ordre", toutes: "Du plus récent", options: ORDRES },
            ]}
            recherche={{ placeholder: "Rechercher un nom, une société…" }}
            total={rows.length}
            unite="demande"
          />
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminCard>
          {lignes.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-warm-grey">
              {q || statut || lecture
                ? "Aucune demande ne correspond à ces critères."
                : "Aucune demande. Celles déposées depuis le site public apparaîtront ici."}
            </p>
          ) : (
            <ul>
              {lignes.map((l) => (
                <DemandeLigne
                  key={l.id}
                  data={l}
                  marquerLue={marquerPartenaireLu}
                  changerStatut={setPartenaireStatus}
                  supprimer={deletePartenaire}
                />
              ))}
            </ul>
          )}
        </AdminCard>
      </AnimateIn>
    </>
  );
}
