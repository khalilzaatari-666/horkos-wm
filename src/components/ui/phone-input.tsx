"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, SUGGESTED_ISO, getCountry, flagOf, normalise } from "@/lib/countries";

interface PhoneInputProps {
  id: string;
  /** ISO 3166-1 alpha-2 of the selected country. */
  iso: string;
  onIsoChange: (iso: string) => void;
  /** National number, as typed — the dial code is not part of it. */
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
}

const suggested = SUGGESTED_ISO.map((iso) => getCountry(iso));

export function PhoneInput({
  id,
  iso,
  onIsoChange,
  value,
  onChange,
  onBlur,
  error,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const country = getCountry(iso);
  const hasError = Boolean(error);

  const results = useMemo(() => {
    const q = normalise(query.trim());
    if (!q) return null;
    const digits = q.replace(/\D/g, "");
    return COUNTRIES.filter(
      (c) =>
        normalise(c.name).includes(q) ||
        (digits.length > 0 && c.dial.replace(/\D/g, "").startsWith(digits))
    );
  }, [query]);

  // Every exit path clears the search, so the panel never reopens on a stale
  // filter. Doing it here rather than in an effect keeps the close atomic.
  const close = () => {
    setOpen(false);
    setQuery("");
  };

  // Outside click and Escape, the two ways people expect to bail out.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const select = (nextIso: string) => {
    onIsoChange(nextIso);
    close();
  };

  const borderColour = hasError ? "border-red-500" : "border-cream-deep";

  // Morocco appears in both groups, so the key needs the group to stay unique.
  const renderOption = (c: (typeof COUNTRIES)[number], group = "all") => (
    <button
      key={`${group}-${c.iso}`}
      type="button"
      role="option"
      aria-selected={c.iso === iso}
      onClick={() => select(c.iso)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors cursor-pointer ${
        c.iso === iso
          ? "bg-cream-deep text-ink font-medium"
          : "bg-white text-charcoal hover:bg-cream"
      }`}
    >
      <span className="text-[16px] leading-none">{flagOf(c.iso)}</span>
      <span className="flex-1 truncate">{c.name}</span>
      <span className="text-warm-grey tabular-nums">{c.dial}</span>
    </button>
  );

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex">
        <button
          type="button"
          onClick={() => (open ? close() : setOpen(true))}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Indicatif pays : ${country.name} ${country.dial}`}
          className={`h-11 shrink-0 flex items-center gap-1.5 px-3 bg-white border ${borderColour} border-r-0 rounded-l-lg text-[14px] text-ink outline-none transition-colors hover:bg-cream/60 focus:border-bronze cursor-pointer`}
        >
          <span className="text-[17px] leading-none">{flagOf(country.iso)}</span>
          <span className="tabular-nums">{country.dial}</span>
          <span
            className={`text-warm-grey text-[10px] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>

        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="6 12 34 56 78"
          aria-required="true"
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`h-11 w-full min-w-0 px-3.5 text-[14px] bg-white border ${borderColour} rounded-r-lg outline-none transition-colors ${
            hasError ? "focus:border-red-500" : "focus:border-bronze"
          }`}
        />
      </div>

      {/* Opaque on purpose: the panel overlaps the fields below, so every layer
          paints its own background rather than letting them show through. */}
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1.5 w-[290px] max-w-[calc(100vw-3.5rem)] bg-white border border-cream-deep rounded-lg shadow-2xl overflow-hidden">
          <div className="p-2 bg-white border-b border-cream-deep">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un pays ou un indicatif"
              aria-label="Rechercher un pays"
              className="w-full h-9 px-2.5 text-[13px] bg-cream border border-cream-deep rounded-md outline-none focus:border-bronze transition-colors"
            />
          </div>

          <div className="max-h-[236px] overflow-y-auto overscroll-contain bg-white" role="listbox">
            {results ? (
              results.length > 0 ? (
                results.map((c) => renderOption(c, "search"))
              ) : (
                <p className="px-3 py-4 bg-white text-[12.5px] text-warm-grey text-center">
                  Aucun pays ne correspond.
                </p>
              )
            ) : (
              <>
                <div role="group" aria-label="Pays fréquents">
                  <div className="px-3 pt-2 pb-1 bg-white text-[10.5px] font-semibold tracking-[1.2px] uppercase text-warm-grey">
                    Fréquents
                  </div>
                  {suggested.map((c) => renderOption(c, "top"))}
                </div>
                <div role="group" aria-label="Tous les pays">
                  <div className="px-3 pt-3 pb-1 bg-white text-[10.5px] font-semibold tracking-[1.2px] uppercase text-warm-grey border-t border-cream-deep mt-1">
                    Tous les pays
                  </div>
                  {COUNTRIES.map((c) => renderOption(c, "all"))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="text-[12px] text-red-600 mt-1.5 leading-[1.45]">
          {error}
        </p>
      )}
    </div>
  );
}
