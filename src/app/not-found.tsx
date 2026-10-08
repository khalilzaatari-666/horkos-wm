import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Page introuvable | Horkos Wealth Management",
};

/**
 * 404 global : rendu dans le layout racine (sans l'en-tête ni le pied du groupe
 * public), donc autonome. On garde la charte du cabinet et des liens de retour.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="shell flex h-[84px] items-center">
        <Link href="/" aria-label="Accueil Horkos Wealth Management">
          <Image src="/images/logo.png" alt="Horkos Wealth Management" width={746} height={248} className="h-11 w-auto" priority />
        </Link>
      </div>
      <div className="shell flex flex-1 flex-col justify-center pb-20">
        <p className="font-heading font-light text-[clamp(7rem,24vw,20rem)] leading-[0.8] tracking-[-0.05em] text-cream-deep">404</p>
        <h1 className="display-lg mt-8 max-w-[16ch] text-ink">Cette page est introuvable.</h1>
        <p className="lead mt-5 max-w-[48ch]">
          Le lien que vous avez suivi n’existe plus ou a été déplacé. Revenez à l’accueil, ou prenez
          rendez-vous avec notre cabinet.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/" className="btn btn-ink">Retour à l’accueil</Link>
          <Link href="/rendez-vous" className="btn btn-outline">Prendre rendez-vous</Link>
          <Link href="/contact" className="link-arrow ml-2">Nous contacter</Link>
        </div>
      </div>
    </div>
  );
}
