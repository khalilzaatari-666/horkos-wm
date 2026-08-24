import "server-only";

import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Gabarit HTML commun à tous les emails du cabinet - mêmes contraintes que
 * code-connexion.html : tableaux et styles inline, pour survivre aux clients
 * mail les plus stricts (Outlook, Gmail, messageries d'entreprise).
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailHtml(options: {
  title: string;
  intro: string;
  rows: [string, string][];
  note: string;
  /** Bouton d'action optionnel (définir un mot de passe, rejoindre l'équipe…). */
  cta?: { label: string; url: string };
}): string {
  const rowsHtml = options.rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;color:#7A7468;white-space:nowrap;vertical-align:top;padding-right:18px;">${label}</td>
          <td style="padding:7px 0;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#0B1A2E;font-weight:600;">${value}</td>
        </tr>`
    )
    .join("");

  // La table des lignes n'est rendue qu'avec du contenu : sans ça, ses bordures
  // haut/bas laisseraient un double filet vide sur un email sans détails.
  const rowsBlock = options.rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border-top:1px solid #EFE7D8;border-bottom:1px solid #EFE7D8;padding:6px 0;">${rowsHtml}</table>`
    : "";

  const ctaBlock = options.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center" bgcolor="#A9784F" style="border-radius:8px;">
        <a href="${options.cta.url}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${options.cta.label}</a>
      </td></tr></table>`
    : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:0;background-color:#F8F4EC;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #EFE7D8;border-radius:10px;overflow:hidden;">
      <tr><td align="center" style="background-color:#0B1A2E;padding:28px 32px;">
        <img src="${SITE_URL}/images/logo-light.png" alt="${SITE_NAME}" width="300" style="display:block;width:300px;max-width:82%;height:auto;border:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:2px;color:#F8F4EC;" />
      </td></tr>
      <tr><td style="padding:32px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:600;color:#0B1A2E;">${options.title}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#7A7468;padding-top:10px;">${options.intro}</div>
        ${rowsBlock}${ctaBlock}
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.6;color:#7A7468;">${options.note}</div>
      </td></tr>
      <tr><td align="center" style="background-color:#EFE7D8;padding:18px 32px;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.6;color:#7A7468;">
        Horkos Conseil - cabinet de conseil en gestion de patrimoine, Maroc.
      </td></tr>
    </table>
  </td></tr>
</table>`;
}
