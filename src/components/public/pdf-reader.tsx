"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { chargerPdf } from "@/lib/pdf-preview";

/**
 * La liseuse d'un guide déverrouillé : chaque page du PDF dessinée à la
 * largeur de la colonne, au moment où elle approche de l'écran. Pas d'iframe :
 * notre CSP les interdit, et iOS n'y affiche que la première page.
 */
export function PdfReader({ url, titre }: { url: string; titre: string }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let annule = false;
    let charge: PDFDocumentProxy | null = null;
    chargerPdf(url)
      .then((d) => {
        charge = d;
        if (!annule) setDoc(d);
      })
      .catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
      charge?.loadingTask.destroy();
    };
  }, [url]);

  if (erreur) {
    return (
      <p className="rounded-[20px] bg-cream-deep px-6 py-5 text-[15px] text-charcoal">
        Le guide ne s’affiche pas ici. Ouvrez-le avec le bouton « Télécharger le PDF ».
      </p>
    );
  }

  return (
    <div className="space-y-6" aria-label={`Lecture du guide ${titre}`}>
      {doc
        ? Array.from({ length: doc.numPages }, (_, i) => <Page key={i} doc={doc} numero={i + 1} />)
        : <div className="aspect-[210/297] w-full animate-pulse rounded-[12px] bg-cream-deep" />}
    </div>
  );
}

function Page({ doc, numero }: { doc: PDFDocumentProxy; numero: number }) {
  const cadre = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(297 / 210);

  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    let fait = false;
    const io = new IntersectionObserver(
      async ([entree]) => {
        if (!entree.isIntersecting || fait) return;
        fait = true;
        io.disconnect();
        const page = await doc.getPage(numero);
        const base = page.getViewport({ scale: 1 });
        setRatio(base.height / base.width);
        const c = canvas.current;
        if (!c) return;
        const echelle = (el.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) / base.width;
        const viewport = page.getViewport({ scale: echelle });
        c.width = Math.round(viewport.width);
        c.height = Math.round(viewport.height);
        await page.render({ canvas: c, viewport }).promise;
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [doc, numero]);

  return (
    <div
      ref={cadre}
      className="overflow-hidden rounded-[12px] border border-ink/10 bg-white shadow-[0_18px_40px_-30px_rgba(11,26,46,0.35)]"
      style={{ aspectRatio: `1 / ${ratio}` }}
    >
      <canvas ref={canvas} className="block h-full w-full" aria-label={`Page ${numero}`} role="img" />
    </div>
  );
}
