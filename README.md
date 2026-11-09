# ADOC studio

An Albanian name-letter customizer built with **TypeScript, Vite, Tailwind CSS and Three.js**. No React or backend is required.

## Run

```sh
npm ci
npm run dev
npm run build
npm test
```

Node 22+ is required (Node 24 is used for the built-in TypeScript tests).

## Features

- Immediate name preview, including Albanian Ë and Ç, spaces and hyphens (16-character limit).
- Individual letter selection and coloring; ordered palettes, repeat, shuffle and presets.
- 8 / 10 / 12 cm product sizes and four preview backgrounds.
- Local draft persistence, with validation of stored data.
- Locally bundled font outlines, rounded extruded 3D letters, lighting and shadows.
- Software-shaded canvas fallback if WebGL is unavailable.
- PNG export of the current renderer, name, size and background.
- Native file sharing where supported. Browsers cannot silently write into the Photos library; users choose Save Image in their device's share/download UI.
- WhatsApp order links to **+355 68 406 9999**, including the name, size and each letter's color. The visitor reviews/sends the message. Attach the saved image manually or use device sharing; WhatsApp links cannot attach local files automatically.

The preview is an approximation of the rounded product style, not an exact 3D scan. Size is a physical order option; the preview is automatically framed to fit the screen.

## Structure

- `src/main.ts`: controls, state updates, persistence and browser interactions.
- `src/data/palettes.ts`: editable colors, backgrounds and presets.
- `src/lib/design.ts`: input validation, palette logic and order payload.
- `src/lib/renderer.ts`: Three.js renderer and PNG export.
- `src/lib/canvas-renderer.ts`: non-WebGL renderer and export.
- `src/style.css`: Tailwind theme and component styles.

## Netlify

Import `lazari03/adoc` in Netlify and select `main`. The checked-in `netlify.toml` configures `npm run build` and `dist` automatically. No secrets or environment variables are needed. Git pushes trigger deployment once the Netlify project is linked.

## Validation

`npm run build` checks TypeScript and produces the deployable bundle. `npm test` verifies name normalization, stored-state validation, palette ordering and the WhatsApp recipient/details.

Fonts are distributed through Fontsource under their bundled SIL Open Font License. See `THIRD_PARTY_NOTICES.md`.
