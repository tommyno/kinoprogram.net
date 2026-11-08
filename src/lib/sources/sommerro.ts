import { htmlText } from '../html.ts';
import { fetchOk } from '../http.ts';
import { splitYear, venueProgram, type Program, type Source } from '../program.ts';
import { addDays, monthNumber, programNow } from '../time.ts';

// Sommerro: film evenings in the hotel's film room, each sold as a prepaid package with dinner, brunch or afternoon tea
// first. The film page lists every screening, one block each; booking is a widget on each series' page, so a showing
// links there. The time is when the package starts, which is when to arrive.
export const CINEMA = 'Sommerro';
const PAGE_URL = 'https://www.sommerrohouse.com/kultur/filmopplevelser/';
// "4. November kl 18:00 - 22:00"
const DATE = /(\d{1,2})\.\s*(\p{L}+)\s+kl\.?\s*(\d{1,2})[:.](\d{2})/u;

export type SommerroScreening = {
  title: string;
  year: number | null;
  synopsis: string;
  /** The series' page, where the package is booked. */
  url: string;
  /** Oslo local time: "2026-11-04T18:00:00". */
  start: string;
};

/** "4. November kl 18:00" as a start. The page has no year, so it is the first such date from a month ago on. */
export function parseDate(text: string, today: string): string | null {
  const m = text.match(DATE);
  const month = m && monthNumber(m[2]);
  if (!m || !month) return null;
  const date = `${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  let year = Number(today.slice(0, 4));
  if (`${year}-${date}` < addDays(today, -30)) year++;
  return `${year}-${date}T${m[3].padStart(2, '0')}:${m[4]}:00`;
}

/** The screenings on the film page. A block that doesn't read as one is left out. */
export function parsePage(html: string, today: string): SommerroScreening[] {
  // The program; the carousel above it repeats the series
  const start = html.indexOf('events-listing-block--big');
  if (start < 0) throw new Error('No program found on the Sommerro page');
  const blocks = html
    .slice(start)
    .split(/<div class="events-listing-block__items__item\b/)
    .slice(1);

  const screenings: SommerroScreening[] = [];
  for (const block of blocks) {
    const url = block.match(/<a href="([^"]+)" class="event-listing-root-link"/)?.[1];
    const name = block.match(/<p style="font-weight: 700;">(.*?)<\/p>/s)?.[1];
    const date = block.match(/__item__date[^>]*>(.*?)<\/span>/s)?.[1];
    const begins = date && parseDate(htmlText(date), today);
    if (!url || !name || !begins) continue;
    screenings.push({
      ...splitYear(htmlText(name)),
      synopsis: htmlText(block.match(/<p>(.*?)<\/p>/s)?.[1] ?? ''),
      url,
      start: begins,
    });
  }
  if (screenings.length === 0) throw new Error('No screenings found on the Sommerro page');
  return screenings;
}

/** The film room's screenings. Its posters are small and of unknown size, so a film gets TMDB's or none. */
export function sommerroProgram(screenings: SommerroScreening[]): Program {
  return venueProgram(
    CINEMA,
    CINEMA,
    screenings.map(({ url, ...screening }) => ({ ...screening, key: screening.start, pageUrl: url })),
  );
}

export const sommerro: Source = {
  name: CINEMA,
  homepage: PAGE_URL,
  file: 'sommerro.html',
  fetch: async () => (await fetchOk(CINEMA, PAGE_URL)).text(),
  program: (raw) => sommerroProgram(parsePage(raw, programNow().day)),
};
