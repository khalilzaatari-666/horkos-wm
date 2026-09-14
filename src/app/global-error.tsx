"use client";

/**
 * Dernier recours : le layout racine lui-même a échoué, donc ni police, ni
 * Tailwind, ni composants. Tout est en ligne pour rester lisible quoi qu'il
 * arrive - et sobre, pour ne pas jurer avec la charte.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F4EC",
          color: "#0B1A2E",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textAlign: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <p style={{ color: "#A9784F", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", margin: 0 }}>
            Horkos Wealth Management
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 600, margin: "16px 0 12px" }}>Une erreur est survenue</h1>
          <p style={{ color: "#7A7468", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            Le site n&apos;a pas pu s&apos;afficher. Réessayez dans un instant.
          </p>
          {error.digest && (
            <p style={{ color: "#7A7468", fontSize: 12, marginTop: 8 }}>Réf. {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 28,
              padding: "12px 24px",
              background: "#A9784F",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
