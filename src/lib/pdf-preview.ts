/**
 * Les PDF des guides, côté navigateur : pdf.js se charge à la demande (il
 * pèse), avec son worker servi depuis notre domaine.
 *
 * - `chargerPdf` sert à la liseuse d'un guide déverrouillé ;
 * - `apercuGuide` fabrique, au back-office, les images de l'aperçu public :
 *   la moitié haute de la première page, nette, puis cette page et les
 *   suivantes réduites à 120
 *   pixels de large (une lettre y tient dans un pixel) et floutées. Le flou
 *   est dans les pixels : aucun réglage du navigateur ne rend le texte lisible.
 */
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

/** Part visible et nette de la page d'aperçu. */
export const PART_NETTE = 0.5;
/** Largeur de rendu de la page d'aperçu, et de sa version floutée. */
const LARGEUR_NETTE = 1200;
const LARGEUR_FLOUE = 120;

let pdfjs: Promise<typeof import("pdfjs-dist")> | null = null;

function lib() {
  pdfjs ??= import("pdfjs-dist").then((m) => {
    m.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), {
      type: "module",
    });
    return m;
  });
  return pdfjs;
}

export async function chargerPdf(source: string | ArrayBuffer): Promise<PDFDocumentProxy> {
  const m = await lib();
  return m.getDocument(typeof source === "string" ? { url: source } : { data: source }).promise;
}

/** Hauteur, en pixels, de la bande nette en haut d'une page rendue. */
export function hauteurNette(hauteurPage: number): number {
  return Math.max(1, Math.round(hauteurPage * PART_NETTE));
}

function versBlob(canvas: HTMLCanvasElement, qualite: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image non générée."))), "image/webp", qualite)
  );
}

/** Les pages qui suivent l'extrait, floutées elles aussi (au plus). */
export const PAGES_SUITE = 4;

async function rendre(page: PDFPageProxy): Promise<HTMLCanvasElement> {
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: LARGEUR_NETTE / base.width });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  await page.render({ canvas, viewport }).promise;
  return canvas;
}

/**
 * Une page entière, réduite puis agrandie avec un flou : le texte n'existe
 * plus dans l'image.
 */
function flouter(pleine: HTMLCanvasElement): HTMLCanvasElement {
  const petite = document.createElement("canvas");
  petite.width = LARGEUR_FLOUE;
  petite.height = Math.round((LARGEUR_FLOUE * pleine.height) / pleine.width);
  const pctx = petite.getContext("2d")!;
  pctx.imageSmoothingQuality = "high";
  pctx.drawImage(pleine, 0, 0, petite.width, petite.height);

  const floue = document.createElement("canvas");
  floue.width = 600;
  floue.height = Math.round((600 * pleine.height) / pleine.width);
  const ctx = floue.getContext("2d")!;
  // Le flou fond les bords de la page vers le transparent : on pose d'abord
  // le fond de la page (la couleur de son coin), sur lequel ils disparaissent.
  const [r, g, b] = pctx.getImageData(0, 0, 1, 1).data;
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, floue.width, floue.height);
  // Rendu proche du texte flouté des articles : agrandissement lissé, flou
  // assez large pour effacer les pixels de la réduction (×5), et texte
  // éclairci vers le fond de la page.
  ctx.imageSmoothingQuality = "high";
  ctx.filter = "blur(7px)";
  ctx.globalAlpha = 0.6;
  ctx.drawImage(petite, 0, 0, floue.width, floue.height);
  return floue;
}

/**
 * L'aperçu d'un guide, dans l'ordre du document : la moitié haute de la
 * première page, nette, cette page floutée, puis les pages suivantes floutées
 * (`PAGES_SUITE` au plus).
 */
export async function apercuGuide(
  source: string | ArrayBuffer
): Promise<{ nette: Blob; floue: Blob; suite: Blob[] }> {
  const doc = await chargerPdf(source);
  try {
    const pleine = await rendre(await doc.getPage(1));

    // Le haut de la page, net.
    const haut = document.createElement("canvas");
    haut.width = pleine.width;
    haut.height = hauteurNette(pleine.height);
    haut.getContext("2d")!.drawImage(pleine, 0, 0);

    // Les pages suivantes, floutées.
    const suite: Blob[] = [];
    for (let n = 2; n <= Math.min(doc.numPages, 1 + PAGES_SUITE); n++) {
      suite.push(await versBlob(flouter(await rendre(await doc.getPage(n))), 0.7));
    }

    return { nette: await versBlob(haut, 0.86), floue: await versBlob(flouter(pleine), 0.7), suite };
  } finally {
    await doc.loadingTask.destroy();
  }
}
