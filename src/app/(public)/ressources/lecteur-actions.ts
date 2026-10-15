"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendCode, checkCode, smsActif } from "@/lib/sms";
import { sendArticleEmail, sendGuideEmail } from "@/lib/email/guide";
import { LECTEUR_COOKIE, LECTEUR_MAX_AGE } from "@/lib/lecteur";
import { NAME_REGEX, NAME_MAX, EMAIL_MAX, validatePhoneFull } from "@/lib/validation";

/**
 * Le formulaire qui ouvre guides et articles : le lecteur s'identifie, reçoit
 * un code par SMS si Twilio est configuré (`lib/sms.ts`), et la fiche ouverte
 * pose le cookie qui déverrouille tout (voir `lib/lecteur.ts`). Le contenu
 * ouvert lui est aussi envoyé par email.
 */

export type Resultat<T = object> = ({ ok: true } & T) | { ok: false; message: string };

const nom = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} est trop court.`)
    .max(NAME_MAX, `${label} est trop long.`)
    .regex(NAME_REGEX, `${label} ne doit contenir que des lettres.`);

const demandeSchema = z.object({
  firstName: nom("Le prénom"),
  lastName: nom("Le nom"),
  email: z.email("Veuillez entrer une adresse email valide.").max(EMAIL_MAX),
  phone: z
    .string()
    .trim()
    .refine((v) => validatePhoneFull(v) === null, "Numéro de téléphone invalide."),
  consent: z.literal(true, { message: "Merci d'accepter d'être recontacté pour continuer." }),
  sourceType: z.enum(["guide", "article"]),
  sourceId: z.uuid(),
});

const leadSchema = z.uuid("Demande inconnue.");
const codeSchema = z.string().regex(/^\d{6}$/, "Le code compte 6 chiffres.");

const TROP = "Trop de tentatives. Merci de patienter quelques minutes avant de réessayer.";
const INDISPONIBLE = "Le service est momentanément indisponible. Réessayez dans un instant.";
const SMS_ECHEC = "Le SMS n'a pas pu partir. Vérifiez le numéro et réessayez.";

export type DemandeCode = z.input<typeof demandeSchema>;

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;

/**
 * Ouvre les contenus pour ce lecteur : cookie d'un an, puis envoi par email du
 * contenu qu'il voulait lire. Un email qui échoue n'empêche pas la lecture :
 * la page adapte son message.
 */
async function ouvrir(
  admin: Admin,
  lead: { id: string; email: string; source_type: string; source_id: string }
): Promise<boolean> {
  (await cookies()).set(LECTEUR_COOKIE, lead.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: LECTEUR_MAX_AGE,
  });

  if (lead.source_type === "guide") {
    const { data: guide } = await admin
      .from("guides")
      .select("title, pdf_url")
      .eq("id", lead.source_id)
      .maybeSingle();
    if (!guide?.pdf_url) return false;
    await admin.from("guide_downloads").insert({ guide_id: lead.source_id, email: lead.email });
    return sendGuideEmail({ email: lead.email, titre: guide.title, pdfUrl: guide.pdf_url });
  }
  const { data: article } = await admin
    .from("articles")
    .select("title, slug")
    .eq("id", lead.source_id)
    .maybeSingle();
  return article ? sendArticleEmail({ email: lead.email, titre: article.title, slug: article.slug }) : false;
}

/**
 * Étape 1 : enregistre le lecteur. Avec Twilio, il reçoit un code et la fiche
 * attend sa vérification ; sans Twilio, le contenu s'ouvre tout de suite,
 * numéro non vérifié.
 */
export async function demanderCode(
  input: DemandeCode
): Promise<Resultat<{ ouvert: false; leadId: string } | { ouvert: true; emailSent: boolean }>> {
  const parsed = demandeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;

  if (!(await rateLimit("lecteur-sms", { max: 3, windowSeconds: 600 }))) return { ok: false, message: TROP };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: INDISPONIBLE };

  // Un identifiant de contenu inventé ne crée pas de fiche.
  const { data: source } = await admin
    .from(d.sourceType === "guide" ? "guides" : "articles")
    .select("id")
    .eq("id", d.sourceId)
    .eq("is_published", true)
    .maybeSingle();
  if (!source) return { ok: false, message: "Ce contenu n'est plus disponible." };

  const sms = smsActif();
  const { data: lead, error } = await admin
    .from("content_leads")
    .insert({
      first_name: d.firstName,
      last_name: d.lastName,
      email: d.email,
      phone: d.phone,
      source_type: d.sourceType,
      source_id: d.sourceId,
      consent_at: new Date().toISOString(),
      // Sans étape SMS, la fiche ouvre les contenus dès maintenant.
      verified_at: sms ? null : new Date().toISOString(),
      ip: await clientIp(),
    })
    .select("id")
    .single();
  if (error || !lead) return { ok: false, message: INDISPONIBLE };

  if (!sms) {
    const emailSent = await ouvrir(admin, { id: lead.id, email: d.email, source_type: d.sourceType, source_id: d.sourceId });
    return { ok: true, ouvert: true, emailSent };
  }

  if (!(await sendCode(d.phone))) return { ok: false, message: SMS_ECHEC };
  return { ok: true, ouvert: false, leadId: lead.id };
}

/** Renvoie un code au numéro d'une fiche pas encore vérifiée. */
export async function renvoyerCode(leadId: string): Promise<Resultat> {
  if (!leadSchema.safeParse(leadId).success) return { ok: false, message: "Demande inconnue." };
  if (!(await rateLimit("lecteur-sms", { max: 3, windowSeconds: 600 }))) return { ok: false, message: TROP };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: INDISPONIBLE };
  const { data: lead } = await admin
    .from("content_leads")
    .select("phone, verified_at")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead || lead.verified_at) return { ok: false, message: "Demande inconnue." };

  return (await sendCode(lead.phone)) ? { ok: true } : { ok: false, message: SMS_ECHEC };
}

/**
 * Étape 2 (avec Twilio) : vérifie le code. S'il est bon, la fiche est marquée
 * vérifiée et les contenus s'ouvrent.
 */
export async function verifierCode(
  leadId: string,
  code: string
): Promise<Resultat<{ emailSent: boolean }>> {
  if (!leadSchema.safeParse(leadId).success) return { ok: false, message: "Demande inconnue." };
  const c = codeSchema.safeParse(code.trim());
  if (!c.success) return { ok: false, message: c.error.issues[0].message };

  if (!(await rateLimit("lecteur-code", { max: 10, windowSeconds: 600 }))) return { ok: false, message: TROP };

  const admin = createAdminClient();
  if (!admin) return { ok: false, message: INDISPONIBLE };
  const { data: lead } = await admin
    .from("content_leads")
    .select("id, email, phone, source_type, source_id, verified_at")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, message: "Demande inconnue." };

  if (!lead.verified_at) {
    if (!(await checkCode(lead.phone, c.data))) {
      return { ok: false, message: "Code incorrect ou expiré. Vérifiez-le, ou demandez-en un nouveau." };
    }
    await admin
      .from("content_leads")
      .update({ verified_at: new Date().toISOString(), phone_verified: true })
      .eq("id", lead.id);
  }

  return { ok: true, emailSent: await ouvrir(admin, lead) };
}
