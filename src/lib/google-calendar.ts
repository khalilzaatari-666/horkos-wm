import "server-only";

import { JWT } from "google-auth-library";

/**
 * Google Calendar - création de l'événement du rendez-vous, avec son lien Meet
 * pour les visios.
 *
 * Un compte de service ne possède aucune licence Meet en propre : il agit au
 * nom d'un compte du domaine (délégation à l'échelle du domaine, autorisée
 * depuis la console d'administration). D'où `subject` sur le JWT.
 *
 * Contrat d'échec identique au reste de la réservation : toute erreur rend
 * `null` et se contente d'un log. Une panne Google ne doit jamais coûter un
 * créneau - le rendez-vous est pris, le conseiller enverra le lien à la main.
 */

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const TIMEOUT_MS = 8000;
const TZ = "Africa/Casablanca";

export interface CalendarEvent {
  eventId: string;
  /** Lien Meet, seulement pour une visio et si Google l'a bien créé. */
  meetLink: string | null;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
}

function config() {
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  const subject = process.env.GOOGLE_CALENDAR_SUBJECT;
  if (!clientEmail || !privateKey || !subject) return null;
  return {
    clientEmail,
    // Les variables d'environnement transportent les retours à la ligne
    // échappés : sans cette restitution, la clé PEM est illisible.
    privateKey: privateKey.replace(/\\n/g, "\n"),
    subject,
  };
}

export function calendarConfigured(): boolean {
  return config() !== null;
}

async function accessToken(): Promise<string | null> {
  const conf = config();
  if (!conf) return null;

  try {
    const jwt = new JWT({
      email: conf.clientEmail,
      key: conf.privateKey,
      scopes: SCOPES,
      // L'impersonation : c'est ce compte du domaine qui « possède »
      // l'événement, et sur l'agenda duquel il apparaît.
      subject: conf.subject,
    });
    const { access_token } = await jwt.authorize();
    return access_token ?? null;
  } catch (error) {
    console.error("[calendar] jeton refusé:", error);
    return null;
  }
}

/**
 * Crée l'événement du rendez-vous. `withMeet` demande en plus une conférence
 * Google Meet - c'est `conferenceDataVersion=1` qui autorise Google à en
 * générer une ; sans ce paramètre, la demande est ignorée en silence.
 */
export async function createAppointmentEvent(options: {
  summary: string;
  description: string;
  startIso: string;
  durationMin: number;
  attendees: EventAttendee[];
  location?: string;
  withMeet: boolean;
}): Promise<CalendarEvent | null> {
  const token = await accessToken();
  if (!token) return null;

  const start = new Date(options.startIso);
  const end = new Date(start.getTime() + options.durationMin * 60_000);

  const body: Record<string, unknown> = {
    summary: options.summary,
    description: options.description,
    start: { dateTime: start.toISOString(), timeZone: TZ },
    end: { dateTime: end.toISOString(), timeZone: TZ },
    attendees: options.attendees.map((a) => ({
      email: a.email,
      displayName: a.displayName,
    })),
    reminders: { useDefault: true },
  };

  if (options.location) body.location = options.location;
  if (options.withMeet) {
    body.conferenceData = {
      createRequest: {
        // Doit être unique par demande : Google déduplique dessus.
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  try {
    // `sendUpdates=none` : c'est notre email de confirmation, à la charte du
    // cabinet, qui prévient le client - pas l'invitation générique de Google.
    // L'événement apparaît malgré tout dans les agendas des participants.
    const url = `${API}?conferenceDataVersion=1&sendUpdates=none`;
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("[calendar] création refusée:", response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as {
      id?: string;
      hangoutLink?: string;
      conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
    };
    if (!data.id) return null;

    const videoEntry = data.conferenceData?.entryPoints?.find(
      (e) => e.entryPointType === "video"
    );

    return {
      eventId: data.id,
      meetLink: data.hangoutLink ?? videoEntry?.uri ?? null,
    };
  } catch (error) {
    console.error("[calendar] création impossible:", error);
    return null;
  }
}

/**
 * Ajoute le conseiller à l'événement une fois qu'on sait lequel a été assigné -
 * `book_slot` ne le révèle qu'après la réservation, et l'événement doit exister
 * avant pour porter le lien Meet.
 */
export async function addEventAttendee(
  eventId: string,
  attendees: EventAttendee[]
): Promise<void> {
  const token = await accessToken();
  if (!token) return;

  try {
    const current = await fetch(`${API}/${encodeURIComponent(eventId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!current.ok) return;

    const event = (await current.json()) as { attendees?: EventAttendee[] };
    const merged = [...(event.attendees ?? [])];
    for (const attendee of attendees) {
      if (!merged.some((a) => a.email?.toLowerCase() === attendee.email.toLowerCase())) {
        merged.push(attendee);
      }
    }

    await fetch(`${API}/${encodeURIComponent(eventId)}?sendUpdates=none`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ attendees: merged }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[calendar] ajout du conseiller impossible:", eventId, error);
  }
}

/**
 * Retire un événement de l'agenda : une réservation finalement échouée, ou une
 * relance annulée. Silencieux comme le reste du module - un événement resté en
 * trop se corrige à la main, il ne doit pas faire échouer l'acte qui l'efface.
 */
export async function deleteAppointmentEvent(eventId: string): Promise<void> {
  const token = await accessToken();
  if (!token) return;

  try {
    await fetch(`${API}/${encodeURIComponent(eventId)}?sendUpdates=none`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    console.error("[calendar] suppression impossible (événement orphelin):", eventId, error);
  }
}

/**
 * Pose le pense-bête de relance dans l'agenda.
 *
 * Ce n'est pas un rendez-vous : personne n'est convoqué, rien n'est à confirmer.
 * D'où l'absence de Meet, et des rappels explicites (une notification la veille,
 * une à l'heure dite) plutôt que ceux de l'agenda - le conseiller a demandé à
 * être prévenu à une date précise, pas trente minutes avant.
 *
 * Même contrat d'échec que le reste du module : `null` et un log. L'email de
 * l'échéance reste la garantie ; l'agenda n'est qu'un confort de plus.
 */
export async function createReminderEvent(options: {
  summary: string;
  description: string;
  startIso: string;
  durationMin: number;
  attendees: EventAttendee[];
}): Promise<string | null> {
  const token = await accessToken();
  if (!token) return null;

  const start = new Date(options.startIso);
  const end = new Date(start.getTime() + options.durationMin * 60_000);

  try {
    const response = await fetch(`${API}?sendUpdates=none`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: options.summary,
        description: options.description,
        start: { dateTime: start.toISOString(), timeZone: TZ },
        end: { dateTime: end.toISOString(), timeZone: TZ },
        attendees: options.attendees.map((a) => ({
          email: a.email,
          displayName: a.displayName,
        })),
        // Interne au cabinet : l'événement ne dit rien d'un dossier client à
        // qui consulterait l'agenda partagé.
        visibility: "private",
        transparency: "transparent",
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 0 },
            { method: "popup", minutes: 24 * 60 },
          ],
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error("[calendar] rappel refusé:", response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as { id?: string };
    return data.id ?? null;
  } catch (error) {
    console.error("[calendar] rappel impossible:", error);
    return null;
  }
}

/** Une plage où l'agenda est pris, en millisecondes epoch. */
export interface Occupation {
  debut: number;
  fin: number;
}

interface AgendaItem {
  id?: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
}

/**
 * Les événements qui rendent réellement l'agenda indisponible. Ne bloquent pas :
 * un événement annulé, marqué « Disponible » (dont les pense-bêtes de relance),
 * une invitation déclinée, ni ceux de `ignorer` - les rendez-vous de l'app, que
 * Postgres compte déjà conseiller par conseiller.
 */
export function occupationsDe(items: AgendaItem[], ignorer: Set<string>): Occupation[] {
  const out: Occupation[] = [];
  for (const e of items) {
    if (e.status === "cancelled" || e.transparency === "transparent") continue;
    if (e.id && ignorer.has(e.id)) continue;
    if (e.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;
    // ponytail: une journée entière est lue à minuit UTC ; le décalage de
    // Casablanca ne déplace le bord que d'une heure, la nuit, hors des heures
    // d'ouverture. Passer par le fuseau si la grille ouvre un jour la nuit.
    const debut = Date.parse(e.start?.dateTime ?? `${e.start?.date}T00:00:00Z`);
    const fin = Date.parse(e.end?.dateTime ?? `${e.end?.date}T00:00:00Z`);
    if (Number.isFinite(debut) && Number.isFinite(fin)) out.push({ debut, fin });
  }
  return out;
}

/** Le créneau `[debut, debut + dureeMin)` croise-t-il une plage prise ? */
export function chevauche(debutIso: string, dureeMin: number, occupations: Occupation[]): boolean {
  const debut = Date.parse(debutIso);
  const fin = debut + dureeMin * 60_000;
  return occupations.some((o) => o.debut < fin && o.fin > debut);
}

/**
 * Les plages prises de l'agenda du compte délégué (celui de l'admin) entre deux
 * instants. Lu par `events.list`, que le scope `calendar.events` autorise déjà :
 * freeBusy demanderait un scope de plus, et ne saurait pas écarter les
 * rendez-vous de l'app.
 *
 * `null` si Google n'est pas configuré ou ne répond pas : l'appelant ne filtre
 * alors rien, une panne Google ne doit jamais coûter un créneau.
 */
export async function agendaOccupe(
  fromIso: string,
  toIso: string,
  ignorer: Set<string>
): Promise<Occupation[] | null> {
  const token = await accessToken();
  if (!token) return null;

  const params = new URLSearchParams({
    timeMin: new Date(fromIso).toISOString(),
    timeMax: new Date(toIso).toISOString(),
    singleEvents: "true",
    maxResults: "2500",
    fields: "items(id,status,transparency,start,end,attendees(self,responseStatus))",
  });

  try {
    const response = await fetch(`${API}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error("[calendar] lecture de l'agenda refusée:", response.status, await response.text());
      return null;
    }
    const data = (await response.json()) as { items?: AgendaItem[] };
    return occupationsDe(data.items ?? [], ignorer);
  } catch (error) {
    console.error("[calendar] lecture de l'agenda impossible:", error);
    return null;
  }
}
