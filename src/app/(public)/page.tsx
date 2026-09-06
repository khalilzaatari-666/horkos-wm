import type { Metadata } from "next";
import { HomeContent, type FaqPublique } from "./home-content";
import { getFaqs } from "@/lib/content";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// The page itself is a client component (GSAP), which cannot export metadata,
// and the homepage shares its layout with every other public page. Hence this
// thin server wrapper.
export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} | Conseil en gestion de patrimoine au Maroc`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

/**
 * Même cadence que les pages Ressources, et pour la même raison : la FAQ vient
 * de la base via le client sans cookie de `getFaqs`, ce qui laisse la page
 * préproduite plutôt que recalculée à chaque visite. Une modification depuis le
 * back-office l'invalide sans attendre ce délai (`revalidatePath("/")`).
 */
export const revalidate = 300;

export default async function HomePage() {
  const faqs: FaqPublique[] = (await getFaqs()).map((f) => ({ q: f.question, a: f.answer }));

  // Liste vide - table encore vierge, ou lecture en échec : `HomeContent`
  // retombe alors sur sa propre liste plutôt que d'afficher une section creuse.
  return <HomeContent faqs={faqs.length ? faqs : undefined} />;
}
