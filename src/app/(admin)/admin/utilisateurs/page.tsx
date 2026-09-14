import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { AdminPanel, AdminHead, AdminTable, Td, AdminBadge } from "@/components/admin/ui";
import { TriHeader } from "@/components/admin/tri-header";
import { FiltresListe } from "@/components/ui/filtres-liste";
import { formatDateLong } from "@/lib/dates";
import { RoleSelect } from "./role-select";
import { ResendLink } from "./resend-link";
import { InviteForm } from "./invite-form";
import { AvatarUpload } from "@/components/admin/avatar-upload";
import { initials } from "@/components/client/espace-nav";
import { setPhone } from "../actions";
import { param, pick, sensDe, recherche, trier, instant, contient, LIMITE_LISTE } from "@/lib/liste";

export const metadata: Metadata = { title: "Utilisateurs" };

const ROLE_TONES: Record<string, "neutre" | "attente" | "succes" | "info"> = {
  client: "neutre",
  conseiller: "succes",
  admin: "info",
};

const TRIS = ["nom", "contact", "inscrit", "role"] as const;
const ROLES = [
  { value: "client", label: "Clients" },
  { value: "conseiller", label: "Conseillers" },
  { value: "admin", label: "Administrateurs" },
];

export default async function UtilisateursPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const tri = pick(param(raw, "tri"), TRIS, "inscrit")!;
  const sens = sensDe(param(raw, "sens"), tri === "inscrit" ? "desc" : "asc");
  const role = pick(param(raw, "role"), ["client", "conseiller", "admin"] as const, null);
  const q = recherche(raw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Le layout garde déjà la porte pour tout le staff ; cette page-ci est
  // réservée aux admins, donc elle revérifie. La barre latérale la masque à un
  // conseiller, mais un menu caché n'est pas un contrôle d'accès.
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.role !== "admin") redirect("/admin");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, role, created_at, avatar_url")
    .order("created_at", { ascending: false })
    .limit(LIMITE_LISTE);

  const tous = profiles ?? [];
  // Le garde-fou compte sur l'ensemble des comptes, jamais sur la vue filtrée :
  // masquer les conseillers d'un clic ne doit pas déclencher l'alerte.
  const conseillers = tous.filter((p) => p.role === "conseiller").length;

  const rows = trier(
    tous.filter(
      (p) =>
        (role === null || p.role === role) &&
        contient([p.first_name, p.last_name, p.email, p.phone], q)
    ),
    (p) =>
      tri === "contact"
        ? p.email
        : tri === "role"
          ? p.role
          : tri === "nom"
            ? [p.first_name, p.last_name].filter(Boolean).join(" ")
            : instant(p.created_at),
    sens,
    (p) => p.email
  );

  const qs = { role: role ?? undefined, q: q || undefined };

  return (
    <AdminPanel>
      <AdminHead
        title="Utilisateurs"
        desc="Tous les comptes du site. Le rôle « conseiller » ouvre le back-office et rend la personne disponible à la réservation de créneaux."
      />

      {conseillers === 0 && (
        <AnimateIn variant="fade-up">
          <div className="mb-5 p-5 rounded-xl border border-bronze/40 bg-bronze/[0.07]">
            <h2 className="text-[14px] font-semibold text-ink">Aucun conseiller</h2>
            <p className="text-[13px] text-charcoal leading-[1.65] mt-1.5">
              Attribuez le rôle « Conseiller » à au moins un compte : c&apos;est ce qui donne au
              calendrier public sa capacité. Sans cela, tous les créneaux s&apos;affichent complets.
            </p>
          </div>
        </AnimateIn>
      )}

      <AnimateIn variant="fade-up" delay={40}>
        <InviteForm />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={50}>
        <FiltresListe
          champs={[{ cle: "role", aria: "Rôle", toutes: "Tous les rôles", options: ROLES }]}
          recherche={{ placeholder: "Rechercher un nom, un email…" }}
          total={rows.length}
          unite="compte"
        />
      </AnimateIn>

      <AnimateIn variant="fade-up" delay={60}>
        <AdminTable
          headers={[
            "Photo",
            <TriHeader key="n" label="Nom" colonne="nom" tri={tri} sens={sens} params={qs} />,
            <TriHeader
              key="c"
              label="Contact"
              colonne="contact"
              tri={tri}
              sens={sens}
              params={qs}
            />,
            <TriHeader
              key="i"
              label="Inscrit le"
              colonne="inscrit"
              tri={tri}
              sens={sens}
              params={qs}
              sensInitial="desc"
            />,
            <TriHeader
              key="r"
              label="Rôle actuel"
              colonne="role"
              tri={tri}
              sens={sens}
              params={qs}
            />,
            "Modifier",
          ]}
          isEmpty={rows.length === 0}
          empty={
            q || role ? "Aucun compte ne correspond à ces critères." : "Aucun compte enregistré."
          }
        >
          {rows.map((p) => (
            <tr key={p.id} className="hover:bg-cream/40 transition-colors">
              <Td>
                {/* Seul le conseiller est vu par ses clients : ailleurs, la
                    vignette reste un repère, non modifiable. */}
                <AvatarUpload
                  userId={p.id}
                  url={p.avatar_url ?? null}
                  initials={initials(p.first_name, p.last_name, p.email)}
                  size={40}
                  editable={p.role === "conseiller"}
                />
              </Td>
              <Td>
                <div className="font-medium text-ink">
                  {[p.first_name, p.last_name].filter(Boolean).join(" ") || "-"}
                </div>
              </Td>
              <Td>
                <a
                  href={`mailto:${p.email}`}
                  className="block text-[12.5px] text-bronze-dark hover:text-bronze transition-colors"
                >
                  {p.email ?? "-"}
                </a>
                {/* Le téléphone d'un conseiller est lu par ses clients : il se
                    corrige ici, sans passer par la base. */}
                {p.role === "conseiller" ? (
                  <form action={setPhone} className="flex items-center gap-1.5 mt-1">
                    <input type="hidden" name="userId" value={p.id} />
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={p.phone ?? ""}
                      maxLength={40}
                      placeholder="+212 6 …"
                      aria-label="Téléphone du conseiller"
                      className="w-[150px] h-8 px-2 text-[12px] bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze transition-colors"
                    />
                    <button
                      type="submit"
                      className="text-[11.5px] text-bronze-dark hover:text-bronze transition-colors cursor-pointer"
                    >
                      OK
                    </button>
                  </form>
                ) : (
                  p.phone && <div className="text-[12px] text-warm-grey">{p.phone}</div>
                )}
              </Td>
              <Td className="whitespace-nowrap">{formatDateLong(p.created_at)}</Td>
              <Td>
                <AdminBadge tone={ROLE_TONES[p.role] ?? "neutre"}>{p.role}</AdminBadge>
              </Td>
              <Td>
                <RoleSelect id={p.id} value={p.role} isSelf={p.id === user.id} />
                {(p.role === "conseiller" || p.role === "admin") && p.id !== user.id && (
                  <ResendLink id={p.id} />
                )}
              </Td>
            </tr>
          ))}
        </AdminTable>
      </AnimateIn>

      <p className="text-[12px] text-warm-grey leading-[1.6] mt-5 max-w-[680px]">
        Une personne déjà inscrite sur le site ne peut pas être invitée : attribuez-lui son rôle
        depuis la liste. L&apos;invitation ne sert qu&apos;aux comptes qui n&apos;existent pas
        encore.
      </p>
    </AdminPanel>
  );
}
