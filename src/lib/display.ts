// How the program reads on the page: labels, lists and how many times a list shows at first
import type { Film } from './program.ts';
import { formatDuration } from './time.ts';

/** Times shown per film in the Film view and per cinema in the Kino view before "+ N tider til". The Program script
 * moves them to the next few as showings start. */
export const COLLAPSED_COUNT = 3;

/** "+ 1 tid til", "+ 4 tider til". */
export function moreLabel(count: number): string {
  return `+ ${count} ${count === 1 ? 'tid' : 'tider'} til`;
}

/** "1 t 50 min · 12 år", or whichever of the two is known. */
export function filmMeta(film: Film): string {
  return [formatDuration(film.minutes), film.ageRating].filter(Boolean).join(' · ');
}

const listFormat = new Intl.ListFormat('nb', { type: 'conjunction' });

/** "Ingrid Bergman, Liv Ullmann og Lena Nyman", as the items and the commas and "og" between them, so each can be a link. */
export function listParts<T extends { name: string }>(items: T[]): (T | string)[] {
  let i = 0;
  return listFormat
    .formatToParts(items.map((item) => item.name))
    .map((part) => (part.type === 'element' ? items[i++] : part.value));
}
