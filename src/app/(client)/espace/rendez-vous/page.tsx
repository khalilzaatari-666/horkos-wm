import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead } from "@/components/client/ui";
import { BookingPanel } from "./booking-panel";

export const metadata: Metadata = { title: "Prendre rendez-vous" };

/** PostgREST rend la relation en objet ou en tableau ; on normalise. */
function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/**
 * Depuis que la réservation se fait chez le référent quand il y en a un
 * (migration 025), la page doit le dire : les créneaux affichés sont ceux d'un
 * agenda précis, et « l'un de nos conseillers » laisserait croire qu'un autre
 * pourrait prendre le rendez-vous si celui-là est pris.
 */
export default async function EspaceRendezVousPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("advisor_id, advisor:advisor_id(first_name, last_name, role)")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  type Referent = { first_name: string | null; last_name: string | null; role: string };
  const advisor = one(profile?.advisor as unknown as Referent | Referent[] | null);
  // Le même garde-fou que côté SQL : un référent qui n'est plus conseiller ne
  // compte pas, et le client retombe sur le cabinet entier.
  const referent =
    advisor && advisor.role === "conseiller"
      ? [advisor.first_name, advisor.last_name].filter(Boolean).join(" ") || null
      : null;

  return (
    <Panel narrow>
      <PanelHead
        eyebrow="À votre convenance"
        title="Prendre rendez-vous"
        desc={
          referent
            ? `Choisissez le créneau qui vous arrange dans l'agenda de ${referent}, votre conseiller référent : il est confirmé immédiatement.`
            : "Choisissez le créneau qui vous arrange : il est confirmé immédiatement avec l'un de nos conseillers."
        }
      />
      <AnimateIn variant="fade-up" delay={80}>
        <BookingPanel />
      </AnimateIn>
    </Panel>
  );
}
