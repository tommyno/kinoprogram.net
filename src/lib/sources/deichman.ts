import { z } from 'zod';
import { fetchOk } from '../http.ts';
import { venueProgram, type Program, type Source } from '../program.ts';
import { minutesBetween, osloDateTime } from '../time.ts';

// The library's ticket shop (Hoopla) lists everything Deichman Bjørvika holds. One call returns every upcoming event.
const NAME = 'Deichman';
const SHOP = 'https://deichman.hoopla.no';
const EVENTS_URL = `${SHOP}/api/public/v3.0/organizations/915950447/events`;
export const CINEMA = 'Deichman Bjørvika';
// Screenings for booked kindergartens and schools are labelled "Utekino", so they are left out
const FILM_LABELS = ['Filmvisning', 'Film og samtale'];
// "Barnas kino: Miss Moxy. Lør kl. 14" → "Miss Moxy"
const TITLE_PREFIX = /^(Barnas kino|Film fra Sør|Film og samtale|Filmvisning):\s*/;
const TITLE_WEEKDAY = /\.\s*(man|tir|ons|tor|fre|lør|søn)\w*\.?\s+kl\b.*$/i;

export const RawEvent = z.object({
  event_id: z.number(),
  name: z.string(),
  // UTC, "2026-11-04T17:00:00Z"
  start: z.string(),
  end: z.string().nullable(),
  is_cancelled: z.boolean().nullable(),
  data: z.object({
    other_category_description: z.string().nullish(),
    location: z.object({ name: z.string() }).nullish(),
  }),
});
export type RawEvent = z.infer<typeof RawEvent>;

const Events = z.object({ events: z.array(RawEvent) });

export function filmTitle(name: string): string {
  return name.trim().replace(TITLE_PREFIX, '').replace(TITLE_WEEKDAY, '').trim();
}

/** "Kinoen, Deichman Bjørvika" → "Kinoen", "Deichman Bjørvika, Kinosalen i underetasjen" → "Kinosalen i underetasjen". */
export function shortScreen(location: string): string {
  return (
    location
      .split(/[,.]/)
      .map((part) => part.trim())
      .find((part) => part && part !== CINEMA) ?? ''
  );
}

/** The library's film screenings. The events have stills, not posters, so a film gets TMDB's poster or none. */
export function deichmanProgram(events: RawEvent[]): Program {
  return venueProgram(
    NAME,
    CINEMA,
    events
      .filter((event) => !event.is_cancelled && FILM_LABELS.includes(event.data.other_category_description ?? ''))
      .map((event) => ({
        key: String(event.event_id),
        title: filmTitle(event.name),
        minutes: event.end ? minutesBetween(new Date(event.start), new Date(event.end)) : null,
        start: osloDateTime(new Date(event.start)),
        screen: shortScreen(event.data.location?.name ?? ''),
        pageUrl: `${SHOP}/event/${event.event_id}`,
      })),
  );
}

export const deichman: Source = {
  name: NAME,
  homepage: 'https://deichman.no',
  file: 'deichman.json',
  fetch: async () => (await fetchOk(NAME, EVENTS_URL)).text(),
  program: (raw) => deichmanProgram(Events.parse(JSON.parse(raw)).events),
};
