# Data

Everything shown comes from a dated snapshot, `app/public/data/cineverse.json`, built by three scripts:

1. `scripts/fetch-wikidata.mjs` queries the Wikidata SPARQL service (CC0): films, credits, genres, series, sequel links, sources, awards, companies, countries, languages. Labels are read from `en` then `mul` (since 2025 many Wikidata labels live under `mul`; ignoring it silently dropped thousands of names).
2. `scripts/fetch-extras.mjs` adds series types, people facts and the Wikipedia lead paragraphs (CC BY-SA 4.0) used as synopses and biographies. Each carries its article title; the UI links the article.
3. `scripts/build-dataset.mjs` normalises, deduplicates, maps Wikidata's fine genres to 18 coarse ones (sub-genres are kept as text), resolves editorial trilogies, and writes the snapshot. Nothing in it invents a fact.

## Selection rule (the first playable catalog)
* Instance of film or a subclass, with at least **45 Wikidata sitelinks** (a proxy for being documented in many Wikipedias);
* plus, for each of 30 countries outside the US and UK, that country's most widely documented films (at least 22 sitelinks, up to 36 per country), so the catalog is not only English-language cinema;
* plus members of a film series already present, with at least 15 sitelinks, so franchises are whole;
* plus the titles named in the product brief (`scripts/must-include.txt`).

Popularity by sitelinks is a bias, not a quality judgement: it favours widely translated and older canonical films, and under-represents recent and local cinema. The snapshot is a curated atlas, not a census of film.

## Quality checks (run by `npm test`)
No broken sequel, person or franchise references; no two films with the same title and year (language versions and same-title shorts are qualified, e.g. “Dracula (Spanish-language version)”); every title the brief names is present; the brief's eleven trilogies are present with their kind; provenance and rights fields exist.

## Known gaps
* **Cast billing order is rare.** Wikidata records it for very few films, so most “shared actor” links say “billing order not recorded” and the Leading-roles filter only works where billing is known. Cameo status is not recorded at all.
* **Film movements, ratings, posters and box office are absent.** Ratings and posters need licensed providers (TMDB terms require attribution and forbid redistribution); movements are not a Wikidata film property in a usable form.
* **Franchises follow Wikidata's “part of the series”** statements, which are sometimes loose (some are studio catalogues). Series types are filtered to film series, franchises, trilogies and shared universes; edge cases remain.
* **Trilogy kind** (narrative, thematic, director-defined) comes only from the product brief's list. Other Wikidata trilogies are shown as “not classified” rather than guessed.
* Dates are first release dates as recorded; people have birth and death years only where Wikidata has them.

## Refresh
`npm run data:fetch && npm run data:build`, then `npm test` and `npm run build`. Raw API responses are cached in `data/raw` (git-ignored); delete a file there to refetch that facet. Respect the services' terms: a descriptive User-Agent is sent, requests are paced and retried.

## Licences and attribution
Wikidata: CC0 1.0. Wikipedia lead paragraphs: CC BY-SA 4.0, shown with a link to the source article. Project code: see the repository licence. No posters, stills or ratings are redistributed.
