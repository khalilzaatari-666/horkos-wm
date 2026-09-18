import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/staff";
import { etatMfa, mfaExigee } from "@/lib/mfa";
import { destinationAdmin } from "@/lib/landing";
import { MfaForm } from "./mfa-form";

/**
 * Second facteur de l'équipe : une seule page, deux visages.
 *
 * - Facteur déjà inscrit : on demande le code de l'application
 *   d'authentification.
 * - Aucun facteur : on en inscrit un - QR code à scanner, puis premier code
 *   pour l'activer. Obligatoire : le back-office ne s'ouvre pas avant.
 *
 * Tout se passe côté serveur avec la session en cookies : le navigateur ne
 * parle jamais à Supabase Auth directement, et la vérification passe par le
 * même plafond par IP que le mot de passe.
 */
export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: demande } = await searchParams;
  const destination = destinationAdmin(demande);

  // Interrupteur éteint : la page n'a rien à demander, on passe.
  if (!mfaExigee()) redirect(destination);

  const supabase = await createClient();
  const staff = await requireStaff(supabase);
  if (!staff) redirect(`/connexion/equipe?redirect=${encodeURIComponent(destination)}`);

  const etat = await etatMfa(supabase);
  if (etat === "ok") redirect(destination);

  const { data: facteurs } = await supabase.auth.mfa.listFactors();
  const totp = facteurs?.totp ?? [];

  if (etat === "a_verifier") {
    const verifie = totp.find((f) => f.status === "verified");
    // Un état « à vérifier » sans facteur vérifié n'existe pas ; si la lecture
    // échoue, autant repartir sur une inscription propre.
    if (verifie) {
      return <MfaForm mode="verifier" factorId={verifie.id} redirect={destination} />;
    }
  }

  // Inscription. Un facteur non vérifié traîne à chaque page quittée avant la
  // fin : on nettoie, sinon Supabase refuse un second facteur du même nom.
  for (const f of totp.filter((f) => f.status !== "verified")) {
    await supabase.auth.mfa.unenroll({ factorId: f.id });
  }

  const { data: inscription, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Horkos",
    issuer: "Horkos WM",
  });

  if (error || !inscription) {
    return (
      <MfaForm
        mode="indisponible"
        redirect={destination}
        message="L'authentification à deux facteurs n'est pas activée sur le projet Supabase (Authentication > Multi-Factor). Contactez l'administrateur."
      />
    );
  }

  return (
    <MfaForm
      mode="inscrire"
      factorId={inscription.id}
      qrCode={inscription.totp.qr_code}
      secret={inscription.totp.secret}
      redirect={destination}
    />
  );
}
