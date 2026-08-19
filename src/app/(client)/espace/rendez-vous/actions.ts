"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { bookAndNotify } from "@/lib/booking";

export interface EspaceBookingState {
  status: "idle" | "success" | "error";
  message?: string;
  bookedSlot?: string | null;
  bookedMode?: "presentiel" | "visio" | null;
}

const schema = z.object({
  slotStart: z.iso.datetime({ offset: true }),
  holdToken: z.uuid(),
  mode: z.enum(["presentiel", "visio"]),
});

/**
 * Réservation depuis l'espace client. Le type de rendez-vous n'est pas pris du
 * formulaire : il se déduit du parcours — une revue si l'audit R0 est passé,
 * sinon un R0. Un champ caché serait un mensonge facile.
 */
export async function bookEspaceSlot(
  _previous: EspaceBookingState,
  formData: FormData
): Promise<EspaceBookingState> {
  const parsed = schema.safeParse({
    slotStart: formData.get("slotStart"),
    holdToken: formData.get("holdToken"),
    mode: formData.get("mode"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Choisissez un format et un créneau avant de confirmer." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Votre session a expiré. Reconnectez-vous." };
  }

  const [{ data: pastR0 }, { data: profile }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id")
      .eq("client_id", user.id)
      .eq("type", "R0")
      .eq("status", "termine")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const booked = await bookAndNotify({
    supabase,
    slotStart: parsed.data.slotStart,
    holdToken: parsed.data.holdToken,
    mode: parsed.data.mode,
    type: pastR0 ? "revue" : "R0",
    client: {
      name:
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        (profile?.email ?? user.email ?? "Client"),
      email: profile?.email ?? user.email ?? "",
    },
  });

  if (!booked) {
    return {
      status: "error",
      message: "Ce créneau vient d'être pris. Choisissez-en un autre.",
    };
  }

  // Le rendez-vous apparaît aussitôt sur le tableau de bord et l'accompagnement.
  revalidatePath("/espace");
  revalidatePath("/espace/accompagnement");

  return {
    status: "success",
    bookedSlot: parsed.data.slotStart,
    bookedMode: parsed.data.mode,
  };
}
