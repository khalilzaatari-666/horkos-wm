import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminCard } from "@/components/admin/ui";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { DemandeLigne, type DemandeLigneData } from "../demande-ligne";
import {
  PARTENAIRE_STATUT_LABELS,
  PARTENAIRE_TRANSITIONS,
  type PartenaireStatut,
} from "./constants";
import { marquerPartenaireLu, setPartenaireStatus, deletePartenaire } from "./actions";

export const metadata: Metadata = { title: "Demandes de partenariat" };

const STATUTS_CONNUS = new Set<string>(Object.keys(PARTENAIRE_STATUT_LABELS));

/** Un statut inconnu - valeur écrite à la main en base - reste lisible. */
function statutDe(valeur: string): PartenaireStatut {
  return (STATUTS_CONNUS.has(valeur) ? valeur : "nouveau") as PartenaireStatut;
}

export default async function AdminPartenariatsPage() {
  const supabase = await createClient();
  const maintenant = new Date();

  const { data } = await supabase
    .from("partner_submissions")
    .select("id, name, company, email, phone, partner_type, message, status, created_at, read_at")
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const nonLues = rows.filter((p) => !p.read_at).length;

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

      {rows.length > 0 && (
        <p className="text-[12.5px] text-warm-grey -mt-2 mb-4 tabular-nums">
          {nonLues > 0
            ? `${nonLues} demande${nonLues > 1 ? "s" : ""} que personne n'a encore ouverte${nonLues > 1 ? "s" : ""}, sur ${rows.length}.`
            : `${rows.length} demande${rows.length > 1 ? "s" : ""}, toutes ouvertes.`}
        </p>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminCard>
          {lignes.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-warm-grey">
              Aucune demande. Celles déposées depuis le site public apparaîtront ici.
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
