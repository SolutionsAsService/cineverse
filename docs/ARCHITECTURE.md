# Architecture

CINEVERSE is a static Vue 3 single-page app over a committed, normalised Wikidata snapshot. There is no server on the hot path: every graph interaction reads the snapshot in the browser.

```
Wikidata (CC0)  ──fetch-wikidata.mjs──┐
Wikipedia leads ──fetch-extras.mjs────┼─> data/raw (git-ignored caches) ──build-dataset.mjs──> app/public/data/cineverse.json
data/editorial.json (trilogy kinds) ──┘                                                         │
                                                                                                 ▼
app/src: catalog.ts (indexes) → relations.ts (engine) → graph.ts (one graph model) → stores (Pinia) → views / components
                                                                    └─ MovieGraph.vue: Cytoscape adapter (render only)
                                                                    └─ D3: scales and shapes for timeline, fingerprints, genre evolution (Vue renders the SVG)
vite build (root app/)  ──>  site/  (committed, served as plain static files on Shadw and Vercel)
```

## One graph model, two renderers
`src/lib/graph.ts` owns nodes and edges (`GraphModel`). `stores/explore.ts` mutates it (expand, collapse, pin, remove) and bumps a version counter. `MovieGraph.vue` diffs the model into Cytoscape elements and never holds state of its own. D3 does not touch that graph: it draws the separate timeline, fingerprint and genre-evolution charts (scales and arc generators only; Vue renders the SVG), so the two libraries never manage the same state.

## The relationship engine (`src/lib/relations.ts`)
Relationships are computed on demand from stored facts, never stored as random edges. Each carries `type`, `strength`, `factual`, `category`, `source`, `confidence`, a `via` (person, franchise, trilogy, company, source work) and a sentence of explanation ("Both films were directed by Quentin Tarantino.").

* Strengths come from `REL_DEFS` and are user-configurable (sidebar sliders, persisted). Defaults follow the brief's table (sequel 100, trilogy 100, franchise 95, director 85, shared lead actor 80, writer 70 …).
* Shared-actor strength depends on billing: leads in both films keep full weight, billed near the top ×0.85, listed in both ×0.6, billing order unknown ×0.7. Wikidata records billing order for few films (see DATA.md), so most actor links say "billing order not recorded".
* Factual relationships come from Wikidata statements or the editorial trilogy list. Inferred ones (shared main subject, Movie DNA similarity, same setting) are flagged `factual: false`, drawn dashed on the map and labelled INFERRED wherever they appear. Genre links are classifications and are only added on request, because they would otherwise connect everything to everything.
* A pair of films can have several relationships; the pair strength is `max + 0.15 × the rest`, capped at 100. The strongest one labels the edge; the others are listed on hover and in the panel.

## Discovery (`src/lib/discovery.ts`)
Similar films (relationships + Movie DNA, reasons attached), multi-hop chains (A → shared credit → B → shared credit → C, factual links only), unexpected connections (a shared person but no shared genre, or 35+ years apart), Six Degrees (breadth-first search over film ↔ person ↔ franchise/trilogy, all shortest paths, cast beyond the eighth billing ignored), Movie constellations (direct links among chosen films and bridge films that connect several), Director/actor fingerprints.

## Performance
The map never renders the catalog. It starts from one film, adds the strongest 4–30 connections per expansion (configurable), folds the remainder into a "+N more" cluster node that expands per category, and stops at a configurable node limit (default 90). Cytoscape draws to canvas with `textureOnViewport`; titles hide below a minimum zoomed font size. Routes are code-split; Cytoscape (440 kB) and D3 load only on the pages that use them. The catalog is one gzipped JSON (about 1 MB) loaded once. Not done: web workers (Six Degrees and relationship queries run in a few milliseconds on this size), cached layouts, viewport virtualisation beyond Cytoscape's own culling.

## Posters
Posters are not redistributed (rights). `src/lib/poster.ts` draws a title card from each film's own data (title, year, primary-genre hue). They are labelled as generated wherever shown. A licensed provider can later fill the same slot through the provider abstraction in the roadmap.

## Accessibility
Every graph fact is also available as text (the detail panel's connection list, the Six Degrees ledger, the timeline's list). Hash routing, skip link, 44 px touch targets, visible focus (gold), reduced-motion respected, dialogs and tabs with roles, no meaning carried by colour alone (shape, dash and text accompany hue).

## Deployment
`vite build` writes `site/` (committed). Root `vercel.json`, `app/public/vercel.json` (copied to `site/`), `fluid.json`, the redirecting root `index.html` and an anchored `.vercelignore` follow the Shadw/Vercel static layout; `scripts/check-deploy.mjs` fails the build if they drift. Hash history means no server rewrites are needed.

## Testing
`npm test` (node:test via tsx): data integrity and brief requirements, relationship queries and explanations, graph expansion and node limits, search (prefix, typo, people, franchises), discovery (paths, multi-hop, unexpected, constellation). `npm run typecheck` runs vue-tsc.
