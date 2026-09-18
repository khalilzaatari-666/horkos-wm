import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, LegalFacts } from "@/components/public/legal";
import { CABINET_EMAIL, CABINET_PHONE, CABINET_PHONE_HREF } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales | Horkos Wealth Management",
  description:
    "Mentions légales du site Horkos Wealth Management : éditeur, hébergement, propriété intellectuelle et droit applicable.",
  robots: { index: true, follow: true },
};

export default function MentionsLegalesPage() {
  return (
    <LegalPage eyebrow="Informations légales" title="Mentions légales" updatedAt="18 septembre 2026">
      <LegalSection title="Éditeur du site">
        <p>Le présent site est édité par :</p>
        <LegalFacts
          items={[
            ["Raison sociale", "HORKOS CONSEIL"],
            ["Forme juridique", "Société à responsabilité limitée à associé unique (SARL AU)"],
            ["Registre du commerce (RC)", "709941 - Tribunal de commerce de Casablanca"],
            ["Identifiant Commun de l'Entreprise (ICE)", "003835462000017"],
            [
              "Téléphone",
              <a key="tel" href={CABINET_PHONE_HREF} className="text-bronze hover:text-bronze-dark">
                {CABINET_PHONE}
              </a>,
            ],
            [
              "Email",
              <a key="mail" href={`mailto:${CABINET_EMAIL}`} className="text-bronze hover:text-bronze-dark">
                {CABINET_EMAIL}
              </a>,
            ],
          ]}
        />
        <p>Le site est exploité sous la marque Horkos Wealth Management.</p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>L&apos;application est hébergée par :</p>
        <LegalFacts
          items={[
            ["Hébergeur", "Vercel Inc."],
            ["Adresse", "340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis"],
            ["Site", <a key="v" href="https://vercel.com" className="text-bronze hover:text-bronze-dark" target="_blank" rel="noopener noreferrer">vercel.com</a>],
          ]}
        />
        <p>
          Les données applicatives (comptes, rendez-vous, documents) sont hébergées par Supabase,
          prestataire d&apos;infrastructure de base de données et de stockage. Voir la{" "}
          <Link href="/politique-de-confidentialite" className="text-bronze hover:text-bronze-dark">
            politique de confidentialité
          </Link>{" "}
          pour le détail des sous-traitants.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments du site - textes, visuels, logos, chartes graphiques,
          structure et code - est la propriété exclusive de l&apos;éditeur ou de ses partenaires, et
          est protégé par le droit de la propriété intellectuelle. Toute reproduction,
          représentation, adaptation ou exploitation, totale ou partielle, sans autorisation écrite
          préalable est interdite et susceptible de constituer une contrefaçon.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Le traitement des données personnelles collectées sur ce site est décrit dans notre{" "}
          <Link href="/politique-de-confidentialite" className="text-bronze hover:text-bronze-dark">
            politique de confidentialité
          </Link>
          , conforme à la loi n° 09-08 relative à la protection des personnes physiques à
          l&apos;égard du traitement des données à caractère personnel. Le site n&apos;utilise que
          des cookies strictement nécessaires à son fonctionnement (session d&apos;authentification)
          et aucun cookie publicitaire ou de suivi tiers.
        </p>
      </LegalSection>

      <LegalSection title="Liens hypertextes">
        <p>
          Le site peut contenir des liens vers des sites tiers. L&apos;éditeur n&apos;exerce aucun
          contrôle sur ces sites et décline toute responsabilité quant à leur contenu ou à
          l&apos;usage qui pourrait en être fait.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilité">
        <p>
          Les informations publiées sur ce site sont fournies à titre général et informatif. Elles
          ne constituent pas un conseil en investissement personnalisé, une recommandation
          d&apos;achat ou de vente, ni une sollicitation. Tout accompagnement personnalisé fait
          l&apos;objet d&apos;un échange direct avec le cabinet. L&apos;éditeur s&apos;efforce
          d&apos;assurer l&apos;exactitude des informations diffusées sans pouvoir en garantir
          l&apos;exhaustivité ou l&apos;actualité permanente.
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable et juridiction">
        <p>
          Les présentes mentions légales sont régies par le droit marocain. Tout litige relatif à
          leur interprétation ou à l&apos;utilisation du site relève de la compétence des tribunaux
          de Casablanca (Maroc).
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative aux présentes mentions, écrivez-nous à{" "}
          <a href={`mailto:${CABINET_EMAIL}`} className="text-bronze hover:text-bronze-dark">
            {CABINET_EMAIL}
          </a>{" "}
          ou via notre{" "}
          <Link href="/contact" className="text-bronze hover:text-bronze-dark">
            formulaire de contact
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
