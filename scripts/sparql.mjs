// Minimal Wikidata SPARQL client: polite User-Agent, retries with backoff, JSON out. Wikidata data is CC0.
export const UA = 'CineverseDatasetBuilder/0.1 (https://github.com/SolutionsAsService/cineverse; static dataset snapshot)';
export async function sparql(query, { retries = 5 } = {}) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const res = await fetch('https://query.wikidata.org/sparql', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json', 'User-Agent': UA }, body: new URLSearchParams({ query }) });
    if (res.ok) return (await res.json()).results.bindings;
    if (res.status === 429 || res.status >= 500) { const wait = Number(res.headers.get('retry-after')) * 1000 || 4000 * (attempt + 1); await new Promise(r => setTimeout(r, wait)); continue; }
    throw new Error(`SPARQL ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error('SPARQL: out of retries');
}
export const qid = uri => uri.split('/').pop();
