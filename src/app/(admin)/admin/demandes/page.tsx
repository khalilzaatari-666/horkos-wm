import { redirect } from "next/navigation";

/**
 * La section ouvre sur son premier onglet : c'est ce qui permet à la barre
 * latérale de pointer sur `/admin/demandes` et de rester allumée sur les deux.
 */
export default function DemandesIndexPage() {
  redirect("/admin/demandes/contacts");
}
