import { UiStack } from "./ui-stack";

/**
 * Écran partagé des pages d'accès : le formulaire à gauche, l'espace client
 * qui attend à droite.
 */
export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell grid gap-12 py-10 lg:grid-cols-2 lg:gap-16 lg:py-14 lg:min-h-[calc(100svh-84px)]">
      <div className="flex flex-col justify-center">{children}</div>
      <div className="hidden lg:flex lg:flex-col lg:justify-center">
        <UiStack compact image="/images/pages/connexion.jpg" />
      </div>
    </div>
  );
}
