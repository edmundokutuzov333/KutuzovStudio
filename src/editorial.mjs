import {validBackground} from './backgrounds.mjs';
import {defaultManifest} from './editorial-default.mjs';
import {families,templates} from './templates.mjs';
import {config} from './config.mjs';
const familyIds=new Set(families.map(f=>f.id)),templateIds=new Set(templates.map(t=>t.id));
export function validateManifest(m){
 if(!m||m.version!==1||JSON.stringify(m).length>65536)throw Error('Versão de catálogo inválida.');
 const keys=['version','products','collections','templates','palettes','fonts','assets'];if(Object.keys(m).some(k=>!keys.includes(k)))throw Error('Campo editorial não autorizado.');const out={version:1};for(const k of ['products','collections','templates','palettes','fonts','assets']){
  if(!Array.isArray(m[k])||!m[k].length||m[k].length>120)throw Error('Lista inválida: '+k);const ids=new Set();
  out[k]=m[k].map(v=>{if(k==='templates'){if(!templateIds.has(v)||ids.has(v))throw Error('Template inválido');ids.add(v);return v}
   if(!v||typeof v.id!=='string'||!/^[a-z0-9-]{1,50}$/.test(v.id)||ids.has(v.id)||typeof v.label!=='string'||v.label.length<1||v.label.length>100)throw Error('Recurso inválido: '+k);ids.add(v.id);const allowed={products:['id','label'],collections:['id','label','families'],palettes:['id','label','color'],fonts:['id','label','license'],assets:['id','label','license','kind']}[k];if(Object.keys(v).some(x=>!allowed.includes(x)))throw Error('Campo editorial não autorizado.');const r={id:v.id,label:v.label};
   if(k==='products'&&!['card','badge'].includes(v.id))throw Error('Produto inválido');
   if(k==='collections'){if(!Array.isArray(v.families)||v.families.length!==5||new Set(v.families).size!==5||v.families.some(f=>!familyIds.has(f)))throw Error('Colecção inválida');r.families=[...v.families]}
   if(k==='palettes'){if(typeof v.color!=='string'||!/^#[0-9a-f]{6}$/i.test(v.color))throw Error('Cor inválida');r.color=v.color}
   if(k==='fonts'){if(!['sans-serif','serif','monospace'].includes(v.id)||v.license!=='system')throw Error('Fonte inválida');r.license=v.license}
   if(k==='assets'){if(v.kind!=='procedural'||v.license!=='original'||!validBackground(v.id)||v.id==='none')throw Error('Recurso externo não autorizado');r.kind=v.kind;r.license=v.license}
   return r});
  if(k==='products'&&ids.size!==2||k==='templates'&&ids.size!==templateIds.size)throw Error('Catálogo incompleto.');
 }return out;
}
export async function loadEditorial(fetcher=globalThis.fetch){
 try{const url=new URL('/rest/v1/studio_releases',config.url);url.searchParams.set('select','id,title,manifest,status');url.searchParams.set('status','eq.published');const r=await fetcher(url,{headers:{apikey:config.key},credentials:'omit',redirect:'error',signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error('Catálogo indisponível');const rows=await r.json();if(!Array.isArray(rows)||rows.length!==1||rows[0].status!=='published'||typeof rows[0].title!=='string'||rows[0].title.length>100)throw Error('Publicação inválida');return {manifest:validateManifest(rows[0].manifest),title:rows[0].title,source:'supabase'}}catch{return {manifest:validateManifest(defaultManifest),title:'Studio Essentials 2.0',source:'local'}}
}
