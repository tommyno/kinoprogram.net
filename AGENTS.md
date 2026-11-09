# Notes for coding agents

Kinoprogram for Oslo is a static Astro site. Every page is built from the program the sources return at build time;
the browser scripts only update times, labels and toggles. See README.md for the sources.

## Commands

- `pnpm dev`: the dev server on port 3000 (`astro dev --background` to run it in the background)
- `pnpm test`, `pnpm check`: tests and type check. `pnpm build` runs the tests first, so a failing test stops the
  Vercel deploy
- `pnpm format`: Biome formats, sorts imports and applies safe lint fixes; `pnpm lint` reports what is left

## Before committing

Run `pnpm format`, then `pnpm lint`, and commit only when both are clean. Nothing checks this later.

## Layout

- `src/lib/sources/`: one file per source, each exporting a `Source` and listed in `index.ts`, with a test against
  the saved response in `tests/fixtures/` (`pnpm fixture` refreshes them). A source for one venue reads its data
  into screenings and hands them to `venueProgram`
- `src/lib/`: the program model (`program.ts`), fetching (`source.ts`, `http.ts`), dates (`time.ts`), labels and
  lists for the pages (`display.ts`) and the page scripts' shared code (`browser.ts`)
- `src/components/`: one folder per component, with its CSS module
- `src/pages/`: thin routes that hand over to a page component

## Conventions

- `type`, never `interface`
- CSS modules, never `composes`: share with a variable or a global rule in `src/styles/global.css`, or repeat it
- Monochrome design: black, white and greys
- The site is in Norwegian; code, comments and build messages are in English
- Keep it simple: no edge-case logic that wasn't asked for
