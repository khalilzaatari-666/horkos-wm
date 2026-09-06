import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead } from "@/components/admin/ui";
import { EventForm, type EventInitial } from "../event-form";
import { updateEvent } from "../actions";

export const metadata: Metadata = { title: "Événement" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventEditPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, description, location, date, is_published")
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const initial: EventInitial = {
    id: event.id,
    title: event.title ?? "",
    description: event.description ?? "",
    location: event.location ?? "",
    date: event.date ?? "",
    is_published: event.is_published ?? false,
  };

  return (
    <>
      <AdminHead title="Modifier l'événement" desc="Les changements sont visibles dès l'enregistrement." />
      <EventForm action={updateEvent} initial={initial} />
    </>
  );
}
