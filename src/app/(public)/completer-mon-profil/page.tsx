import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnimateIn } from "@/components/ui/animate-in";
import { profilComplet } from "@/lib/intake";
import { capitaliseName } from "@/lib/validation";
import { signOut } from "@/components/client/actions";
import { IntakeForm } from "./intake-form";

export const metadata: Metadata = {
  title: "Compléter mon profil",
  // Page de première connexion : rien à indexer.
  robots: { index: false, follow: false },
};

/**
 * Le questionnaire d'entrée, obligatoire avant d'ouvrir l'espace client.
 *
 * La page vit dans le groupe public, et non sous `(client)` : c'est ce layout-là
 * qui redirige ici quand le profil est incomplet, et l'y placer ferait boucler
 * la redirection sur elle-même.
 */
export default async function CompleterProfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/espace");

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone, role, intake:client_intake(client_id)")
    .eq("id", user.id)
    .maybeSingle();

  const intake = profile?.intake;
  const intakeRempli = Array.isArray(intake) ? intake.length > 0 : Boolean(intake);

  // Déjà en règle - ou membre de l'équipe : rien à demander ici.
  if (
    profilComplet({
      role: profile?.role,
      first_name: profile?.first_name,
      last_name: profile?.last_name,
      phone: profile?.phone,
      intakeRempli,
    })
  ) {
    redirect("/espace");
  }

  /**
   * Ce que le fournisseur d'identité a bien voulu donner, proposé en valeur de
   * départ. Google renseigne `given_name` et `family_name`, Microsoft se
   * contente souvent de `name` : on retombe donc sur le premier mot, puis le
   * reste. Ce n'est pas une reprise silencieuse - c'est un brouillon que la
   * personne relit et valide.
   */
  const meta: Record<string, unknown> = user.user_metadata ?? {};
  // `user_metadata` n'est pas typé : tout ce qui n'est pas une chaîne devient
  // une chaîne vide, jamais `String(undefined)` - qui écrirait « undefined »
  // dans le champ. Et `||` plutôt que `??` : une chaîne vide doit elle aussi
  // laisser la place au repli suivant.
  const texte = (valeur: unknown): string =>
    typeof valeur === "string" ? valeur.trim() : "";

  // Ni Google ni Azure ne renvoient `given_name` / `family_name` sur ce projet :
  // c'est `full_name` qu'il faut découper. Le premier mot vaut prénom, le reste
  // nom - faux pour un prénom composé, mais c'est un brouillon que la personne
  // corrige, pas une donnée qu'on enregistre dans son dos.
  const nomComplet = texte(meta.full_name) || texte(meta.name);
  const [premierMot = "", ...restants] = nomComplet.split(/\s+/).filter(Boolean);

  // Les fournisseurs rendent parfois le nom en capitales : on le remet dans la
  // casse des champs de saisie, qui l'appliquent de toute façon à la frappe.
  const prenom = capitaliseName(texte(profile?.first_name) || texte(meta.given_name) || premierMot);
  const nom = capitaliseName(
    texte(profile?.last_name) || texte(meta.family_name) || restants.join(" ")
  );

  return (
    <div className="flex justify-center px-4 py-14">
      <div className="w-full max-w-xl">
        <AnimateIn variant="blur-in" duration={0.5}>
          <div className="text-center mb-8">
            <span className="text-bronze-dark text-[11.5px] font-semibold tracking-[1.8px] uppercase">
              Première connexion
            </span>
            <h1 className="font-heading text-[clamp(1.5rem,4vw,1.9rem)] font-semibold text-ink mt-2.5 leading-[1.3]">
              Quelques questions avant de commencer
            </h1>
            <p className="text-[13.5px] text-warm-grey leading-[1.65] mt-3 max-w-[440px] mx-auto">
              Elles servent à préparer votre premier rendez-vous et à vous joindre. Vous ne les
              remplirez qu&apos;une fois.
            </p>
          </div>
        </AnimateIn>

        <AnimateIn variant="fade-up" delay={120}>
          <div className="bg-cream border border-cream-deep rounded-xl p-6 sm:p-8">
            <IntakeForm defaultFirstName={prenom} defaultLastName={nom} />
          </div>
        </AnimateIn>

        {/* La page n'a pas la barre de l'espace client, donc aucune sortie. Or
            la raison la plus banale d'arriver ici et de vouloir repartir, c'est
            de s'être connecté avec le mauvais compte Google : on dit lequel,
            et on laisse en changer. */}
        <AnimateIn variant="fade-up" delay={180}>
          {/* Un `div` et non un `p` : un formulaire est du contenu de flux, que
              le navigateur refuserait d'imbriquer dans un paragraphe - il le
              fermerait d'office et la ligne se couperait en deux. */}
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 text-[12.5px] text-warm-grey mt-5">
            <span>
              Connecté avec <span className="text-charcoal">{user.email}</span>
            </span>
            <span aria-hidden="true">·</span>
            <form action={signOut}>
              <button
                type="submit"
                className="text-bronze-dark hover:text-bronze font-medium transition-colors cursor-pointer"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </AnimateIn>
      </div>
    </div>
  );
}
