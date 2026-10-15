import "server-only";

import { Resend } from "resend";
import { emailHtml, escapeHtml } from "./template";
import { SITE_NAME, SITE_URL, CABINET_EMAIL } from "@/lib/site";

/**
 * Envoie au lecteur qui vient de s'identifier le contenu qu'il a ouvert : un
 * lien vers le PDF du guide, ou vers l'article - pas de pièce jointe, le
 * fichier vit déjà en ligne, et une pièce jointe de plusieurs mégaoctets finit
 * plus souvent en indésirables.
 *
 * Rend `false` si l'email n'est pas parti : la page adapte alors son message
 * plutôt que de promettre un envoi qui n'a pas eu lieu.
 */
async function envoyer(input: {
  email: string;
  subject: string;
  title: string;
  intro: string;
  cta: { label: string; url: string };
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY absente : contenu non envoyé.");
    return false;
  }

  try {
    const result = await new Resend(apiKey).emails.send({
      from: `${SITE_NAME} <${CABINET_EMAIL}>`,
      to: input.email,
      replyTo: CABINET_EMAIL,
      subject: input.subject,
      html: emailHtml({
        title: input.title,
        intro: input.intro,
        rows: [],
        cta: input.cta,
        note: `Une question après lecture ? Répondez simplement à cet email, ou <a href="${SITE_URL}/rendez-vous" style="color:#A9784F;">prenez rendez-vous</a> : le premier échange est gratuit et sans engagement.`,
      }),
    });
    if (result.error) {
      console.error("[email] envoi du contenu refusé:", result.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] envoi du contenu échoué:", err);
    return false;
  }
}

export function sendGuideEmail(input: { email: string; titre: string; pdfUrl: string }): Promise<boolean> {
  return envoyer({
    email: input.email,
    subject: `Votre guide : ${input.titre}`,
    title: "Votre guide",
    intro: `Merci de votre intérêt pour « ${escapeHtml(input.titre)} ». Le guide est prêt : il s'ouvre depuis le bouton ci-dessous.`,
    cta: { label: "Télécharger le guide", url: escapeHtml(input.pdfUrl) },
  });
}

export function sendArticleEmail(input: { email: string; titre: string; slug: string }): Promise<boolean> {
  return envoyer({
    email: input.email,
    subject: `Votre article : ${input.titre}`,
    title: "Votre article",
    intro: `Merci de votre intérêt pour « ${escapeHtml(input.titre)} ». L'article complet s'ouvre depuis le bouton ci-dessous.`,
    cta: { label: "Lire l'article", url: `${SITE_URL}/ressources/articles/${encodeURIComponent(input.slug)}` },
  });
}
