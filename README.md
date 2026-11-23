# CINEVERSE

**Every movie has a story. Every movie connects to another.**
An interactive map of cinema: about 2,600 films joined by who directed, wrote, scored and starred in them, and by the franchises, trilogies and genres they belong to. Built with Vue 3 as the SHADW experimental web suite's Vue showcase.

Live: <https://cineverse.shadw.app> (static site, committed in `site/`).

## What you can do
* **Movie map**: start from any film, add its strongest connections, double-click to go further, hover a line for the reason, filter by relationship kind, switch between poster, minimal, genre, franchise and timeline modes, save or share the map.
* **Franchises and the Trilogy Machine**: series, shared universes, release and story order from Wikidata's sequel links; trilogies classed as narrative, thematic or director-defined where the brief's list says so.
* **People**: filmography, collaborators and a fingerprint of genres and decades for directors and actors.
* **Timeline and genres**: zoom from a century to a single year; see how a genre's share of each decade moves.
* **Discovery**: similar films with reasons, two-step chains, unexpected connections, Movie DNA, **Six degrees of cinema** between any two films, movie constellations.
* **Library**: watchlist, watched, ratings, collections, saved maps, link sharing (stored in your browser).

Solid lines are facts from Wikidata; dashed lines are inferred and labelled so. Nothing is random: every connection has a source and a sentence of explanation.

## Run
```sh
npm install
npm run dev         # vite dev server (app/)
npm test            # 28 tests: data integrity, relations, graph, search, discovery
npm run typecheck
npm run build       # deploy-file check, typecheck, vite build -> site/, site check
```
Refresh the data: `npm run data:fetch && npm run data:build` (needs network access to Wikidata and Wikipedia; see `docs/DATA.md`).

## Layout
* `app/` the Vue app (`src/lib` engine, `src/stores`, `src/views`, `src/components`, `src/styles`), `app/public` static assets and the data snapshot.
* `scripts/` data pipeline, palette derivation, deploy and site checks. `data/editorial.json` is the brief's trilogy list.
* `site/` the built static site, committed. `vercel.json`, `fluid.json`, `.vercelignore`, root `index.html` configure Shadw and Vercel.
* `docs/` architecture, data notes, roadmap, target SQL schema. `design/master-prompt.md` is the product brief. `DESIGN-LOG.md` is the design record.

## Honest limits
No backend, accounts or admin yet; posters and ratings are not included (rights): each film shows a generated title card; cast billing order is recorded for few films; film movements are not in the dataset. `docs/ROADMAP.md` lists what is done and what is next.

Data: [Wikidata](https://www.wikidata.org) (CC0) and [Wikipedia](https://en.wikipedia.org) lead paragraphs (CC BY-SA 4.0), each linked from where it is shown.
