// Contenu de démonstration pour prévisualiser /ressources (articles, guides,
// événements). Attention : la base est partagée avec la production, le contenu
// publié ici apparaît aussi sur horkos-wm.com tant qu'il n'est pas retiré.
//
//   node --env-file=.env.local scripts/demo-content.mjs seed
//   node --env-file=.env.local scripts/demo-content.mjs guides
//   node --env-file=.env.local scripts/demo-content.mjs clean
//
// `guides` ne publie que les guides, chacun avec un PDF de démonstration
// déposé dans le bucket `media` (guides/demo-….pdf).
// `clean` ne retire que ce que ce script a inséré (slugs `demo-…`, titres des
// événements ci-dessous, catégories de démonstration, PDF de démonstration).
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ARTICLE_CATS = ["Fiscalité", "Transmission", "Investissement"];
const GUIDE_CATS = ["Patrimoine", "Retraite"];

const day = 86_400_000;
const ago = (n) => new Date(Date.now() - n * day).toISOString();

const para = (...p) => p.join("\n\n");

const articles = [
  {
    slug: "demo-loi-de-finances-2027",
    title: "Loi de finances 2027 : ce qui change pour votre patrimoine",
    category: "Fiscalité",
    excerpt: "Barème de l’IR, plus-values immobilières, revenus de capitaux mobiliers : les mesures à connaître avant la fin de l’année.",
    cover_url: null,
    published_at: ago(2),
  },
  {
    slug: "demo-transmettre-entreprise-familiale",
    title: "Transmettre une entreprise familiale sans fragiliser l’activité",
    category: "Transmission",
    excerpt: "Anticiper la gouvernance, organiser la détention, préparer les héritiers : une transmission se construit sur plusieurs années.",
    cover_url: "/images/pages/cas-transmission.jpg",
    published_at: ago(9),
  },
  {
    slug: "demo-diversifier-hors-immobilier",
    title: "Diversifier au-delà de l’immobilier : par où commencer ?",
    category: "Investissement",
    excerpt: "Pour beaucoup de familles marocaines, la pierre représente l’essentiel du patrimoine. Quelques pistes pour rééquilibrer.",
    cover_url: "/images/pages/placements.jpg",
    published_at: ago(17),
  },
  {
    slug: "demo-mre-investir-au-maroc",
    title: "Marocains résidant à l’étranger : investir au Maroc en toute clarté",
    category: "Fiscalité",
    excerpt: "Convention fiscale, rapatriement des fonds, choix de la structure : les questions à se poser avant d’investir.",
    cover_url: null,
    published_at: ago(30),
  },
  {
    slug: "demo-private-equity-particuliers",
    title: "Le private equity est-il fait pour vous ?",
    category: "Investissement",
    excerpt: "Horizon long, illiquidité, ticket d’entrée : comprendre la classe d’actifs avant d’y consacrer une part de son patrimoine.",
    cover_url: "/images/pages/private-equity.jpg",
    published_at: ago(44),
  },
  {
    slug: "demo-donation-de-son-vivant",
    title: "Donner de son vivant : avantages et précautions",
    category: "Transmission",
    excerpt: "La donation permet d’accompagner ses proches au bon moment. Encore faut-il en mesurer les effets civils et fiscaux.",
    cover_url: null,
    published_at: ago(61),
  },
].map((a) => ({
  ...a,
  is_published: true,
  content: para(
    `${a.excerpt} Cet article de démonstration illustre la mise en page des contenus éditoriaux : chapeau, paragraphes, rythme de lecture.`,
    "Chaque situation patrimoniale est singulière. Avant toute décision, il est utile de clarifier l’objectif poursuivi, l’horizon envisagé et le niveau de risque acceptable. C’est à partir de ces trois repères que les options se comparent réellement.",
    "Les dispositifs évoqués ici évoluent régulièrement : textes de loi, conventions fiscales, conditions de marché. Une analyse à date, adaptée à votre situation familiale et professionnelle, reste indispensable.",
    "Nous restons à votre disposition pour en parler lors d’un premier échange, gratuit et sans engagement.",
  ),
}));

const guides = [
  {
    slug: "demo-guide-structurer-patrimoine",
    title: "Structurer son patrimoine au Maroc",
    description: "Les grandes étapes pour organiser la détention de vos actifs, de l’état des lieux à la mise en œuvre.",
    category: "Patrimoine",
    cover_url: "/images/pages/structuration-assemblage.jpg",
  },
  {
    slug: "demo-guide-preparer-retraite",
    title: "Préparer sa retraite à 45 ans",
    description: "Estimer ses besoins, combler l’écart avec les régimes obligatoires, choisir les bons supports.",
    category: "Retraite",
    cover_url: "/images/pages/cas-retraite.jpg",
  },
  {
    slug: "demo-guide-mre",
    title: "Le guide patrimonial des MRE",
    description: "Résidence fiscale, investissement à distance, transmission entre deux pays.",
    category: "Patrimoine",
    cover_url: "/images/stack/double-regard.jpg",
    partner: "un cabinet d’avocats fiscalistes",
  },
  {
    slug: "demo-guide-epargne-salariale",
    title: "Épargne salariale : le guide du dirigeant",
    description: "Associer ses collaborateurs à la création de valeur, dans un cadre clair et maîtrisé.",
    category: "Retraite",
    cover_url: "/images/pages/epargne-salariale.jpg",
  },
].map((g) => ({ ...g, is_published: true }));

const events = [
  {
    title: "Petit-déjeuner : la loi de finances 2027 décryptée",
    description: "Un échange d’une heure avec nos conseillers sur les mesures qui touchent les particuliers et les dirigeants.",
    date: ago(-12),
    location: "Casablanca",
    cover_url: null,
  },
  {
    title: "Webinaire : investir au Maroc depuis l’étranger",
    description: "Pour les Marocains résidant à l’étranger : fiscalité, rapatriement, structuration.",
    date: ago(-26),
    location: "En ligne",
    cover_url: "/images/pages/evenements-hero.jpg",
  },
  {
    title: "Rencontre : transmettre son entreprise",
    description: "Témoignages de dirigeants et regards croisés d’un notaire et d’un avocat d’affaires.",
    date: ago(20),
    location: "Rabat",
    cover_url: "/images/pages/cas-transmission.jpg",
  },
  {
    title: "Conférence : les marchés en 2026, bilan et perspectives",
    description: "Retour sur l’année écoulée et lecture des grandes tendances pour les investisseurs privés.",
    date: ago(75),
    location: "Casablanca",
    cover_url: null,
  },
].map((e) => ({ ...e, is_published: true }));

async function run(label, query) {
  const { error } = await query;
  if (error) throw new Error(`${label} : ${error.message}`);
  console.log("ok", label);
}

async function seed() {
  await run("catégories articles", db.from("article_categories").upsert(ARTICLE_CATS.map((name, i) => ({ name, sort_order: i }))));
  await run("catégories guides", db.from("guide_categories").upsert(GUIDE_CATS.map((name, i) => ({ name, sort_order: i }))));
  await run("articles", db.from("articles").upsert(articles, { onConflict: "slug" }));
  await run("guides", db.from("guides").upsert(guides, { onConflict: "slug" }));
  // Pas de clé naturelle : on retire d'abord pour pouvoir relancer.
  await run("événements (purge)", db.from("events").delete().in("title", events.map((e) => e.title)));
  await run("événements", db.from("events").insert(events));
}

const pdfPath = (slug) => `guides/${slug}.pdf`;

const INK = rgb(0x0b / 255, 0x1a / 255, 0x2e / 255);
const BRONZE = rgb(0xa9 / 255, 0x78 / 255, 0x4f / 255);
const GREY = rgb(0x7a / 255, 0x74 / 255, 0x68 / 255);

/** Retour à la ligne simple, mesuré avec la police du PDF. */
function wrap(text, font, size, width) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Un guide de démonstration : couverture, sommaire, puis une page par partie. */
async function guidePdf(g) {
  const doc = await PDFDocument.create();
  doc.setTitle(g.title);
  doc.setAuthor("Horkos Wealth Management");
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const [W, H, M] = [595, 842, 64];
  const text = (page, str, { x = M, y, size = 11, font = sans, color = INK, width = W - 2 * M, lh = 1.5 }) => {
    for (const l of wrap(str, font, size, width)) {
      page.drawText(l, { x, y, size, font, color });
      y -= size * lh;
    }
    return y;
  };

  const cover = doc.addPage([W, H]);
  cover.drawRectangle({ x: 0, y: 0, width: W, height: H, color: INK });
  text(cover, "HORKOS WEALTH MANAGEMENT", { y: H - M, size: 9, color: BRONZE });
  let y = text(cover, g.title, { y: H / 2 + 60, size: 34, font: serif, color: rgb(0.97, 0.96, 0.93), lh: 1.15 });
  text(cover, g.description, { y: y - 16, size: 12, color: rgb(0.85, 0.83, 0.79) });
  text(cover, "Document de démonstration - contenu fictif.", { y: M, size: 9, color: GREY });

  const sections = ["Faire le point", "Fixer les objectifs", "Choisir les supports", "Mettre en œuvre et suivre"];
  const toc = doc.addPage([W, H]);
  y = text(toc, "Sommaire", { y: H - M - 20, size: 26, font: serif });
  sections.forEach((s, i) => {
    y = text(toc, `${i + 1}.  ${s}`, { y: y - 18, size: 13 });
  });

  // Une page par partie : titre, trois paragraphes, pied de page numéroté.
  const corps = [
    `${g.description} Ce passage illustre la mise en page d’un guide Horkos : un titre, quelques paragraphes, un rythme de lecture posé.`,
    "Chaque situation patrimoniale est singulière. Avant toute décision, il est utile de clarifier l’objectif poursuivi, l’horizon envisagé et le niveau de risque acceptable. C’est à partir de ces trois repères que les options se comparent réellement.",
    "Les dispositifs évoqués ici évoluent régulièrement : textes de loi, conventions fiscales, conditions de marché. Une analyse à date, adaptée à votre situation familiale et professionnelle, reste indispensable avant toute mise en œuvre.",
  ];
  for (const [i, s] of sections.entries()) {
    const page = doc.addPage([W, H]);
    y = text(page, `${i + 1}. ${s}`, { y: H - M - 20, size: 18, font: serif });
    for (const p of corps) y = text(page, p, { y: y - 10, color: rgb(0.23, 0.23, 0.21) }) - 8;
    text(page, `Horkos Wealth Management - Conseiller en investissements financiers agréé AMMC.   ${i + 3}`, { y: M, size: 8, color: GREY });
  }

  return doc.save();
}

async function seedGuides() {
  await run("catégories guides", db.from("guide_categories").upsert(GUIDE_CATS.map((name, i) => ({ name, sort_order: i }))));
  const rows = [];
  for (const g of guides) {
    const path = pdfPath(g.slug);
    await run(`PDF ${path}`, db.storage.from("media").upload(path, await guidePdf(g), { upsert: true, contentType: "application/pdf" }));
    rows.push({ ...g, pdf_url: db.storage.from("media").getPublicUrl(path).data.publicUrl });
  }
  await run("guides", db.from("guides").upsert(rows, { onConflict: "slug" }));
  for (const r of rows) console.log(`  ${r.slug} → ${r.pdf_url}`);
}

async function clean() {
  await run("articles", db.from("articles").delete().like("slug", "demo-%"));
  await run("guides", db.from("guides").delete().like("slug", "demo-%"));
  await run("PDF des guides", db.storage.from("media").remove(guides.map((g) => pdfPath(g.slug))));
  await run("événements", db.from("events").delete().in("title", events.map((e) => e.title)));
  await run("catégories articles", db.from("article_categories").delete().in("name", ARTICLE_CATS));
  await run("catégories guides", db.from("guide_categories").delete().in("name", GUIDE_CATS));
}

const mode = process.argv[2];
if (mode === "seed") await seed();
else if (mode === "guides") await seedGuides();
else if (mode === "clean") await clean();
else throw new Error("usage : demo-content.mjs seed|guides|clean");
