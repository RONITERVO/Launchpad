import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {appEntries} from '../site/core.js';
import {gridLayout,inferCategory,present,profiles,visibleApps} from '../site/profiles.js';
import {readReadme,readmeSummary} from '../scripts/sync.mjs';

const catalog=JSON.parse(await readFile(new URL('../site/catalog.json',import.meta.url),'utf8'));
test('every reviewed app has a category and a packaged image',async()=>{
  for(const [repository,profile] of Object.entries(profiles)){
    const app=present({repository,name:profile.label});
    const bytes=await readFile(new URL(`../site/${app.image.slice(2)}`,import.meta.url));
    assert.equal(bytes.toString('ascii',8,12),'WEBP');assert.ok(bytes.length<50000);
    assert.ok(['play','learn','create','lab'].includes(app.category));
  }
});
test('category views match README-reviewed app purposes',()=>{
  const entries=appEntries(catalog.sites).filter(s=>profiles[s.repository.toLowerCase()]);
  assert.deepEqual(visibleApps(entries,'play','').map(a=>a.label),['Ink Battle','StateBeats','Cube XR']);
  assert.deepEqual(visibleApps(entries,'learn','').map(a=>a.label),['Maestro','Spanish']);
  assert.deepEqual(visibleApps(entries,'create','').map(a=>a.label),['Sketch AI']);
  assert.deepEqual(visibleApps(entries,'lab','').map(a=>a.label),['Chess','Magnets']);
  assert.deepEqual(visibleApps(entries,'all','arduino').map(a=>a.label),['Chess']);
});
test('newly discovered apps get usable identities without requiring artwork',()=>{
  const app=present({name:'New tool',repository:'Example/New',description:'An SVG graphics editor'});
  assert.equal(app.category,'create');assert.equal(app.image,null);assert.equal(app.label,'New tool');
  assert.equal(inferCategory({readme:{summary:'A Spanish language tutor for learning.'}}),'learn');
});
test('normal phone and desktop sizes fit eight apps without a second page',()=>{
  for(const [width,height] of [[284,308],[351,440],[664,590],[904,480]]){
    const layout=gridLayout(width,height);assert.ok(layout.capacity>=8,`${width}×${height}`);
    assert.ok(layout.columns*layout.cell+(layout.columns-1)*layout.gap<=width);
  }
});
test('short screens paginate and every item remains reachable',()=>{
  const layout=gridLayout(600,160);assert.equal(layout.capacity,4);
  const entries=Array.from({length:29},(_,i)=>i);const pages=[];
  for(let page=0;page<Math.ceil(entries.length/layout.capacity);page++)pages.push(...entries.slice(page*layout.capacity,(page+1)*layout.capacity));
  assert.deepEqual(pages,entries);
});
test('README context stores source and SHA, and outages preserve previous context',async()=>{
  const site={repository:'Example/App',readme:{summary:'Previous'}};
  const result=await readReadme(site,{fetcher:async()=>Response.json({encoding:'base64',content:Buffer.from('# App\nA rhythm game with music.').toString('base64'),sha:'abc123',html_url:'https://github.com/Example/App/blob/main/README.md'})});
  assert.equal(result.readme.sha,'abc123');assert.match(result.readme.summary,/rhythm game/);
  assert.equal((await readReadme(site,{fetcher:async()=>new Response('',{status:404})})).readme.summary,'Previous');
  assert.equal((await readReadme(site,{fetcher:async()=>{throw Error('offline');}})).readme.summary,'Previous');
});
test('README excerpts remove images, code and link destinations',()=>{
  const result=readmeSummary('# Tool\n![badge](https://example.com/a.png)\nA [language tutor](https://example.com).\n```js\nsecretExample()\n```');
  assert.equal(result,'Tool A language tutor.');
});
