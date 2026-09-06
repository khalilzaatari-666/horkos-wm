import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminCard } from "@/components/admin/ui";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { DemandeLigne, type DemandeLigneData } from "../demande-ligne";
import {
  CONTACT_STATUT_LABELS,
  CONTACT_TRANSITIONS,
  type ContactStatut,
} from "./constants";
import { marquerContactLu, setContactStatus, deleteContact } from "./actions";

export const metadata: Metadata = { title: "Messages de contact" };

const STATUTS_CONNUS = new Set<string>(Object.keys(CONTACT_STATUT_LABELS));

/** Un statut inconnu - valeur écrite à la main en base - reste lisible. */
function statutDe(valeur: string): ContactStatut {
  return (STATUTS_CONNUS.has(valeur) ? valeur : "nouveau") as ContactStatut;
}

export default async function AdminContactsPage() {
  const supabase = await createClient();
  // Un seul instant de référence pour toutes les dates relatives de la page :
  // `Date.now` est rejeté par la règle de pureté des composants.
  const maintenant = new Date();

  const { data } = await supabase
    .from("contacts")
    .select("id, name, email, phone, subject, message, status, created_at, read_at")
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const nonLus = rows.filter((c) => !c.read_at).length;

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

      {rows.length > 0 && (
        <p className="text-[12.5px] text-warm-grey -mt-2 mb-4 tabular-nums">
          {nonLus > 0
            ? `${nonLus} message${nonLus > 1 ? "s" : ""} que personne n'a encore ouvert, sur ${rows.length}.`
            : `${rows.length} message${rows.length > 1 ? "s" : ""}, tous ouverts.`}
        </p>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminCard>
          {lignes.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-warm-grey">
              Aucun message. Ceux déposés depuis la page Contact du site apparaîtront ici.
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
