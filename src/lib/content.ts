import { createPublicClient } from "@/lib/supabase/public";

/**
 * Read helpers for the public "Ressources" pages.
 *
 * Everything here is filled from the back-office — nothing is hardcoded. RLS
 * already restricts anonymous reads to rows with `is_published = true`; the
 * explicit filters below just keep the intent visible at the call site.
 */

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  category: string | null;
  published_at: string | null;
  created_at: string;
}

export interface Guide {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  cover_label: string | null;
  partner: string | null;
}

export interface HorkosEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
}

export async function getArticles(): Promise<Article[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, content, cover_url, category, published_at, created_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getArticle(slug: string): Promise<Article | null> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("articles")
    .select("id, title, slug, excerpt, content, cover_url, category, published_at, created_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  return data ?? null;
}

export async function getGuides(): Promise<Guide[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("guides")
    .select("id, title, slug, description, cover_url, cover_label, partner")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return data ?? [];
}

/** Upcoming first, then past ones most-recent first. */
export async function getEvents(): Promise<HorkosEvent[]> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, description, date, location")
    .eq("is_published", true)
    .order("date", { ascending: false });

  const events = data ?? [];
  const now = Date.now();
  const upcoming = events
    .filter((e: HorkosEvent) => new Date(e.date).getTime() >= now)
    .sort((a: HorkosEvent, b: HorkosEvent) => +new Date(a.date) - +new Date(b.date));
  const past = events.filter((e: HorkosEvent) => new Date(e.date).getTime() < now);

  return [...upcoming, ...past];
}

const longDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const shortMonth = new Intl.DateTimeFormat("fr-FR", { month: "short" });

/** "8 juillet 2026" — `numeric` keeps the day free of a leading zero. */
export function formatLongDate(value: string): string {
  return longDate.format(new Date(value));
}

export function formatEventDay(value: string): { day: string; month: string } {
  const date = new Date(value);
  const month = shortMonth.format(date).replace(".", "");
  return {
    day: String(date.getDate()),
    month: month.charAt(0).toUpperCase() + month.slice(1) + ".",
  };
}

export function isUpcoming(value: string): boolean {
  return new Date(value).getTime() >= Date.now();
}
