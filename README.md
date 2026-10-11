# Zikr — Digital Tasbeeh

An offline-first Progressive Web App for counting dhikr. Tap anywhere on the
screen, watch the bead strand move, and keep a quiet record of your practice.

Built with **SvelteKit (Svelte 5 runes)**, **Vite**, **Tailwind CSS v4** and
**Dexie** (IndexedDB). No backend, no accounts, no network calls.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build (static site in `build/`):

```bash
npm run build
npm run preview
```

The service worker needs a secure context, so use `localhost` or serve the
`build/` folder over HTTPS.

---

## Features

**Counting**
- Tap anywhere to count — the whole screen is the target, buttons are excluded.
- A 33-bead strand (11 / 33 / 99 selectable) rotates one bead per count, driven
  by a `svelte/motion` spring so it settles with physical weight.
- Per-dhikr target counts: presets, any number, or `∞` for free counting.
- Haptic tick on every count, a distinct double pattern when the target is met.

**Focus & hands-free**
- **Zen mode** strips the interface down to the beads, the number and a faint
  exit button (`Esc` also exits). Optionally launch straight into it.
- **Auto count** advances on a timer at 1–5 second intervals with start, pause
  and reset, and keeps working in zen mode.

**Celebration**
- Reaching a target triggers an ambient golden glow, expanding rings, radiating
  sparks, a pulsing crescent and a short banner.

**Customisation**
- Dark, light or system theme; pitch-black dark mode.
- Four backdrops (Girih, stars, waves, none) across four gradients.
- Four bead sounds synthesised with the Web Audio API — wood, mechanical, soft,
  silent — with a volume slider.

**Dhikr management**
- Seven traditional dhikr preloaded with Arabic, transliteration and meaning.
- Add, edit, reorder and delete your own; set a target for any of them.

**Statistics**
- Session count and lifetime totals, overall and per dhikr.
- Daily goal, current streak, best streak and active days.
- 18-week GitHub-style activity heatmap.
- 7 / 30 / 90-day trend charts.
- Export a full JSON backup, or history and daily CSV; re-import a JSON backup.

**PWA**
- Installable with a generated icon set (any + maskable), web manifest and a
  hand-written service worker: precached shell, cache-first assets,
  network-first navigation. It works fully offline once installed.

**Languages**
- English and Arabic, switchable from the header or Settings, remembered
  between sessions.
- Layout mirrors automatically: Arabic runs right-to-left, including the
  progress bar, sheets and charts.
- Dates and plurals follow each language — Arabic renders六月/يوليو on the
  heatmap and uses the correct one/two/few/many forms.
- Digitals stay Latin (`0-9`) in every language; see "Digits" below.

---

## Project layout

```
src/
  lib/
    components/     Beads, CountRing, Celebration, Heatmap, TrendChart, sheets…
    data/defaults.js   the seven built-in dhikr
    state/          settings, zikrs, session, stats, auto, pwa  (runes stores)
    utils/          date, sound, haptics, export/import
    db.js           Dexie schema (zikrs, logs)
  routes/
    +layout.svelte  theme bootstrap + service worker
    +page.svelte    the counter
static/
  manifest.webmanifest
  sw.js
  icons/            generated PNGs
scripts/
  generate-icons.mjs  draws and encodes the icons with no dependencies
  smoke.mjs           drives a headless Edge over CDP to test the built app
  shots.mjs           captures screenshots of every screen
```

### Data model

Counts are written to IndexedDB in five-minute buckets per dhikr, so the log
table stays small no matter how much you tap. Totals are maintained in memory
and reconciled from the database on launch, on tab focus, and after import.
Settings and the in-progress session live in `localStorage`.

---

## Languages

The interface is fully localised — there are no hard-coded strings in the
component layer.

```
src/lib/i18n/
  index.js          registry, key lookup, interpolation, plural selection
  format.js         Intl number/date helpers bound to the active language
  locales/en.js     catalog
  locales/ar.js     catalog
src/lib/state/locale.svelte.js   active language, persistence, lang/dir/meta
```

`src/lib/i18n/index.js` is the only file that needs touching to register a
language:

```js
import fr from './locales/fr.js';
export const CATALOGS = { en, ar, fr };
```

Nothing else changes. The picker, the browser-language detection, the
`lang`/`dir` attributes and the document title pick it up automatically.

### Writing a catalog

Each file exports `meta` plus the strings:

```js
export default {
	meta: {
		name: 'French',        // shown in the picker
		nativeName: 'Français',
		dir: 'ltr',            // or 'rtl'
		tag: 'fr'              // BCP-47, used by Intl
	},
	nav: { stats: 'Statistiques' /* … */ }
};
```

Rules the code relies on:

- Keys are dotted paths: `t('nav.stats')`, or computed: ``t(`settings.theme.${value}`)``.
- Interpolation is `{name}`: `t('counter.today', { count })`.
- Pass `count` and plural forms are selected with `Intl.PluralRules`, so Arabic
  correctly gets `one` / `two` / `few` / `many` / `other`. A plain string works
  too when the wording does not vary.
- Missing keys fall back to English rather than showing a raw key.

Run `npm run audit:i18n` to list any keys a language is missing and to catch
user-facing strings that were hard-coded by mistake.

### Right-to-left

`<html dir>` is set from the active language, and the layout uses logical CSS
properties throughout (`ms-`/`me-`, `ps-`/`pe-`, `start`/`end`, `text-start`,
`inset-inline-start`), so a new RTL language needs no extra work. Arabic text
carries its own `dir="rtl" lang="ar"` regardless of the interface language.

### Digits

Counters keep Latin digits in every language — a tasbeeh count is read at a
glance and Arabic-Indic numerals are slower to scan. To follow each locale's
own numbering system instead, set `NUMBERING_SYSTEM` to `undefined` in
`src/lib/i18n/format.js`.

---

## Development helpers

```bash
npm run icons      # regenerate static/icons/*.png
npm run smoke      # end-to-end check against a running preview server
npm run shots      # write screenshots into shots/
npm run shots:i18n # screenshot both languages, LTR and RTL
npm run audit:i18n # missing translation keys, hard-coded strings
```

`smoke` boots headless Edge over the DevTools protocol and asserts the things
that are easy to break: counting, undo, dhikr switching, auto-count, the target
celebration, zen mode, service-worker registration, persistence across a reload,
that the app still mounts with the network switched off, and that a JSON backup
round-trips.

`shots` and `smoke` expect a preview server on the URL passed as the first
argument, e.g. `node scripts/smoke.mjs http://localhost:4173`.

---

## Accessibility

- Every control has an accessible name; tap targets are at least 40px.
- The count is announced through a polite live region.
- `prefers-reduced-motion` collapses all animation.
- Text and background colours meet contrast requirements in both themes.