import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead, Card, CardGrid, EmptyPanel, Badge } from "@/components/client/ui";
import { formatDateTime } from "@/lib/dates";
import { PARCOURS, etatEtape, progressionParcours } from "@/lib/parcours";

export const metadata: Metadata = { title: "Mon accompagnement" };

interface Appointment {
  id: string;
  type: string;
  status: string;
  date: string;
  notes: string | null;
  mode?: string | null;
  meeting_url?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  planifie: "Planifié",
  confirme: "Confirmé",
  termine: "Terminé",
  annule: "Annulé",
};

/**
 * Le parcours en une seule pièce : un rail horizontal, trois jalons, la portion
 * parcourue remplie.
 *
 * Le rail ne court pas d'un bord à l'autre mais du centre du premier jalon au
 * centre du dernier - sinon il dépasse des pastilles et la barre semble
 * commencer avant l'étape initiale.
 */
function ParcoursBar({ appointments }: { appointments: Appointment[] }) {
  const reached = progressionParcours(appointments);
  const last = PARCOURS.length - 1;
  const fill = reached <= 0 ? 0 : (reached / last) * 100;
  const encours = PARCOURS.find((e) => etatEtape(e.type, appointments) === "encours");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-7">
        <h2 className="font-heading text-[17px] font-semibold text-ink leading-[1.3]">
          Votre parcours
        </h2>
        {encours && <Badge tone="attente">Vous en êtes à {encours.type}</Badge>}
      </div>

      <div className="relative">
        {/* Rail et remplissage bornés aux centres des pastilles extrêmes :
            1/6 et 5/6 de la largeur, chaque jalon occupant un tiers. */}
        <div
          aria-hidden="true"
          className="absolute top-[15px] h-[3px] rounded-full bg-cream-deep"
          style={{ left: `${100 / (PARCOURS.length * 2)}%`, right: `${100 / (PARCOURS.length * 2)}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute top-[15px] h-[3px] rounded-full bg-bronze transition-[width] duration-500"
          style={{
            left: `${100 / (PARCOURS.length * 2)}%`,
            width: `calc((100% - ${200 / (PARCOURS.length * 2)}%) * ${fill / 100})`,
          }}
        />

        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${PARCOURS.length}, 1fr)` }}>
          {PARCOURS.map((etape, i) => {
            const state = etatEtape(etape.type, appointments);
            return (
              <li key={etape.type} className="flex flex-col items-center text-center px-2">
                <span
                  aria-hidden="true"
                  className={`grid place-items-center w-8 h-8 rounded-full text-[12px] font-semibold border-[3px] border-white shrink-0 ${
                    state === "fait"
                      ? "bg-ink text-cream"
                      : state === "encours"
                        ? "bg-bronze text-white"
                        : "bg-cream-deep text-warm-grey"
                  }`}
                >
                  {state === "fait" ? "✓" : i + 1}
                </span>
                <span className="font-heading text-[15px] font-semibold text-ink mt-3">
                  {etape.type}
                </span>
                <span
                  className={`text-[13px] font-medium mt-0.5 ${
                    state === "avenir" ? "text-warm-grey" : "text-ink"
                  }`}
                >
                  {etape.title}
                </span>
                {/* Masquée sous `sm` : trois descriptions côte à côte sur un
                    téléphone donnent trois colonnes d'une dizaine de lignes. Le
                    jalon et son titre suffisent à se situer. */}
                <span className="hidden sm:block text-[12.5px] text-warm-grey leading-[1.6] mt-2 max-w-[280px]">
                  {etape.desc}
                </span>
                <span className="sr-only">
                  {state === "fait"
                    ? "étape franchie"
                    : state === "encours"
                      ? "étape en cours"
                      : "étape à venir"}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Une rangée de rendez-vous en cartes, à venir ou passés. */
function RendezVousGroup({
  titre,
  rendezVous,
  vide,
  delay,
  passe = false,
}: {
  titre: string;
  rendezVous: Appointment[];
  vide: string;
  delay: number;
  passe?: boolean;
}) {
  return (
    <section>
      <AnimateIn variant="fade-up" delay={delay}>
        <h2 className="text-ink text-[12px] font-semibold tracking-[1.4px] uppercase mb-3">
          {titre}
        </h2>
        {rendezVous.length > 0 ? (
          <CardGrid min="300px">
            {rendezVous.map((a) => (
              <Card key={a.id} center className={`p-5 h-full ${passe ? "bg-cream/40" : ""}`}>
                <div className="flex items-start gap-2.5 mb-2">
                  <span className="font-heading text-[17px] font-semibold text-ink leading-none flex-1">
                    {a.type}
                  </span>
                  <Badge
                    tone={
                      a.status === "termine" || a.status === "confirme" ? "succes" : "attente"
                    }
                  >
                    {STATUS_LABELS[a.status] ?? a.status}
                  </Badge>
                </div>
                <div className="text-[13px] text-charcoal">{formatDateTime(a.date)}</div>
                <div className="text-[12px] text-warm-grey mt-1">
                  {a.mode === "visio" ? "En visioconférence" : "Au cabinet"}
                </div>
                {a.notes && (
                  <p className="text-[12.5px] text-warm-grey leading-[1.6] mt-2.5">{a.notes}</p>
                )}
                {/* Le bouton ne s'affiche que sur un rendez-vous à venir : rejoindre
                    une réunion passée n'aurait aucun sens. */}
                {!passe && a.mode === "visio" && a.meeting_url && (
                  <a
                    href={a.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3.5 px-4 py-2 text-[12.5px] font-medium bg-ink text-cream rounded-lg hover:bg-navy transition-colors"
                  >
                    Rejoindre la visio
                  </a>
                )}
              </Card>
            ))}
          </CardGrid>
        ) : (
          <p className="text-[13px] text-warm-grey leading-[1.65]">{vide}</p>
        )}
      </AnimateIn>
    </section>
  );
}

export default async function AccompagnementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Le découpage passé / à venir est fait par Postgres plutôt qu'en mémoire :
  // c'est lui qui détient l'heure de référence, et chaque liste arrive déjà
  // dans son ordre d'affichage.
  const nowIso = new Date().toISOString();
  const [{ data: tous }, { data: aVenir }, { data: passesData }] = await Promise.all([
    supabase.from("appointments").select("id, type, status, date, notes, mode, meeting_url").eq("client_id", user.id),
    supabase
      .from("appointments")
      .select("id, type, status, date, notes, mode, meeting_url")
      .eq("client_id", user.id)
      .neq("status", "annule")
      .gte("date", nowIso)
      .order("date", { ascending: true }),
    supabase
      .from("appointments")
      .select("id, type, status, date, notes, mode, meeting_url")
      .eq("client_id", user.id)
      .neq("status", "annule")
      .lt("date", nowIso)
      .order("date", { ascending: false }),
  ]);

  // Les états du parcours se lisent sur TOUS les rendez-vous, annulés compris :
  // un R0 annulé ne franchit pas l'étape, mais il ne doit pas non plus la faire
  // disparaître de l'historique.
  const appointments: Appointment[] = tous ?? [];
  const avenir: Appointment[] = aVenir ?? [];
  const passes: Appointment[] = passesData ?? [];
  const actifs = appointments.filter((a) => a.status !== "annule");

  return (
    <Panel narrow>
      <PanelHead
        eyebrow="Où j'en suis"
        title="Mon accompagnement"
        desc="Trois étapes, du premier échange à la gouvernance dans la durée."
      />

      <AnimateIn variant="fade-up" delay={80}>
        <Card className="p-7 sm:p-9">
          <ParcoursBar appointments={appointments} />
        </Card>
      </AnimateIn>

      {/* Visible même sans rendez-vous : c'est ici qu'on vient pour en prendre un. */}
      <AnimateIn variant="fade-up" delay={110}>
        <div className="flex justify-end mt-5">
          <Link
            href="/espace/rendez-vous"
            className="inline-block px-5 py-2.5 text-[13px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors"
          >
            Prendre rendez-vous →
          </Link>
        </div>
      </AnimateIn>

      <div className="space-y-9 mt-4">
        <RendezVousGroup
          titre="À venir"
          rendezVous={avenir}
          delay={140}
          vide="Aucun rendez-vous planifié. Choisissez un créneau via « Prendre rendez-vous » ci-dessus."
        />
        <RendezVousGroup
          titre="Passés"
          rendezVous={passes}
          delay={200}
          passe
          vide="Aucun rendez-vous passé pour l'instant."
        />
      </div>

      {actifs.length === 0 && (
        <AnimateIn variant="fade-up" delay={260}>
          <div className="mt-3.5">
            <EmptyPanel
              title="Votre parcours n'a pas encore commencé"
              desc="Le premier rendez-vous, l'audit patrimonial, est gratuit et sans engagement. Choisissez l'heure qui vous arrange."
              action={{ href: "/espace/rendez-vous", label: "Prendre rendez-vous" }}
            />
          </div>
        </AnimateIn>
      )}
    </Panel>
  );
}
