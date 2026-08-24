"use client";

/**
 * Bouton de soumission qui demande confirmation avant de laisser le formulaire
 * partir. Sert aux actions destructrices du back-office (suppression de contenu)
 * sans transformer chaque ligne en composant à état.
 */
export function ConfirmButton({
  message,
  children,
  className,
}: {
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
