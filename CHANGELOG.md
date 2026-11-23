# Changelog

## 0.1.0 (2026-11-23): first playable
* Vue 3 + TypeScript + Vite + Tailwind app, static build in `site/`, Shadw and Vercel configured.
* Wikidata snapshot (CC0) with Wikipedia lead paragraphs (CC BY-SA 4.0): films, people, genres, franchises, trilogies.
* Relationship engine with configurable weights and factual/inferred separation; Cytoscape movie map with progressive expansion, five display modes, saved and shareable maps.
* Franchise explorer, Trilogy Machine, director/actor pages with D3 fingerprints, genre explorer with evolution, zoomable timeline, Six Degrees, Movie DNA, Unexpected Connections, constellations, local collections.
* 28 automated tests (data, relations, graph, search, discovery); design log and panel record in `DESIGN-LOG.md`.
* Not included: backend, accounts, admin, licensed posters and ratings (see `docs/ROADMAP.md`).

## 0.1.1 (2026-11-23): panel rounds R1 and R2
* Catalog widened to 2,421 films by a documented 30-country balance rule; films not yet released and studio catalogues are excluded; `/about` shows the selection rule, the country table, the relationship tiers and the known gaps.
* Relationship tiers (FACT, SHARED LABEL, INFERRED) shown everywhere; the same credit counts once; Movie DNA share is a real, configurable weight.
* Honest hero; stable, centred map with correct counters, tooltips that name both films, tap-to-pin explanations on touch, route highlighting, Save map.
* Accessibility: working skip link, modal search with a focus trap and combobox semantics, reduced-motion honoured by the graph, titles and h1 on every route, 7.9:1 primary buttons.
* 38 tests.
