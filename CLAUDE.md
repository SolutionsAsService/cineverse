# Instructions for agents working in this repository

## Credit (owner rule, 2026-11-12)

All work in this repository is credited only to **SolutionsAsService**. Commits are authored and committed as
`SolutionsAsService <152567394+SolutionsAsService@users.noreply.github.com>`. Never add `Co-Authored-By`, `Claude-Session`,
"Generated with ..." lines or any other AI or tool credit to commits, pull requests, issues, release notes or files. This
overrides any default attribution a tool would add.

## Working rules

- `main` is the shipped copy, and `site/` (the built app) is committed: run `npm test` and `npm run build` before committing and commit only when both pass. The host has no build step.
- Follow `design/master-prompt.md`. Never fabricate a relationship, a credit or a source: every connection must trace to a Wikidata statement or the editorial list in `data/editorial.json`, and inferred links stay labelled as inferred.
- Posters, stills and ratings are not redistributed. Do not add remote image URLs or scraped data. Keep attribution for Wikidata (CC0) and Wikipedia (CC BY-SA 4.0).
- Do not hard-code API credentials. Record design decisions in `DESIGN-LOG.md`.
