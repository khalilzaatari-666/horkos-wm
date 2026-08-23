import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Anciennement `src/middleware.ts` : Next 16 a renommé la convention en
 * `proxy`. Les deux fichiers ne peuvent pas coexister, la construction échoue.
 *
 * Rafraîchit la session Supabase à chaque requête et protège les routes
 * privées - la logique vit dans `@/lib/supabase/middleware`.
 */
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/espace/:path*", "/admin/:path*"],
};
