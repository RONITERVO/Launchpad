import {appEntries,listRepositories,reconcile,safeURL} from './core.js';
import {categories,gridLayout,visibleApps} from './profiles.js';
const $=selector=>document.querySelector(selector);
const make=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
let config,snapshot,sites=[],category='all',page=0,busy=false,layout,layoutKey='';
const cacheKey=owner=>`launchpad:v2:${owner}`;

function notice(message='') { $('#notice').textContent=message;$('#notice').hidden=!message; }
function appTile(entry) {
  const link=make('a','app');link.href=safeURL(entry.url);link.target='_blank';link.rel='noopener noreferrer';
  link.setAttribute('aria-label',`Open ${entry.name} (new tab)`);
  link.title=`${entry.name} · ${categories.find(c=>c.id===entry.category)?.label||'Lab'}\n${entry.summary}`;
  const artwork=make('span','artwork');
  const fallback=make('span','fallback',entry.label.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase());
  fallback.setAttribute('aria-hidden','true');artwork.append(fallback);
  if(entry.image){const img=make('img');img.src=entry.image;img.alt='';img.width=256;img.height=256;img.decoding='async';img.addEventListener('load',()=>{fallback.hidden=true;});img.addEventListener('error',()=>{img.remove();});artwork.append(img);}
  link.append(artwork,make('span','app-label',entry.label.replace(/([a-z])([A-Z])/g,'$1\u200b$2')));return link;
}
function render() {
  const entries=appEntries(sites).filter(entry=>safeURL(entry.url));
  const matches=visibleApps(entries,category,$('#search').value);
  const capacity=layout?.capacity||8;const pages=Math.max(1,Math.ceil(matches.length/capacity));
  page=Math.max(0,Math.min(page,pages-1));
  $('#catalog').replaceChildren(...matches.slice(page*capacity,(page+1)*capacity).map(appTile));
  $('#catalog').setAttribute('aria-busy','false');$('#catalog').hidden=!matches.length;$('#empty').hidden=!!matches.length;
  $('#empty-message').textContent=entries.length?'No matches':'No published apps yet';
  $('#app-count').textContent=`${matches.length} ${matches.length===1?'app':'apps'}`;
  $('#pagination').hidden=pages<=1;$('#page-number').textContent=`${page+1} / ${pages}`;
  $('#previous-page').disabled=page===0;$('#next-page').disabled=page===pages-1;
  for(const button of $('#categories').children)button.setAttribute('aria-pressed',String(button.dataset.category===category));
  const resources=sites.filter(s=>s.availability==='unavailable');$('#resources').hidden=!resources.length;
  $('#resource-list').replaceChildren(...resources.map(site=>{const row=make('div','resource-item');const link=make('a','',site.name);link.href=safeURL(site.sourceUrl);link.target='_blank';link.rel='noopener noreferrer';row.append(link,make('span','',site.httpStatus===404?'Shared files · no launch page':'Launch page unavailable'));return row;}));
}
function fit() {
  // Reserve the pager even when hidden so adding it cannot change capacity.
  const box=$('#main').getBoundingClientRect();const nav=$('#categories').getBoundingClientRect();const style=getComputedStyle($('#categories'));
  const noticeHeight=$('#notice').hidden?0:$('#notice').getBoundingClientRect().height;
  const height=box.height-nav.height-parseFloat(style.marginTop)-parseFloat(style.marginBottom)-noticeHeight-44;
  const next=gridLayout(box.width,Math.max(80,height),parseFloat(getComputedStyle(document.documentElement).fontSize));
  const key=JSON.stringify(next);if(key===layoutKey)return;layout=next;layoutKey=key;
  for(const [name,value] of Object.entries({'--columns':next.columns,'--cell-size':`${next.cell}px`,'--icon-size':`${next.icon}px`,'--row-height':`${next.rowHeight}px`,'--grid-gap':`${next.gap}px`}))$('#catalog').style.setProperty(name,value);
  render();
}
function updateTime(value) {
  if(!value)return;const date=new Date(value);if(!Number.isFinite(date.getTime()))return;
  const label=`Synced ${date.toLocaleString()}`;$('#sync-time').textContent=label;$('#refresh').title=`Refresh apps · ${label}`;
}
async function refresh() {
  if(busy||!config)return;busy=true;$('#refresh').disabled=true;$('#refresh').setAttribute('aria-label','Checking for new apps');
  try {
    // Re-open the manifest so daily custom-domain and README updates reach an existing tab.
    try{const response=await fetch('./catalog.json',{cache:'no-cache',signal:AbortSignal.timeout(10000)});if(response.ok){const latest=await response.json();if(Array.isArray(latest.sites)){snapshot=latest;const saved=new Map(sites.map(s=>[s.repository.toLowerCase(),s]));for(const site of latest.sites)saved.set(site.repository.toLowerCase(),site);sites=[...saved.values()];}}}catch{}
    sites=reconcile(await listRepositories(config.owner),{sites},config);
    const checkedAt=new Date().toISOString();try{localStorage.setItem(cacheKey(config.owner),JSON.stringify({sites,checkedAt}));}catch{}
    render();updateTime(checkedAt);notice();
  }catch{notice(sites.length?'Saved apps shown. Refresh when GitHub is available.':'Couldn’t reach GitHub. Try refresh.');$('#sync-time').textContent='Showing saved apps';render();}
  finally{busy=false;$('#refresh').disabled=false;$('#refresh').setAttribute('aria-label','Refresh apps');fit();}
}
function search(open) {
  $('#search-box').hidden=!open;$('.masthead').classList.toggle('searching',open);$('#search-toggle').setAttribute('aria-expanded',String(open));
  if(open)$('#search').focus();else{$('#search').value='';page=0;render();$('#search-toggle').focus();}
}
for(const item of categories){const button=make('button','category',item.label);button.type='button';button.dataset.category=item.id;button.setAttribute('aria-pressed',String(item.id==='all'));if(item.color)button.style.setProperty('--category-color',item.color);button.addEventListener('click',()=>{category=item.id;page=0;render();fit();});$('#categories').append(button);}
$('#search-toggle').addEventListener('click',()=>search(true));$('#close-search').addEventListener('click',()=>search(false));
$('#search').addEventListener('input',()=>{page=0;render();fit();});
$('#clear-search').addEventListener('click',()=>{$('#search').value='';category='all';page=0;render();fit();});
$('#refresh').addEventListener('click',refresh);
$('#previous-page').addEventListener('click',()=>{page--;render();});$('#next-page').addEventListener('click',()=>{page++;render();});
$('#catalog-info').addEventListener('click',()=>$('#info-dialog').showModal());$('#close-info').addEventListener('click',()=>$('#info-dialog').close());
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!$('#search-box').hidden&&!$('#info-dialog').open)search(false);
  if(event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!$('#info-dialog').open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){event.preventDefault();search(true);}
});
new ResizeObserver(()=>requestAnimationFrame(fit)).observe($('#main'));document.fonts.ready.then(fit);
async function init() {
  try{
    const result=await fetch('./config.json');if(!result.ok)throw new Error('Config unavailable');config=await result.json();
    try{const response=await fetch('./catalog.json',{cache:'no-cache'});if(response.ok)snapshot=await response.json();}catch{}
    let cached;try{cached=JSON.parse(localStorage.getItem(cacheKey(config.owner)));}catch{}
    sites=snapshot?.sites||[];const useCache=Array.isArray(cached?.sites)&&new Date(cached.checkedAt)>new Date(snapshot?.generatedAt||0);if(useCache)sites=cached.sites;
    fit();render();updateTime(useCache?cached.checkedAt:snapshot?.generatedAt);await refresh();
  }catch{$('#catalog').replaceChildren();$('#catalog').setAttribute('aria-busy','false');notice('Couldn’t load the catalog. Please reload.');}
}
init();
