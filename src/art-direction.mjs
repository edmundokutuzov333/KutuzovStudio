// Original parametric art direction. Every coordinate is in physical millimetres.
// No downloaded stock, remote URL, baked-in placeholder or raster graphic is required.
export const artVersion=2;
const styles={
 swiss:['#f1efe7','#171b25','#254bd1','#142e75','Grid / International'],
 luxury:['#15151b','#f5ecda','#c6a46a','#604522','Noir / Gilded'],
 corporate:['#e9edf3','#142336','#194e9c','#102c58','Signal / Corporate'],
 brutal:['#e7fa5b','#151619','#17181c','#576126','Type / Brutal'],
 editorial:['#f1e4d0','#36241d','#ab492c','#652b24','Form / Editorial'],
 tech:['#111e24','#eaf9f4','#53d4af','#14545b','Interface / Technical'],
 organic:['#e9e4d0','#293b30','#5c785a','#283e37','Terra / Organic'],
 mono:['#eae9e7','#18191e','#45484f','#17181d','Archive / Mono'],
 geo:['#f6e5d1','#261b20','#d94c37','#8b2348','Modular / Geometry'],
 creative:['#f0e9fa','#261744','#7946d2','#32216c','Studio / Chromatic'],
 afro:['#f5dfb5','#42271b','#a4572b','#643326','Rhythm / Afro Modern'],
 future:['#161827','#f0f1ff','#8298ff','#353a8c','Orbit / Future']
};
const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
const rect=(x,y,w,h,fill,opacity)=>({kind:'rect',x,y,w,h,fill,...(opacity===undefined?{}:{opacity})});
const path=(d,fill)=>({kind:'path',d,fill});
const gradient=(q,a,b,axis='diagonal')=>({kind:'gradient',...q,colors:[a,b],axis});
const ellipse=(x,y,rx,ry,fill,opacity=1)=>({kind:'ellipse',x,y,rx,ry,fill,opacity});
const trim=(q,g)=>({x:q.x+g,y:q.y+g,w:q.w-2*g,h:q.h-2*g});
const split=(q,axis,fraction,gap)=>{const size=(axis==='x'?q.w:q.h)-gap,first=size*fraction;return axis==='x'?[{...q,w:first},{...q,x:q.x+first+gap,w:size-first}]:[{...q,h:first},{...q,y:q.y+first+gap,h:size-first}]};
const initials=p=>Array.from((p.company||p.name).trim().split(/\s+/).slice(0,2).map(s=>Array.from(s)[0]||'').join('').toUpperCase()).slice(0,3).join('');
export function artStyle(id){const s=styles[id];if(!s)throw Error('Direcção de arte inválida.');return {bg:s[0],fg:s[1],accent:s[2],deep:s[3],name:s[4]}}
export function artMotif(id,q,a,d,seed=0){
 const {x,y,w,h}=q, X=u=>x+w*u,Y=v=>y+h*v, P=(...v)=>v.map((p,i)=>(i?'L':'M')+X(p[0])+' '+Y(p[1])).join(' ')+' Z', n=[gradient(q,d,a,seed%2?'vertical':'diagonal')],light=mix(a,'#ffffff',.48),dark=mix(d,'#000000',.24),soft=mix(a,d,.48), k=seed*.025;
 const poly=(points,c)=>n.push(path(P(...points),c)),r=(u,v,uw,vh,c,o)=>n.push(rect(X(u),Y(v),w*uw,h*vh,c,o)),e=(u,v,uw,vh,c,o)=>n.push(ellipse(X(u),Y(v),w*uw,h*vh,c,o));
 switch(id){
 case 'swiss':for(let i=0;i<5;i++){r(i*.2,0,.006,1,light,.45);r(0,i*.2,1,.006,light,.45)}poly([[0,0],[.63+k,0],[.14,1],[0,1]],dark);poly([[.75,0],[1,0],[1,1],[.28,1]],a);break;
 case 'luxury':for(let i=0;i<7;i++){const t=.06+i*.035;r(t,t,1-2*t,.008,light,.72);r(t,1-t-.008,1-2*t,.008,light,.72);r(t,t,.008,1-2*t,light,.72);r(1-t-.008,t,.008,1-2*t,light,.72)}poly([[0,.75],[1,.18],[1,.23],[0,.80]],light);break;
 case 'corporate':poly([[0,0],[.45,0],[1,.55],[1,1],[.68,1],[0,.32]],dark);poly([[.32,0],[.53,0],[1,.48],[1,.67]],light);poly([[0,.68],[.40,1],[0,1]],soft);break;
 case 'brutal':r(0,0,.5,.5,dark);r(.5,.5,.5,.5,dark);r(.5,0,.5,.5,light);r(0,.5,.5,.5,a);for(let i=0;i<8;i++)r(.03+i*.055,.6,.02,.31,dark);break;
 case 'editorial':poly([[0,0],[.78,0],[.48,1],[0,1]],dark);poly([[.78,0],[1,0],[1,1],[.48,1]],light);e(.60,.46,.23,.34,soft);e(.60,.46,.12,.18,dark);break;
 case 'tech':for(let i=0;i<9;i++){r(i/9,0,.004,1,light,.4);r(0,i/9,1,.004,light,.4)}for(let i=0;i<4;i++){poly([[0,.2+i*.2],[.32,.2+i*.2],[.65,.04+i*.2],[.65,.065+i*.2],[.33,.225+i*.2],[0,.225+i*.2]],light);e(.65,.052+i*.2,.016,.016,light)}break;
 case 'organic':e(.17,.23,.17,.23,light);e(.73,.71,.27,.29,dark);e(.65,.60,.19,.24,soft);poly([[0,.8],[.37,.45],[.55,.58],[.18,1],[0,1]],light);break;
 case 'mono':for(let i=0;i<9;i++)r(i/9,0,.043,1,i%2?light:dark,.55);poly([[0,0],[1,0],[1,.22],[0,.78]],dark);break;
 case 'geo':r(0,0,.5,.5,dark);r(.5,.5,.5,.5,soft);e(.25,.75,.25,.25,light);poly([[.5,0],[1,0],[1,.5]],light);poly([[.5,.5],[1,1],[.5,1]],dark);break;
 case 'creative':e(.28,.25,.28,.25,light);e(.73,.62,.27,.38,dark);e(.73,.62,.17,.25,soft);poly([[0,.9],[.6,0],[.7,0],[.1,1],[0,1]],light);break;
 case 'afro':for(let i=0;i<5;i++)for(let j=0;j<4;j++){const u=i/5,v=j/4;poly([[u,v],[u+.1,v+.125],[u+.2,v],[u+.1,v+.25]],(i+j)%2?light:dark)}break;
 case 'future':for(let i=0;i<7;i++){const z=.04+i*.07;poly([[z,0],[z+.035,0],[1,1-z],[1,1-z-.035]],i%2?light:soft)}e(.7,.25,.22,.25,dark);e(.7,.25,.16,.18,a);e(.7,.25,.10,.11,light);break;
 }
 return n;
}
export function composeArt({g,p,badge,template,profile,photo,logo,backgroundImage,showPhoto,showLogo,photoMode,textScale,textAlign,variation,image,fitBlock,measure,contrastColor,backgroundNodes,backgroundPermission,code39Bars,warnings}){
 const {w,h,b,s}=g, style=artStyle(template.family.id),a=p.color||style.accent,d=p.color?mix(a,'#111321',.72):style.deep,unit=Math.min(w,h),wide=w>=h,layout=template.layout, gap=Math.min(2.5,Math.min(w-2*s,h-2*s)*.065),base={x:s,y:s,w:w-2*s,h:h-2*s};
 const f=template.family, custom=profile.background==='uploaded';if(custom&&!backgroundImage)throw Error('Selecciona primeiro uma imagem de fundo.');
 const sides={};const palette=(side)=>{const inverse=side==='back'&&(layout==='split'||layout==='rail'||layout==='editorial');const bg=inverse?d:style.bg, fg=inverse?contrastColor(bg):style.fg;return {bg,fg}};
 const align=(fallback)=>textAlign==='auto'?fallback:textAlign;
 const fontFor=(kind)=>kind==='headline'?(f.font==='monospace'?'sans-serif':f.font):kind==='meta'&&['tech','future','swiss','mono'].includes(f.id)?'monospace':'sans-serif';
 for(const side of ['front','back']){
  const {bg,fg}=palette(side),isFront=side==='front',nodes=[rect(-b,-b,w+2*b,h+2*b,bg)];
  if(custom){nodes.push({...image(backgroundImage,-b,-b,w+2*b,h+2*b,'cover'),focusX:.5,focusY:.5},rect(-b,-b,w+2*b,h+2*b,bg,.92))}
  else nodes.push(...backgroundNodes(profile.background||'none',g,bg,fg));
  // Subtle printed margin detail; safe content never relies on a decorative area.
  const edge=Math.min(s*.30,unit*.02);nodes.push(rect(-b,-b,w+2*b,b+edge,a),rect(-b,h-edge,w+2*b,b+edge,d));
  let area={...base};
  const addText=(fields,box,kind='body',opts={})=>{
   if(!fields.some(x=>x[1]))return;
   const font=fontFor(kind),color=opts.color||fg;
   const entries=fields.map(([key,value,factor,weight=400])=>({key,value,size:Math.min(15,unit*factor*textScale),weight,gap:Math.max(.22,unit*.009),fill:color}));
   const fit=fitBlock(entries,{...box,align:align(opts.align||'start'),center:opts.center??true},font,measure);
   nodes.push(...fit.nodes);warnings.push(...fit.warnings);
  };
  const addArt=(q,showMark=false)=>{
   if(q.w<=0||q.h<=0)return;
   nodes.push(...artMotif(f.id,q,a,d,variation));
   if(showMark){const pad=Math.min(q.w,q.h)*.10,plate=trim(q,pad),ink=contrastColor(d);nodes.push(rect(plate.x,plate.y,plate.w,plate.h,d,.92));if(showLogo&&logo){const inner=trim(plate,Math.min(plate.w,plate.h)*.12);nodes.push({...image(logo,inner.x,inner.y,inner.w,inner.h,'contain'),focusX:.5,focusY:.5})}else addText([['monogram',initials(p),.28,700]],trim(plate,Math.min(plate.w,plate.h)*.10),'headline',{align:'middle',color:ink});}
  };
  const addPhoto=q=>{const inset=Math.min(q.w,q.h)*.065;nodes.push(...artMotif(f.id,q,a,d,variation));const inner=trim(q,inset);nodes.push(image(photo,inner.x,inner.y,inner.w,inner.h,photoMode));};
  const reserveLogo=q=>{if(!showLogo||!logo)return q;const [top,rest]=split(q,'y',.22,gap*.5);const lw=Math.min(top.w*.7,top.h*2.7),x=align(layout==='center'?'middle':'start')==='middle'?top.x+(top.w-lw)/2:top.x;nodes.push({...image(logo,x,top.y,lw,top.h,'contain'),focusX:.5,focusY:.5});return rest};
  const identity=[['company',p.company,.048,600],['name',p.name,.145,700],['role',p.role,.067,500]],contacts=[['phone',p.phone,.053],['email',p.email,.053]];
  if(isFront&&badge){
   const roleH=area.h*(wide?.23:.16),role={...area,h:roleH};nodes.push(gradient(role,d,a,'horizontal'),rect(role.x,role.y,role.w,role.h,d,.78));addText([['badgeKind',badge.label,.095,700]],trim(role,Math.min(role.w,role.h)*.10),'meta',{color:contrastColor(d),align:'middle'});
   area={...area,y:area.y+roleH+gap,h:area.h-roleH-gap};
   const [first,second]=split(area,wide?'x':'y',wide?.39:.47,gap);
   const media=layout==='rail'&&wide?second:first,info=media===first?second:first;
   if(showPhoto&&photo)addPhoto(media);else addArt(media,true);
   let q=info;if(showLogo&&logo&&(showPhoto&&photo))q=reserveLogo(q);
   addText([...identity,['department',badge.department,.055],['badgeId',badge.id?'ID: '+badge.id:'',.062,700]],q,'headline',{align:layout==='center'?'middle':'start'});
  }else if(isFront){
   // The five compositions have separate information and artwork zones.
   const mediaNeeded=!!(showPhoto&&photo), useArt=layout!=='stack'||mediaNeeded;
   if(useArt){
    const axis=wide&&layout!=='center'?'x':'y',frac=layout==='center'?.29:layout==='rail'?.22:layout==='editorial'?.34:.36;
    const [artBox,textBox]=split(area,axis,frac,gap);
    const reversed=layout==='split'||layout==='editorial';
    let artQ=artBox,textQ=textBox;
    if(reversed){const [t,m]=split(area,axis,1-frac,gap);artQ=m;textQ=t;}
    if(mediaNeeded)addPhoto(artQ);else addArt(artQ,layout==='center'||layout==='editorial');
    area=textQ;
   }else{
    const [main,band]=split(area,'y',.81,gap);addArt(band,false);area=main;
   }
   area=reserveLogo(area);
   const contactPresent=contacts.some(x=>x[1]),defaultAlign=layout==='center'?'middle':'start';
   if(contactPresent){const [main,details]=split(area,'y',.67,gap*.5);addText(identity,main,'headline',{align:defaultAlign,center:layout!=='editorial'});nodes.push(rect(details.x,details.y,details.w,Math.min(.25,details.h*.035),mix(bg,fg,.45)));addText(contacts,{...details,y:details.y+details.h*.08,h:details.h*.92},'meta',{align:defaultAlign});}
   else addText(identity,area,'headline',{align:defaultAlign,center:layout!=='editorial'});
  }else{
   // Machine-readable codes get independent white zones and quiet areas.
   if(badge?.barcode){const [top,bar]=split(area,'y',.78,gap);const bh=Math.min(12,bar.h),bw=bar.w;if(bw/code39Bars(badge.barcode).modules<.19)warnings.push('Code 39 estreito: confirma leitura após impressão.');nodes.push({kind:'barcode',value:badge.barcode,x:bar.x,y:bar.y+(bar.h-bh)/2,w:bw,h:bh});area=top;}
   if(p.qr){const [info,code]=split(area,wide?'x':'y',wide?.64:.67,gap);const qs=Math.min(code.w,code.h,26);if(qs/45<.40)warnings.push('QR pequeno: confirma leitura após impressão.');nodes.push({kind:'qr',value:p.qr,x:code.x+(code.w-qs)/2,y:code.y+(code.h-qs)/2,size:qs});area=info;}
   const backFields=badge?[['company',p.company||p.name,.10,700],['badgeKind',badge.label,.073,700],['badgeId',badge.id?'ID: '+badge.id:'',.058],['expiry',badge.expiry?'Validade: '+badge.expiry:'',.055],['website',p.website,.05],['phone',p.phone,.05],['slogan',p.slogan,.05]]:[['company',p.company||p.name,.12,700],['slogan',p.slogan,.06],['website',p.website,.058],['address',p.address,.052],['phone',p.phone,.052],['email',p.email,.052]];
   // On compact backs with codes, prioritize the actual information rather than artwork.
   const dense=backFields.filter(x=>x[1]).length>=4||p.qr&&badge?.barcode||area.h<15||area.w<15;
   if(!dense){const [mark,info]=split(area,wide?'x':'y',layout==='center'?.46:.32,gap);addArt(mark,true);area=info;}
   else if(showLogo&&logo&&area.h>17)area=reserveLogo(area);
   addText(backFields,area,'body',{align:layout==='center'?'middle':'start'});
  }
  sides[side]=nodes;
 }
 return {geometry:g,templateId:template.id,artVersion:2,backgroundRights:custom?backgroundPermission(backgroundImage):null,sides,warnings:[...new Set(warnings)]};
}
