import {svgDocument} from './engine.mjs';
export function previewSvg(doc,side,guides=false){
 if(!guides)return svgDocument(doc,side,false);
 const {w,h,b,s}=doc.geometry;
 const trim='<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="none" stroke="#f04438" stroke-width=".35" stroke-dasharray="1.5 1"/>';
 const safe='<rect x="'+s+'" y="'+s+'" width="'+(w-2*s)+'" height="'+(h-2*s)+'" fill="none" stroke="#16824a" stroke-width=".35" stroke-dasharray="1.5 1"/>';
 return svgDocument(doc,side,true).replace('</svg>',trim+safe+'</svg>');
}
