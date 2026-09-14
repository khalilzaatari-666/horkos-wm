import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminCard, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { RepartitionBar } from "@/components/client/repartition-bar";
import { formatDateLong } from "@/lib/dates";
import {
  repartition,
  totalPatrimoine,
  performance12m,
  assetTypeLabel,
  formatMAD,
  formatPercent,
  type AssetRow,
  type ValuationRow,
} from "@/lib/patrimoine";
import { param, pick, sensDe, trier, instant } from "@/lib/liste";
import { AuditCreate } from "../audits/audit-create";
import { AuditOpenButton } from "../audits/audit-open-button";
import { AuditRowActions } from "../audits/audit-row-actions";
import { AssetRowActions } from "./asset-row-actions";

/** Un audit par an : ouvrir le suivant avant ce délai n'a pas de sens pour le cabinet. */
const UN_AN_MS = 365 * 86_400_000;

export const metadata: Metadata = { title: "Audits" };

/**
 * Audit et patrimoine sur une seule page : c'est l'audit qui établit le
 * patrimoine du client, les séparer obligeait à lire deux onglets pour une
 * seule réalité. L'audit vient en premier, le détail des actifs en dessous.
 */
/**
 * Deux tableaux sur une page, donc deux jeux de paramètres : `triA` pour les
 * audits, `tri` pour les actifs. Sans cette distinction, trier l'un
 * réordonnerait l'autre.
 */
const TRIS_AUDIT = ["statut", "ouvert", "maj"] as const;
const TRIS_ACTIF = ["type", "intitule", "valeur", "releve"] as const;

export default async function ClientPatrimoinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const triAudit = pick(param(raw, "triA"), TRIS_AUDIT, "ouvert")!;
  const sensAudit = sensDe(param(raw, "sensA"), triAudit === "statut" ? "asc" : "desc");
  const triActif = pick(param(raw, "tri"), TRIS_ACTIF, "valeur")!;
  const sensActif = sensDe(param(raw, "sens"), triActif === "valeur" ? "desc" : "asc");
  const type = param(raw, "type") ?? null;

  const supabase = await createClient();

  const [{ data: assets }, { data: auditData }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, type, label, value")
      .eq("client_id", id)
      .order("value", { ascending: false }),
    supabase
      .from("audits")
      .select("id, status, pdf_url, created_at, updated_at")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const assetRows: AssetRow[] = (assets ?? []).map((a) => ({
    id: a.id,
    type: a.type,
    label: a.label,
    value: Number(a.value) || 0,
  }));
  const audits = auditData ?? [];

  // Le premier de la liste est le plus récent (triée par `created_at` décroissant) -
  // rien à comparer tant qu'aucun audit n'existe encore.
  const maintenant = new Date();
  const dernierAudit = audits[0] ?? null;
  const depuisDernier = dernierAudit
    ? maintenant.getTime() - new Date(dernierAudit.created_at).getTime()
    : null;
  const peutOuvrirAudit = depuisDernier === null || depuisDernier >= UN_AN_MS;
  const prochainAuditLe =
    !peutOuvrirAudit && dernierAudit
      ? formatDateLong(new Date(new Date(dernierAudit.created_at).getTime() + UN_AN_MS).toISOString())
      : null;

  const lastValued = new Map<string, string>();
  let valuations: ValuationRow[] = [];
  if (assetRows.length) {
    const { data: vals } = await supabase
      .from("asset_valuations")
      .select("asset_id, value, valued_at")
      .in(
        "asset_id",
        assetRows.map((a) => a.id)
      )
      .order("valued_at", { ascending: false });
    valuations = (vals ?? []).map((v) => ({
      asset_id: v.asset_id,
      value: Number(v.value) || 0,
      valued_at: v.valued_at,
    }));
    for (const v of valuations) {
      if (!lastValued.has(v.asset_id)) lastValued.set(v.asset_id, v.valued_at);
    }
  }

  // Les agrégats se calculent sur la totalité du patrimoine : un filtre est une
  // loupe sur le tableau, il ne redéfinit pas ce que le client possède.
  const total = totalPatrimoine(assetRows);
  const classes = repartition(assetRows);
  const perf = performance12m(assetRows, valuations);

  const typesPresents = [...new Set(assetRows.map((a) => a.type))];

  const actifs = trier(
    assetRows.filter((a) => type === null || a.type === type),
    (a) =>
      triActif === "type"
        ? assetTypeLabel(a.type)
        : triActif === "intitule"
          ? a.label
          : triActif === "releve"
            ? instant(lastValued.get(a.id))
            : a.value,
    sensActif,
    (a) => a.label
  );

  const lignesAudit = trier(
    audits,
    (a) =>
      triAudit === "statut"
        ? a.status
        : triAudit === "maj"
          ? instant(a.updated_at)
          : instant(a.created_at),
    sensAudit
  );

  const qsAudit = { tri: param(raw, "tri"), sens: param(raw, "sens"), type: type ?? undefined };
  const qsActif = { triA: param(raw, "triA"), sensA: param(raw, "sensA"), type: type ?? undefined };


  return (
    <>
      {/* Audit */}
      <section className="mb-9">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="font-heading text-[17.5px] font-semibold text-ink">Audit patrimonial</h2>
            <p className="text-[13px] text-warm-grey leading-[1.6] max-w-[560px] mt-1">
              Le statut et le rapport sont visibles par le client sur sa page patrimoine ; le PDF
              reste privé (lien signé).
            </p>
          </div>
          <AuditCreate
            clientId={id}
            peutOuvrir={peutOuvrirAudit}
            prochainAuditLe={prochainAuditLe}
          />
        </div>

        <AnimateIn variant="fade-up" delay={60}>
          <AdminTable
            headers={[
              // `triA`/`sensA` : ce tableau partage la page avec celui des
              // actifs, et trier l'un ne doit pas réordonner l'autre.
              <TriHeader
                key="s"
                label="Statut"
                colonne="statut"
                tri={triAudit}
                sens={sensAudit}
                params={qsAudit}
                cleTri="triA"
                cleSens="sensA"
              />,
              "Fiche",
              "Rapport",
              <TriHeader
                key="o"
                label="Ouvert le"
                colonne="ouvert"
                tri={triAudit}
                sens={sensAudit}
                params={qsAudit}
                sensInitial="desc"
                cleTri="triA"
                cleSens="sensA"
              />,
              <TriHeader
                key="m"
                label="Mis à jour"
                colonne="maj"
                tri={triAudit}
                sens={sensAudit}
                params={qsAudit}
                sensInitial="desc"
                cleTri="triA"
                cleSens="sensA"
              />,
              "",
            ]}
            isEmpty={lignesAudit.length === 0}
            empty="Aucun audit. Ouvrez-en un — le client verra son statut sur sa page patrimoine."
          >
            {lignesAudit.map((a) => {
              const hasReport = Boolean(a.pdf_url);
              return (
                <tr key={a.id} className="hover:bg-cream/40 transition-colors align-top">
                  <Td>
                    <AdminBadge tone={a.status === "termine" ? "succes" : "attente"}>
                      {a.status === "termine" ? "Terminé" : "En cours"}
                    </AdminBadge>
                  </Td>
                  {/* La fiche saisie sur la plateforme, distincte du PDF joint :
                      l'une se remplit ici, l'autre vient du dossier du client. */}
                  <Td className="whitespace-nowrap">
                    <Link
                      href={`/admin/clients/${id}/audits/${a.id}`}
                      className="text-[13px] font-medium text-bronze-dark hover:text-bronze transition-colors"
                    >
                      Ouvrir
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {hasReport ? (
                      <AuditOpenButton auditId={a.id} />
                    ) : (
                      <span className="text-warm-grey">-</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-warm-grey">
                    {formatDateLong(a.created_at)}
                  </Td>
                  <Td className="whitespace-nowrap text-warm-grey">
                    {formatDateLong(a.updated_at)}
                  </Td>
                  <Td>
                    <AuditRowActions
                      clientId={id}
                      audit={{ id: a.id, status: a.status, hasReport }}
                    />
                  </Td>
                </tr>
              );
            })}
          </AdminTable>
        </AnimateIn>
      </section>

      {/* Patrimoine */}
      <section>
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="font-heading text-[17.5px] font-semibold text-ink mb-2">Patrimoine</h2>
            <div className="font-heading text-[24px] font-semibold text-ink leading-none">
              {total > 0 ? formatMAD(total) : "-"}
            </div>
            <div className="text-[12.5px] text-warm-grey mt-1.5">
              {assetRows.length} actif(s)
              {perf.percent !== null && (
                <>
                  {" · "}
                  <span className={perf.percent >= 0 ? "text-emerald-700" : "text-red-600"}>
                    {formatPercent(perf.percent)} sur 12 mois
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {classes.length > 0 && (
          <AnimateIn variant="fade-up">
            <AdminCard className="p-6 mb-4">
              <RepartitionBar classes={classes} />
            </AdminCard>
          </AnimateIn>
        )}

        <AnimateIn variant="fade-up" delay={60}>
          {assetRows.length > 0 && (
            <FiltresListe
              champs={[
                {
                  cle: "type",
                  aria: "Type d'actif",
                  toutes: "Tous les types",
                  options: typesPresents.map((t) => ({ value: t, label: assetTypeLabel(t) })),
                },
              ]}
              total={actifs.length}
              unite="actif"
            />
          )}

          <AdminTable
            headers={[
              <TriHeader
                key="t"
                label="Type"
                colonne="type"
                tri={triActif}
                sens={sensActif}
                params={qsActif}
              />,
              <TriHeader
                key="i"
                label="Intitulé"
                colonne="intitule"
                tri={triActif}
                sens={sensActif}
                params={qsActif}
              />,
              <TriHeader
                key="v"
                label="Valeur"
                colonne="valeur"
                tri={triActif}
                sens={sensActif}
                params={qsActif}
                sensInitial="desc"
              />,
              <TriHeader
                key="r"
                label="Dernier relevé"
                colonne="releve"
                tri={triActif}
                sens={sensActif}
                params={qsActif}
                sensInitial="desc"
              />,
              "",
            ]}
            isEmpty={actifs.length === 0}
            empty={
              type
                ? "Aucun actif de ce type."
                : "Aucun actif. La fiche d'audit établit le patrimoine — ouvrez ou remplissez un audit pour le faire apparaître ici."
            }
          >
            {actifs.map((a) => (
              <tr key={a.id} className="hover:bg-cream/40 transition-colors align-top">
                <Td className="whitespace-nowrap text-bronze-dark font-medium">
                  {assetTypeLabel(a.type)}
                </Td>
                <Td className="text-ink">{a.label}</Td>
                <Td className="whitespace-nowrap tabular-nums font-medium text-ink">
                  {formatMAD(a.value)}
                </Td>
                <Td className="whitespace-nowrap text-warm-grey">
                  {lastValued.get(a.id) ? formatDateLong(lastValued.get(a.id)!) : "-"}
                </Td>
                <Td>
                  <AssetRowActions clientId={id} asset={a} />
                </Td>
              </tr>
            ))}
          </AdminTable>
        </AnimateIn>
      </section>
    </>
  );
}
