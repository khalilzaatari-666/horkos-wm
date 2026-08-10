"use client";

import { useEffect, useRef } from "react";

/** Must match Supabase → Authentication → Providers → Email → Email OTP Length. */
export const CODE_LENGTH = 6;

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Six boxes that behave like one field: typing advances, backspace retreats,
 * and a pasted code fills the whole row. The value is always the plain string,
 * so the parent never has to reassemble it.
 */
export function CodeInput({ value, onChange, disabled, autoFocus }: CodeInputProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) boxes.current[0]?.focus();
  }, [autoFocus]);

  const setDigit = (index: number, digit: string) => {
    const next = value.padEnd(CODE_LENGTH, " ").split("");
    next[index] = digit || " ";
    onChange(next.join("").trimEnd());
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setDigit(index, "");
      return;
    }

    // Typing over a filled box, or a code dropped into one: spread it forward.
    if (digits.length > 1) {
      const next = value.padEnd(CODE_LENGTH, " ").split("");
      digits
        .slice(0, CODE_LENGTH - index)
        .split("")
        .forEach((d, offset) => {
          next[index + offset] = d;
        });
      onChange(next.join("").trimEnd());
      boxes.current[Math.min(index + digits.length, CODE_LENGTH - 1)]?.focus();
      return;
    }

    setDigit(index, digits);
    if (index < CODE_LENGTH - 1) boxes.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      e.preventDefault();
      setDigit(index - 1, "");
      boxes.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      boxes.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      e.preventDefault();
      boxes.current[index + 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-between" role="group" aria-label={`Code à ${CODE_LENGTH} chiffres`}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          // Lets iOS and Chrome offer the code straight from the email.
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={CODE_LENGTH}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`Chiffre ${i + 1}`}
          className="w-full h-13 min-w-0 text-center font-heading text-[24px] text-ink bg-white border border-cream-deep rounded-lg outline-none focus:border-bronze focus:ring-2 focus:ring-bronze/20 disabled:opacity-60 transition-all"
        />
      ))}
    </div>
  );
}
