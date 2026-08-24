import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel, AdminHead } from "@/components/admin/ui";
import { GuideForm, type GuideInitial } from "../guide-form";
import { createGuide, updateGuide } from "../actions";

export const metadata: Metadata = { title: "Guide" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GuideEditPage({ params }: PageProps) {
  const { id } = await params;

  if (id === "new") {
    return (
      <AdminPanel>
        <AdminHead title="Nouveau guide" desc="Renseignez le guide, joignez le PDF, puis publiez." />
        <GuideForm action={createGuide} />
      </AdminPanel>
    );
  }

  const supabase = await createClient();
  const { data: guide } = await supabase
    .from("guides")
    .select("id, title, slug, description, partner, cover_label, cover_url, pdf_url, is_published")
    .eq("id", id)
    .maybeSingle();

  if (!guide) notFound();

  const initial: GuideInitial = {
    id: guide.id,
    title: guide.title ?? "",
    slug: guide.slug ?? "",
    description: guide.description ?? "",
    partner: guide.partner ?? "",
    cover_label: guide.cover_label ?? "",
    cover_url: guide.cover_url ?? "",
    pdf_url: guide.pdf_url ?? "",
    is_published: guide.is_published ?? false,
  };

  return (
    <AdminPanel>
      <AdminHead title="Modifier le guide" desc="Les changements sont visibles dès l'enregistrement." />
      <GuideForm action={updateGuide} initial={initial} />
    </AdminPanel>
  );
}
