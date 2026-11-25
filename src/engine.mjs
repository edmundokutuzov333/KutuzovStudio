import {backgroundNodes} from './backgrounds.mjs';
import {badgeFields,code39Bars,code39Svg} from './badge.mjs';
import {qrSvg,qrMatrix} from './qr.mjs';
import {proposals,templates} from './templates.mjs';
export function validFormat(f){return !!f && typeof f.id==="string" && /^[a-z0-9-]{1,40}$/.test(f.id)&&["card","badge"].includes(f.product)&&typeof f.label==="string"&&f.label.length>0&&f.label.length<=100&&["width_mm","height_mm","bleed_mm","safe_mm","position"].every(k=>typeof f[k]==="number"&&Number.isFinite(f[k]))&&f.width_mm>=25&&f.width_mm<=200&&f.height_mm>=25&&f.height_mm<=200&&f.bleed_mm>=0&&f.bleed_mm<=5&&f.safe_mm>=2&&f.safe_mm<=8&&Math.min(f.width_mm,f.height_mm)>2*f.safe_mm&&Number.isInteger(f.position)&&f.position>=0&&f.position<=2147483647}

export function geometry(f,vertical=false){if(!validFormat(f))throw Error("Formato inválido");const w=vertical?Math.min(f.width_mm,f.height_mm):f.width_mm;const h=vertical?Math.max(f.width_mm,f.height_mm):f.height_mm;const b=f.bleed_mm;return {w,h,b,s:f.safe_mm,width:w+2*b,height:h+2*b}}

export function escapeXml(v){return String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[x]))}


export function normalizeProfile(p){
 const limits={name:80,role:80,company:80,phone:40,email:120,website:100,address:140,slogan:100,qr:106};
 const out={};for(const [k,n] of Object.entries(limits)){const raw=String(p[k]??'').trim();if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(raw))throw Error('Caracteres inválidos: '+k);const v=k==='qr'?raw:raw.replace(/\s+/g,' ');if(v.length>n)throw Error('Campo demasiado longo: '+k);out[k]=v}
 if(!out.name)throw Error('Indica o teu nome.');if(out.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))throw Error('Email inválido.');
 if(out.qr)qrMatrix(out.qr);
 out.color=/^#[0-9a-f]{6}$/i.test(p.color||'')?p.color.toLowerCase():null;
 return out;
}
export function contrastColor(hex){const a=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const l=.2126*a[0]+.7152*a[1]+.0722*a[2];return (l+.05)/.05>=1.05/(l+.05)?"#000000":"#ffffff"}


export function customFormat(product,width,height,bleed=3,safe=3){
 const numeric=v=>{if(v===null||v===undefined||String(v).trim()==='')throw Error('Preenche todas as dimensões.');const n=Number(v);if(!Number.isFinite(n)||Math.abs(n*100-Math.round(n*100))>1e-7)throw Error('Usa até duas casas decimais.');return n};
 const f={id:'custom',product,label:'Personalizado',width_mm:numeric(width),height_mm:numeric(height),bleed_mm:numeric(bleed),safe_mm:numeric(safe),position:999};
 if(!validFormat(f))throw Error('Dimensões: 25–200 mm; sangria 0–5 mm; margem 2–8 mm.');return f;
}
export function oriented(format,orientation='native'){
 if(!validFormat(format))throw Error('Formato inválido');if(!['native','horizontal','vertical'].includes(orientation))throw Error('Orientação inválida');
 const {width_mm:w,height_mm:h}=format;return {...format,width_mm:orientation==='native'?w:orientation==='vertical'?Math.min(w,h):Math.max(w,h),height_mm:orientation==='native'?h:orientation==='vertical'?Math.max(w,h):Math.min(w,h)};
}
export function defaultMeasure(text,size,font,weight){return Array.from(text).reduce((n,c)=>n+(/[ilI1.,:;]/.test(c)?.35:/[MW@%]/.test(c)?.95:.68),0)*size}
export function browserMeasure(){const c=document.createElement('canvas').getContext('2d');if(!c)throw Error('Canvas indisponível');return (text,size,font,weight)=>{c.font=weight+' '+size*96/25.4+'px '+font;return c.measureText(text).width*25.4/96}}
function wrap(text,max,size,font,weight,measure){const lines=[];let line='';for(const word of text.split(' ')){const next=line?line+' '+word:word;if(measure(next,size,font,weight)<=max){line=next;continue}if(line)lines.push(line);line='';for(const ch of Array.from(word)){if(line&&measure(line+ch,size,font,weight)>max){lines.push(line);line=''}line+=ch}}if(line)lines.push(line);return lines}
export function fitBlock(fields,box,font,measure=defaultMeasure){
 const {x,y,w,h,align='start'}=box;if(w<=0||h<=0)throw Error('Área de texto insuficiente');
 const present=fields.filter(f=>f.value);if(!present.length)return {nodes:[],warnings:[]};
 const layout=scale=>{let height=0;const groups=present.map(f=>{const size=f.size*scale,lines=wrap(f.value,w,size,font,f.weight,measure);const lineHeight=size*1.32;const gap=f.gap*scale;height+=lines.length*lineHeight+gap;return {...f,size,lines,lineHeight,gap}});return {groups,height:height-(groups.at(-1)?.gap||0)}};
 let lo=0,hi=1;for(let i=0;i<22;i++){const mid=(lo+hi)/2;const l=layout(mid);if(l.height<=h&&l.groups.every(f=>f.lines.every(t=>measure(t,f.size,font,f.weight)<=w+.000001)))lo=mid;else hi=mid}
 const {groups,height}=layout(lo);let top=y+(box.center?(h-height)/2:0);const nodes=[],warnings=[];
 for(const f of groups){if(f.size<2.12)warnings.push('Texto pequeno: '+f.key+' ('+(f.size*72/25.4).toFixed(1)+' pt).');for(const value of f.lines){nodes.push({kind:'text',value,x:align==='middle'?x+w/2:x,y:top+f.size,size:f.size,font,weight:f.weight,align,fill:f.fill,max:w});top+=f.lineHeight}top+=f.gap}
 return {nodes,warnings};
}
function rect(x,y,w,h,fill){return {kind:'rect',x,y,w,h,fill}}
function assetValid(a){return !a||(typeof a.data==='string'&&a.data.length<=20000000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(a.data)&&Number.isInteger(a.width)&&Number.isInteger(a.height)&&a.width>0&&a.height>0&&a.width<=2400&&a.height<=2400)}
function decorations(pattern,w,h,b,accent,s){const a=[];const p=(d)=>({kind:'path',d,fill:accent});if(pattern==='line')a.push(rect(-b,-b,w+2*b,Math.min(s*.6,Math.max(.5,h*.035))+b,accent));if(pattern==='frame')a.push({kind:'frame',x:1,y:1,w:w-2,h:h-2,fill:accent});if(pattern==='band')a.push(rect(-b,-b,w+2*b,1+b,accent));if(pattern==='blocks')a.push(rect(w*.8,-b,w*.2+b,1.8+b,accent),rect(-b,h-1.8,w*.2+b,1.8+b,accent));if(pattern==='grid')for(let i=0;i<5;i++)a.push(rect(w*(.78+i*.04),-b,.5,2+b,accent));if(pattern==='circles')a.push({kind:'circle',x:w,y:0,r:Math.min(s*.8,Math.min(w,h)*.26),fill:accent});if(pattern==='diagonal')a.push(p('M'+w*.78+' '+(-b)+'H'+(w+b)+'V'+Math.min(h*.08,s*.7)+'Z'));return a}
export function composeDocument({format,profile,template,orientation='native',photo=null,logo=null,backgroundImage=null,focusX=.5,focusY=.5,variation=0,textScale=1,textAlign='auto',photoMode='cover',showPhoto=true,showLogo=true,measure=defaultMeasure}){
 const p=normalizeProfile(profile),badge=format?.product==='badge'?badgeFields(profile):null;if(!templates.includes(template))throw Error('Template inválido.');if(!assetValid(photo)||!assetValid(logo)||!assetValid(backgroundImage))throw Error('Imagem inválida.');
 if(!Number.isFinite(textScale)||textScale<.75||textScale>1.25||!['auto','start','middle'].includes(textAlign))throw Error('Tipografia inválida.');
 if(!['cover','contain'].includes(photoMode))throw Error('Modo de imagem inválido.');
 if(!Number.isSafeInteger(variation)||variation<0||variation>4)throw Error('Variação inválida.');
 const g=geometry(oriented(format,orientation)),{w,h,b,s}=g,f=template.family,accent=p.color||f.accent,bg=template.layout==='center'&&p.color?accent:f.bg,fg=template.layout==='center'&&p.color?contrastColor(bg):f.fg;
 const warnings=[],sides={};const image=(a,x,y,iw,ih,mode)=>{const scale=mode==='cover'?Math.max(iw/a.width,ih/a.height):Math.min(iw/a.width,ih/a.height),dpi=25.4/scale;if(dpi<300)warnings.push('Imagem: resolução efectiva '+Math.floor(dpi)+' DPI.');return {kind:'image',asset:a,x,y,w:iw,h:ih,mode,focusX:Math.max(0,Math.min(1,Number(focusX)||0)),focusY:Math.max(0,Math.min(1,Number(focusY)||0))}};
 for(const side of ['front','back']){
  const customBg=profile.background==='uploaded';if(customBg&&!backgroundImage)throw Error('Selecciona primeiro uma imagem de fundo.');const nodes=[rect(-b,-b,w+2*b,h+2*b,bg),...(customBg?[{...image(backgroundImage,-b,-b,w+2*b,h+2*b,'cover'),focusX:.5,focusY:.5},{...rect(-b,-b,w+2*b,h+2*b,bg),opacity:.86}]:backgroundNodes(profile.background||'none',g,bg,fg)),...decorations(variation===0?f.pattern:['line','frame','grid','diagonal'][variation-1],w,h,b,accent,s)];
  const inner={x:s,y:s,w:w-2*s,h:h-2*s};let area={...inner};const isFront=side==='front';const portrait=isFront&&showPhoto&&photo;
  if(template.layout==='rail'){const bw=Math.min(3,inner.w*.08);nodes.push(rect(-b,-b,bw+b,h+2*b,accent));area.x+=bw;area.w-=bw}
  if(portrait){
   if(w>=h&&template.layout!=='center'){const pw=Math.min(area.w*.31,area.h*.9);nodes.push(image(photo,area.x+area.w-pw,area.y,pw,area.h,photoMode));area.w-=pw+Math.min(2,area.w*.05)}
   else{const ph=area.h*.32,pw=Math.min(area.w*.58,ph);nodes.push(image(photo,area.x+(area.w-pw)/2,area.y,pw,ph,photoMode));area.y+=ph+1;area.h-=ph+1}
  }
  if(isFront&&showLogo&&logo){const lh=Math.min(area.h*.18,8),lw=Math.min(area.w*.45,lh*2);nodes.push({...image(logo,area.x,area.y,lw,lh,'contain'),focusX:.5,focusY:.5});area.y+=lh+1;area.h-=lh+1;}
  if(!isFront&&badge?.barcode){const bh=Math.min(10,area.h*.23),bw=area.w;if(bw/code39Bars(badge.barcode).modules<.19)warnings.push('Code 39 estreito: confirma leitura após impressão.');nodes.push({kind:'barcode',value:badge.barcode,x:area.x,y:area.y+area.h-bh,w:bw,h:bh});area.h-=bh+1.5;}
  if(!isFront&&p.qr){const qs=Math.min(area.w*.44,area.h*.66,26);if(qs/45<.40)warnings.push('QR pequeno: confirma leitura após impressão.');if(w>=h){nodes.push({kind:'qr',value:p.qr,x:area.x+area.w-qs,y:area.y+(area.h-qs)/2,size:qs});area.w-=qs+1.5}else{nodes.push({kind:'qr',value:p.qr,x:area.x+(area.w-qs)/2,y:area.y+area.h-qs,size:qs});area.h-=qs+1.5}}
  const unit=Math.min(w,h),field=(key,value,factor,weight=400)=>({key,value,size:Math.min(10,unit*factor*textScale),weight,gap:Math.max(.35,unit*.012),fill:fg});
  let fields=isFront?[field('company',p.company,.052,600),field('name',p.name,.12,700),field('role',p.role,.064),field('phone',p.phone,.049),field('email',p.email,.049)]:[field('company',p.company||p.name,.105,700),field('slogan',p.slogan,.059),field('website',p.website,.052),field('address',p.address,.049),field('phone',p.phone,.049),field('email',p.email,.049)];
  if(badge){fields=isFront?[field('company',p.company,.055,600),field('name',p.name,.115,700),field('role',p.role,.062),field('department',badge.department,.05),field('badgeId',badge.id?'ID: '+badge.id:'',.052,600),field('badgeKind',badge.label,.068,700)]:[field('company',p.company||p.name,.09,700),field('badgeKind',badge.label,.065,700),field('badgeId',badge.id?'ID: '+badge.id:'',.055),field('expiry',badge.expiry?'Validade: '+badge.expiry:'',.055),field('website',p.website,.05),field('phone',p.phone,.049),field('slogan',p.slogan,.05)];}else if(template.layout==='editorial'&&isFront)fields=[fields[1],fields[2],fields[0],...fields.slice(3)];
  if(template.layout==='split'&&!portrait&&w>=h){const band=Math.min(8,area.w*.15);nodes.push(rect(area.x,area.y,band,area.h,accent));area.x+=band+1.2;area.w-=band+1.2}
  const fit=fitBlock(fields,{...area,align:textAlign==='auto'?(template.layout==='center'?'middle':'start'):textAlign,center:template.layout!=='editorial'},f.font,measure);nodes.push(...fit.nodes);warnings.push(...fit.warnings);sides[side]=nodes;
 }
 return {geometry:g,templateId:template.id,sides,warnings:[...new Set(warnings)]};
}
export function svgDocument(doc,side='front',includeBleed=true){
 const {w,h,b:bleed}=doc.geometry,b=includeBleed?bleed:0,W=w+2*b,H=h+2*b;
 if(!doc.sides[side])throw Error('Face inválida');
 let count=0;const markup=doc.sides[side].map(n=>{
  if(n.kind==='rect')return '<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" fill="'+n.fill+'"'+(n.opacity!==undefined?' opacity="'+n.opacity+'"':'')+'/>';
  if(n.kind==='frame')return '<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" stroke="'+n.fill+'" fill="none" stroke-width=".35"/>';
  if(n.kind==='circle')return '<circle cx="'+n.x+'" cy="'+n.y+'" r="'+n.r+'" stroke="'+n.fill+'" fill="none" stroke-width=".5"/>';
  if(n.kind==='path')return '<path d="'+n.d+'" fill="'+n.fill+'"/>';
  if(n.kind==='text')return '<text x="'+n.x+'" y="'+n.y+'" font-family="'+n.font+'" font-size="'+n.size.toFixed(4)+'" font-weight="'+n.weight+'" fill="'+n.fill+'" text-anchor="'+n.align+'">'+escapeXml(n.value)+'</text>';
  if(n.kind==='barcode')return code39Svg(n.value,n.x,n.y,n.w,n.h);
  if(n.kind==='qr')return qrSvg(n.value,n.x,n.y,n.size);
  if(n.kind==='image'){const id=side+'-image-'+(++count),a=n.asset,k=n.mode==='cover'?Math.max(n.w/a.width,n.h/a.height):Math.min(n.w/a.width,n.h/a.height),iw=a.width*k,ih=a.height*k,x=n.x+(n.w-iw)*n.focusX,y=n.y+(n.h-ih)*n.focusY;return '<defs><clipPath id="'+id+'"><rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'"/></clipPath></defs><image href="'+a.data+'" x="'+x+'" y="'+y+'" width="'+iw+'" height="'+ih+'" clip-path="url(#'+id+')" preserveAspectRatio="none"/>'}
  throw Error('Unknown node');
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'mm" height="'+H+'mm" viewBox="'+(-b)+' '+(-b)+' '+W+' '+H+'" role="img">'+markup+'</svg>';
}
export function renderSvg(format,profile,style,vertical=false,includeBleed=true){if(!Number.isInteger(style)||style<0||style>4)throw Error('Estilo inválido');return svgDocument(composeDocument({format,profile,template:proposals()[style],orientation:vertical?'vertical':'native'}),'front',includeBleed)}
