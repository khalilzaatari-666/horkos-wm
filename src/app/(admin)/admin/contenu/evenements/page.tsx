import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { formatDateTime } from "@/lib/dates";
import { EventCreate } from "./event-create";
import { setEventPublished, deleteEvent } from "./actions";
import { param, pick, sensDe, recherche, trier, instant, contient, LIMITE_LISTE } from "@/lib/liste";

export const metadata: Metadata = { title: "Événements" };

const TRIS = ["evenement", "quand", "statut"] as const;
const ETATS = [
  { value: "publies", label: "Publiés" },
  { value: "brouillons", label: "Brouillons" },
];
/** L'axe le plus utile ici : ce qui reste à tenir, et ce qui est derrière. */
const PERIODES = [
  { value: "avenir", label: "À venir" },
  { value: "passes", label: "Passés" },
];

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "quand")!;
  const sens = sensDe(param(raw, "sens"), tri === "quand" ? "desc" : "asc");
  const etat = pick(param(raw, "etat"), ["publies", "brouillons"] as const, null);
  const periode = pick(param(raw, "periode"), ["avenir", "passes"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select("id, title, location, date, is_published")
    .order("date", { ascending: false })
    .limit(LIMITE_LISTE);

  const rows = trier(
    (data ?? []).filter(
      (e) =>
        (etat === null || (etat === "publies") === Boolean(e.is_published)) &&
        (periode === null || (periode === "passes") === (e.date < nowIso)) &&
        contient([e.title, e.location], q)
    ),
    (e) =>
      tri === "evenement" ? e.title : tri === "statut" ? Boolean(e.is_published) : instant(e.date),
    sens,
    (e) => e.title
  );

  const params = {
    etat: etat ?? undefined,
    periode: periode ?? undefined,
    q: q || undefined,
  };

  return (
    <>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <AdminHead
          title="Événements"
          desc="Les événements publiés apparaissent sur la page Ressources, les à venir en premier."
        />
        <AnimateIn variant="fade-up">
          <EventCreate />
        </AnimateIn>
      </div>

      <AnimateIn variant="fade-up" delay={40}>
        <FiltresListe
          champs={[
            { cle: "periode", aria: "Période", toutes: "Toute période", options: PERIODES },
            { cle: "etat", aria: "État", toutes: "Tous les états", options: ETATS },
          ]}
          recherche={{ placeholder: "Rechercher un événement…" }}
          total={rows.length}
          unite="événement"
        />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader
              key="e"
              label="Événement"
              colonne="evenement"
              tri={tri}
              sens={sens}
              params={params}
            />,
            <TriHeader
              key="q"
              label="Quand"
              colonne="quand"
              tri={tri}
              sens={sens}
              params={params}
              sensInitial="desc"
            />,
            <TriHeader key="s" label="Statut" colonne="statut" tri={tri} sens={sens} params={params} />,
            "",
          ]}
          isEmpty={rows.length === 0}
          empty={
            q || etat || periode
              ? "Aucun événement ne correspond à ces critères."
              : "Aucun événement pour l'instant. Créez le premier avec « Nouvel événement »."
          }
        >
          {rows.map((e) => {
            const past = e.date < nowIso;
            return (
              <tr key={e.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td>
                  <Link
                    href={`/admin/contenu/evenements/${e.id}`}
                    className="font-medium text-ink hover:text-bronze-dark transition-colors"
                  >
                    {e.title}
                  </Link>
                  {e.location && (
                    <div className="text-[11.5px] text-warm-grey mt-0.5">{e.location}</div>
                  )}
                </Td>
                <Td className="whitespace-nowrap">
                  <span className={past ? "text-warm-grey" : "text-charcoal"}>
                    {formatDateTime(e.date)}
                  </span>
                  {past && <span className="text-[11px] text-warm-grey ml-1.5">(passé)</span>}
                </Td>
                <Td>
                  <AdminBadge tone={e.is_published ? "succes" : "neutre"}>
                    {e.is_published ? "Publié" : "Brouillon"}
                  </AdminBadge>
                </Td>
                <Td>
                  <div className="flex items-center gap-3 justify-end whitespace-nowrap">
                    <Link
                      href={`/admin/contenu/evenements/${e.id}`}
                      className="text-[12.5px] text-bronze-dark hover:text-bronze font-medium transition-colors"
                    >
                      Modifier
                    </Link>
                    <form action={setEventPublished}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="publish" value={e.is_published ? "false" : "true"} />
                      <button
                        type="submit"
                        className="text-[12.5px] text-warm-grey hover:text-ink transition-colors cursor-pointer"
                      >
                        {e.is_published ? "Dépublier" : "Publier"}
                      </button>
                    </form>
                    <form action={deleteEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <ConfirmButton
                        message={`Supprimer définitivement l'événement « ${e.title} » ?`}
                        className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
                      >
                        Supprimer
                      </ConfirmButton>
                    </form>
                  </div>
                </Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </>
  );
}
