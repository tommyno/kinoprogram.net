import { fetchOk } from '../http.ts';
import { type Program, type Source, venueProgram } from '../program.ts';
import { programNow } from '../time.ts';

// The student film club at Chateau Neuf. Its site reads the semester's program from a spreadsheet, one row per screening.
export const CINEMA = 'Cinema Neuf';
const SITE = 'https://cinemaneuf.no';
// Screenings have no pages or ticket links of their own; the program page links to the tickets
const PROGRAM_URL = `${SITE}/html/program.html`;

export type NeufScreening = {
  /** Oslo local time, "2026-11-05T19:00:00". */
  start: string;
  title: string;
  year: number | null;
  minutes: number | null;
  description: string;
};

/** The semester's spreadsheet, as the club's own site finds it: "Spring" until July, then "Fall". */
export function programFileUrl(day: string = programNow().day): string {
  const year = day.slice(0, 4);
  const season = Number(day.slice(5, 7)) < 7 ? 'Spring' : 'Fall';
  return `${SITE}/semesters/${year}/${season}/Program_${season}_${year}.tsv`;
}

/** The rows with a date, time and title. Like the club's site, it shows every row, whatever its status column says. */
export function parseProgram(tsv: string): NeufScreening[] {
  const [header, ...lines] = tsv.split(/\r?\n/).map((line) => line.split('\t'));
  const screenings: NeufScreening[] = [];
  for (const cells of lines) {
    const row = Object.fromEntries(header.map((name, i) => [name, cells[i]?.trim() ?? '']));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !/^\d{1,2}:\d{2}$/.test(row.screeningStartTime) || !row.title)
      continue;
    screenings.push({
      start: `${row.date}T${row.screeningStartTime.padStart(5, '0')}:00`,
      title: row.title,
      year: Number(row.releaseYear) || null,
      // "92 min."
      minutes: Number(row.duration.match(/\d+/)?.[0]) || null,
      description: row.descriptionNor || row.descriptionEng,
    });
  }
  return screenings;
}

/** The spreadsheet has no posters or ticket links, and the club has one screen, Lillesalen. */
export function cinemaNeufProgram(screenings: NeufScreening[]): Program {
  return venueProgram(
    CINEMA,
    CINEMA,
    screenings.map(({ description, ...screening }) => ({
      ...screening,
      key: screening.start,
      synopsis: description,
      pageUrl: PROGRAM_URL,
    })),
  );
}

export const cinemaNeuf: Source = {
  name: CINEMA,
  homepage: SITE,
  file: 'cinemaneuf.tsv',
  fetch: async () => (await fetchOk(CINEMA, programFileUrl())).text(),
  program: (raw) => cinemaNeufProgram(parseProgram(raw)),
};
