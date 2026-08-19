"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * Fine enveloppe des RPC de réservation (migration 010). Toute la logique —
 * grille, capacité, verrous — vit dans Postgres ; ici on ne fait que valider
 * les formes et transporter la session, pour que `auth.uid()` soit renseigné
 * quand l'utilisateur est connecté.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");
const uuid = z.uuid();
// Un instant ISO complet — la validité métier (grille, marge) est revérifiée
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
  return data as SlotAvailability[];
}

export async function holdSlot(slotStart: string, token: string): Promise<boolean> {
  const parsed = z
    .object({ slotStart: isoInstant, token: uuid })
    .safeParse({ slotStart, token });
  if (!parsed.success) return false;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("hold_slot", {
    p_slot_start: parsed.data.slotStart,
    p_token: parsed.data.token,
  });

  return !error && data === true;
}
