import assert from 'node:assert/strict';
import {loadCatalog,builtIn} from '../src/catalog.mjs';
import {config} from '../src/config.mjs';
const sort=a=>[...a].sort((x,y)=>x.id.localeCompare(y.id));
const r=await loadCatalog(config);assert.equal(r.source,'supabase','Live API must not silently fall back');assert.deepEqual(sort(r.formats),sort(builtIn));
const url=new URL('/rest/v1/studio_formats',config.url);url.searchParams.set('select','published');const forbidden=await fetch(url,{headers:{apikey:config.key},signal:AbortSignal.timeout(10000)});assert.equal(forbidden.status,403);console.log('Live public catalog contract verified');
