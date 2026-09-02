/** Statuts d'une recommandation attribuée à un client, et leurs libellés. */
export const ASSIGNMENT_STATUS = [
  { value: "proposee", label: "À étudier", tone: "attente" as const },
  { value: "acceptee", label: "Acceptée", tone: "succes" as const },
  { value: "mise_en_place", label: "Mise en place", tone: "info" as const },
  { value: "rejetee", label: "Écartée", tone: "neutre" as const },
];

export function assignmentStatusLabel(value: string): string {
  return ASSIGNMENT_STATUS.find((s) => s.value === value)?.label ?? value;
}

export function assignmentStatusTone(value: string): "attente" | "succes" | "info" | "neutre" {
  return ASSIGNMENT_STATUS.find((s) => s.value === value)?.tone ?? "neutre";
}
