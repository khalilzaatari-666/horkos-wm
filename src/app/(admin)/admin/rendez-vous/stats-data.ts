import type { createClient } from "@/lib/supabase/server";
import { bornesSemaine } from "@/lib/cabinet-time";
import { agregerStats, type StatsConseiller } from "@/lib/stats-conseillers";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface RdvStat {
  advisor_id: string | null;
  type: string;
}

/**
 * Charge les statistiques d'une semaine pour la liste et pour l'agenda - la
 * même lecture des deux côtés, pour que les deux vues ne divergent jamais.
 *
 * `conseillerId` restreint les deux requêtes et le tableau à un seul membre :
 * quand l'admin filtre sur un conseiller, il ne voit que son agenda et ses
 * chiffres.
 */
export async function chargerStatsConseillers(
  supabase: SupabaseServerClient,
  {
    lundi,
    equipe,
    conseillerId,
  }: {
    lundi: string;
    equipe: { id: string; nom: string }[];
    conseillerId?: string | null;
  }
): Promise<StatsConseiller[] | null> {
  const bornes = bornesSemaine(lundi);
  if (!bornes) return null;

  // Les étapes tenues dans la semaine, et les R1/R2 posés dans la semaine
  // (voir `lib/stats-conseillers` pour ce que recouvrent les deux lectures).
  const tenus = supabase
    .from("appointments")
    .select("advisor_id, type")
    .eq("status", "termine")
    .in("type", ["R0", "R1", "R2"])
    .gte("date", bornes.debut)
    .lt("date", bornes.fin);
  const fixes = supabase
    .from("appointments")
    .select("advisor_id, type")
    .neq("status", "annule")
    .in("type", ["R1", "R2"])
    .gte("created_at", bornes.debut)
    .lt("created_at", bornes.fin);

  const [{ data: t }, { data: f }] = await Promise.all([
    conseillerId ? tenus.eq("advisor_id", conseillerId) : tenus,
    conseillerId ? fixes.eq("advisor_id", conseillerId) : fixes,
  ]);

  const membres = conseillerId ? equipe.filter((c) => c.id === conseillerId) : equipe;
  return agregerStats(membres, (t ?? []) as RdvStat[], (f ?? []) as RdvStat[]);
}
