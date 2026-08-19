/**
 * Générateur d'invitation ICS (RFC 5545), pur et testable.
 *
 * C'est lui qui fait « apparaître le rendez-vous dans le calendrier » sans
 * aucune API : joint à l'email en `METHOD:REQUEST`, Gmail, Outlook et Apple le
 * proposent à l'ajout — Google Calendar l'insère même de lui-même côté Gmail.
 */

export interface IcsEvent {
  /** Identifiant stable (l'id du rendez-vous) : rejouer l'email met à jour l'événement au lieu de le dupliquer. */
  uid: string;
  /** Début, ISO avec fuseau. */
  startIso: string;
  durationMin: number;
  summary: string;
  description?: string;
  /** Adresse du cabinet, ou lien de la visio. */
  location?: string;
  organizer: { name: string; email: string };
  attendees: { name: string; email: string }[];
}

/** `,` `;` et `\` se protègent, les sauts de ligne deviennent `\n` littéral. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Pliage RFC 5545 : 75 octets maximum par ligne, la suite indentée d'une
 * espace. En octets UTF-8, pas en caractères — un accent compte double, et un
 * pli au milieu d'un caractère multi-octets corromprait le fichier, donc on
 * plie caractère par caractère en comptant les octets.
 */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  // La première ligne a droit à 75 octets, les continuations à 74 (l'espace de
  // tête compte dans la limite).
  let budget = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > budget) {
      out.push(current);
      current = "";
      currentBytes = 0;
      budget = 74;
    }
    current += char;
    currentBytes += size;
  }
  if (current) out.push(current);

  return out.map((part, i) => (i === 0 ? part : ` ${part}`)).join("\r\n");
}

/** `2026-08-17T09:00:00+01:00` → `20260817T080000Z`. */
function toUtcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildIcs(event: IcsEvent): string {
  const start = new Date(event.startIso);
  const end = new Date(start.getTime() + event.durationMin * 60_000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Horkos Wealth Management//Rendez-vous//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${event.uid}@horkos-wm.com`,
    `DTSTAMP:${toUtcStamp(new Date().toISOString())}`,
    `DTSTART:${toUtcStamp(event.startIso)}`,
    `DTEND:${toUtcStamp(end.toISOString())}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    `ORGANIZER;CN=${escapeIcsText(event.organizer.name)}:mailto:${event.organizer.email}`,
    ...event.attendees.map(
      (a) =>
        `ATTENDEE;CN=${escapeIcsText(a.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`
    ),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // CRLF obligatoire : certains clients rejettent un ICS en LF nu.
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
