"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { occupationsAdmin } from "@/lib/booking";
import { chevauche } from "@/lib/google-calendar";
import { dureeRendezVous } from "@/lib/rendez-vous";

/**
 * Fine enveloppe des RPC de réservation (migration 010). Toute la logique -
 * grille, capacité, verrous - vit dans Postgres ; ici on ne fait que valider
 * les formes et transporter la session, pour que `auth.uid()` soit renseigné
 * quand l'utilisateur est connecté.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const uuid = z.uuid();
// Un instant ISO complet - la validité métier (grille, marge) est revérifiée
// par la fonction SQL, qui reste la seule autorité.
const isoInstant = z.iso.datetime({ offset: true });

export interface SlotAvailability {
  slot_start: string;
  remaining: number;
}

export async function fetchAvailability(
  from: string,
  to: string,
  token?: string
): Promise<SlotAvailability[]> {
  const parsed = z
    .object({ from: isoDate, to: isoDate, token: uuid.optional() })
    .safeParse({ from, to, token });
  if (!parsed.success) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_slot_availability", {
    p_from: parsed.data.from,
    p_to: parsed.data.to,
    p_token: parsed.data.token ?? null,
  });

  if (error || !data) return [];
  const slots = data as SlotAvailability[];

  // L'agenda Google de l'admin retire ses heures prises, sur la durée d'un R0 :
  // c'est la seule étape réservable en ligne (public et espace client). Deux jours de marge
  // après `to` couvrent le fuseau ; sans réponse de Google, la grille reste
  // celle de Postgres.
  const fin = new Date(Date.parse(`${parsed.data.to}T00:00:00Z`) + 2 * 86_400_000).toISOString();
  const occupe = await occupationsAdmin(`${parsed.data.from}T00:00:00Z`, fin);
  return occupe ? slots.filter((s) => !chevauche(s.slot_start, dureeRendezVous("R0"), occupe)) : slots;
}

export async function holdSlot(slotStart: string, token: string): Promise<boolean> {
  const parsed = z
    .object({ slotStart: isoInstant, token: uuid })
    .safeParse({ slotStart, token });
  if (!parsed.success) return false;

  // Les holds sont bon marché et re-choisis souvent, mais restent une écriture :
  // on plafonne largement pour n'attraper que l'abus.
  if (!(await rateLimit("hold", { max: 40, windowSeconds: 600 }))) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("hold_slot", {
    p_slot_start: parsed.data.slotStart,
    p_token: parsed.data.token,
  });

  return !error && data === true;
}
