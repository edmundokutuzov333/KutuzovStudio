import {svgDocument} from './engine.mjs';
import {printGeometry} from './print.mjs';
export function vectorPage(doc,side,marks=true){
 const g=doc.geometry,{w,h,b}=g;printGeometry(g,marks);const m=marks?5:0,W=w+2*(b+m),H=h+2*(b+m);
 const nested=svgDocument(doc,side,true).replace('<svg ','<svg x="'+m+'" y="'+m+'" ').replace('width="'+(w+2*b)+'mm"','width="'+(w+2*b)+'"').replace('height="'+(h+2*b)+'mm"','height="'+(h+2*b)+'"');
 let cut='';if(marks){const x=m+b,y=m+b,X=x+w,Y=y+h;for(const xx of [x,X])for(const yy of [y,Y]){const ox=xx===x?m-1:m+w+2*b+1,oy=yy===y?m-1:m+h+2*b+1;cut+='M'+ox+' '+yy+'h'+(xx===x?-2:2)+'M'+xx+' '+oy+'v'+(yy===y?-2:2)}}
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'mm" height="'+H+'mm" viewBox="0 0 '+W+' '+H+'"><rect width="'+W+'" height="'+H+'" fill="white"/>'+nested+(cut?'<path d="'+cut+'" stroke="#000" stroke-width=".088" fill="none"/>':'')+'</svg>';
}
export async function nativePrint(doc,marks=true,isCurrent=()=>true){
 const assets=[...new Set(Object.values(doc.sides).flat().filter(n=>n.kind==='image').map(n=>n.asset.data))];await Promise.all(assets.map(async data=>{const image=new Image();image.src=data;await image.decode()}));await document.fonts.ready;if(!isCurrent())return;
 if(document.body.classList.contains('native-print-active'))throw Error('Já existe uma impressão activa.');
 const g=doc.geometry,geo=printGeometry(g,marks),w=geo.media[2]*25.4/72,h=geo.media[3]*25.4/72;
 const root=document.getElementById('native-print'),sheet=[...document.styleSheets].find(s=>s.href&&s.href.endsWith('/src/style.css'));if(!root||!sheet)throw Error('Impressão vectorial indisponível.');
 const parser=new DOMParser(),nodes=['front','back'].map(side=>{const parsed=parser.parseFromString(vectorPage(doc,side,marks),'image/svg+xml');if(parsed.querySelector('parsererror'))throw Error('SVG inválido');const page=document.createElement('div');page.className='native-page';page.append(document.importNode(parsed.documentElement,true));return page});
 const rule=sheet.insertRule('@page { size: '+w.toFixed(4)+'mm '+h.toFixed(4)+'mm; margin: 0; }',sheet.cssRules.length);
 root.replaceChildren(...nodes);document.body.classList.add('native-print-active');
 const cleanup=()=>{document.body.classList.remove('native-print-active');root.replaceChildren();sheet.deleteRule(rule);window.removeEventListener('afterprint',cleanup)};
 window.addEventListener('afterprint',cleanup,{once:true});try{window.print()}catch(e){cleanup();throw e}
}
