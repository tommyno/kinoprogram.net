// The page scripts' shared work: keeping the build's times and day labels right as the clock moves on
import { dayLabel, formatDay, isPast, programNow } from './time.ts';

/** Marks started showing links (see ShowingLink) with data-past, which global.css greys out, and says so in their label. */
export function markPast(links: HTMLElement[]): void {
  const now = programNow();
  for (const link of links) {
    const past = isPast({ day: link.dataset.day!, minutes: Number(link.dataset.minutes) }, now);
    const label = (link.dataset.label ??= link.getAttribute('aria-label')!);
    link.toggleAttribute('data-past', past);
    link.setAttribute('aria-label', past ? `${label} (startet)` : label);
  }
}

/**
 * The day sections (data-day-section) are labelled at build time; in case Oslo has passed midnight since, drops the
 * days that are over and labels the rest again.
 */
export function relabelDays(): void {
  const today = programNow().day;
  for (const section of document.querySelectorAll<HTMLElement>('[data-day-section]')) {
    const day = section.dataset.daySection!;
    if (day < today) {
      section.remove();
      continue;
    }
    const label = dayLabel(day, today);
    section.querySelector('[data-day-label]')!.textContent = label;
    section.querySelector<HTMLElement>('[data-date]')!.hidden = label === formatDay(day);
  }
}

/** Labels the days again and greys out started showings, now and every minute. Returns the showing links. */
export function keepDaysCurrent(): HTMLElement[] {
  relabelDays();
  const links = [...document.querySelectorAll<HTMLElement>('[data-minutes]')];
  markPast(links);
  setInterval(() => markPast(links), 60_000);
  return links;
}
