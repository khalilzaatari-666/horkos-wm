import "server-only";

import { Resend } from "resend";
import { emailHtml, escapeHtml } from "./template";
import { SITE_NAME, SITE_URL, CABINET_EMAIL } from "@/lib/site";

/**
 * Envoie le guide demandé depuis la page Ressources : un lien vers son PDF,
 * pas une pièce jointe - le fichier vit déjà en ligne, et une pièce jointe
 * de plusieurs mégaoctets finit plus souvent en indésirables.
 *
 * Rend `false` si l'email n'est pas parti : contrairement aux alertes de
 * l'équipe, c'est ici la seule chose que le visiteur attend, et la page ne
 * doit pas lui promettre un envoi qui n'a pas eu lieu.
 */
export async function sendGuideEmail(input: {
  email: string;
  titre: string;
  pdfUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : guide non envoyé.");
    return false;
  }

  try {
    const result = await new Resend(apiKey).emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to: input.email,
      replyTo: CABINET_EMAIL,
      subject: `Votre guide : ${input.titre}`,
      html: emailHtml({
        title: "Votre guide",
        intro: `Merci de votre intérêt pour « ${escapeHtml(input.titre)} ». Le guide est prêt : il s'ouvre depuis le bouton ci-dessous.`,
        rows: [],
        cta: { label: "Télécharger le guide", url: escapeHtml(input.pdfUrl) },
        note: `Une question après lecture ? Répondez simplement à cet email, ou <a href="${SITE_URL}/rendez-vous" style="color:#A9784F;">prenez rendez-vous</a> : le premier échange est gratuit et sans engagement.`,
      }),
    });
    if (result.error) {
      console.error("[email] envoi du guide refusé:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] envoi du guide échoué:", err);
    return false;
  }
}
