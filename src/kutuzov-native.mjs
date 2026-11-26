import {svgDocument} from './engine.mjs';
import {assertEditable} from './asset-policy.mjs';
export const MAX_NATIVE=100_000_000;
export function nativeKind(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<100||bytes.length>MAX_NATIVE)throw Error('Ficheiro inválido ou acima de 100 MB.');
 const text=new TextDecoder('latin1').decode(bytes);
 if(/^%PDF-\d\.\d/.test(text)&&/\/Illustrator\b/.test(text)&&/\/(?:AIPrivateData|AIPDFPrivateData|AIPrivateData\d+|AIPDFPrivateData\d+|AIPrivateDataStream)\b/.test(text)&&/%%EOF\s*$/.test(text))return 'ai-pdf';
 if(/^%!PS-Adobe-/.test(text)&&/%%Creator:[^\r\n]*Illustrator/i.test(text)&&/%AI[35789]_(?:FileFormat|ColorUsage|TemplateBox|ArtSize)/.test(text)&&/%%EndSetup/.test(text))return 'ai-legacy';
 throw Error('Não foi reconhecida uma estrutura AI nativa. PDF, SVG e JSON não são ficheiros .kutuzov nativos.');
}
export function nativeCopy(bytes){const kind=nativeKind(bytes);return {kind,bytes:bytes.slice()}}
export function nativeName(name,extension='kutuzov'){
 if(!['ai','kutuzov'].includes(extension))throw Error('Extensão inválida.');
 const stem=String(name).replace(/\.(ai|kutuzov)$/i,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').trim().slice(0,120);
 return (stem||'design')+'.'+extension;
}
export function bridgeSvg(doc){
 assertEditable(doc);const {w,h,b}=doc.geometry;
 if(![w,h,b].every(Number.isFinite)||w<25||w>200||h<25||h>200||b<0||b>5)throw Error('Dimensões inválidas.');
 const aw=w+2*b,ah=h+2*b,gap=12,W=2*aw+gap,body=side=>{const svg=svgDocument(doc,side,true);return svg.slice(svg.indexOf('>')+1,svg.lastIndexOf('</svg>'))};
 return {svg:'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+W+'mm" height="'+ah+'mm" viewBox="0 0 '+W+' '+ah+'"><defs><clipPath id="studio-front-bound"><rect x="0" y="0" width="'+aw+'" height="'+ah+'"/></clipPath><clipPath id="studio-back-bound"><rect x="'+(aw+gap)+'" y="0" width="'+aw+'" height="'+ah+'"/></clipPath></defs><g clip-path="url(#studio-front-bound)"><g transform="translate('+b+' '+b+')">'+body('front').replace(/<image href=/g,'<image xlink:href=')+'</g></g><g clip-path="url(#studio-back-bound)"><g transform="translate('+(aw+gap+b)+' '+b+')">'+body('back').replace(/<image href=/g,'<image xlink:href=')+'</g></g></svg>',w,h,b,aw,ah,gap,W,text:[...doc.sides.front,...doc.sides.back].filter(x=>x.kind==='text').map(x=>({key:x.key||'text',value:x.value}))};
}
export function illustratorBridge(doc){
 const p=bridgeSvg(doc),name=nativeName('kutuzov-'+doc.templateId);
 // JSON strings are data literals, not user-authored script. Escape line separators for ExtendScript ES3.
 const literal=x=>JSON.stringify(x).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return '#target illustrator\nvar STUDIO='+literal(p)+';\nvar DEFAULT_NAME='+literal(name)+';\n'+BRIDGE;
}
const BRIDGE=String.raw`(function(){
 var dest=File.saveDialog("Guardar AI nativo como "+DEFAULT_NAME);if(!dest)return;
 if(!/\.kutuzov$/i.test(dest.name))dest=new File(dest.parent.fsName+'/'+dest.name.replace(/\.ai$/i,'')+'.kutuzov');
 if(dest.exists){alert("Escolhe um novo nome. Nenhum ficheiro foi alterado.");return;}
 var tmp=new Folder(Folder.temp.fsName+'/kutuzov-'+new Date().getTime()+'-'+Math.floor(Math.random()*1000000));
 var svgFile=null,ai=null,d=null,proof=null,created=false;
 function check(ok,msg){if(!ok)throw new Error(msg);}
 function verify(doc){
   check(doc.artboards.length===2,"Esperavam-se duas pranchetas.");
   check(doc.pathItems.length+doc.rasterItems.length+doc.placedItems.length>0,"Arte vazia.");
   for(var n=0;n<2;n++){var r=doc.artboards[n].artboardRect;check(Math.abs(r[2]-r[0]-STUDIO.w*72/25.4)<0.25&&Math.abs(r[1]-r[3]-STUDIO.h*72/25.4)<0.25,"Dimensoes incorrectas.");}
   var remaining=[];for(var i=0;i<doc.textFrames.length;i++)remaining.push(doc.textFrames[i].contents);
   for(var j=0;j<STUDIO.text.length;j++){var found=-1;for(var k=0;k<remaining.length;k++)if(remaining[k]===STUDIO.text[j].value){found=k;break;}check(found>=0,"Texto nao preservado: "+STUDIO.text[j].key);remaining.splice(found,1);}
 }
 try{
  check(tmp.create(),"Nao foi possivel criar pasta temporaria.");
  svgFile=new File(tmp.fsName+'/art.svg');svgFile.encoding='UTF-8';check(svgFile.open('w'),"Nao foi possivel escrever SVG.");svgFile.write(STUDIO.svg);svgFile.close();
  d=app.open(svgFile);var old=d.artboards[0].artboardRect,pt=72/25.4;
  check(Math.abs((old[2]-old[0])-STUDIO.W*pt)<.5&&Math.abs((old[1]-old[3])-STUDIO.ah*pt)<.5,"Importacao SVG com escala inesperada.");
  var x=old[0]+STUDIO.b*pt,y=old[1]-STUDIO.b*pt,w=STUDIO.w*pt,h=STUDIO.h*pt;
  d.artboards[0].artboardRect=[x,y,x+w,y-h];d.artboards[0].name='Frente';
  x+=(STUDIO.aw+STUDIO.gap)*pt;d.artboards.add([x,y,x+w,y-h]);d.artboards[1].name='Verso';
  var seen={};for(var i=0;i<d.textFrames.length;i++){var tf=d.textFrames[i];for(var j=0;j<STUDIO.text.length;j++){if(!seen[j]&&tf.contents===STUDIO.text[j].value){tf.name=STUDIO.text[j].key;seen[j]=true;break;}}}
  verify(d);
  ai=new File(tmp.fsName+'/native.ai');var opt=new IllustratorSaveOptions();opt.pdfCompatible=true;opt.compressed=true;opt.embedLinkedFiles=true;
  d.saveAs(ai,opt);d.close(SaveOptions.DONOTSAVECHANGES);d=null;check(ai.exists&&ai.length>100,"AI nao guardado.");
  proof=app.open(ai);verify(proof);proof.close(SaveOptions.DONOTSAVECHANGES);proof=null;
  check(!dest.exists,"O destino ja existe.");check(ai.copy(dest.fsName),"Falhou a copia nativa.");created=true;
  check(dest.exists&&dest.length===ai.length,"Copia incompleta.");
  ai.encoding='BINARY';dest.encoding='BINARY';check(ai.open('r'),"Falhou leitura AI.");check(dest.open('r'),"Falhou leitura .kutuzov.");
  while(!ai.eof){check(ai.read(65536)===dest.read(65536),"Bytes diferentes.");}check(dest.eof,"Bytes adicionais.");ai.close();dest.close();
  alert("Criado e reaberto como AI nativo. Ficheiro .kutuzov guardado. A abertura directa da extensao depende do Illustrator/SO.");
 }catch(e){try{if(ai&&ai.opened)ai.close();if(dest.opened)dest.close();}catch(_){}if(created&&dest.exists)dest.remove();alert("Exportacao interrompida: "+e.message);}
 finally{try{if(proof)proof.close(SaveOptions.DONOTSAVECHANGES);if(d)d.close(SaveOptions.DONOTSAVECHANGES);if(svgFile&&svgFile.exists)svgFile.remove();if(ai&&ai.exists)ai.remove();if(tmp.exists)tmp.remove();}catch(_){}}
})();`;

// Native master mode intentionally changes only explicitly named text objects.
export function nativeMasterBridge(values,fieldNames){
 if(!Array.isArray(fieldNames)||!fieldNames.length||fieldNames.length>32||new Set(fieldNames).size!==fieldNames.length)throw Error('Mapa nativo inválido.');
 const fields={};for(const key of fieldNames){if(!/^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(key)||!Object.hasOwn(values,key)||typeof values[key]!=='string'||values[key].length>140||/[\x00-\x1f\x7f]/.test(values[key]))throw Error('Campo nativo inválido: '+key);fields[key]=values[key]}
 const literal=JSON.stringify(fields).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return '#target illustrator\nvar VALUES='+literal+';\n'+MASTER_BRIDGE;
}
const MASTER_BRIDGE=String.raw`(function(){
 var src=File.openDialog("Selecciona o master AI ou .kutuzov");if(!src)return;
 if(!/\.(ai|kutuzov)$/i.test(src.name)){alert("Master invalido.");return;}
 var dest=File.saveDialog("Guardar novo .kutuzov");if(!dest)return;
 if(!/\.kutuzov$/i.test(dest.name))dest=new File(dest.parent.fsName+'/'+dest.name.replace(/\.ai$/i,'')+'.kutuzov');
 if(dest.exists||src.fsName===dest.fsName){alert("Escolhe um nome novo.");return;}
 var tmp=new Folder(Folder.temp.fsName+'/kutuzov-master-'+new Date().getTime()+'-'+Math.floor(Math.random()*1000000));
 var input=null,output=null,d=null,proof=null,created=false;
 function check(ok,msg){if(!ok)throw new Error(msg);}
 function named(doc){var result={};for(var key in VALUES){if(!VALUES.hasOwnProperty(key))continue;result[key]=[];for(var i=0;i<doc.textFrames.length;i++){var t=doc.textFrames[i];if(t.name===key)result[key].push(t);}check(result[key].length>0,"Campo nao encontrado no master: "+key);}return result;}
 try{
  check(tmp.create(),"Pasta temporaria indisponivel.");input=new File(tmp.fsName+'/master.ai');output=new File(tmp.fsName+'/result.ai');
  check(src.copy(input.fsName)&&input.length===src.length,"Copia do master falhou.");
  d=app.open(input);var count=d.artboards.length,paths=d.pathItems.length,frames=d.textFrames.length,rasters=d.rasterItems.length,layers=d.layers.length;
  var map=named(d);for(var key in map){if(!map.hasOwnProperty(key))continue;for(var j=0;j<map[key].length;j++){var t=map[key][j];check(!t.locked&&!t.hidden,"Campo bloqueado: "+key);check(t.kind===TextType.POINTTEXT,"Campo deve ser Point Text: "+key);var maxWidth=t.width;if(VALUES[key]===''){t.contents=' ';}else{t.contents=VALUES[key];}app.redraw();if(t.width>maxWidth&&maxWidth>0){var a=t.textRange.characterAttributes,size=a.size;check(typeof size==='number'&&size>0,"Tipografia mista: "+key);var fitted=size*maxWidth/t.width;check(fitted>=6,"Texto nao cabe: "+key);a.size=fitted;app.redraw();check(t.width<=maxWidth+.5,"Texto excede caixa: "+key);}}}
  var opt=new IllustratorSaveOptions();opt.pdfCompatible=true;opt.compressed=true;opt.embedLinkedFiles=true;d.saveAs(output,opt);d.close(SaveOptions.DONOTSAVECHANGES);d=null;
  proof=app.open(output);check(proof.artboards.length===count&&proof.pathItems.length===paths&&proof.textFrames.length===frames&&proof.rasterItems.length===rasters&&proof.layers.length===layers,"Estrutura alterada; revê o master.");
  var mapped=named(proof);for(var field in mapped){if(!mapped.hasOwnProperty(field))continue;for(var k=0;k<mapped[field].length;k++)check(mapped[field][k].contents===(VALUES[field]||' '),"Texto nao preservado: "+field);}
  proof.close(SaveOptions.DONOTSAVECHANGES);proof=null;
  check(!dest.exists&&output.copy(dest.fsName),"Copia final falhou.");created=true;check(dest.length===output.length,"Copia incompleta.");
  output.encoding='BINARY';dest.encoding='BINARY';check(output.open('r')&&dest.open('r'),"Leitura falhou.");while(!output.eof)check(output.read(65536)===dest.read(65536),"Bytes diferentes.");check(dest.eof,"Bytes adicionais.");output.close();dest.close();
  alert("Master personalizado e guardado como AI nativo .kutuzov. O original ficou intacto.");
 }catch(e){try{if(output)output.close();dest.close();}catch(_){}if(created&&dest.exists)dest.remove();alert("Exportacao interrompida: "+e.message);}
 finally{try{if(proof)proof.close(SaveOptions.DONOTSAVECHANGES);if(d)d.close(SaveOptions.DONOTSAVECHANGES);if(input&&input.exists)input.remove();if(output&&output.exists)output.remove();if(tmp.exists)tmp.remove();}catch(_){}}
})();`;
