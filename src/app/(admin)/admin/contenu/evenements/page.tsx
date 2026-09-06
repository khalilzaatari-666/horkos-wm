import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { formatDateTime } from "@/lib/dates";
import { EventCreate } from "./event-create";
import { setEventPublished, deleteEvent } from "./actions";

export const metadata: Metadata = { title: "Événements" };

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select("id, title, location, date, is_published")
    .order("date", { ascending: false });

  const rows = data ?? [];

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

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Événement", "Quand", "Statut", ""]}
          isEmpty={rows.length === 0}
          empty="Aucun événement pour l'instant. Créez le premier avec « Nouvel événement »."
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
