import { redirect } from "next/navigation";

/**
 * L'audit a rejoint le patrimoine : c'est lui qui l'établit, les deux se lisent
 * ensemble. La route reste pour les liens et signets déjà en circulation.
 */
export default async function ClientAuditsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/clients/${id}/patrimoine`);
}
