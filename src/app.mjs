import {buildBatch} from './batch.mjs';
import {nativePrint} from './native-print.mjs';
import {exportPdf,exportPng,exportJpg,sheetGeometry,imageResolutionWarnings} from './print.mjs';
import {exportPackage} from './package-export.mjs';
import {loadCatalog} from './catalog.mjs';
import {customFormat,oriented,browserMeasure,composeDocument,svgDocument} from './engine.mjs';
import {families,proposals} from './templates.mjs';
import {readImage} from './images.mjs';
import {config} from './config.mjs';
const $=id=>document.getElementById(id),form=$('brief'),field=n=>form.elements.namedItem(n),grid=$('designs'),error=$('error'),editor=$('editor');
const {formats,source}=await loadCatalog(config);$('catalog-status').textContent=source==='supabase'?'Catálogo online':source==='fallback'?'Catálogo local · ligação indisponível':'Catálogo local';
const measure=browserMeasure(),assets={photo:null,logo:null},assetEpoch={photo:0,logo:0};let seed=0,selectedId='',docs=[],chosen=null,urls=[],detailUrls=[],timer,exporting=false,printUrl=null,revision=0,batchUrl=null,batchRevision=0,batchRunning=false;const pendingAssets=new Set();
function option(value,label){const o=document.createElement('option');o.value=value;o.textContent=label;return o}
for(const f of families)field('family').append(option(f.id,f.label));
function setFormats(){$('badge-fields').hidden=field('product').value!=='badge';$('batch-panel').hidden=field('product').value!=='badge';const select=field('format');select.replaceChildren(...formats.filter(f=>f.product===field('product').value).map(f=>option(f.id,f.label)),option('custom','Personalizado'));$('custom').hidden=select.value!=='custom'}
function clearUrls(list){for(const u of list)URL.revokeObjectURL(u);list.length=0}
function imgUrl(doc,side,list){const u=URL.createObjectURL(new Blob([svgDocument(doc,side,false)],{type:'image/svg+xml;charset=utf-8'}));list.push(u);return u}
function clearPrint(){revision++;clearBatch();if(printUrl){URL.revokeObjectURL(printUrl);printUrl=null}const a=$('print-download-link');a.hidden=true;a.removeAttribute('href');$('print-status').textContent='';$('accept-warnings').checked=false}
function select(id){const item=docs.find(x=>x.template.id===id);if(!item)return;clearPrint();selectedId=id;chosen=item;clearUrls(detailUrls);editor.hidden=false;$('chosen').textContent=item.template.family.label+' / '+item.template.layout;$('front').src=imgUrl(item.doc,'front',detailUrls);$('back').src=imgUrl(item.doc,'back',detailUrls);const g=item.doc.geometry;$('dimensions').textContent=g.w+' × '+g.h+' mm · sangria '+g.b+' mm · margem '+g.s+' mm';updateWarnings(item);for(const b of grid.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.id===id));}
function invalidate(){clearPrint();chosen=null;editor.hidden=true;docs=[];grid.replaceChildren();clearUrls(urls);clearUrls(detailUrls)}
function update(){clearTimeout(timer);error.textContent='';$('notice').textContent='';invalidate();if(pendingAssets.size)return;try{
 const p=Object.fromEntries(new FormData(form));if(!field('customColor').checked)delete p.color;
 const f=p.format==='custom'?customFormat(p.product,p.width,p.height,p.bleed,3):formats.find(x=>x.id===p.format&&x.product===p.product);
 const variants=proposals({family:p.family,industry:p.industry,seed});docs=variants.map(template=>{const options={format:f,profile:p,template,orientation:p.orientation,photo:assets.photo,logo:assets.logo,photoMode:p.photoMode,variation:seed,textScale:Number(p.textScale)/100,textAlign:p.textAlign,showPhoto:field('showPhoto').checked,showLogo:field('showLogo').checked,focusX:Number(p.focusX)/100,focusY:Number(p.focusY)/100,measure};return {template,options,doc:composeDocument(options)}});
 for(const item of docs){const article=document.createElement('article'),preview=document.createElement('img'),title=document.createElement('h3'),button=document.createElement('button');preview.alt='Frente · '+item.template.family.label;preview.src=imgUrl(item.doc,'front',urls);title.textContent=item.template.family.label+' / '+item.template.layout;button.type='button';button.dataset.id=item.template.id;button.textContent='Seleccionar';button.addEventListener('click',()=>select(item.template.id));article.append(preview,title,button);grid.append(article)}
 select(docs.some(d=>d.template.id===selectedId)?selectedId:docs[0].template.id);
 }catch(e){error.textContent=e instanceof Error?e.message:'Não foi possível criar os designs.'}}
function updateWarnings(item=chosen){if(!item)return;const warnings=[...new Set([...item.doc.warnings,...imageResolutionWarnings(item.doc,Number($('print-dpi').value))])];$('warnings').textContent=warnings.length?'Verificação: '+warnings.join(' '):'Sem alertas de dimensão ou resolução na análise inicial.';$('preflight-confirm').hidden=!warnings.length}
function approved(){if(!chosen||pendingAssets.size)return false;if(!$('preflight-confirm').hidden&&!$('accept-warnings').checked){$('print-status').textContent='Confirma os alertas de qualidade antes de exportar.';$('accept-warnings').focus();return false}return true}
function download(side){if(!approved())return;const data=svgDocument(chosen.doc,side,true),u=URL.createObjectURL(new Blob([data],{type:'image/svg+xml;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='kutuzov-'+chosen.template.id+'-'+side+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);$('notice').textContent='Download solicitado: '+side;}
$('download-front').addEventListener('click',()=>download('front'));$('download-back').addEventListener('click',()=>download('back'));
$('remix').addEventListener('click',()=>{seed=(seed+1)%5;update()});
form.addEventListener('submit',e=>{e.preventDefault();update()});
form.addEventListener('input',e=>{if(['product','format','photo','logo'].includes(e.target.name))return;invalidate();clearTimeout(timer);timer=setTimeout(update,180)});
field('product').addEventListener('change',()=>{setFormats();update()});
field('format').addEventListener('change',()=>{$('custom').hidden=field('format').value!=='custom';update()});
for(const k of ['photo','logo']){field(k).addEventListener('change',async()=>{const epoch=++assetEpoch[k];if(!field(k).files[0]){pendingAssets.delete(k);update();return}pendingAssets.add(k);invalidate();$('asset-status').textContent='A processar imagem localmente…';try{const a=await readImage(field(k).files[0],k==='logo');if(epoch!==assetEpoch[k])return;assets[k]=a;$('asset-status').textContent='Imagem carregada.'}catch(e){if(epoch===assetEpoch[k]){$('asset-status').textContent=e.message+(assets[k]?' A imagem anterior foi mantida.':'');field(k).value=''}}finally{if(epoch===assetEpoch[k]){pendingAssets.delete(k);update()}}});form.querySelector('[data-clear="'+k+'"]').addEventListener('click',()=>{assetEpoch[k]++;pendingAssets.delete(k);assets[k]=null;field(k).value='';$('asset-status').textContent='Imagem removida.';update()})}
window.addEventListener('pagehide',e=>{if(!e.persisted){clearUrls(urls);clearUrls(detailUrls)}});
setFormats();update();

const printButtons=['download-pdf','download-sheet','download-sheet-a3','download-zip','download-png-front','download-png-back','download-jpg-front','download-jpg-back'].map($);
window.addEventListener('pagehide',e=>{if(!e.persisted&&printUrl)URL.revokeObjectURL(printUrl)});
async function runExport(kind,side){
 if(exporting||!approved())return;const item=chosen,started=revision,dpi=Number($('print-dpi').value),marks=$('print-marks').checked;
 exporting=true;printButtons.forEach(b=>b.disabled=true);$('print-status').textContent='A preparar ficheiro localmente…';
 try{const sheet=kind==='sheet'||kind==='sheet-a3',paper=kind==='sheet-a3'?'A3':'A4';const blob=kind==='png'?await exportPng(item.doc,side,dpi):kind==='jpg'?await exportJpg(item.doc,side,dpi):kind==='zip'?await exportPackage(item.doc,{dpi,marks}):await exportPdf(item.doc,{dpi,marks,sheet,paper});
 if(started!==revision)return;if(printUrl)URL.revokeObjectURL(printUrl);printUrl=URL.createObjectURL(blob);const a=$('print-download-link');a.href=printUrl;a.download='kutuzov-'+item.template.id+'-'+(sheet?paper.toLowerCase():['png','jpg'].includes(kind)?side:kind==='zip'?'package':'duplex')+'-'+dpi+'dpi.'+(['png','jpg','zip'].includes(kind)?kind:'pdf');a.hidden=false;a.click();
 $('print-status').textContent=sheet?'PDF '+paper+' preparado: '+sheetGeometry(item.doc.geometry,paper).count+' cartões por face. Imprime a 100%, duplex pela margem longa.':'Ficheiro preparado. Verifica a escala e os requisitos da gráfica.';
 }catch(e){if(started===revision)$('print-status').textContent=e instanceof Error?e.message:'Falha na exportação.'}finally{exporting=false;printButtons.forEach(b=>b.disabled=false)}
}
$('download-pdf').addEventListener('click',()=>runExport('pdf'));$('download-sheet').addEventListener('click',()=>runExport('sheet'));$('download-png-front').addEventListener('click',()=>runExport('png','front'));$('download-png-back').addEventListener('click',()=>runExport('png','back'));

$('native-print-button').addEventListener('click',async()=>{if(exporting||!approved())return;const started=revision;exporting=true;$('native-print-button').disabled=true;try{await nativePrint(chosen.doc,$('print-marks').checked,()=>revision===started)}catch(e){if(revision===started)$('print-status').textContent=e.message}finally{exporting=false;$('native-print-button').disabled=false}});
for(const id of ['print-dpi','print-marks'])$(id).addEventListener('change',()=>{clearPrint();updateWarnings()});
$('download-sheet-a3').addEventListener('click',()=>runExport('sheet-a3'));$('download-zip').addEventListener('click',()=>runExport('zip'));$('download-jpg-front').addEventListener('click',()=>runExport('jpg','front'));$('download-jpg-back').addEventListener('click',()=>runExport('jpg','back'));

function clearBatch(){batchRevision++;if(batchUrl){URL.revokeObjectURL(batchUrl);batchUrl=null}const a=$('batch-link');a.hidden=true;a.removeAttribute('href');$('batch-status').textContent=''}
for(const id of ['batch-csv','batch-photos','batch-warnings'])$(id).addEventListener('change',clearBatch);
$('batch-cancel').addEventListener('click',()=>{clearBatch();$('batch-status').textContent='Lote cancelado.'});
$('batch-example').addEventListener('click',()=>{const u=URL.createObjectURL(new Blob(['name,role,company,department,badgeId,badgeKind,expiry,qr,photo\nAna Teste,Designer,Studio,Arte,001,employee,,,ana.jpg\n'],{type:'text/csv'}));const a=document.createElement('a');a.href=u;a.download='kutuzov-badges.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)});
$('batch-run').addEventListener('click',async()=>{if(batchRunning||exporting||!chosen||pendingAssets.size)return;const csv=$('batch-csv').files[0];if(!csv||csv.size>1000000){$('batch-status').textContent='Selecciona um CSV até 1 MB.';return}clearBatch();const epoch=batchRevision;batchRunning=true;$('batch-run').disabled=true;try{const blob=await buildBatch({csv:await csv.text(),photos:[...$('batch-photos').files],options:chosen.options,dpi:Number($('print-dpi').value),marks:$('print-marks').checked,acceptWarnings:$('batch-warnings').checked,isCurrent:()=>epoch===batchRevision,onProgress:(n,total)=>{$('batch-status').textContent=n+' / '+total+' preparados.'}});if(epoch!==batchRevision)return;batchUrl=URL.createObjectURL(blob);const a=$('batch-link');a.href=batchUrl;a.download='kutuzov-badges.zip';a.hidden=false;a.click();$('batch-status').textContent='Lote preparado.'}catch(e){if(epoch===batchRevision)$('batch-status').textContent=e.message}finally{batchRunning=false;$('batch-run').disabled=false}});
