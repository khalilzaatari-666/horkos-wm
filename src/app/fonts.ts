import localFont from "next/font/local";

/**
 * Les deux voix de la marque, auto-hébergées.
 *
 * Zodiak (titres) et Switzer (texte), Indian Type Foundry, distribuées par
 * Fontshare sous licence ITF Free Font License : usage commercial et
 * auto-hébergement autorisés, gratuitement (texte de la licence dans
 * `src/fonts/LICENSE-ITF-FFL.txt`). Les noms de variables CSS ne changent pas.
 */
export const alpina = localFont({
  variable: "--font-alpina",
  display: "swap",
  src: [
    { path: "../fonts/Zodiak-300.woff2", weight: "300", style: "normal" },
    { path: "../fonts/Zodiak-300-italic.woff2", weight: "300", style: "italic" },
    { path: "../fonts/Zodiak-400.woff2", weight: "400", style: "normal" },
  ],
});

export const america = localFont({
  variable: "--font-america",
  display: "swap",
  src: [
    { path: "../fonts/Switzer-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Switzer-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Switzer-600.woff2", weight: "600", style: "normal" },
  ],
});
