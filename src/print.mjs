import {svgDocument} from './engine.mjs';

const PT=72/25.4,MAX_PIXELS=12000000;
export function rasterDimensions(g,dpi,includeBleed=true){
 if(![300,600].includes(dpi))throw Error('Escolhe 300 ou 600 DPI.');
 const b=includeBleed?g.b:0,w=g.w+2*b,h=g.h+2*b;
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||w>210||h>210)throw Error('Dimensão inválida.');
 printGeometry(g);const width=Math.round(w*dpi/25.4),height=Math.round(h*dpi/25.4);
 if(width*height>MAX_PIXELS)throw Error('Formato demasiado grande para esta resolução. Selecciona 300 DPI.');
 return {width,height};
}
export function printGeometry(g,marks=false){
 const {w,h,b}=g;if(![w,h,b].every(Number.isFinite)||w<25||h<25||w>200||h>200||b<0||b>5)throw Error('Geometria de impressão inválida.');
 const m=marks?5:0,W=w+2*(b+m),H=h+2*(b+m);
 return {media:[0,0,W*PT,H*PT],trim:[(m+b)*PT,(m+b)*PT,(m+b+w)*PT,(m+b+h)*PT],bleed:[m*PT,m*PT,(m+w+2*b)*PT,(m+h+2*b)*PT],placement:{x:m*PT,y:m*PT,w:(w+2*b)*PT,h:(h+2*b)*PT},marks};
}
export function sheetGeometry(g){
 printGeometry(g);
 const W=210,H=297,margin=10,gap=6,aw=g.w+2*g.b,ah=g.h+2*g.b;
 const cols=Math.floor((W-2*margin+gap)/(aw+gap)),rows=Math.floor((H-2*margin+gap)/(ah+gap));
 if(cols<1||rows<1)throw Error('O formato não cabe numa folha A4 com margens.');
 const startX=(W-(cols*aw+(cols-1)*gap))/2,startY=(H-(rows*ah+(rows-1)*gap))/2;
 const front=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)front.push({x:(startX+c*(aw+gap))*PT,y:(startY+r*(ah+gap))*PT,w:aw*PT,h:ah*PT});
 const back=front.map(p=>({...p,x:W*PT-p.x-p.w}));
 return {media:[0,0,W*PT,H*PT],front,back,cols,rows,count:rows*cols};
}
const n=v=>{if(!Number.isFinite(v))throw Error('Invalid PDF coordinate');return Number(v.toFixed(5)).toString()};
const box=a=>'['+a.map(n).join(' ')+']';
const enc=s=>new TextEncoder().encode(s);
const concat=parts=>{const out=new Uint8Array(parts.reduce((sum,p)=>sum+p.length,0));let i=0;for(const p of parts){out.set(p,i);i+=p.length}return out};
function cutMarks(p,g){
 const b=g.b*PT,l=2*PT,off=1*PT,x=p.x+b,y=p.y+b,X=p.x+p.w-b,Y=p.y+p.h-b;
 let s='0 G 0.25 w\n';for(const xx of [x,X])for(const yy of [y,Y]){
 const ox=xx===x?p.x-off:p.x+p.w+off,oy=yy===y?p.y-off:p.y+p.h+off;
 s+=n(ox)+' '+n(yy)+' m '+n(ox+(xx===x?-l:l))+' '+n(yy)+' l S\n';
 s+=n(xx)+' '+n(oy)+' m '+n(xx)+' '+n(oy+(yy===y?-l:l))+' l S\n';
 }return s;
}
// A deliberately small PDF 1.4 serializer. Binary streams and offsets are counted in bytes.
export function encodePdf(pages){
 if(!Array.isArray(pages)||pages.length<1||pages.length>2)throw Error('Número de páginas inválido.');
 const objects=[null,null];const add=bytes=>{objects.push(typeof bytes==='string'?enc(bytes):bytes);return objects.length};
 const stream=(dict,data)=>concat([enc('<< '+dict+' /Length '+data.length+' >>\nstream\n'),data,enc('\nendstream')]);
 const ids=[];
 for(const page of pages){
  const {image,media,trim,bleed,placements,marks,g}=page;
  if(!Array.isArray(media)||media.length!==4||!media.every(Number.isFinite)||media[0]!==0||media[1]!==0||media[2]<=0||media[3]<=0||!Array.isArray(placements)||!placements.length||placements.length>100||placements.some(p=>![p.x,p.y,p.w,p.h].every(Number.isFinite)||p.x<-.00001||p.y<-.00001||p.w<=0||p.h<=0||p.x+p.w>media[2]+.00001||p.y+p.h>media[3]+.00001))throw Error('Página PDF inválida.');
  if(!(image.bytes instanceof Uint8Array)||!image.bytes.length||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.width*image.height>MAX_PIXELS)throw Error('Imagem PDF inválida.');
  const img=add(stream('/Type /XObject /Subtype /Image /Width '+image.width+' /Height '+image.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode',image.bytes));
  let commands='';for(const p of placements){commands+='q '+n(p.w)+' 0 0 '+n(p.h)+' '+n(p.x)+' '+n(p.y)+' cm /Im0 Do Q\n';if(marks)commands+=cutMarks(p,g)}
  const content=add(stream('',enc(commands)));
  ids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox '+box(media)+(trim?' /TrimBox '+box(trim):'')+(bleed?' /BleedBox '+box(bleed):'')+' /Resources << /XObject << /Im0 '+img+' 0 R >> >> /Contents '+content+' 0 R >>'));
 }
 objects[0]=enc('<< /Type /Catalog /Pages 2 0 R >>');objects[1]=enc('<< /Type /Pages /Count '+ids.length+' /Kids ['+ids.map(x=>x+' 0 R').join(' ')+'] >>');
 const parts=[enc('%PDF-1.4\n'),new Uint8Array([37,226,227,207,211,10])],offsets=[0];let length=parts.reduce((s,p)=>s+p.length,0);
 for(let i=0;i<objects.length;i++){offsets.push(length);const chunk=concat([enc((i+1)+' 0 obj\n'),objects[i],enc('\nendobj\n')]);parts.push(chunk);length+=chunk.length}
 parts.push(enc('xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+length+'\n%%EOF\n'));
 return concat(parts);
}
async function rasterize(doc,side,dpi){
 const {width,height}=rasterDimensions(doc.geometry,dpi),url=URL.createObjectURL(new Blob([svgDocument(doc,side,true)],{type:'image/svg+xml;charset=utf-8'}));
 const c=document.createElement('canvas');try{const img=new Image();img.src=url;await img.decode();c.width=width;c.height=height;const ctx=c.getContext('2d',{alpha:false,willReadFrequently:true});if(!ctx)throw Error('Canvas indisponível.');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.drawImage(img,0,0,width,height);return {canvas:c,ctx,width,height};}catch(e){c.width=1;c.height=1;throw e}finally{URL.revokeObjectURL(url)}
}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
export function pngWithDpi(input,dpi){
 if(![300,600].includes(dpi)||input.length<33||[137,80,78,71,13,10,26,10].some((v,i)=>input[i]!==v))throw Error('PNG inválido.');
 const phys=new Uint8Array(21),dv=new DataView(phys.buffer);dv.setUint32(0,9);phys.set(enc('pHYs'),4);const ppm=Math.round(dpi/0.0254);dv.setUint32(8,ppm);dv.setUint32(12,ppm);phys[16]=1;dv.setUint32(17,crc32(phys.subarray(4,17)));
 const parts=[input.subarray(0,8)];let i=8,ihdr=false,iend=false;const view=new DataView(input.buffer,input.byteOffset,input.byteLength);
 while(i+12<=input.length){const len=view.getUint32(i),end=i+12+len;if(end>input.length)throw Error('PNG truncado.');const type=String.fromCharCode(...input.subarray(i+4,i+8));if(!ihdr&&type!=='IHDR')throw Error('PNG sem IHDR.');if(type!=='pHYs')parts.push(input.subarray(i,end));if(type==='IHDR'){if(ihdr||len!==13)throw Error('IHDR inválido.');ihdr=true;parts.push(phys)}i=end;if(type==='IEND'){iend=true;break}}
 if(!ihdr||!iend||i!==input.length)throw Error('PNG incompleto.');return concat(parts);
}
export async function exportPng(doc,side,dpi){
 const r=await rasterize(doc,side,dpi);try{const blob=await new Promise((resolve,reject)=>r.canvas.toBlob(b=>b?resolve(b):reject(Error('Falha PNG.')),'image/png'));return new Blob([pngWithDpi(new Uint8Array(await blob.arrayBuffer()),dpi)],{type:'image/png'});}finally{r.canvas.width=1;r.canvas.height=1}
}
async function rgbImage(doc,side,dpi){
 if(typeof CompressionStream!=='function')throw Error('O navegador não suporta compressão PDF. Usa um navegador actualizado ou exporta PNG.');
 const r=await rasterize(doc,side,dpi);try{const rgba=r.ctx.getImageData(0,0,r.width,r.height).data,rgb=new Uint8Array(r.width*r.height*3);for(let i=0,j=0;i<rgba.length;i+=4){rgb[j++]=rgba[i];rgb[j++]=rgba[i+1];rgb[j++]=rgba[i+2]}const compressed=await new Response(new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer();return {width:r.width,height:r.height,bytes:new Uint8Array(compressed)}}finally{r.canvas.width=1;r.canvas.height=1}
}
export async function exportPdf(doc,{dpi=300,marks=true,sheet=false}={}){
 rasterDimensions(doc.geometry,dpi);const g=doc.geometry,geo=sheet?sheetGeometry(g):printGeometry(g,marks),pages=[];
 for(const side of ['front','back']){const image=await rgbImage(doc,side,dpi);pages.push({image,media:geo.media,trim:geo.trim,bleed:geo.bleed,placements:sheet?geo[side]:[geo.placement],marks:sheet||marks,g})}
 return new Blob([encodePdf(pages)],{type:'application/pdf'});
}
