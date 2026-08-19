"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Déconnexion de l'espace client. Server action plutôt que `signOut()` côté
 * navigateur : c'est le serveur qui détient les cookies de session, et les
 * effacer ici garantit qu'un retour arrière ne ressuscite pas une page privée
 * depuis un jeton encore valide.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
