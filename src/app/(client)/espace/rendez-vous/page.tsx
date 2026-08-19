import type { Metadata } from "next";
import { AnimateIn } from "@/components/ui/animate-in";
import { Panel, PanelHead } from "@/components/client/ui";
import { BookingPanel } from "./booking-panel";

export const metadata: Metadata = { title: "Prendre rendez-vous" };

export default function EspaceRendezVousPage() {
  return (
    <Panel narrow>
      <PanelHead
        eyebrow="À votre convenance"
        title="Prendre rendez-vous"
        desc="Choisissez l'heure qui vous arrange : le créneau est confirmé immédiatement avec l'un de nos conseillers."
      />
      <AnimateIn variant="fade-up" delay={80}>
        <BookingPanel />
      </AnimateIn>
    </Panel>
  );
}
