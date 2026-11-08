import { z } from 'zod';
import { fetchOk } from '../http.ts';
import { venueProgram, type Program, type Source } from '../program.ts';

// Revier Film Club: free screenings at the Revier hotel, Kongens gate 5. Its program is only on Eventbrite, one event per
// screening, and the organizer page holds the upcoming events as JSON.
const NAME = 'Revier';
const ORGANIZER_URL = 'https://www.eventbrite.com/o/revier-117564493841';
export const CINEMA = 'Revier Film Club';
// "Catch Me If You Can (2002, 2t 21m)"
const TITLE = /^(.*?)\s*\((\d{4})(?:,\s*(?:(\d+)\s*t)?\s*(?:(\d+)\s*m)?)?\)\s*$/;

export const RawEvent = z.object({
  id: z.string(),
  name: z.string(),
  // Event page, where the free tickets are booked
  url: z.string(),
  // Oslo local time: "2026-11-04" and "18:00:00"
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}/),
  is_cancelled: z.boolean().nullish(),
  is_online_event: z.boolean().nullish(),
});
export type RawEvent = z.infer<typeof RawEvent>;

const PageProps = z.object({
  upcomingEventsFailed: z.boolean().nullish(),
  upcomingEvents: z.array(z.unknown()),
});

/** The upcoming events from the organizer page's Next.js data, as JSON. */
export function upcomingEvents(html: string): string {
  const json = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s)?.[1];
  if (!json) throw new Error('No events found on the Eventbrite page');
  const page = PageProps.parse(JSON.parse(json).props.pageProps);
  if (page.upcomingEventsFailed) throw new Error('Eventbrite failed to load the events');
  return JSON.stringify(page.upcomingEvents);
}

/** "Drive (2011, 1t 40m)" → title, year and length. Any other name is kept whole as the title. */
export function parseName(name: string): { title: string; year: number | null; minutes: number | null } {
  const m = name.trim().match(TITLE);
  if (!m) return { title: name.trim(), year: null, minutes: null };
  return { title: m[1], year: Number(m[2]), minutes: Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0) || null };
}

/** The film club's screenings, in one room. The events have no posters, so a film gets TMDB's or none. */
export function revierProgram(events: RawEvent[]): Program {
  return venueProgram(
    NAME,
    CINEMA,
    events
      .filter((event) => !event.is_cancelled && !event.is_online_event)
      .map((event) => ({
        ...parseName(event.name),
        key: event.id,
        start: `${event.start_date}T${event.start_time}`,
        pageUrl: event.url,
      })),
  );
}

export const revier: Source = {
  name: NAME,
  homepage: ORGANIZER_URL,
  file: 'revier.json',
  fetch: async () => upcomingEvents(await (await fetchOk(NAME, ORGANIZER_URL)).text()),
  program: (raw) => revierProgram(z.array(RawEvent).parse(JSON.parse(raw))),
};
