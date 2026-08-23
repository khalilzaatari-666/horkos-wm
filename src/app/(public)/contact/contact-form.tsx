"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Send } from "lucide-react";
import { AnimateIn } from "@/components/ui/animate-in";
import { PhoneInput } from "@/components/ui/phone-input";
import { submitContact, type ContactState } from "./actions";
import { contactSubjectOptions } from "@/lib/contact-options";
import {
  validateName,
  formatNameInput,
  validateEmail,
  validatePhoneNational,
  composePhone,
  MESSAGE_MAX,
} from "@/lib/validation";
import { DEFAULT_ISO, getCountry, nationalLengths } from "@/lib/countries";

const initialState: ContactState = { status: "idle" };

const inputBase =
  "h-11 w-full min-w-0 px-3.5 text-[14px] bg-white border rounded-lg outline-none transition-colors";

function fieldBorder(error?: string) {
  return error ? "border-red-500 focus:border-red-500" : "border-cream-deep focus:border-bronze";
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initialState);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [iso, setIso] = useState(DEFAULT_ISO);
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState<string>(contactSubjectOptions[0]);
  const [message, setMessage] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  }>({});

  const country = getCountry(iso);
  const composedPhone = composePhone(country.dial, phone);

  // Validité globale : ce qui garde le bouton d'envoi désactivé tant que le
  // formulaire n'est pas complet. Le serveur revérifie tout de toute façon.
  const formValid =
    validateName(name, "Le nom") === null &&
    validateEmail(email) === null &&
    validatePhoneNational(phone, nationalLengths(iso)) === null &&
    message.trim().length >= 10;

  // Remonte la page vers la confirmation une fois le message envoyé.
  useEffect(() => {
    if (state.status === "success") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state.status]);

  if (state.status === "success") {
    return (
      <AnimateIn variant="reveal-up">
        <div className="bg-cream border border-cream-deep rounded-lg p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-2.5">
            <span className="w-9 h-9 rounded-full bg-bronze/15 text-bronze-dark flex items-center justify-center shrink-0">
              <Check className="w-4.5 h-4.5" />
            </span>
            <h2 className="font-heading text-[21px] font-semibold text-ink leading-tight">
              Message bien reçu
            </h2>
          </div>
          <p className="text-[13.5px] text-warm-grey leading-[1.65]">
            Merci de nous avoir écrit. Notre équipe vous répond dans les meilleurs délais, à
            l&apos;adresse que vous nous avez indiquée.
          </p>
        </div>
      </AnimateIn>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Nom complet */}
        <div>
          <label htmlFor="name" className="block text-[13px] font-medium text-ink mb-1.5">
            Nom complet <span className="text-bronze">*</span>
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(formatNameInput(e.target.value))}
            onBlur={() => setErrors((p) => ({ ...p, name: validateName(name, "Le nom") ?? undefined }))}
            placeholder="Votre nom"
            aria-required="true"
            aria-invalid={errors.name ? true : undefined}
            className={`${inputBase} ${fieldBorder(errors.name)}`}
          />
          {errors.name && <p className="text-[12px] text-red-600 mt-1.5">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-[13px] font-medium text-ink mb-1.5">
            Email <span className="text-bronze">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setErrors((p) => ({ ...p, email: validateEmail(email) ?? undefined }))}
            placeholder="votre@email.com"
            aria-required="true"
            aria-invalid={errors.email ? true : undefined}
            className={`${inputBase} ${fieldBorder(errors.email)}`}
          />
          {errors.email && <p className="text-[12px] text-red-600 mt-1.5">{errors.email}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {/* Téléphone */}
        <div>
          <label htmlFor="phone" className="block text-[13px] font-medium text-ink mb-1.5">
            Téléphone <span className="text-bronze">*</span>
          </label>
          <PhoneInput
            id="phone"
            iso={iso}
            onIsoChange={setIso}
            value={phone}
            onChange={setPhone}
            onBlur={() =>
              setErrors((p) => ({
                ...p,
                phone: validatePhoneNational(phone, nationalLengths(iso)) ?? undefined,
              }))
            }
            error={errors.phone}
          />
          {/* Valeur composée ("+212 612345678") réellement envoyée au serveur. */}
          <input type="hidden" name="phone" value={composedPhone} />
        </div>

        {/* Sujet */}
        <div>
          <label htmlFor="subject" className="block text-[13px] font-medium text-ink mb-1.5">
            Sujet <span className="text-bronze">*</span>
          </label>
          <div className="relative">
            <select
              id="subject"
              name="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`${inputBase} appearance-none pr-10 text-ink border-cream-deep focus:border-bronze cursor-pointer`}
            >
              {contactSubjectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-grey text-[10px]"
              aria-hidden="true"
            >
              ▼
            </span>
          </div>
        </div>
      </div>

      {/* Message */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <label htmlFor="message" className="block text-[13px] font-medium text-ink">
            Message <span className="text-bronze">*</span>
          </label>
          <span className="text-[11.5px] text-warm-grey tabular-nums">
            {message.length} / {MESSAGE_MAX}
          </span>
        </div>
        <textarea
          id="message"
          name="message"
          value={message}
          maxLength={MESSAGE_MAX}
          onChange={(e) => setMessage(e.target.value)}
          onBlur={() =>
            setErrors((p) => ({
              ...p,
              message:
                message.trim().length < 10 ? "Votre message est trop court." : undefined,
            }))
          }
          placeholder="Votre message..."
          rows={6}
          aria-required="true"
          aria-invalid={errors.message ? true : undefined}
          className={`w-full px-3.5 py-3 text-[14px] leading-[1.55] bg-white border rounded-lg outline-none transition-colors resize-y min-h-[140px] ${fieldBorder(
            errors.message
          )}`}
        />
        {errors.message && <p className="text-[12px] text-red-600 mt-1.5">{errors.message}</p>}
      </div>

      {state.status === "error" && state.message && (
        <p className="text-[13px] text-red-600 leading-[1.5]" role="alert">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!formValid || pending}
        className="inline-flex items-center justify-center gap-2 h-12 w-full text-[14px] font-medium bg-bronze text-white rounded-lg transition-colors hover:bg-bronze-dark disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-4 h-4" aria-hidden="true" />
        {pending ? "Envoi en cours…" : "Envoyer le message"}
      </button>
    </form>
  );
}
