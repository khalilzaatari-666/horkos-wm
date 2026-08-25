import { SITE_NAME, SITE_DESCRIPTION, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * `JSON.stringify` escapes quotes but not `<`, so a value containing
 * `</script>` would close the tag early. Escaping it as a unicode sequence
 * keeps the JSON identical while making that impossible.
 */
function serialise(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialise(data) }}
    />
  );
}

/**
 * Site-wide identity.
 *
 * Deliberately limited to what the codebase can actually vouch for: no
 * address, phone or opening hours are invented. They should be added once the
 * cabinet provides them, since a LocalBusiness entry gains a lot from them.
 */
export function OrganisationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "FinancialService",
            "@id": `${SITE_URL}/#organisation`,
            name: SITE_NAME,
            alternateName: "Horkos Wealth Management",
            url: SITE_URL,
            logo: absoluteUrl("/images/logo-dark.jpg"),
            image: absoluteUrl("/images/logo-dark.jpg"),
            description: SITE_DESCRIPTION,
            areaServed: [
              { "@type": "Country", name: "Maroc" },
              { "@type": "Country", name: "France" },
            ],
            knowsLanguage: ["fr"],
            founder: {
              "@type": "Person",
              name: "Othmane Benzakour",
              jobTitle: "Fondateur & CEO",
              sameAs: "https://www.linkedin.com/in/othmane-benzakour-6a93a0112/",
            },
            serviceType: [
              "Conseil en gestion de patrimoine",
              "Structuration patrimoniale",
              "Conseil en investissement financier",
              "Transmission et succession",
            ],
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            inLanguage: "fr-MA",
            publisher: { "@id": `${SITE_URL}/#organisation` },
          },
        ],
      }}
    />
  );
}

interface ArticleJsonLdProps {
  title: string;
  description: string | null;
  slug: string;
  publishedAt: string;
  imageUrl: string | null;
}

export function ArticleJsonLd({
  title,
  description,
  slug,
  publishedAt,
  imageUrl,
}: ArticleJsonLdProps) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: description ?? undefined,
        datePublished: publishedAt,
        inLanguage: "fr",
        mainEntityOfPage: absoluteUrl(`/ressources/articles/${slug}`),
        image: imageUrl ? [imageUrl] : [absoluteUrl("/images/logo-dark.jpg")],
        author: { "@id": `${SITE_URL}/#organisation` },
        publisher: { "@id": `${SITE_URL}/#organisation` },
      }}
    />
  );
}
