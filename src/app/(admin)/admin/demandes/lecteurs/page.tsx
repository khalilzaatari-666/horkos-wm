import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminHead, AdminCard } from "@/components/admin/ui";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { param, pick, recherche, trier, instant, contient, LIMITE_LISTE } from "@/lib/liste";

export const metadata: Metadata = { title: "Lecteurs" };

const BADGES = {
  verifies: { label: "Tél. vérifié", className: "bg-emerald-50 text-emerald-700" },
  "non-verifies": { label: "Tél. non vérifié", className: "bg-cream-deep text-charcoal" },
  attente: { label: "En attente du code", className: "bg-cream-deep text-warm-grey" },
};

/**
 * Les personnes qui ont ouvert un guide ou un article du site : prénom, nom,
 * email et téléphone. Trois états : téléphone vérifié par SMS ; téléphone non
 * vérifié (fiche ouverte sans code, tant que Twilio n'est pas configuré) ; en
 * attente (code reçu mais pas saisi - le contenu ne s'est pas ouvert).
 */
export default async function AdminLecteursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const verification = pick(param(raw, "verification"), ["verifies", "non-verifies", "attente"] as const, null);
  const source = pick(param(raw, "source"), ["guide", "article"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();
  const maintenant = new Date();

  const { data } = await supabase
    .from("content_leads")
    .select("id, first_name, last_name, email, phone, source_type, source_id, verified_at, phone_verified, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTE);
  const toutes = data ?? [];

  // Le titre de ce que chacun a ouvert, en deux lectures pour toute la liste.
  const ids = (type: string) => [...new Set(toutes.filter((l) => l.source_type === type).map((l) => l.source_id))];
  const [{ data: guides }, { data: articles }] = await Promise.all([
    supabase.from("guides").select("id, title, slug").in("id", ids("guide")),
    supabase.from("articles").select("id, title, slug").in("id", ids("article")),
  ]);
  const titres = new Map<string, { title: string; href: string }>([
    ...(guides ?? []).map((g) => [g.id, { title: g.title, href: `/ressources/guides/${g.slug}` }] as const),
    ...(articles ?? []).map((a) => [a.id, { title: a.title, href: `/ressources/articles/${a.slug}` }] as const),
  ]);

  const etat = (l: { verified_at: string | null; phone_verified: boolean }) =>
    l.phone_verified ? "verifies" : l.verified_at ? "non-verifies" : "attente";
  const ouverts = toutes.filter((l) => l.verified_at).length;
  const rows = trier(
    toutes.filter(
      (l) =>
        (verification === null || etat(l) === verification) &&
        (source === null || l.source_type === source) &&
        contient([l.first_name, l.last_name, l.email, l.phone, titres.get(l.source_id)?.title], q)
    ),
    (l) => instant(l.created_at),
    "desc",
    (l) => l.last_name
  );

  return (
    <>
      <AdminHead
        title="Lecteurs"
        desc="Les visiteurs qui ont ouvert un guide ou un article. Leur téléphone est vérifié par SMS une fois Twilio configuré ; une fiche en attente a demandé un code sans le saisir."
      />

      {toutes.length > 0 && (
        <p className="text-[12.5px] text-warm-grey -mt-2 mb-4 tabular-nums">
          {ouverts} lecteur{ouverts > 1 ? "s" : ""}, sur {toutes.length} demande{toutes.length > 1 ? "s" : ""}.
        </p>
      )}

      {toutes.length > 0 && (
        <AnimateIn variant="fade-up" delay={40}>
          <FiltresListe
            champs={[
              {
                cle: "verification",
                aria: "Vérification",
                toutes: "Tous les états",
                options: [
                  { value: "verifies", label: "Téléphone vérifié" },
                  { value: "non-verifies", label: "Téléphone non vérifié" },
                  { value: "attente", label: "En attente du code" },
                ],
              },
              {
                cle: "source",
                aria: "Contenu",
                toutes: "Guides et articles",
                options: [
                  { value: "guide", label: "Guides" },
                  { value: "article", label: "Articles" },
                ],
              },
            ]}
            recherche={{ placeholder: "Rechercher un nom, un email, un contenu…" }}
            total={rows.length}
            unite="lecteur"
          />
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={60}>
        <AdminCard>
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-[13px] text-warm-grey">
              {q || verification || source
                ? "Aucun lecteur ne correspond à ces critères."
                : "Aucun lecteur pour l'instant. Les visiteurs qui ouvrent un guide ou un article apparaîtront ici."}
            </p>
          ) : (
            <ul className="divide-y divide-ink/[0.06]">
              {rows.map((l) => {
                const contenu = titres.get(l.source_id);
                return (
                  <li key={l.id} className="grid gap-x-6 gap-y-1.5 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {l.first_name} {l.last_name}
                      </p>
                      <p className="truncate text-[12.5px] text-warm-grey">
                        <a href={`mailto:${l.email}`} className="hover:text-ink">{l.email}</a>
                        {" · "}
                        <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="tabular-nums hover:text-ink">{l.phone}</a>
                      </p>
                    </div>
                    <p className="min-w-0 truncate text-[12.5px] text-charcoal">
                      <span className="text-warm-grey">{l.source_type === "guide" ? "Guide" : "Article"} · </span>
                      {contenu ? (
                        <Link href={contenu.href} target="_blank" className="hover:text-ink hover:underline underline-offset-2">
                          {contenu.title}
                        </Link>
                      ) : (
                        "contenu supprimé"
                      )}
                    </p>
                    <div className="flex items-center gap-3 sm:justify-end">
                      <span
                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-medium ${
                          BADGES[etat(l)].className
                        }`}
                      >
                        {BADGES[etat(l)].label}
                      </span>
                      <time dateTime={l.created_at} title={formatDateTime(l.created_at)} className="text-[12px] text-warm-grey tabular-nums whitespace-nowrap">
                        {formatRelative(l.created_at, maintenant)}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>
      </AnimateIn>
    </>
  );
}
