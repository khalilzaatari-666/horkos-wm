"use client";

import { useState, useTransition } from "react";
import { AdminBadge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/confirm-button";

export interface DemandeLigneData {
  id: string;
  /** Qui écrit. */
  nom: string;
  /** Société, pour une demande de partenariat. */
  soustitre: string | null;
  /** Objet du message, ou spécialité du partenaire. */
  objet: string | null;
  /** Le corps, révélé au dépliage. */
  message: string | null;
  email: string;
  telephone: string | null;
  /** Déjà formatés côté serveur : aucune date ne se calcule dans le navigateur. */
  recuLe: string;
  recuRelatif: string;
  /** Personne dans l'équipe ne l'a encore ouverte. */
  nonLue: boolean;
  statut: { label: string; tone: "attente" | "info" | "succes" | "refus" };
  /** Les gestes offerts depuis le statut courant. */
  transitions: { vers: string; label: string }[];
  /** Objet pré-rempli du `mailto:` de réponse. */
  sujetReponse: string;
}

/** Assez pour reconnaître le message sans le déplier, pas assez pour le lire. */
const APERCU = 110;

function apercu(message: string | null): string {
  if (!message) return "";
  const plat = message.replace(/\s+/g, " ").trim();
  return plat.length > APERCU ? `${plat.slice(0, APERCU)}…` : plat;
}

/**
 * Une demande entrante, repliée par défaut.
 *
 * Le dépliage est ce qui vaut lecture : c'est le moment où quelqu'un a le
 * message sous les yeux. L'état part aussitôt en base, où il vaut pour toute
 * l'équipe - la pastille d'un collègue tombe aussi. Sans ça, trois personnes
 * liraient le même message pendant qu'une quatrième reste sur le carreau.
 *
 * La pastille disparaît immédiatement en local, sans attendre le serveur : le
 * geste est sans risque - on ne peut que passer de « non lu » à « lu » - et une
 * demi-seconde d'attente sur un simple accusé de lecture se remarquerait.
 */
export function DemandeLigne({
  data,
  marquerLue,
  changerStatut,
  supprimer,
}: {
  data: DemandeLigneData;
  marquerLue: (id: string) => Promise<void>;
  changerStatut: (formData: FormData) => void;
  supprimer: (formData: FormData) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [nonLue, setNonLue] = useState(data.nonLue);
  const [, startTransition] = useTransition();

  const basculer = () => {
    const ouvre = !ouvert;
    setOuvert(ouvre);
    // Seulement à la première ouverture : replier puis rouvrir ne relance rien.
    if (ouvre && nonLue) {
      setNonLue(false);
      startTransition(() => {
        void marquerLue(data.id);
      });
    }
  };

  const regionId = `demande-${data.id}`;

  return (
    <li className="border-b border-cream-deep last:border-b-0">
      <button
        type="button"
        onClick={basculer}
        aria-expanded={ouvert}
        aria-controls={regionId}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-cream/50 transition-colors cursor-pointer"
      >
        {/* La colonne de pastille garde sa largeur même vide : sans ça, les
            lignes se décalent horizontalement au fur et à mesure des lectures. */}
        <span className="shrink-0 w-2 mt-[7px]">
          {nonLue && (
            <span
              aria-hidden="true"
              className="block w-2 h-2 rounded-full bg-red-500"
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className={`text-[13.5px] text-ink ${nonLue ? "font-semibold" : "font-medium"}`}>
              {data.nom}
              {nonLue && <span className="sr-only"> (non lue)</span>}
            </span>
            {data.soustitre && (
              <span className="text-[12px] text-warm-grey">{data.soustitre}</span>
            )}
            {data.objet && (
              <span className="text-[12.5px] text-charcoal">· {data.objet}</span>
            )}
          </span>
          {!ouvert && data.message && (
            <span className="block text-[12px] text-warm-grey leading-[1.5] mt-0.5 truncate">
              {apercu(data.message)}
            </span>
          )}
        </span>

        <span className="shrink-0 flex items-center gap-2.5">
          <AdminBadge tone={data.statut.tone}>{data.statut.label}</AdminBadge>
          <span className="text-[11.5px] text-warm-grey whitespace-nowrap">
            {data.recuRelatif}
          </span>
          <span
            aria-hidden="true"
            className={`text-warm-grey text-[11px] transition-transform ${ouvert ? "rotate-90" : ""}`}
          >
            ›
          </span>
        </span>
      </button>

      {ouvert && (
        <div id={regionId} className="px-4 pb-4 pl-9">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] mb-3">
            <a
              href={`mailto:${data.email}?subject=${encodeURIComponent(data.sujetReponse)}`}
              className="text-bronze-dark hover:text-bronze font-medium transition-colors"
            >
              Répondre à {data.email}
            </a>
            {data.telephone && (
              <a
                href={`tel:${data.telephone}`}
                className="text-warm-grey hover:text-bronze transition-colors tabular-nums"
              >
                {data.telephone}
              </a>
            )}
            <span className="text-warm-grey">{data.recuLe}</span>
          </div>

          {data.message ? (
            <p className="text-[13px] text-charcoal leading-[1.7] whitespace-pre-line max-w-[720px]">
              {data.message}
            </p>
          ) : (
            <p className="text-[12.5px] text-warm-grey">Aucun message joint.</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {data.transitions.map((t) => (
              <form key={t.vers} action={changerStatut}>
                <input type="hidden" name="id" value={data.id} />
                <input type="hidden" name="status" value={t.vers} />
                <button
                  type="submit"
                  className="h-8 px-3 text-[12.5px] font-medium text-charcoal bg-white border border-cream-deep rounded-lg hover:border-bronze hover:text-bronze-dark transition-colors cursor-pointer"
                >
                  {t.label}
                </button>
              </form>
            ))}
            <form action={supprimer}>
              <input type="hidden" name="id" value={data.id} />
              <ConfirmButton
                message={`Supprimer définitivement la demande de ${data.nom} ?`}
                className="text-[12.5px] text-warm-grey hover:text-red-600 transition-colors cursor-pointer"
              >
                Supprimer
              </ConfirmButton>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
