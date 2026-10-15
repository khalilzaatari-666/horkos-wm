import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Guide } from "@/lib/content";

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <Link href={`/ressources/guides/${guide.slug}`} className="group flex flex-col h-full">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-ink flex items-end p-8">
        {guide.cover_url ? (
          <Image
            src={guide.cover_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
          />
        ) : (
          <>
            <span aria-hidden="true" className="absolute -right-6 -top-10 font-heading font-light text-[16rem] leading-none text-navy">H</span>
            <span className="relative font-heading font-light text-cream text-[30px] leading-[1.1] tracking-[-0.02em]">
              {guide.cover_label ?? guide.title}
            </span>
          </>
        )}
      </div>

      <div className="flex flex-col flex-1 pt-6">
        {guide.partner && (
          <p className="text-[14px] text-warm-grey mb-2">
            Avec {guide.partner}
          </p>
        )}
        <h2 className="font-heading text-[24px] text-ink leading-[1.15]">
          {guide.title}
        </h2>
        {guide.description && (
          <p className="text-[15px] text-warm-grey leading-relaxed mt-2">{guide.description}</p>
        )}

        <span className="link-arrow mt-auto pt-5">
          Lire le guide <ArrowRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
