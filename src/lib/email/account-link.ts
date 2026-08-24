import "server-only";

import { Resend } from "resend";
import { emailHtml, escapeHtml } from "./template";
import { SITE_NAME, CABINET_EMAIL } from "@/lib/site";

/**
 * Envoie, depuis notre propre pile Resend, le lien qui fait définir un mot de
 * passe - à un nouveau membre invité, ou à un compte fraîchement promu.
 *
 * Pourquoi ne pas laisser Supabase envoyer cet email ? Son lien par défaut passe
 * par le flux PKCE : le `code_verifier` est déposé dans le navigateur qui a lancé
 * la demande (celui de l'admin), jamais dans celui du destinataire. Ouvert sur un
 * autre appareil, l'échange échoue et la personne atterrit sur /connexion. Un
 * lien `token_hash`, vérifié par `verifyOtp`, n'a pas ce défaut : il marche
 * partout. On génère donc le lien côté serveur et on l'expédie nous-mêmes.
 */
export async function sendAccountLink(input: {
  email: string;
  link: string;
  firstName?: string | null;
  mode: "invite" | "recovery";
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : lien d'accès non envoyé.");
    return false;
  }

  const resend = new Resend(apiKey);
  const greeting = input.firstName ? `Bonjour ${escapeHtml(input.firstName)},` : "Bonjour,";
  const intro =
    input.mode === "invite"
      ? "Vous avez été invité(e) à rejoindre l'espace équipe de Horkos. Définissez votre mot de passe pour accéder au back-office."
      : "Votre compte donne désormais accès au back-office de Horkos. Définissez votre mot de passe pour vous connecter.";
  const subject =
    input.mode === "invite"
      ? "Votre accès à l'équipe Horkos"
      : "Définissez votre mot de passe - Horkos";

  try {
    const result = await resend.emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to: input.email,
      subject,
      html: emailHtml({
        title: "Accès à l'espace équipe",
        intro: `${greeting}<br/><br/>${intro}`,
        rows: [],
        cta: { label: "Définir mon mot de passe", url: input.link },
        note: `Ce lien est personnel et expire après un court délai - ouvrez-le sans tarder. S'il ne fonctionne pas, copiez cette adresse dans votre navigateur :<br/><span style="word-break:break-all;color:#A9784F;">${escapeHtml(input.link)}</span>`,
      }),
    });
    if (result.error) {
      console.error("[email] lien d'accès refusé:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] lien d'accès échoué:", err);
    return false;
  }
}
