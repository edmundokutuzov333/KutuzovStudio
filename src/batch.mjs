import {parseCsv} from './badge.mjs';
import {composeDocument} from './engine.mjs';
import {exportPdf,imageResolutionWarnings} from './print.mjs';
import {zipStore} from './package-export.mjs';
import {readImage} from './images.mjs';
export async function buildBatch({csv,photos=[],options,dpi=300,marks=true,acceptWarnings=false,onProgress=()=>{},isCurrent=()=>true}){
 if(options.format.product!=='badge')throw Error('Selecciona um formato de crachá.');
 const rows=parseCsv(csv),files=new Map(),entries=[],warnings=[];for(const file of photos){if(files.has(file.name))throw Error('Fotografia duplicada: '+file.name);files.set(file.name,file)}
 const enc=new TextEncoder();let total=0;
 const add=(name,bytes)=>{total+=bytes.length;if(total>110000000)throw Error('Lote demasiado grande. Divide o CSV.');entries.push({name,bytes})};
 for(let i=0;i<rows.length;i++){if(!isCurrent())throw Error('Lote cancelado.');const row=rows[i];let photo=null;if(row.photo){const file=files.get(row.photo);if(!file)throw Error('Fotografia em falta: '+row.photo);photo=await readImage(file)}
 const personal={name:'',role:'',department:'',badgeId:'',badgeKind:options.profile.badgeKind||'employee',expiry:'',qr:'',barcode:'',phone:'',email:''};const doc=composeDocument({...options,profile:{...options.profile,...personal,...row},photo});const issues=[...new Set([...doc.warnings,...imageResolutionWarnings(doc,dpi)])];if(issues.length){warnings.push((i+1)+': '+issues.join(' '));if(!acceptWarnings)throw Error('Linha '+(i+2)+': '+issues.join(' ')+' Confirma os alertas para continuar.')}
 const name='badge-'+String(i+1).padStart(3,'0');const pdf=await exportPdf(doc,{dpi,marks});add(name+'.pdf',new Uint8Array(await pdf.arrayBuffer()));onProgress(i+1,rows.length);
 }
 if(!isCurrent())throw Error('Lote cancelado.');add('PRINT-README.txt',enc.encode('Crachás privados / eventos. '+rows.length+' ficheiros PDF RGB, duas faces. Imprimir a 100%. Não são credenciais verificadas nem PDF/X.\n'+warnings.join('\n')));return zipStore(entries)
}
