import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateLong } from "@/lib/dates";
import { formatMAD } from "@/lib/patrimoine";
import { param, pick, sensDe, recherche, trier, instant } from "@/lib/liste";

export const metadata: Metadata = { title: "Clients" };

const TRIS = ["nom", "patrimoine", "referent", "inscrit"] as const;
/** Valeur du filtre « référent » désignant les dossiers que personne ne pilote. */
const SANS_REFERENT = "aucun";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // `recherche` neutralise les caractères qui ont un sens dans un filtre
  // PostgREST (`,`, `()`, `%`, `*`, `:`) : le terme finit interpolé dans le
  // `.or(...)` ci-dessous.
  const q = recherche(raw);
  const tri = pick(param(raw, "tri"), TRIS, "inscrit")!;
  const sens = sensDe(param(raw, "sens"), tri === "inscrit" ? "desc" : "asc");
  const referent = param(raw, "referent") ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = me?.role === "admin";

  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, advisor_id, created_at")
    .eq("role", "client")
    .order("created_at", { ascending: false })
    .limit(500);

  // Le conseiller ne voit que son portefeuille et les clients encore sans
  // référent - ceux-là restent visibles de tous, sans quoi personne ne les
  // reprendrait. La RLS laisse l'équipe lire tous les profils : c'est ce filtre
  // qui tient la règle, avec le garde d'entrée du dossier.
  if (!isAdmin) {
    query = query.or(`advisor_id.eq.${user.id},advisor_id.is.null`);
  }

  if (q) {
    // Recherche simple sur le nom ou l'email.
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`
    );
  }

  const [{ data: clients }, { data: conseillers }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, first_name, last_name").eq("role", "conseiller"),
  ]);

  // Le filtre par référent s'applique après la requête : la clause `or` du
  // conseiller occupe déjà le seul `.or()` disponible sur ce constructeur, et
  // en empiler un second changerait le sens du premier.
  const rows = (clients ?? []).filter((c) =>
    referent === null
      ? true
      : referent === SANS_REFERENT
        ? !c.advisor_id
        : c.advisor_id === referent
  );

  // Total du patrimoine par client, agrégé en mémoire à partir d'une requête.
  const ids = rows.map((r) => r.id);
  const totals = new Map<string, number>();
  if (ids.length) {
    const { data: assets } = await supabase
      .from("assets")
      .select("client_id, value")
      .in("client_id", ids);
    for (const a of assets ?? []) {
      totals.set(a.client_id, (totals.get(a.client_id) ?? 0) + (Number(a.value) || 0));
    }
  }

  const advisorName = new Map(
    (conseillers ?? []).map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" ") || "Conseiller",
    ])
  );

  const lignes = trier(
    rows,
    (c) =>
      tri === "nom"
        ? [c.first_name, c.last_name].filter(Boolean).join(" ")
        : tri === "patrimoine"
          ? (totals.get(c.id) ?? null)
          : tri === "referent"
            ? (c.advisor_id ? advisorName.get(c.advisor_id) : null)
            : instant(c.created_at),
    sens,
    (c) => c.email
  );

  const params = { q: q || undefined, referent: referent ?? undefined };

  return (
    <AdminPanel>
      <AdminHead
        title="Clients"
        desc="Les comptes clients et leur dossier : patrimoine, audits, documents et recommandations."
      />

      <AnimateIn variant="fade-up" delay={40}>
        <FiltresListe
          champs={[
            {
              cle: "referent",
              aria: "Conseiller référent",
              toutes: "Tous les référents",
              options: [
                ...[...advisorName].map(([id, name]) => ({ value: id, label: name })),
                { value: SANS_REFERENT, label: "Sans référent" },
              ],
            },
          ]}
          recherche={{ placeholder: "Rechercher par nom ou email…" }}
          total={lignes.length}
          unite="client"
        />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            <TriHeader key="n" label="Nom" colonne="nom" tri={tri} sens={sens} params={params} />,
            "Contact",
            <TriHeader
              key="p"
              label="Patrimoine"
              colonne="patrimoine"
              tri={tri}
              sens={sens}
              params={params}
              sensInitial="desc"
            />,
            <TriHeader
              key="r"
              label="Conseiller référent"
              colonne="referent"
              tri={tri}
              sens={sens}
              params={params}
            />,
            <TriHeader
              key="i"
              label="Inscrit le"
              colonne="inscrit"
              tri={tri}
              sens={sens}
              params={params}
              sensInitial="desc"
            />,
          ]}
          isEmpty={lignes.length === 0}
          empty={
            q || referent
              ? "Aucun client ne correspond à ces critères."
              : "Aucun client inscrit."
          }
        >
          {lignes.map((c) => {
            const nom = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Sans nom";
            return (
              <tr key={c.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td>
                  <Link
                    href={`/admin/clients/${c.id}`}
                    className="font-medium text-ink hover:text-bronze-dark transition-colors"
                  >
                    {nom}
                  </Link>
                </Td>
                <Td>
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      className="block text-[12.5px] text-bronze-dark hover:text-bronze transition-colors truncate max-w-[220px]"
                    >
                      {c.email}
                    </a>
                  )}
                  {c.phone && <div className="text-[12px] text-warm-grey">{c.phone}</div>}
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {totals.get(c.id) ? formatMAD(totals.get(c.id)!) : "-"}
                </Td>
                <Td className="whitespace-nowrap text-charcoal">
                  {c.advisor_id ? (advisorName.get(c.advisor_id) ?? "-") : <span className="text-warm-grey">-</span>}
                </Td>
                <Td className="whitespace-nowrap text-warm-grey">{formatDateLong(c.created_at)}</Td>
              </tr>
            );
          })}
        </AdminTable>
      </AnimateIn>
    </AdminPanel>
  );
}
