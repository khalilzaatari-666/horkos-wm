import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminCard } from "@/components/admin/ui";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { DemandeLigne, type DemandeLigneData } from "../demande-ligne";
import {
  CONTACT_STATUTS,
  CONTACT_STATUT_LABELS,
  CONTACT_TRANSITIONS,
  type ContactStatut,
} from "./constants";
import { marquerContactLu, setContactStatus, deleteContact } from "./actions";
import { param, pick, recherche, trier, instant, contient, LIMITE_LISTE } from "@/lib/liste";

export const metadata: Metadata = { title: "Messages de contact" };

const STATUTS_CONNUS = new Set<string>(Object.keys(CONTACT_STATUT_LABELS));

/** Un statut inconnu - valeur écrite à la main en base - reste lisible. */
function statutDe(valeur: string): ContactStatut {
  return (STATUTS_CONNUS.has(valeur) ? valeur : "nouveau") as ContactStatut;
}

/**
 * Une liste de cartes, pas un tableau : le tri passe donc par un choix unique
 * plutôt que par des en-têtes cliquables, chaque option portant sa colonne et
 * son sens.
 */
const ORDRES = [
  { value: "ancien", label: "Du plus ancien" },
  { value: "nom", label: "Par nom" },
];

export default async function AdminContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const ordre = pick(param(raw, "ordre"), ["recent", "ancien", "nom"] as const, "recent")!;
  const statut = pick(param(raw, "statut"), ["nouveau", "lu", "traite"] as const, null);
  const lecture = pick(param(raw, "lecture"), ["non-lus", "lus"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();
  // Un seul instant de référence pour toutes les dates relatives de la page :
  // `Date.now` est rejeté par la règle de pureté des composants.
  const maintenant = new Date();

  const { data } = await supabase
    .from("contacts")
    .select("id, name, email, phone, subject, message, status, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTE);

  const toutes = data ?? [];
  // Le compteur porte sur l'ensemble : filtrer la vue ne change pas le nombre
  // de messages que personne n'a ouverts.
  const nonLus = toutes.filter((c) => !c.read_at).length;

  const rows = trier(
    toutes.filter(
      (c) =>
        (statut === null || statutDe(c.status) === statut) &&
        (lecture === null || (lecture === "lus") === Boolean(c.read_at)) &&
        contient([c.name, c.email, c.subject, c.message, c.phone], q)
    ),
    (c) => (ordre === "nom" ? c.name : instant(c.created_at)),
    ordre === "recent" ? "desc" : "asc",
    (c) => c.name
  );

  // Tout est formaté ici : la ligne cliente ne reçoit que des chaînes prêtes,
  // pour qu'aucune date ne diverge entre le rendu serveur et le navigateur.
  const lignes: DemandeLigneData[] = rows.map((c) => {
    const statut = statutDe(c.status);
    return {
      id: c.id,
      nom: c.name,
      soustitre: null,
      objet: c.subject,
      message: c.message,
      email: c.email,
      telephone: c.phone,
      recuLe: formatDateTime(c.created_at),
      recuRelatif: formatRelative(c.created_at, maintenant),
      nonLue: !c.read_at,
      statut: CONTACT_STATUT_LABELS[statut],
      transitions: CONTACT_TRANSITIONS[statut],
      sujetReponse: `Re : ${c.subject ?? "votre message"}`,
    };
  });

  return (
    <>
      <AdminHead
        title="Messages de contact"
        desc="Les messages déposés depuis la page Contact du site public. Ouvrir un message le marque lu pour toute l'équipe ; le statut dit, lui, s'il a été traité."
      />

      {toutes.length > 0 && (
        <p className="text-[12.5px] text-warm-grey -mt-2 mb-4 tabular-nums">
          {nonLus > 0
            ? `${nonLus} message${nonLus > 1 ? "s" : ""} que personne n'a encore ouvert, sur ${toutes.length}.`
            : `${toutes.length} message${toutes.length > 1 ? "s" : ""}, tous ouverts.`}
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
                options: CONTACT_STATUTS.map((v) => ({
                  value: v,
                  label: CONTACT_STATUT_LABELS[v].label,
                })),
              },
              {
                cle: "lecture",
                aria: "Lecture",
                toutes: "Lus et non lus",
                options: [
                  { value: "non-lus", label: "Non ouverts" },
                  { value: "lus", label: "Déjà ouverts" },
                ],
              },
              { cle: "ordre", aria: "Ordre", toutes: "Du plus récent", options: ORDRES },
            ]}
            recherche={{ placeholder: "Rechercher un nom, un objet…" }}
            total={rows.length}
            unite="message"
          />
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminCard>
          {lignes.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-warm-grey">
              {q || statut || lecture
                ? "Aucun message ne correspond à ces critères."
                : "Aucun message. Ceux déposés depuis la page Contact du site apparaîtront ici."}
            </p>
          ) : (
            <ul>
              {lignes.map((l) => (
                <DemandeLigne
                  key={l.id}
                  data={l}
                  marquerLue={marquerContactLu}
                  changerStatut={setContactStatus}
                  supprimer={deleteContact}
                />
              ))}
            </ul>
          )}
        </AdminCard>
      </AnimateIn>
    </>
  );
}
