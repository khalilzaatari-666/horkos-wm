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
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-7 py-16 text-center">
      <Link href="/" aria-label="Accueil Horkos Wealth Management">
        <Image
          src="/images/logo.png"
          alt="Horkos Wealth Management"
          width={160}
          height={56}
          className="h-12 w-auto mb-12"
          priority
        />
      </Link>

      <p className="font-heading text-[clamp(3.5rem,13vw,6rem)] font-semibold text-bronze leading-none">
        404
      </p>
      <h1 className="font-heading text-[clamp(1.4rem,4vw,1.95rem)] font-semibold text-ink mt-4">
        Cette page est introuvable
      </h1>
      <p className="text-warm-grey text-[14px] leading-[1.7] mt-3 max-w-[440px]">
        Le lien que vous avez suivi n&apos;existe plus ou a été déplacé. Revenez à l&apos;accueil,
        ou prenez rendez-vous avec notre cabinet.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Link
          href="/"
          className="px-6 py-3 text-[13.5px] font-medium bg-bronze text-white rounded-lg hover:bg-bronze-dark transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
        <Link
          href="/rendez-vous"
          className="px-6 py-3 text-[13.5px] font-medium bg-white border border-cream-deep text-ink rounded-lg hover:border-bronze/50 transition-colors"
        >
          Prendre rendez-vous
        </Link>
      </div>

      <Link href="/contact" className="text-[13px] text-bronze hover:text-bronze-dark mt-6">
        Nous contacter
      </Link>
    </div>
  );
}
