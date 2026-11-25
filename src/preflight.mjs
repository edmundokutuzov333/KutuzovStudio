import {rasterDimensions,printGeometry,imageResolutionWarnings,sheetGeometry} from './print.mjs';
export function printReport(doc,{dpi=300,marks=true}={}){
 const g=doc.geometry,px=rasterDimensions(g,dpi),p=printGeometry(g,marks);
 return {version:1,trim_mm:[g.w,g.h],bleed_mm:g.b,safe_mm:g.s,dpi,pixels:px,boxes_pt:{media:p.media,trim:p.trim,bleed:p.bleed},faces:['front','back'],color:'RGB',pdf:'Raster PDF with exact boxes; native vector print is separate',warnings:[...new Set([...doc.warnings,...imageResolutionWarnings(doc,dpi)])],pdfx:'Offline CMYK conversion requires printer-approved ICC and independent preflight'};
}

export function productionOptions(g,dpi,marks=true,flip='long',sheetOrientation='portrait'){
 const options={};for(const paper of ['A4','A3']){try{const x=sheetGeometry(g,paper,flip,sheetOrientation);options[paper]={available:true,count:x.count,cols:x.cols,rows:x.rows}}catch(e){options[paper]={available:false,reason:e.message}}}
 let pixels=null,reason='';try{pixels=rasterDimensions(g,dpi)}catch(e){reason=e.message}
 return {rasterAvailable:!!pixels,pixels,reason,sheets:options,marks,flip,sheetOrientation};
}
