import test from 'node:test';
import assert from 'node:assert/strict';
import {appEntries,filterEntries,listRepositories,pagesURL,reconcile,safeURL,selectPages} from '../site/core.js';
import {inspectSite,metadata} from '../scripts/sync.mjs';

const config={owner:'Example',catalogRepository:'Launchpad'};
const repo=(name,extra={})=>({name,full_name:`Example/${name}`,owner:{login:'Example'},has_pages:true,private:false,html_url:`https://github.com/Example/${name}`,...extra});

test('discovers only owned public Pages sites and excludes the catalog itself',()=>{
  assert.deepEqual(selectPages([repo('One'),repo('NoPages',{has_pages:false}),repo('Private',{private:true}),repo('Launchpad'),repo('OtherOwner',{owner:{login:'Another'}})],config).map(r=>r.name),['One']);
});
test('pagination finds sites beyond the first 100 repositories',async()=>{
  let calls=0;
  const result=await listRepositories('Example',{fetcher:async url=>{calls++;const page=Number(new URL(url).searchParams.get('page'));return Response.json(page===1?Array.from({length:100},(_,i)=>repo(`repo-${i}`)):[repo('Last')]);}});
  assert.equal(calls,2);assert.equal(result.length,101);assert.equal(result.at(-1).name,'Last');
});
test('API failures reject instead of returning a partial catalog',async()=>{
  let calls=0;
  await assert.rejects(listRepositories('Example',{fetcher:async()=>++calls===1?Response.json(Array(100).fill(repo('One'))):new Response('',{status:403})}),/403/);
});
test('refresh discovers new apps, removes disabled apps and preserves custom domains',()=>{
  const snapshot={sites:[{repository:'Example/One',url:'https://custom.example/',availability:'available'},{repository:'Example/Removed'}]};
  const sites=reconcile([repo('One'),repo('New')],snapshot,config);
  assert.equal(sites.length,2);assert.equal(sites.find(s=>s.name==='One').url,'https://custom.example/');assert.equal(sites.find(s=>s.name==='New').url,'https://example.github.io/New/');
});
test('user and project Pages URLs are correct',()=>{
  assert.equal(pagesURL('Example','EXAMPLE.github.io'),'https://example.github.io/');assert.equal(pagesURL('Example','My-App'),'https://example.github.io/My-App/');
});
test('unavailable asset hosts are excluded and nested links are never expanded',()=>{
  assert.deepEqual(appEntries([{id:1,availability:'available',children:[{id:2}]},{id:3,availability:'unavailable'}]).map(x=>x.id),[1]);
});
test('search matches names, descriptions and repositories without case sensitivity',()=>{
  assert.equal(filterEntries([{name:'Magnet Simulation',description:'Engineering',repository:'Example/Magnets'}],'MAGNET engineering').length,1);
  assert.equal(filterEntries([{name:'Magnet',repository:'Example/Magnet'}],'chess').length,0);
});
test('unsafe links are rejected',()=>{
  for(const url of ['javascript:alert(1)','data:text/html,hi','file:///tmp/a','https://user:pass@example.com/','not a url']) assert.equal(safeURL(url),null);
});
test('metadata reads either attribute order and decodes HTML entities',()=>{
  assert.deepEqual(metadata('<title>Tools &amp; games</title><meta content="Build &amp; play" name="description">'),{title:'Tools & games',description:'Build & play'});
});
test('site checks follow custom domains without sending authorization headers',async()=>{
  const result=await inspectSite({repository:'Example/One'},config,async(url,options)=>{
    assert.equal(url,'https://example.github.io/One/');assert.equal(options.headers,undefined);
    return {ok:true,status:200,url:'https://custom.example/',headers:new Headers({'content-type':'text/html'}),text:async()=>'<title>One</title>'};
  });
  assert.equal(result.url,'https://custom.example/');assert.equal(result.availability,'available');
});
test('a missing launch page is retained as a resource, transient failures retain working links',async()=>{
  const site={repository:'Example/One',url:'https://example.github.io/One/',availability:'available'};
  assert.equal((await inspectSite(site,config,async()=>new Response('',{status:404}))).availability,'unavailable');
  assert.equal((await inspectSite(site,config,async()=>new Response('',{status:503}))).availability,'available');
  assert.equal((await inspectSite(site,config,async()=>{throw new Error('offline');})).availability,'available');
});
