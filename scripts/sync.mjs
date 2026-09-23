import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {appEntries, listRepositories, pagesURL, reconcile, safeURL} from '../site/core.js';

const configURL = new URL('../site/config.json', import.meta.url);
const catalogURL = new URL('../site/catalog.json', import.meta.url);

export function cleanText(text = '') {
  const entities = {amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' ',middot:'·',mdash:'—',ndash:'–'};
  return text.replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, entity) => {
    if (entity.startsWith('#')) {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2),16) : parseInt(entity.slice(1),10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return entities[entity] || match;
  }).replace(/\s+/g,' ').trim();
}

export function metadata(html) {
  const title = cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  let description = '';
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(match => [match[1].toLowerCase(), match[2] ?? match[3]]));
    if ((attrs.name || attrs.property || '').toLowerCase() === 'description') description = cleanText(attrs.content);
  }
  return {title, description};
}

export async function inspectSite(site, config, fetcher = fetch) {
  // Use the stable GitHub Pages alias each time; GitHub redirects custom domains.
  // No GitHub credential is ever sent to a hosted website.
  const url = pagesURL(config.owner, site.repository.split('/')[1]);
  try {
    const response = await fetcher(url, {signal: AbortSignal.timeout(20000), redirect:'follow'});
    const result = {...site, httpStatus: response.status, checkedAt:new Date().toISOString()};
    if (response.status === 404 || response.status === 410) return {...result, url, availability:'unavailable'};
    if (!response.ok) return {...result, availability:site.availability === 'available' ? 'available' : 'unverified'};
    const destination = safeURL(response.url || url);
    if (!destination) throw new Error('Invalid destination');
    if (!(response.headers.get('content-type') || '').includes('text/html')) return {...result,url:destination,availability:'unavailable'};
    const html = await response.text();
    const {title, description} = metadata(html);
    return {...result,url:destination,availability:'available',pageTitle:title,description:description || site.description || title};
  } catch {
    return {...site,availability:site.availability === 'available' ? 'available' : 'unverified',checkError:'The site did not respond during this check.'};
  }
}

export async function sync() {
  const config = JSON.parse(await readFile(configURL,'utf8'));
  let previous;
  try { previous=JSON.parse(await readFile(catalogURL,'utf8')); } catch {}
  // Fetch every repository page before replacing the manifest. An API failure
  // fails the deployment instead of publishing an empty/partial collection.
  const repositories = await listRepositories(config.owner, {token:process.env.GITHUB_TOKEN});
  const sites = reconcile(repositories,previous,config);
  const inspected = [];
  for (let offset=0; offset<sites.length; offset+=4) inspected.push(...await Promise.all(sites.slice(offset,offset+4).map(site=>inspectSite(site,config))));
  const catalog = {owner:config.owner,generatedAt:new Date().toISOString(),sites:inspected};
  await writeFile(catalogURL,JSON.stringify(catalog,null,2)+'\n');
  console.log(`Discovered ${catalog.sites.length} Pages sites; ${appEntries(catalog.sites).length} launch entries.`);
  for (const site of inspected) console.log(`${site.availability.padEnd(11)} ${site.repository} ${site.url}`);
  return catalog;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  sync().catch(error=>{console.error(`Catalog sync failed: ${error.message}`);process.exitCode=1;});
}
