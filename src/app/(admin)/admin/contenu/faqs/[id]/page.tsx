import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead } from "@/components/admin/ui";
import { FaqForm, type FaqInitial } from "../faq-form";
import { updateFaq } from "../actions";

export const metadata: Metadata = { title: "Question" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FaqEditPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: faq } = await supabase
    .from("faqs")
    .select("id, question, answer, sort_order, is_published")
    .eq("id", id)
    .maybeSingle();

  if (!faq) notFound();

  const initial: FaqInitial = {
    id: faq.id,
    question: faq.question ?? "",
    answer: faq.answer ?? "",
    sort_order: faq.sort_order ?? 0,
    is_published: faq.is_published ?? false,
  };

  return (
    <>
      <AdminHead
        title="Modifier la question"
        desc="Les changements sont visibles dès l'enregistrement."
      />
      <FaqForm action={updateFaq} initial={initial} />
    </>
  );
}
