import {appEntries, filterEntries, listRepositories, reconcile, safeURL} from './core.js';
const $ = selector => document.querySelector(selector);
const palette = [['#313c25','#d4f879'],['#263e3c','#95dac7'],['#3c3143','#d1b0ef'],['#443327','#efc49b'],['#293b4c','#a5cee9'],['#453342','#ecaeca']];
let config, snapshot, sites = [], busy = false;
function notice(message = '') { $('#notice').textContent = message; $('#notice').hidden = !message; }
function initials(name) { return name.split(/\s+/).slice(0,2).map(s => [...s][0]).join('').toUpperCase(); }
function make(tag, className, text) { const element = document.createElement(tag); if (className) element.className = className; if (text) element.textContent = text; return element; }
function arrow() { const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true'); const path = document.createElementNS(svg.namespaceURI,'path'); path.setAttribute('d','M7 17 17 7M7 7h10v10'); svg.append(path); return svg; }
function card(entry) {
  const link = make('a', 'card');
  link.href = safeURL(entry.url); link.target = '_blank'; link.rel = 'noopener noreferrer'; link.setAttribute('aria-label', `Open ${entry.name} (new tab)`);
  let hash = 0; for (const c of entry.repository) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const [tint,ink] = palette[hash % palette.length]; link.style.setProperty('--tint',tint); link.style.setProperty('--ink',ink);
  const top = make('div','card-top'); top.append(make('span','app-icon',initials(entry.name)),make('span','kind',entry.availability === 'unverified' ? 'JUST DISCOVERED' : 'WEBSITE'));
  const bottom = make('div','card-bottom'); const open = make('span','open','Open'); open.append(arrow()); bottom.append(make('span','card-origin',new URL(entry.url).hostname),open);
  link.append(top,make('h3','',entry.name),make('p','',entry.description || 'Open this app'),bottom);
  return link;
}
function render() {
  const entries = appEntries(sites).filter(entry => safeURL(entry.url));
  const visible = filterEntries(entries,$('#search').value);
  $('#all-count').textContent = entries.length;
  $('#results-count').textContent = `${visible.length} ${visible.length === 1 ? 'app' : 'apps'}`;
  $('#results-label').textContent = $('#search').value ? 'Search results' : 'Your collection';
  $('#catalog').replaceChildren(...visible.map(card)); $('#catalog').setAttribute('aria-busy','false');
  $('#empty').hidden = visible.length > 0;
  $('#empty-message').textContent = entries.length ? 'Try another name or clear your search.' : 'Published GitHub Pages apps will appear here automatically.';
  $('#clear-search').hidden = !entries.length;
  const resources = sites.filter(s => s.availability === 'unavailable');
  $('#resources').hidden = !resources.length || !!$('#search').value;
  $('#resource-list').replaceChildren(...resources.map(site => {const row = make('div','resource-item'); const a=make('a','',site.name); a.href=safeURL(site.sourceUrl); a.target='_blank'; a.rel='noopener noreferrer'; row.append(a,make('span','',site.httpStatus === 404 ? 'No launch page' : 'Temporarily unavailable')); return row;}));
}
function updateTime(value) {
  if (!value) return;
  const date = new Date(value); if (!Number.isFinite(date.getTime())) return;
  $('#sync-time').textContent = `Checked ${new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(date)}`;
  $('#sync-time').title = `Repository list checked ${date.toLocaleString()}. App links checked ${new Date(snapshot?.generatedAt || value).toLocaleString()}.`;
}
async function refresh() {
  if (busy || !config) return;
  busy = true; $('#refresh').disabled = true; $('#refresh span').textContent = 'Checking…';
  try {
    const repos = await listRepositories(config.owner);
    sites = reconcile(repos, {sites}, config);
    const checkedAt = new Date().toISOString();
    try { localStorage.setItem(`launchpad:${config.owner}`,JSON.stringify({sites,checkedAt,generatedAt:snapshot?.generatedAt})); } catch {}
    render(); updateTime(checkedAt); notice();
  } catch (error) {
    notice(sites.length ? `${error.status === 403 || error.status === 429 ? 'GitHub is limiting requests.' : 'Couldn’t reach GitHub.'} Your saved collection is still available. Try refreshing later.` : 'Couldn’t load your apps. Check your connection, then refresh.');
    $('#sync-time').textContent = 'Showing saved collection';
  } finally { busy = false; $('#refresh').disabled = false; $('#refresh span').textContent = 'Refresh apps'; }
}
$('#search').addEventListener('input',render);
$('#clear-search').addEventListener('click',() => { $('#search').value=''; render(); $('#search').focus(); });
$('#refresh').addEventListener('click',refresh);
document.addEventListener('keydown',event => { if(event.key==='/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName) && !document.activeElement?.isContentEditable){event.preventDefault();$('#search').focus();} });
async function init() {
  try {
    const result = await fetch('./config.json'); if(!result.ok) throw new Error('Config unavailable'); config=await result.json();
    try { const result2 = await fetch('./catalog.json',{cache:'no-cache'}); if(result2.ok) snapshot=await result2.json(); } catch {}
    let cached; try { cached=JSON.parse(localStorage.getItem(`launchpad:${config.owner}`)); } catch {}
    sites = snapshot?.sites || [];
    const useCache = Array.isArray(cached?.sites) && new Date(cached.checkedAt) > new Date(snapshot?.generatedAt || 0);
    if (useCache) sites=cached.sites;
    render(); updateTime(useCache ? cached.checkedAt : snapshot?.generatedAt);
    await refresh();
  } catch { $('#catalog').replaceChildren();$('#catalog').setAttribute('aria-busy','false');notice('The catalog could not load. Please reload this page.');$('#sync-time').textContent='Unable to load'; }
}
init();
