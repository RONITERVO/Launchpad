import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {appEntries, listRepositories, pagesURL, reconcile, safeURL} from '../site/core.js';
import {inferCategory, profiles} from '../site/profiles.js';

const configURL = new URL('../site/config.json', import.meta.url);
const catalogURL = new URL('../site/catalog.json', import.meta.url);

export function readmeSummary(markdown) {
  return cleanText(markdown.replace(/```[\s\S]*?```/g,' ').replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/[*_`>|]/g,' ')).slice(0,1800);
}

export async function readReadme(site, {fetcher=fetch,token}={}) {
  const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  if(token)headers.Authorization=`Bearer ${token}`;
  try {
    const response=await fetcher(`https://api.github.com/repos/${site.repository}/readme`,{headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok)return site;
    const data=await response.json();
    if(data.encoding!=='base64'||typeof data.content!=='string')return site;
    const summary=readmeSummary(Buffer.from(data.content,'base64').toString('utf8'));
    return {...site,readme:{url:safeURL(data.html_url),sha:data.sha,summary,checkedAt:new Date().toISOString()}};
  }catch{return site;}
}

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
  for (let offset=0; offset<sites.length; offset+=4) {
    inspected.push(...await Promise.all(sites.slice(offset,offset+4).map(async site=>{
      const withReadme=await readReadme(site,{token:process.env.GITHUB_TOKEN});
      const checked=await inspectSite(withReadme,config);
      return {...checked,category:profiles[site.repository.toLowerCase()]?.category||inferCategory(checked)};
    })));
  }
  const catalog = {owner:config.owner,generatedAt:new Date().toISOString(),sites:inspected};
  await writeFile(catalogURL,JSON.stringify(catalog,null,2)+'\n');
  console.log(`Discovered ${catalog.sites.length} Pages sites; ${appEntries(catalog.sites).length} launch entries.`);
  for (const site of inspected) console.log(`${site.availability.padEnd(11)} ${site.repository} ${site.url}`);
  return catalog;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  sync().catch(error=>{console.error(`Catalog sync failed: ${error.message}`);process.exitCode=1;});
}
