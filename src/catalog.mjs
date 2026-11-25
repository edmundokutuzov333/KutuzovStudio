import {validFormat} from './engine.mjs';
export const builtIn = Object.freeze([
  {
    "id": "eu-card",
    "product": "card",
    "label": "Europeu · 85 × 55",
    "width_mm": 85,
    "height_mm": 55,
    "bleed_mm": 3,
    "safe_mm": 3,
    "position": 10
  },
  {
    "id": "wide-card",
    "product": "card",
    "label": "Horizontal · 90 × 50",
    "width_mm": 90,
    "height_mm": 50,
    "bleed_mm": 3,
    "safe_mm": 3,
    "position": 20
  },
  {
    "id": "us-card",
    "product": "card",
    "label": "Americano · 88,9 × 50,8",
    "width_mm": 88.9,
    "height_mm": 50.8,
    "bleed_mm": 3,
    "safe_mm": 3,
    "position": 30
  },
  {
    "id": "square-card",
    "product": "card",
    "label": "Quadrado · 55 × 55",
    "width_mm": 55,
    "height_mm": 55,
    "bleed_mm": 3,
    "safe_mm": 3,
    "position": 40
  },
  {
    "id": "cr80",
    "product": "badge",
    "label": "PVC · 85,60 × 53,98",
    "width_mm": 85.6,
    "height_mm": 53.98,
    "bleed_mm": 2,
    "safe_mm": 3,
    "position": 10
  },
  {
    "id": "vertical-badge",
    "product": "badge",
    "label": "Vertical · 54 × 86",
    "width_mm": 54,
    "height_mm": 86,
    "bleed_mm": 3,
    "safe_mm": 4,
    "position": 20
  },
  {
    "id": "event-badge",
    "product": "badge",
    "label": "Evento · 70 × 100",
    "width_mm": 70,
    "height_mm": 100,
    "bleed_mm": 3,
    "safe_mm": 4,
    "position": 30
  },
  {
    "id": "conference-badge",
    "product": "badge",
    "label": "Conferência · 90 × 120",
    "width_mm": 90,
    "height_mm": 120,
    "bleed_mm": 3,
    "safe_mm": 5,
    "position": 40
  }
].map(Object.freeze));
export async function loadCatalog(config={}, fetcher=globalThis.fetch){
 if(!config.url||!config.key)return {formats:builtIn,source:'local'};
 try {const url=new URL('/rest/v1/studio_formats',config.url);if(url.protocol!=='https:'||url.username||url.password||url.port||!url.hostname.endsWith('.supabase.co')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.key))throw Error('Invalid public catalog configuration');url.searchParams.set('select','id,product,label,width_mm,height_mm,bleed_mm,safe_mm,position');url.searchParams.set('order','position.asc,id.asc');const r=await fetcher(url,{headers:{apikey:config.key},redirect:'error',credentials:'omit',signal:AbortSignal.timeout(4000)});if(!r.ok)throw Error('Catalog unavailable');const payload=await r.json();if(!Array.isArray(payload)||payload.length>100)throw Error('Invalid catalog');const rows=payload.map(row=>{if(!row||typeof row!=='object')throw Error('Invalid row');const out={...row};for(const k of ['width_mm','height_mm','bleed_mm','safe_mm'])if(typeof out[k]==='string'&&/^\d+(?:\.\d{1,2})?$/.test(out[k]))out[k]=Number(out[k]);return out});if(!rows.every(validFormat)||new Set(rows.map(x=>x.id)).size!==rows.length||!['card','badge'].every(p=>rows.some(x=>x.product===p)))throw Error('Invalid catalog');return {formats:Object.freeze(rows.map(Object.freeze)),source:'supabase'};}catch{return {formats:builtIn,source:'fallback'};}
}
