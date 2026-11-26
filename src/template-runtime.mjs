import {geometry,customFormat,fitBlock,normalizeProfile,defaultMeasure} from './engine.mjs';
import {badgeFields,code39Bars} from './badge.mjs';
import {qrMatrix} from './qr.mjs';
export const fields=Object.freeze({name:'Nome',role:'Cargo',company:'Empresa',phone:'Telefone',email:'Email',website:'Website',address:'Morada',slogan:'Slogan',department:'Departamento',badgeId:'Identificação',badgeKind:'Categoria',expiry:'Validade',qr:'QR Code',barcode:'Código de barras',photo:'Fotografia',logo:'Logótipo'});
const MAX=32000000,hex=/^#[0-9a-f]{6}$/i,keys=Object.keys(fields);
const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
function fail(msg){throw Error(msg)}
function png(a){
 if(!a||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.width<1||a.height<1||a.width*a.height>12000000||typeof a.data!=='string'||a.data.length>MAX||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(a.data))fail('Imagem PNG inválida.');
 let b;try{b=atob(a.data.slice(22,66))}catch{fail('PNG inválido.')}
 const n=i=>b.charCodeAt(i),u=i=>n(i)*16777216+n(i+1)*65536+n(i+2)*256+n(i+3);
 if(b.slice(0,8)!=='\x89PNG\r\n\x1a\n'||b.slice(12,16)!=='IHDR'||u(16)!==a.width||u(20)!==a.height)fail('Dimensões PNG inconsistentes.');
 return {data:a.data,width:a.width,height:a.height};
}
export function validatePack(raw){
 if(!raw||raw.version!==1||raw.kind!=='kutuzov-template'||!/^[a-z0-9-]{1,64}$/.test(raw.id)||typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>100||!['card','badge'].includes(raw.product)||!['draft','approved'].includes(raw.status)||raw.rights!=='editable')fail('Modelo inválido ou direitos não autorizados.');
 const format=customFormat(raw.product,raw.width,raw.height,raw.bleed,raw.safe),g=geometry(format),sides={};let total=0,hasName=false;
 for(const side of ['front','back']){
  const q=raw.sides?.[side];if(!q||!Array.isArray(q.slots)||q.slots.length>32||!(/^[0-9a-f]{64}$/.test(q.sourceHash||'')))fail('Face inválida: '+side);
  const art=png(q.art);total+=art.data.length;if(Math.abs(art.width/art.height-g.width/g.height)>.003)fail('Proporção da arte não corresponde ao formato.');
  const slots=q.slots.map(n=>{
   if(!n||!keys.includes(n.field)||!['text','qr','barcode','photo','logo'].includes(n.kind))fail('Campo inválido.');
   const {x,y,w,h}=n;if(!finite(x,g.s,g.w-g.s)||!finite(y,g.s,g.h-g.s)||!finite(w,.1,g.w)||!finite(h,.1,g.h)||x+w>g.w-g.s+.001||y+h>g.h-g.s+.001)fail('Campo fora da margem segura: '+n.field);
   if(n.kind!=='text'&&n.field!==n.kind||n.kind==='text'&&['qr','barcode','photo','logo'].includes(n.field))fail('Tipo de campo inconsistente.');
   if(n.field==='name')hasName=true;
   const result={field:n.field,kind:n.kind,x,y,w,h};
   if(n.kind==='text'){if(!hex.test(n.color)||!['sans-serif','serif','monospace'].includes(n.font)||!['start','middle'].includes(n.align)||![400,500,600,700,800,900].includes(n.weight)||!finite(n.size,.5,40)||typeof n.required!=='boolean')fail('Tipografia inválida.');Object.assign(result,{color:n.color,font:n.font,align:n.align,weight:n.weight,size:n.size,required:n.required})}
   return result;
  });
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){const a=slots[i],b=slots[j];if(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>.02&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>.02)fail('Campos sobrepostos: '+a.field+' / '+b.field)}
  sides[side]={art,slots,sourceHash:q.sourceHash};
 }
 if(!hasName||total>MAX)fail('O modelo precisa de um nome editável e respeitar o limite de tamanho.');
 return {version:1,kind:'kutuzov-template',id:raw.id,title:raw.title,product:raw.product,status:raw.status,rights:raw.rights,width:g.w,height:g.h,bleed:g.b,safe:g.s,sides};
}
export function parsePack(text){if(typeof text!=='string'||text.length>MAX+100000)fail('Modelo demasiado grande.');return validatePack(JSON.parse(text))}
export function packFields(pack){return keys.filter(k=>Object.values(pack.sides).some(s=>s.slots.some(n=>n.field===k)))}
function assetValid(a){return a&&typeof a.data==='string'&&a.data.length<=20000000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(a.data)&&Number.isInteger(a.width)&&Number.isInteger(a.height)&&a.width>0&&a.height>0&&a.width<=2400&&a.height<=2400}
export function composeImported(pack,profile,assets={},measure=defaultMeasure){
 const p=normalizeProfile(profile),badge=pack.product==='badge'?badgeFields(profile):null,g=geometry(customFormat(pack.product,pack.width,pack.height,pack.bleed,pack.safe)),sides={},warnings=[];
 const values={...p,department:badge?.department||'',badgeId:badge?.id||'',badgeKind:badge?.label||'',expiry:badge?.expiry||'',barcode:badge?.barcode||''};
 for(const side of ['front','back']){
  const q=pack.sides[side],nodes=[{kind:'rect',x:-g.b,y:-g.b,w:g.width,h:g.height,fill:'#ffffff'},{kind:'image',asset:q.art,x:-g.b,y:-g.b,w:g.width,h:g.height,mode:'contain',focusX:.5,focusY:.5}];
  for(const n of q.slots){
   const v=values[n.field]||'';
   if(n.kind==='text'){
    if(n.required&&!v)fail('Preenche '+fields[n.field]+'.');
    if(!v)continue;
    const f=fitBlock([{key:n.field,value:v,size:n.size,weight:n.weight,fill:n.color,gap:0}],{x:n.x,y:n.y,w:n.w,h:n.h,center:true,align:n.align},n.font,measure);nodes.push(...f.nodes);warnings.push(...f.warnings);
   }else if(n.kind==='qr'&&v){qrMatrix(v);const size=Math.min(n.w,n.h);if(size/45<.4)warnings.push('QR pequeno. Confirma a leitura após impressão.');nodes.push({kind:'qr',value:v,x:n.x+(n.w-size)/2,y:n.y+(n.h-size)/2,size})}
   else if(n.kind==='barcode'&&v){if(n.w/code39Bars(v).modules<.19)warnings.push('Código de barras estreito.');nodes.push({kind:'barcode',value:v,x:n.x,y:n.y,w:n.w,h:n.h})}
   else if(['photo','logo'].includes(n.kind)&&assets[n.kind]){const a=assets[n.kind];if(!assetValid(a))fail('Imagem inválida.');nodes.push({kind:'image',asset:a,x:n.x,y:n.y,w:n.w,h:n.h,mode:n.kind==='photo'?'cover':'contain',focusX:.5,focusY:.5})}
  }
  sides[side]=nodes;
 }
 return {geometry:g,templateId:pack.id,artVersion:3,sides,warnings:[...new Set(warnings)],backgroundRights:'editable'};
}
