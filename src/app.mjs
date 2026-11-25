import {loadCatalog} from './catalog.mjs';
import {customFormat,oriented,browserMeasure,composeDocument,svgDocument} from './engine.mjs';
import {families,proposals} from './templates.mjs';
import {readImage} from './images.mjs';
import {config} from './config.mjs';
const $=id=>document.getElementById(id),form=$('brief'),field=n=>form.elements.namedItem(n),grid=$('designs'),error=$('error'),editor=$('editor');
const {formats,source}=await loadCatalog(config);$('catalog-status').textContent=source==='supabase'?'Catálogo online':source==='fallback'?'Catálogo local · ligação indisponível':'Catálogo local';
const measure=browserMeasure(),assets={photo:null,logo:null},assetEpoch={photo:0,logo:0};let seed=0,selectedId='',docs=[],chosen=null,urls=[],detailUrls=[],timer;
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o}
for(const f of families)field('family').append(option(f.id,f.label));
function setFormats(){const select=field('format');select.replaceChildren(...formats.filter(f=>f.product===field('product').value).map(f=>option(f.id,f.label)),option('custom','Personalizado'));$('custom').hidden=select.value!=='custom'}
function clearUrls(list){for(const u of list)URL.revokeObjectURL(u);list.length=0}
function imgUrl(doc,side,list){const u=URL.createObjectURL(new Blob([svgDocument(doc,side,false)],{type:'image/svg+xml;charset=utf-8'}));list.push(u);return u}
function select(id){const item=docs.find(x=>x.template.id===id);if(!item)return;selectedId=id;chosen=item;clearUrls(detailUrls);editor.hidden=false;$('chosen').textContent=item.template.family.label+' / '+item.template.layout;$('front').src=imgUrl(item.doc,'front',detailUrls);$('back').src=imgUrl(item.doc,'back',detailUrls);const g=item.doc.geometry;$('dimensions').textContent=g.w+' × '+g.h+' mm · sangria '+g.b+' mm · margem '+g.s+' mm';$('warnings').textContent=item.doc.warnings.length?'Verificação: '+item.doc.warnings.join(' '):'Sem alertas de dimensão ou resolução na análise inicial.';for(const b of grid.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.id===id));}
function invalidate(){chosen=null;editor.hidden=true;docs=[];grid.replaceChildren();clearUrls(urls);clearUrls(detailUrls)}
function update(){clearTimeout(timer);error.textContent='';$('notice').textContent='';invalidate();try{
 const p=Object.fromEntries(new FormData(form));if(!field('customColor').checked)delete p.color;
 const f=p.format==='custom'?customFormat(p.product,p.width,p.height,p.bleed,3):formats.find(x=>x.id===p.format&&x.product===p.product);
 const variants=proposals({family:p.family,industry:p.industry,seed});docs=variants.map(template=>({template,doc:composeDocument({format:f,profile:p,template,orientation:p.orientation,photo:assets.photo,logo:assets.logo,photoMode:p.photoMode,variation:seed,focusX:Number(p.focusX)/100,focusY:Number(p.focusY)/100,measure})}));
 for(const item of docs){const article=document.createElement('article'),preview=document.createElement('img'),title=document.createElement('h3'),button=document.createElement('button');preview.alt='Frente · '+item.template.family.label;preview.src=imgUrl(item.doc,'front',urls);title.textContent=item.template.family.label+' / '+item.template.layout;button.type='button';button.dataset.id=item.template.id;button.textContent='Seleccionar';button.addEventListener('click',()=>select(item.template.id));article.append(preview,title,button);grid.append(article)}
 select(docs.some(d=>d.template.id===selectedId)?selectedId:docs[0].template.id);
 }catch(e){error.textContent=e instanceof Error?e.message:'Não foi possível criar os designs.'}}
function download(side){if(!chosen)return;const data=svgDocument(chosen.doc,side,true),u=URL.createObjectURL(new Blob([data],{type:'image/svg+xml;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='kutuzov-'+chosen.template.id+'-'+side+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);$('notice').textContent='Download solicitado: '+side;}
$('download-front').addEventListener('click',()=>download('front'));$('download-back').addEventListener('click',()=>download('back'));
$('remix').addEventListener('click',()=>{seed=(seed+1)%5;update()});
form.addEventListener('submit',e=>{e.preventDefault();update()});
form.addEventListener('input',e=>{if(['product','format','photo','logo'].includes(e.target.name))return;invalidate();clearTimeout(timer);timer=setTimeout(update,180)});
field('product').addEventListener('change',()=>{setFormats();update()});
field('format').addEventListener('change',()=>{$('custom').hidden=field('format').value!=='custom';update()});
for(const k of ['photo','logo']){field(k).addEventListener('change',async()=>{const epoch=++assetEpoch[k];if(!field(k).files[0])return;$('asset-status').textContent='A processar imagem localmente…';try{const a=await readImage(field(k).files[0],k==='logo');if(epoch!==assetEpoch[k])return;assets[k]=a;$('asset-status').textContent='Imagem carregada.';update()}catch(e){if(epoch===assetEpoch[k]){$('asset-status').textContent=e.message;field(k).value=''}}});form.querySelector('[data-clear="'+k+'"]').addEventListener('click',()=>{assetEpoch[k]++;assets[k]=null;field(k).value='';$('asset-status').textContent='Imagem removida.';update()})}
window.addEventListener('pagehide',()=>{clearUrls(urls);clearUrls(detailUrls)});
setFormats();update();
