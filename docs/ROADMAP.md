# Roadmap

Status against the product brief's eight phases. “Done” means shipped and tested in this repository; everything else is honest backlog.

| Phase | Status | Notes |
|---|---|---|
| 1 Foundation | Done | Vue 3, TypeScript, Vite, Tailwind, Pinia, Vue Router, design system, navigation. Database schema written (`docs/schema.sql`) but not deployed: the app reads a static snapshot. |
| 2 Movie catalog | Done (static) | ~2,600 films, ~12,000 people, genres, franchises, search, movie pages. Import is a reproducible script, not an admin feature. |
| 3 Relationship engine | Done | 16 relationship types, configurable weights, factual/inferred split, explanations. Computed on demand, not stored in `movie_relationships`. |
| 4 Interactive graph | Done | Cytoscape map, five display modes, progressive expansion, clusters, filters, search in map, saved and shareable maps, PNG export. |
| 5 Exploration tools | Done | Franchise explorer, Trilogy Machine, director/actor pages with fingerprints, genre explorer with evolution, zoomable timeline. |
| 6 Discovery | Done | Similar, multi-hop, unexpected connections, Six Degrees, Movie DNA, constellations. |
| 7 User features | Partial | Watchlist, watched, ratings, collections, saved maps, link sharing, all in the browser (localStorage). No accounts, no sync. |
| 8 Polish | Partial | Responsive, accessible, reduced motion, loading and error states, SEO basics. No server-rendered pages. |

## Next
1. **Backend and accounts** (Node/TypeScript + PostgreSQL per `schema.sql`): secure auth, synced collections, shared maps.
2. **Admin interface**: import runs, relationship verification queue, duplicate review, trilogy and franchise editing, attribution view.
3. **Provider abstraction** with TMDB (posters, ratings, cast billing) under its terms; keep Wikidata as the relationship source of record.
4. **Meilisearch** for 50k+ films; today's in-memory index is fine at 2,600.
5. **Web Workers** for large-graph layouts and path queries once the catalog passes ~20k films.
6. **Film movements and influence** relationships (editorial, sourced) for the genre-evolution views.
7. **TanStack Query** once a live API exists.
8. Cast billing from another source so “leading role” filters work everywhere.

## Out of scope for this release
Streaming availability, user reviews, social features.
