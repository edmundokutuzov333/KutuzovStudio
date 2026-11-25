import {rasterDimensions,printGeometry,imageResolutionWarnings} from './print.mjs';
export function printReport(doc,{dpi=300,marks=true}={}){
 const g=doc.geometry,px=rasterDimensions(g,dpi),p=printGeometry(g,marks);
 return {version:1,trim_mm:[g.w,g.h],bleed_mm:g.b,safe_mm:g.s,dpi,pixels:px,boxes_pt:{media:p.media,trim:p.trim,bleed:p.bleed},faces:['front','back'],color:'RGB',pdf:'Raster PDF with exact boxes; native vector print is separate',warnings:[...new Set([...doc.warnings,...imageResolutionWarnings(doc,dpi)])],pdfx:'Offline CMYK conversion requires printer-approved ICC and independent preflight'};
}
