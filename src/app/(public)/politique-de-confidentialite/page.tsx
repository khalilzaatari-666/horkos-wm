import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection, LegalList, LegalFacts } from "@/components/public/legal";
import { CABINET_EMAIL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Horkos Wealth Management",
  description:
    "Comment Horkos Wealth Management collecte, utilise et protège vos données personnelles, conformément à la loi n° 09-08.",
  robots: { index: true, follow: true },
};

export default function ConfidentialitePage() {
  return (
    <LegalPage
      eyebrow="Protection des données"
      title="Politique de confidentialité"
      updatedAt="18 septembre 2026"
    >
      <LegalSection title="Préambule">
        <p>
          Horkos Wealth Management accorde une importance particulière à la protection de vos
          données personnelles. La présente politique explique quelles données nous collectons,
          pourquoi, comment nous les utilisons et les protégeons, et quels sont vos droits. Elle
          s&apos;inscrit dans le cadre de la loi n° 09-08 relative à la protection des personnes
          physiques à l&apos;égard du traitement des données à caractère personnel et des textes pris
          pour son application, sous le contrôle de la Commission Nationale de contrôle de la
          protection des Données à caractère Personnel (CNDP).
        </p>
      </LegalSection>

      <LegalSection title="Responsable du traitement">
        <p>Le responsable du traitement des données est :</p>
        <LegalFacts
          items={[
            ["Entité", "HORKOS CONSEIL (SARL AU), exploitant la marque Horkos Wealth Management"],
            ["RC / ICE", "RC 709941 (Casablanca) - ICE 003835462000017"],
            [
              "Contact",
              <a key="c" href={`mailto:${CABINET_EMAIL}`} className="text-bronze hover:text-bronze-dark">
                {CABINET_EMAIL}
              </a>,
            ],
          ]}
        />
      </LegalSection>

      <LegalSection title="Données que nous collectons">
        <p>
          Nous ne collectons que les données nécessaires à chaque démarche. Selon votre usage du
          site, il peut s&apos;agir de :
        </p>
        <LegalList
          items={[
            <span key="1">
              <strong className="font-medium text-ink">Formulaire de contact</strong> : nom, adresse
              email, téléphone, sujet et contenu de votre message.
            </span>,
            <span key="2">
              <strong className="font-medium text-ink">Prise de rendez-vous</strong> : identité,
              coordonnées, besoins patrimoniaux exprimés, fourchette de patrimoine indiquée, message
              éventuel, ainsi que le créneau et le format (visioconférence ou cabinet) choisis.
            </span>,
            <span key="3">
              <strong className="font-medium text-ink">Demande de cession d&apos;actif</strong> :
              type d&apos;actif, motif, valeur estimée, horizon, description et vos coordonnées.
            </span>,
            <span key="4">
              <strong className="font-medium text-ink">Téléchargement de guides</strong> : adresse
              email.
            </span>,
            <span key="5">
              <strong className="font-medium text-ink">Espace client</strong> : adresse email, mot de
              passe (stocké sous forme chiffrée, jamais en clair), identité, téléphone et données
              patrimoniales que vous renseignez.
            </span>,
            <span key="6">
              <strong className="font-medium text-ink">Coffre-fort documentaire</strong> : les
              documents que vous déposez dans votre espace.
            </span>,
            <span key="7">
              <strong className="font-medium text-ink">Données techniques</strong> : adresse IP,
              journaux de connexion et données de navigation strictement nécessaires, collectés par
              notre hébergeur pour la sécurité et le bon fonctionnement du service.
            </span>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Finalités et bases légales">
        <p>Vos données sont traitées pour :</p>
        <LegalList
          items={[
            "répondre à vos demandes de contact, de rendez-vous et de cession (exécution de mesures précontractuelles et intérêt légitime à vous répondre) ;",
            "gérer et confirmer vos rendez-vous, y compris l'ajout à l'agenda et la création d'un lien de visioconférence ;",
            "vous donner accès à votre espace client et aux services associés (exécution du contrat) ;",
            "vous envoyer les guides et documents que vous demandez (consentement) ;",
            "assurer la sécurité, prévenir la fraude et respecter nos obligations légales.",
          ]}
        />
        <p>
          Nous ne procédons à aucune prospection commerciale non sollicitée sans votre accord et ne
          revendons jamais vos données.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires et sous-traitants">
        <p>
          Vos données sont accessibles aux équipes habilitées du cabinet (administrateurs et
          conseillers). Pour fournir le service, nous faisons appel à des prestataires techniques
          agissant en tant que sous-traitants, uniquement selon nos instructions :
        </p>
        <LegalList
          items={[
            <span key="s1">
              <strong className="font-medium text-ink">Supabase</strong> - hébergement de la base de
              données, authentification et stockage des documents.
            </span>,
            <span key="s2">
              <strong className="font-medium text-ink">Resend</strong> - envoi des emails
              transactionnels (confirmations, notifications).
            </span>,
            <span key="s3">
              <strong className="font-medium text-ink">Google</strong> - Google Agenda et Google Meet
              pour la planification et la tenue des rendez-vous à distance.
            </span>,
            <span key="s4">
              <strong className="font-medium text-ink">Vercel</strong> - hébergement et diffusion de
              l&apos;application.
            </span>,
          ]}
        />
        <p>
          Certains de ces prestataires sont situés hors du Maroc. Les transferts de données vers
          l&apos;étranger sont encadrés par les garanties appropriées, conformément à la loi
          n° 09-08.
        </p>
      </LegalSection>

      <LegalSection title="Durée de conservation">
        <p>
          Nous conservons vos données pour la durée nécessaire aux finalités ci-dessus : le temps de
          traiter votre demande, puis pendant la durée de la relation avec le cabinet. À l&apos;issue
          de cette relation, ou de votre dernier contact avec nous, vos données sont conservées
          pendant une durée de cinq (5) ans, conformément aux délais légaux applicables. Passé ce
          délai, les données sont supprimées ou anonymisées.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles adaptées : chiffrement
          des échanges (HTTPS), mots de passe stockés de façon chiffrée, cloisonnement des accès aux
          données par des règles de sécurité au niveau des lignes, et restriction des accès aux seuls
          membres habilités du cabinet.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Le site n&apos;utilise que des cookies strictement nécessaires à son fonctionnement,
          principalement pour maintenir votre session lorsque vous êtes connecté à votre espace
          client. Nous n&apos;utilisons ni cookie publicitaire, ni traceur d&apos;analyse tiers.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Conformément à la loi n° 09-08, vous disposez d&apos;un droit d&apos;accès, de
          rectification et d&apos;opposition au traitement de vos données, ainsi que du droit
          d&apos;en demander la suppression lorsque cela est justifié. Vous pouvez exercer ces droits
          à tout moment en écrivant à{" "}
          <a href={`mailto:${CABINET_EMAIL}`} className="text-bronze hover:text-bronze-dark">
            {CABINET_EMAIL}
          </a>
          , en justifiant de votre identité. Vous avez également le droit d&apos;introduire une
          réclamation auprès de la CNDP.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          Nous pouvons faire évoluer la présente politique pour refléter des changements
          réglementaires ou de nos services. La date de dernière mise à jour figure en haut de cette
          page ; nous vous invitons à la consulter régulièrement.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question relative à vos données personnelles, contactez-nous à{" "}
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
