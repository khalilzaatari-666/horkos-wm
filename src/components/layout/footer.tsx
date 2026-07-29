import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <span className="font-heading text-2xl font-semibold tracking-[3px]">
              HORKOS
            </span>
            <p className="mt-2 text-sm text-warm-grey">Wealth Management</p>
            <p className="mt-4 text-sm text-warm-grey leading-relaxed">
              Cabinet de gestion de patrimoine au Maroc. Accompagnement
              personnalisé en structuration, investissement et transmission.
            </p>
          </div>

          {/* Le cabinet */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-bronze-light mb-4">
              Le cabinet
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/cabinet/approche" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Notre approche
                </Link>
              </li>
              <li>
                <Link href="/cabinet/modele" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Notre modèle
                </Link>
              </li>
              <li>
                <Link href="/cabinet/produits" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Nos produits
                </Link>
              </li>
            </ul>
          </div>

          {/* Conseil */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-bronze-light mb-4">
              Conseil
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/conseil/structuration" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Structuration patrimoniale
                </Link>
              </li>
              <li>
                <Link href="/conseil/reseau" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Réseau de professionnels
                </Link>
              </li>
              <li>
                <Link href="/conseil/cas-usage" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Cas d&apos;usage
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-bronze-light mb-4">
              Contact
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Nous contacter
                </Link>
              </li>
              <li>
                <Link href="/ressources/articles" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Articles
                </Link>
              </li>
              <li>
                <Link href="/ressources/guides" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Guides
                </Link>
              </li>
              <li>
                <Link href="/questionnaire" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Prendre rendez‑vous
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Horkos Wealth Management. Tous droits réservés.
          </p>
          <div className="flex gap-6">
            <Link href="#" className="text-xs text-gray-500 hover:text-white transition-colors">
              Mentions légales
            </Link>
            <Link href="#" className="text-xs text-gray-500 hover:text-white transition-colors">
              Politique de confidentialité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
