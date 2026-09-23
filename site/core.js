export function friendlyName(name) {
  return name.replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').trim();
}
export function pagesURL(owner, name) {
  const root = `https://${owner.toLowerCase()}.github.io/`;
  return name.toLowerCase() === `${owner.toLowerCase()}.github.io` ? root : `${root}${encodeURIComponent(name)}/`;
}
export function safeURL(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function selectPages(repositories, config) {
  return repositories.filter(repo => repo.has_pages && !repo.private && repo.owner?.login?.toLowerCase() === config.owner.toLowerCase() && repo.name.toLowerCase() !== config.catalogRepository.toLowerCase());
}
export async function listRepositories(owner, {fetcher = fetch, token} = {}) {
  const repos = [];
  for (let page = 1; ; page++) {
    const headers = {Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetcher(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100&type=owner&sort=full_name&page=${page}`, {headers, signal: AbortSignal.timeout(15000)});
    if (!response.ok) { const error = new Error(`GitHub returned ${response.status}`); error.status = response.status; throw error; }
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Unexpected GitHub response');
    repos.push(...batch);
    if (batch.length < 100) return repos;
  }
}
export function reconcile(repositories, snapshot, config) {
  const old = new Map((snapshot?.sites ?? []).map(site => [site.repository.toLowerCase(), site]));
  return selectPages(repositories, config).map(repo => {
    const previous = old.get(repo.full_name.toLowerCase());
    return {...previous, id: repo.full_name, repository: repo.full_name, name: friendlyName(repo.name), description: repo.description || previous?.description || '', url: previous?.url || pagesURL(config.owner, repo.name), sourceUrl: repo.html_url, updatedAt: repo.pushed_at, availability: previous?.availability || 'unverified'};
  }).sort((a,b) => a.name.localeCompare(b.name));
}
export function appEntries(sites) {
  return sites.filter(site => site.availability !== 'unavailable');
}
export function filterEntries(entries, query) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(entry => terms.every(term => `${entry.name} ${entry.description || ''} ${entry.repository}`.toLocaleLowerCase().includes(term)));
}
