import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td } from "@/components/admin/ui";
import { formatDateLong } from "@/lib/dates";
import { StatusSelect } from "./status-select";
import { DEMANDE_STATUTS, DEMANDE_STATUT_STYLES, type DemandeStatut } from "./constants";

export const metadata: Metadata = { title: "Demandes de rendez-vous" };

/** Au-delà, la colonne devient un mur de pastilles ; le reste passe en « +N ». */
const BESOINS_VISIBLES = 3;

function Initiales({ prenom, nom }: { prenom: string | null; nom: string | null }) {
  const letters =
    [prenom?.[0], nom?.[0]].filter(Boolean).join("").toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center w-9 h-9 rounded-full bg-cream text-bronze-dark font-heading text-[13px] font-semibold shrink-0"
    >
      {letters}
    </span>
  );
}

function Ligne({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[12px] whitespace-nowrap">
      <span className="text-warm-grey">{label}</span>
      <span className="text-charcoal font-medium">{value}</span>
    </div>
  );
}

export default async function DemandesPage() {
  const supabase = await createClient();

  const { data: demandes } = await supabase
    .from("appointment_requests")
    .select(
      "id, first_name, last_name, email, phone, besoins, besoin_autre, patrimoine, investissement, message, status, created_at, appointment_id"
    )
    .order("created_at", { ascending: false });

  const rows = demandes ?? [];

  // Un compteur par statut : le conseiller voit ce qui l'attend avant de lire
  // le tableau ligne à ligne.
  const parStatut = DEMANDE_STATUTS.map((s) => ({
    statut: s,
    total: rows.filter((r) => r.status === s).length,
  })).filter((s) => s.total > 0);

  return (
    <AdminPanel>
      <AdminHead
        title="Demandes de rendez-vous"
        desc="Les questionnaires remplis sur le site public. Une demande marquée « Réservé » signifie que le visiteur a lui-même posé son créneau — il n'y a pas de rappel à passer pour fixer l'heure."
      />

      {parStatut.length > 0 && (
        <AnimateIn variant="fade-up" delay={40}>
          <div className="flex flex-wrap gap-2 mb-5">
            {parStatut.map(({ statut, total }) => {
              const style = DEMANDE_STATUT_STYLES[statut as DemandeStatut];
              return (
                <span
                  key={statut}
                  title={style.hint}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[12px] font-semibold ${style.pill}`}
                >
                  <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {style.label}
                  <span className="opacity-70 tabular-nums">{total}</span>
                </span>
              );
            })}
          </div>
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={["Contact", "Besoins exprimés", "Profil", "Reçue le", "Statut"]}
          isEmpty={rows.length === 0}
          empty="Aucune demande pour l'instant. Elles apparaîtront ici dès qu'un visiteur remplira le questionnaire de prise de rendez-vous."
        >
          {rows.map((d) => {
            const besoins: string[] = d.besoins ?? [];
            const visibles = besoins.slice(0, BESOINS_VISIBLES);
            const reste = besoins.length - visibles.length;

            return (
              <tr key={d.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td>
                  <div className="flex items-start gap-3">
                    <Initiales prenom={d.first_name} nom={d.last_name} />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-ink leading-[1.35]">
                        {d.first_name} {d.last_name}
                      </div>
                      <a
                        href={`mailto:${d.email}`}
                        className="block text-[12px] text-bronze-dark hover:text-bronze transition-colors truncate max-w-[220px]"
                      >
                        {d.email}
                      </a>
                      {d.phone && (
                        <a
                          href={`tel:${d.phone}`}
                          className="block text-[12px] text-warm-grey hover:text-bronze transition-colors tabular-nums"
                        >
                          {d.phone}
                        </a>
                      )}
                      {d.appointment_id && (
                        <span className="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-emerald-700">
                          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Créneau réservé
                        </span>
                      )}
                    </div>
                  </div>
                </Td>

                <Td className="max-w-[300px]">
                  {besoins.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {visibles.map((b) => (
                        <span
                          key={b}
                          className="inline-block text-[11.5px] text-charcoal bg-cream border border-cream-deep px-2 py-0.5 rounded-md"
                        >
                          {b}
                        </span>
                      ))}
                      {reste > 0 && (
                        <span
                          title={besoins.slice(BESOINS_VISIBLES).join(", ")}
                          className="inline-block text-[11.5px] font-semibold text-warm-grey bg-cream/60 border border-cream-deep px-2 py-0.5 rounded-md cursor-default"
                        >
                          +{reste}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-warm-grey">—</span>
                  )}

                  {d.besoin_autre && (
                    <p className="text-[12px] text-charcoal leading-[1.5] mt-2 pl-2.5 border-l-2 border-bronze/40 italic">
                      {d.besoin_autre}
                    </p>
                  )}

                  {d.message && (
                    <p
                      title={d.message}
                      className="text-[12px] text-warm-grey leading-[1.5] mt-2 line-clamp-2"
                    >
                      {d.message}
                    </p>
                  )}
                </Td>

                <Td>
                  <div className="space-y-1">
                    <Ligne label="Patrimoine" value={d.patrimoine ?? "—"} />
                    <Ligne label="À investir" value={d.investissement ?? "—"} />
                  </div>
                </Td>

                <Td className="whitespace-nowrap text-warm-grey">
                  {formatDateLong(d.created_at)}
                </Td>

                <Td>
                  <StatusSelect id={d.id} value={d.status} />
                </Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </AdminPanel>
  );
}
