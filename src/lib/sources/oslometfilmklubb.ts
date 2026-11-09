import { decodeEntities, htmlText } from '../html.ts';
import { fetchOk } from '../http.ts';
import { type Program, type Source, splitYear, venueProgram } from '../program.ts';
import { monthNumber } from '../time.ts';

// OsloMet Filmklubb: the student film club's screenings in Lille Auditorium at P32. Its RSS feed lists the upcoming
// screenings with only a date, so each screening's own page is fetched too, for the time and the film's details.
export const CINEMA = 'OsloMet Filmklubb';
const SITE = 'https://oslometfilmklubb.no';
const FEED_URL = `${SITE}/visninger/index.xml`;
// "06 November 2026\n- 16:30"
const TIME = /<strong>Tid:<\/strong>\s*(\d{1,2})\.?\s+(\p{L}+)\s+(\d{4})\s*-\s*(\d{1,2})[:.](\d{2})/u;

export type OsloMetScreening = {
  title: string;
  year: number | null;
  minutes: number | null;
  ageRating: string | null;
  synopsis: string;
  /** The screening's page. */
  url: string;
  /** Oslo local time: "2026-11-06T16:30:00". */
  start: string;
};

/** A row of the film's table on the page: "Spilletid:" → "134 min". */
function row(html: string, label: string): string | null {
  const value = html.match(new RegExp(`<td>${label}:</td><td>(.*?)</td>`, 's'))?.[1];
  return value ? htmlText(value) : null;
}

/** The screening on its page, or null for a page that doesn't read as one. */
export function parsePage(html: string): OsloMetScreening | null {
  const heading = html.match(/<h1 class=post-title><a href=([^\s>]+)>(.*?)<\/a>/s);
  const time = html.match(TIME);
  const month = time && monthNumber(time[2]);
  if (!heading || !time || !month) return null;
  const minutes = row(html, 'Spilletid')?.match(/^(\d+)/)?.[1];
  const date = `${time[3]}-${String(month).padStart(2, '0')}-${time[1].padStart(2, '0')}`;
  return {
    ...splitYear(htmlText(heading[2])),
    minutes: minutes ? Number(minutes) : null,
    ageRating: row(html, 'Aldersgrense'),
    synopsis: decodeEntities(html.match(/<meta name=description content="(.*?)">/s)?.[1] ?? '').trim(),
    url: heading[1],
    start: `${date}T${time[4].padStart(2, '0')}:${time[5]}:00`,
  };
}

/**
 * The club's screenings in Lille Auditorium, one room, with entry at the door for members. The page's posters are
 * TMDB's originals, so a film gets TMDB's poster from the lookup instead.
 */
export function osloMetProgram(pages: string[]): Program {
  return venueProgram(
    CINEMA,
    CINEMA,
    pages.flatMap((page) => {
      const screening = parsePage(page);
      return screening ? [{ ...screening, key: screening.url, pageUrl: screening.url }] : [];
    }),
  );
}

/** The feed's screening pages, as a JSON list of their HTML. */
async function fetchPages(): Promise<string> {
  const feed = await (await fetchOk(CINEMA, FEED_URL)).text();
  const links = [...feed.matchAll(/<item>.*?<link>(.*?)<\/link>/gs)].map(([, link]) => link.trim());
  return JSON.stringify(await Promise.all(links.map(async (link) => (await fetchOk(CINEMA, link)).text())));
}

export const osloMetFilmklubb: Source = {
  name: CINEMA,
  homepage: `${SITE}/visninger/`,
  file: 'oslometfilmklubb.json',
  fetch: fetchPages,
  program: (raw) => osloMetProgram(JSON.parse(raw)),
};
