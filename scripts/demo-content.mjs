// Contenu de démonstration pour prévisualiser /ressources (articles, guides,
// événements). Attention : la base est partagée avec la production, le contenu
// publié ici apparaît aussi sur horkos-wm.com tant qu'il n'est pas retiré.
//
//   node --env-file=.env.local scripts/demo-content.mjs seed
//   node --env-file=.env.local scripts/demo-content.mjs clean
//
// `clean` ne retire que ce que ce script a inséré (slugs `demo-…`, titres des
// événements ci-dessous, catégories de démonstration).
import { createClient } from "@supabase/supabase-js";

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
    cover_label: "Préparer sa retraite",
  },
  {
    slug: "demo-guide-mre",
    title: "Le guide patrimonial des MRE",
    description: "Résidence fiscale, investissement à distance, transmission entre deux pays.",
    category: "Patrimoine",
    cover_label: "Guide des MRE",
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

async function clean() {
  await run("articles", db.from("articles").delete().like("slug", "demo-%"));
  await run("guides", db.from("guides").delete().like("slug", "demo-%"));
  await run("événements", db.from("events").delete().in("title", events.map((e) => e.title)));
  await run("catégories articles", db.from("article_categories").delete().in("name", ARTICLE_CATS));
  await run("catégories guides", db.from("guide_categories").delete().in("name", GUIDE_CATS));
}

const mode = process.argv[2];
if (mode === "seed") await seed();
else if (mode === "clean") await clean();
else throw new Error("usage : demo-content.mjs seed|clean");
