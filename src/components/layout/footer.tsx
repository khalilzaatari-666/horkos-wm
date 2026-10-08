import Link from "next/link";
import Image from "next/image";
import { NAV, LEGAL_LINKS } from "./nav";
import { CABINET_ADDRESS, CABINET_EMAIL, CABINET_PHONE, CABINET_PHONE_HREF } from "@/lib/site";

/**
 * Pied de page : un chapitre encre, les rubriques, les coordonnées, et le nom
 * du cabinet composé en très grand, tronqué par le bas de page.
 */
export function Footer() {
  return (
    <footer className="relative bg-ink text-cream overflow-hidden border-t border-cream/10">
      <div className="shell pt-16 lg:pt-20">
        <div className="grid gap-14 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Image
              src="/images/logo-light.png"
              alt="Horkos Wealth Management"
              width={746}
              height={248}
              className="h-12 w-auto"
            />
            <p className="mt-8 max-w-[34ch] text-[15px] leading-relaxed text-cream-muted">
              Cabinet de conseil en gestion de patrimoine, agréé conseiller en investissements
              financiers par l’AMMC.
            </p>
            <div className="mt-8 space-y-1.5 text-[15px]">
              <a href={CABINET_PHONE_HREF} className="block tabular-nums hover:text-white transition-colors">
                {CABINET_PHONE}
              </a>
              <a href={`mailto:${CABINET_EMAIL}`} className="block hover:text-white transition-colors">
                {CABINET_EMAIL}
              </a>
              <p className="text-cream-muted">{CABINET_ADDRESS.replace("Cabinet Horkos, ", "")}</p>
            </div>
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            {NAV.map((g) => (
              <nav key={g.label} aria-label={g.label}>
                <h2 className="font-sans text-[13px] font-medium tracking-normal text-cream-muted">{g.label}</h2>
                <ul className="mt-5 space-y-3">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[16px] hover:text-white transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col-reverse gap-4 border-t border-cream/[0.12] py-7 text-[13px] text-cream-muted sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Horkos Wealth Management</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/contact" className="hover:text-cream transition-colors">Nous contacter</Link>
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-cream transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}
