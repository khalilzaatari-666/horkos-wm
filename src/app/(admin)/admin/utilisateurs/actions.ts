"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { sendAccountLink } from "@/lib/email/account-link";
import { NAME_REGEX, NAME_MAX, EMAIL_MAX } from "@/lib/validation";
import { ROLES, INVITABLE_ROLES } from "./constants";

const schema = z.object({
  id: z.uuid(),
  role: z.enum(ROLES),
});

export interface RoleState {
  status: "idle" | "success" | "error";
  message?: string;
}

/** Rôles qui ouvrent le back-office, donc qui exigent un mot de passe. */
const STAFF_ROLES: readonly string[] = ["conseiller", "admin"];

/**
 * Envoie à un compte déjà inscrit le lien qui lui fera choisir un mot de passe.
 *
 * On GÉNÈRE le lien avec la clé de service (`generateLink`, type recovery) puis
 * on l'expédie nous-mêmes via Resend, plutôt que de laisser Supabase l'envoyer.
 * Raison : le lien email par défaut de Supabase passe par PKCE, dont le
 * `code_verifier` reste dans le navigateur de l'admin qui a lancé la demande -
 * ouvert par le destinataire sur un autre appareil, l'échange échoue et il
 * atterrit sur /connexion. Un lien `token_hash`, vérifié par `verifyOtp` sur
 * /auth/confirm, n'a pas ce défaut et fonctionne partout.
 */
async function sendSetPasswordLink(
  email: string,
  firstName?: string | null
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("[admin] SUPABASE_SERVICE_ROLE_KEY absente : lien de mot de passe non généré.");
    return false;
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    console.error("[admin] génération du lien de mot de passe échouée:", error?.message);
    return false;
  }

  const link = `${SITE_URL}/auth/confirm?token_hash=${tokenHash}&type=recovery&next=/bienvenue`;
  return sendAccountLink({ email, link, firstName, mode: "recovery" });
}

/**
 * Change le rôle d'un compte.
 *
 * On ne crée pas de comptes ici : cela demanderait la clé de service Supabase,
 * qui contourne toute la RLS et n'a rien à faire dans une requête web. La
 * personne s'inscrit normalement sur le site, puis un admin la promeut.
 *
 * Deux garde-fous. La policy « Admins can update all profiles » (`is_admin()`)
 * est la barrière réelle - Postgres refusera l'écriture à un conseiller. Le
 * contrôle « ne pas se rétrograder soi-même » ci-dessous, lui, protège d'une
 * autre erreur : un unique admin qui se retire ses droits et verrouille le
 * back-office pour tout le monde, sans recours autre que du SQL.
 */
export async function updateUserRole(
  _previous: RoleState,
  formData: FormData
): Promise<RoleState> {
  const parsed = schema.safeParse({
    id: formData.get("id"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Rôle invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "error", message: "Session expirée." };

  if (user.id === parsed.data.id && parsed.data.role !== "admin") {
    return {
      status: "error",
      message:
        "Vous ne pouvez pas retirer vos propres droits d'administrateur - demandez à un autre admin.",
    };
  }

  // L'état actuel se lit avant l'écriture : c'est ce qui permet de distinguer
  // « rôle inchangé » d'un refus de la base, et de récupérer l'email vers
  // lequel partira le lien de mot de passe.
  const { data: cible } = await supabase
    .from("profiles")
    .select("role, email, first_name")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!cible) return { status: "error", message: "Compte introuvable." };

  if (cible.role === parsed.data.role) {
    return { status: "success", message: "Ce compte porte déjà ce rôle." };
  }

  // `.select()` n'est pas décoratif : une écriture bloquée par la RLS ne
  // renvoie AUCUNE erreur, elle met simplement à jour zéro ligne. Sans lire ce
  // qui a été touché, l'action annonçait un succès alors que rien n'avait
  // changé - et l'écran ne pouvait pas le dire.
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.id)
    .select("id, role");

  if (error) {
    return {
      status: "error",
      message: "Modification refusée. Seul un administrateur peut changer un rôle.",
    };
  }

  if (!updated || updated.length === 0) {
    return {
      status: "error",
      message:
        "Aucune modification enregistrée : la base a refusé l'écriture. Vérifiez que votre compte porte bien le rôle administrateur.",
    };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");

  // Entrer dans l'équipe, c'est avoir besoin d'un mot de passe : le
  // back-office ne se déverrouille pas par code email. Un compte déjà inscrit
  // n'en a pas - d'où l'envoi automatique, sans qu'un admin ait à y penser.
  //
  // L'échec de l'envoi ne remet pas le rôle en cause : la promotion est faite
  // et le reste se rattrape à la main. On le dit, plutôt que de laisser croire
  // qu'un email est parti.
  if (!STAFF_ROLES.includes(parsed.data.role)) {
    return { status: "success", message: "Rôle mis à jour." };
  }

  if (!cible.email) {
    return {
      status: "error",
      message:
        "Rôle mis à jour, mais ce compte n'a pas d'email : impossible d'envoyer le lien de mot de passe.",
    };
  }

  const envoye = await sendSetPasswordLink(cible.email, cible.first_name);
  return envoye
    ? {
        status: "success",
        message: `Rôle mis à jour. Un lien de définition du mot de passe a été envoyé à ${cible.email}.`,
      }
    : {
        status: "error",
        message:
          "Rôle mis à jour, mais l'email de définition du mot de passe n'est pas parti. Vérifiez la configuration email de Supabase - la limite d'envoi est souvent en cause.",
      };
}

// ============================================================
// RENVOI DU LIEN DE DÉFINITION DU MOT DE PASSE
// ============================================================

const resendSchema = z.object({ id: z.uuid() });

export interface ResendState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Renvoie à un membre de l'équipe le lien qui lui fait choisir son mot de passe.
 *
 * Les liens de récupération Supabase sont à usage unique et expirent (une heure
 * par défaut) : une personne promue qui tarde à cliquer se retrouve sans accès,
 * et le back-office n'offrait alors aucun moyen de relancer sans repasser par un
 * changement de rôle bidon. Cette action comble ce trou.
 *
 * Mêmes garde-fous que la promotion : l'appelant doit être admin (vérifié par la
 * RLS via le client ordinaire), et seul un compte déjà membre de l'équipe reçoit
 * un lien - un client se connecte par code, il n'a pas de mot de passe à définir.
 */
export async function resendSetPasswordLink(
  _previous: ResendState,
  formData: FormData
): Promise<ResendState> {
  const parsed = resendSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { status: "error", message: "Compte invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "error", message: "Session expirée. Reconnectez-vous." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return { status: "error", message: "Seul un administrateur peut renvoyer un lien." };
  }

  const { data: cible } = await supabase
    .from("profiles")
    .select("role, email, first_name")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!cible) return { status: "error", message: "Compte introuvable." };

  if (!STAFF_ROLES.includes(cible.role)) {
    return {
      status: "error",
      message: "Ce compte n'est pas membre de l'équipe : un client se connecte par code, sans mot de passe.",
    };
  }

  if (!cible.email) {
    return { status: "error", message: "Ce compte n'a pas d'email : impossible d'envoyer le lien." };
  }

  const envoye = await sendSetPasswordLink(cible.email, cible.first_name);
  return envoye
    ? {
        status: "success",
        message: `Lien renvoyé à ${cible.email}. Il expire vite : à ouvrir sans tarder.`,
      }
    : {
        status: "error",
        message:
          "L'email n'est pas parti. Vérifiez la configuration email de Supabase - la limite d'envoi est souvent en cause.",
      };
}

// ============================================================
// INVITATION D'UN MEMBRE DE L'ÉQUIPE
// ============================================================

const inviteSchema = z.object({
  email: z.email("Adresse email invalide.").max(EMAIL_MAX),
  firstName: z
    .string()
    .trim()
    .min(2, "Le prénom est trop court.")
    .max(NAME_MAX)
    .regex(NAME_REGEX, "Le prénom ne doit contenir que des lettres."),
  lastName: z
    .string()
    .trim()
    .min(2, "Le nom est trop court.")
    .max(NAME_MAX)
    .regex(NAME_REGEX, "Le nom ne doit contenir que des lettres."),
  role: z.enum(INVITABLE_ROLES),
});

export interface InviteState {
  status: "idle" | "success" | "error";
  message?: string;
}

/**
 * Invite un conseiller ou un admin : Supabase crée le compte et lui envoie un
 * lien pour définir son mot de passe. Ensuite, il se connecte sur
 * `/connexion/equipe` comme le reste de l'équipe.
 *
 * L'ordre des opérations est le point sensible. La clé de service ignore toutes
 * les policies : le rôle de l'appelant est donc vérifié AVANT de la toucher,
 * avec le client ordinaire soumis à la RLS. Inverser ces deux étapes ouvrirait
 * la création de comptes administrateurs à n'importe quel visiteur.
 *
 * Le prénom, le nom et le rôle voyagent dans les métadonnées de l'invitation :
 * `handle_new_user` les lit à la création du profil, donc le compte naît déjà
 * avec le bon rôle, sans seconde écriture.
 */
export async function inviteStaff(
  _previous: InviteState,
  formData: FormData
): Promise<InviteState> {
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  // 1. Vérifier l'appelant avec le client soumis à la RLS.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "error", message: "Session expirée. Reconnectez-vous." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") {
    return { status: "error", message: "Seul un administrateur peut inviter un membre." };
  }

  // 2. Seulement maintenant, la clé de service.
  const admin = createAdminClient();
  if (!admin) {
    return {
      status: "error",
      message:
        "L'invitation n'est pas configurée : la variable SUPABASE_SERVICE_ROLE_KEY est absente.",
    };
  }

  // On génère le lien d'invitation (qui crée aussi le compte, avec ses
  // métadonnées) sans laisser Supabase l'envoyer : même raison que pour la
  // promotion, l'email par défaut passe par PKCE et casse d'un appareil à
  // l'autre. On expédie donc nous-mêmes un lien `token_hash`.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: parsed.data.email,
    options: {
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        role: parsed.data.role,
      },
    },
  });

  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) {
    // Cas courant : la personne s'est déjà inscrite côté client. L'inviter
    // échoue, mais la promotion depuis la liste marche très bien.
    const exists = /already|registered|exist/i.test(error?.message ?? "");
    return {
      status: "error",
      message: exists
        ? "Ce compte existe déjà. Attribuez-lui simplement son rôle dans la liste ci-dessous."
        : "L'invitation n'a pas pu être générée. Réessayez.",
    };
  }

  const link = `${SITE_URL}/auth/confirm?token_hash=${tokenHash}&type=invite&next=/bienvenue`;
  const sent = await sendAccountLink({
    email: parsed.data.email,
    link,
    firstName: parsed.data.firstName,
    mode: "invite",
  });

  if (!sent) {
    return {
      status: "error",
      message:
        "Le compte est créé mais l'email d'invitation n'est pas parti. Utilisez « Renvoyer le lien » depuis la liste ci-dessous.",
    };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  return {
    status: "success",
    message: `Invitation envoyée à ${parsed.data.email}. Le lien permet de définir un mot de passe.`,
  };
}
