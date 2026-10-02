import { redirect } from "next/navigation";

/** L'ancienne adresse, que portent les emails d'alerte déjà envoyés. */
export default function AncienneAdresseCessions() {
  redirect("/admin/demandes/cessions");
}
