"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
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

/**
 * Change le rôle d'un compte.
 *
 * On ne crée pas de comptes ici : cela demanderait la clé de service Supabase,
 * qui contourne toute la RLS et n'a rien à faire dans une requête web. La
 * personne s'inscrit normalement sur le site, puis un admin la promeut.
 *
 * Deux garde-fous. La policy « Admins can update all profiles » (`is_admin()`)
 * est la barrière réelle — Postgres refusera l'écriture à un conseiller. Le
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
        "Vous ne pouvez pas retirer vos propres droits d'administrateur — demandez à un autre admin.",
    };
  }

  // `.select()` n'est pas décoratif : une écriture bloquée par la RLS ne
  // renvoie AUCUNE erreur, elle met simplement à jour zéro ligne. Sans lire ce
  // qui a été touché, l'action annonçait un succès alors que rien n'avait
  // changé — et l'écran ne pouvait pas le dire.
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
  return { status: "success" };
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

  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      role: parsed.data.role,
    },
    // Passe par le callback existant, qui échange le code contre une session
    // puis dépose l'invité sur la page de définition du mot de passe.
    redirectTo: `${SITE_URL}/auth/callback?next=/bienvenue`,
  });

  if (error) {
    // Cas courant : la personne s'est déjà inscrite côté client. L'inviter
    // échoue, mais la promotion depuis la liste marche très bien.
    const exists = /already|registered|exist/i.test(error.message);
    return {
      status: "error",
      message: exists
        ? "Ce compte existe déjà. Attribuez-lui simplement son rôle dans la liste ci-dessous."
        : "L'invitation n'a pas pu être envoyée. Vérifiez la configuration email de Supabase.",
    };
  }

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  return {
    status: "success",
    message: `Invitation envoyée à ${parsed.data.email}. Le lien permet de définir un mot de passe.`,
  };
}
