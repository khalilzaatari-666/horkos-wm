/** Shared by the contact form and its server action, so the two can't drift. */

export const contactSubjectOptions = [
  "Poser une question",
  "Partager une idée",
  "Donner un avis",
  "Préciser un besoin",
  "Proposer un partenariat",
  "Céder un actif",
] as const;

export type ContactSubject = (typeof contactSubjectOptions)[number];
