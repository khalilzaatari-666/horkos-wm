/**
 * Réexports pour les actions du CMS. La logique commune vit désormais dans
 * `@/lib/staff` (partagée avec la gestion des clients) ; on garde ici le nom
 * historique `ContentState` pour ne pas toucher aux imports existants.
 */
export { requireStaff, isUniqueViolation, type ActionState as ContentState } from "@/lib/staff";
