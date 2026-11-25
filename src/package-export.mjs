import {productionTools} from './production-tools.mjs';
import {printReport} from './preflight.mjs';
import {crc32,exportPdf,exportPng} from './print.mjs';
import {svgDocument} from './engine.mjs';
const zipEnc=s=>new TextEncoder().encode(s);
function zipHeader(size){const bytes=new Uint8Array(size),v=new DataView(bytes.buffer);return {bytes,u16:(offset,n)=>v.setUint16(offset,n,true),u32:(offset,n)=>v.setUint32(offset,n,true)}}
export function zipStore(entries){
 if(!Array.isArray(entries)||!entries.length||entries.length>200)throw Error('Pacote inválido.');
 const parts=[],directory=[],names=new Set();let offset=0,centralSize=0;
 for(const entry of entries){if(!entry||typeof entry.name!=='string'||!/^[a-zA-Z0-9_.-]{1,100}$/.test(entry.name)||entry.name==='.'||entry.name==='..'||names.has(entry.name)||!(entry.bytes instanceof Uint8Array)||entry.bytes.length>60000000)throw Error('Entrada ZIP inválida.');names.add(entry.name);const name=zipEnc(entry.name),size=entry.bytes.length,crc=crc32(entry.bytes);const a=zipHeader(30);
 a.u32(0,0x04034b50);a.u16(4,20);a.u16(12,33);a.u32(14,crc);a.u32(18,size);a.u32(22,size);a.u16(26,name.length);
 parts.push(a.bytes,name,entry.bytes);const b=zipHeader(46);b.u32(0,0x02014b50);b.u16(4,20);b.u16(6,20);b.u16(14,33);b.u32(16,crc);b.u32(20,size);b.u32(24,size);b.u16(28,name.length);b.u32(42,offset);directory.push(b.bytes,name);centralSize+=46+name.length;offset+=30+name.length+size;if(offset>120000000)throw Error('Pacote demasiado grande.');}
 const end=zipHeader(22);end.u32(0,0x06054b50);end.u16(8,entries.length);end.u16(10,entries.length);end.u32(12,centralSize);end.u32(16,offset);
 return new Blob([...parts,...directory,end.bytes],{type:'application/zip'});
}
export async function exportPackage(doc,{dpi=300,marks=true}={}){
 const entries=[];const add=async(name,blob)=>entries.push({name,bytes:new Uint8Array(await blob.arrayBuffer())});
 await add('print.pdf',await exportPdf(doc,{dpi,marks}));
 for(const side of ['front','back']){entries.push({name:side+'.svg',bytes:zipEnc(svgDocument(doc,side,true))});await add(side+'.png',await exportPng(doc,side,dpi))}
 const g=doc.geometry;entries.push({name:'PRINT-README.txt',bytes:zipEnc('Kutuzov Studio\nCorte: '+g.w+' x '+g.h+' mm\nSangria: '+g.b+' mm\nResolução: '+dpi+' DPI\nPDF RGB sem perdas, duas páginas. Imprimir a 100%, sem ajuste de escala. SVG contém fontes de sistema. Confirmar cor e tolerância com a gráfica. Não é PDF/X nem CMYK. Inclui ferramentas de pré-impressão opcionais; lê PREPRESS.txt.\n')});entries.push({name:'PRINT-SPEC.json',bytes:zipEnc(JSON.stringify(printReport(doc,{dpi,marks}),null,2))});for(const [name,content] of Object.entries(productionTools))entries.push({name,bytes:zipEnc(content)});return zipStore(entries)
}
