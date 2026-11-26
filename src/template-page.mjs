import {illustratorBridge} from './kutuzov-native.mjs';
import {parsePack,packFields,fields,composeImported} from './template-runtime.mjs';
import {browserMeasure,svgDocument} from './engine.mjs';
import {readImage} from './images.mjs';
import {exportPdf,exportPng,imageResolutionWarnings} from './print.mjs';
import {exportPackage} from './package-export.mjs';
const $=id=>document.getElementById(id),measure=browserMeasure(),form=$('template-form'),inputs=$('template-fields');
let pack=null,doc=null,assets={},revision=0,loadEpoch=0,urls=[],pending=new Set(),assetEpoch={},busy=false,downloadUrl=null;
function resetUrls(){for(const u of urls)URL.revokeObjectURL(u);urls=[]}
function status(s){$('template-status').textContent=s}
function buttons(){for(const b of document.querySelectorAll('[data-export]'))b.disabled=!doc||busy||pending.size>0}
function invalidate(){revision++;doc=null;buttons();$('template-download-link').hidden=true;if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=null}
function refresh(){
 invalidate();if(!pack||pending.size)return;
 try{doc=composeImported(pack,Object.fromEntries(new FormData(form)),assets,measure);resetUrls();for(const side of ['front','back']){const u=URL.createObjectURL(new Blob([svgDocument(doc,side,false)],{type:'image/svg+xml'}));urls.push(u);$(side+'-art').src=u}$('template-preview').hidden=false;const warnings=[...new Set([...doc.warnings,...imageResolutionWarnings(doc,300)])];$('template-warnings').textContent=warnings.join(' ');$('template-ack').hidden=!warnings.length;$('template-confirm').checked=false;status('');}
 catch(e){$('template-preview').hidden=true;status(e.message)}buttons()
}
async function load(text,epoch,approvedOnly=false){
 if(epoch!==loadEpoch)return;
 const next=parsePack(text);if(approvedOnly&&next.status!=='approved')throw Error('Modelo não aprovado.');
 for(const side of ['front','back']){const im=new Image();im.src=next.sides[side].art.data;await im.decode();if(im.naturalWidth!==next.sides[side].art.width||im.naturalHeight!==next.sides[side].art.height)throw Error('Imagem inválida.')}
 if(epoch!==loadEpoch)return;invalidate();resetUrls();pack=next;assets={};pending=new Set();assetEpoch={};inputs.replaceChildren();$('template-preview').hidden=true;$('template-title').textContent=pack.title;$('template-draft').hidden=pack.status==='approved';
 for(const key of packFields(pack)){const label=document.createElement('label'),span=document.createElement('span'),input=document.createElement('input');span.textContent=fields[key];input.name=key;input.id='field-'+key;
 if(key==='photo'||key==='logo'){input.type='file';input.accept='image/png,image/jpeg,image/webp';input.addEventListener('change',async()=>{const marker=pack,n=(assetEpoch[key]||0)+1;assetEpoch[key]=n;pending.add(key);invalidate();delete assets[key];try{if(input.files[0]){const a=await readImage(input.files[0],key==='logo');if(pack===marker&&assetEpoch[key]===n)assets[key]=a}}catch(e){if(pack===marker&&assetEpoch[key]===n)status(e.message)}finally{if(pack===marker&&assetEpoch[key]===n){pending.delete(key);refresh()}}});}
 else {input.type=key==='email'?'email':key==='phone'?'tel':key==='expiry'?'date':'text';input.maxLength=({name:80,role:80,company:80,phone:40,email:120,website:100,address:140,slogan:100,qr:106,barcode:24,department:80,badgeId:40})[key]||80;if(key==='name')input.required=true;if(key==='badgeKind'){const select=document.createElement('select');select.name=key;for(const [v,t] of Object.entries({employee:'Colaborador',visitor:'Visitante',event:'Evento',speaker:'Orador',student:'Estudante',crew:'Equipa'})){const o=document.createElement('option');o.value=v;o.textContent=t;select.append(o)}label.append(span,select);inputs.append(label);continue}}
 label.append(span,input);inputs.append(label);}
 form.hidden=false;status('Preenche os teus dados.');buttons();
}
$('template-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;const epoch=++loadEpoch;try{if(f.size>32100000)throw Error('Modelo demasiado grande.');await load(await f.text(),epoch)}catch(e){if(epoch===loadEpoch)status(e.message)}finally{$('template-file').value=''}});
form.addEventListener('submit',e=>{e.preventDefault();refresh()});form.addEventListener('input',e=>{if(e.target.type!=='file')refresh()});form.addEventListener('change',e=>{if(e.target.tagName==='SELECT')refresh()});
for(const b of document.querySelectorAll('[data-export]'))b.addEventListener('click',async()=>{if(!doc||busy||pending.size)return;if(!$('template-ack').hidden&&!$('template-confirm').checked){status('Confirma os avisos de impressão.');return}const rev=revision,snapshot=doc,k=b.dataset.export;busy=true;buttons();try{let blob;if(k==='pdf')blob=await exportPdf(snapshot,{dpi:300,marks:true});else if(k==='jsx')blob=new Blob([illustratorBridge(snapshot)],{type:'text/plain;charset=utf-8'});else if(k==='zip')blob=await exportPackage(snapshot,{dpi:300});else if(k==='png')blob=await exportPng(snapshot,'front',300);else blob=new Blob([svgDocument(snapshot,k,true)],{type:'image/svg+xml'});if(rev!==revision)return;if(downloadUrl)URL.revokeObjectURL(downloadUrl);downloadUrl=URL.createObjectURL(blob);const a=$('template-download-link');a.href=downloadUrl;a.download=pack.id+(k==='front'||k==='back'?'-'+k+'.svg':'.'+k);a.hidden=false;a.click();status('Ficheiro preparado.')}catch(e){if(rev===revision)status(e.message)}finally{busy=false;buttons()}});
async function catalog(){try{const r=await fetch('./template-library/catalog.json',{credentials:'omit'});if(!r.ok)return;const list=await r.json();if(!Array.isArray(list)||list.length>100)return;for(const item of list){if(!/^[a-z0-9-]{1,64}$/.test(item.id)||typeof item.title!=='string')continue;const b=document.createElement('button');b.type='button';b.textContent=item.title;b.addEventListener('click',async()=>{const epoch=++loadEpoch;try{const r=await fetch('./template-library/'+item.id+'.json',{credentials:'omit'});if(!r.ok)throw Error('Modelo indisponível.');await load(await r.text(),epoch,true)}catch(e){if(epoch===loadEpoch)status(e.message)}});$('template-library').append(b)}if(list.length)$('template-library').hidden=false}catch{}}
catalog();
