export function validFormat(f){return !!f && typeof f.id==="string" && /^[a-z0-9-]{1,40}$/.test(f.id)&&["card","badge"].includes(f.product)&&typeof f.label==="string"&&f.label.length>0&&f.label.length<=100&&["width_mm","height_mm","bleed_mm","safe_mm","position"].every(k=>typeof f[k]==="number"&&Number.isFinite(f[k]))&&f.width_mm>=25&&f.width_mm<=200&&f.height_mm>=25&&f.height_mm<=200&&f.bleed_mm>=0&&f.bleed_mm<=5&&f.safe_mm>=2&&f.safe_mm<=8&&Math.min(f.width_mm,f.height_mm)>2*f.safe_mm&&Number.isInteger(f.position)&&f.position>=0}

export function geometry(f,vertical=false){if(!validFormat(f))throw Error("Formato inválido");const w=vertical?Math.min(f.width_mm,f.height_mm):f.width_mm;const h=vertical?Math.max(f.width_mm,f.height_mm):f.height_mm;const b=f.bleed_mm;return {w,h,b,s:f.safe_mm,width:w+2*b,height:h+2*b}}

export function escapeXml(v){return String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"}[x]))}

export function normalizeProfile(p){const limits={name:60,role:60,company:60,phone:35,email:100};const out={};for(const [k,n] of Object.entries(limits)){const v=String(p[k]??"").trim().replace(/\s+/g," ");if(v.length>n)throw Error("Campo demasiado longo: "+k);out[k]=v}if(!out.name)throw Error("Indica o teu nome.");if(out.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))throw Error("Email inválido.");out.color=/^#[0-9a-f]{6}$/i.test(p.color)?p.color:"#233963";return out}

export function contrastColor(hex){const a=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);const l=.2126*a[0]+.7152*a[1]+.0722*a[2];return (l+.05)/.05>=1.05/(l+.05)?"#000000":"#ffffff"}

export function renderSvg(format,profile,style,vertical=false,includeBleed=true){
 const p=normalizeProfile(profile),g=geometry(format,vertical);if(!Number.isInteger(style)||style<0||style>4)throw Error("Estilo inválido");
 const {w,h,s}=g,b=includeBleed?g.b:0, W=w+2*b,H=h+2*b, a=p.color, dark=style===1, colored=style===4, bg=dark?"#18191e":colored?a:"#f4f1e9", fg=dark?"#f4ebd6":colored?contrastColor(a):"#171717", accent=dark?"#d4b887":colored?fg:a;
 const rect=(x,y,width,height,fill)=>`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
 const text=(v,x,y,size,fill,weight=400,max=w-2*s,anchor="start")=>{if(!v)return "";const estimated=Array.from(v).length*size*.72;const fs=Math.min(size,max/Math.max(1,Array.from(v).length*.72));return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fs.toFixed(3)}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${estimated>max?` textLength="${max}" lengthAdjust="spacingAndGlyphs"`:""}>${escapeXml(v)}</text>`};
 let body=rect(-b,-b,W,H,bg);let x=s, max=w-2*s, anchor="start", tx=x;
 if(style===0)body+=rect(s,s,w-2*s,.8,accent);
 if(style===1){body+=`<rect x="${s/2}" y="${s/2}" width="${w-s}" height="${h-s}" fill="none" stroke="${accent}" stroke-width=".35"/>`;anchor="middle";tx=w/2}
 if(style===2){const band=w*.25;body+=rect(-b,-b,band+b,H,a);x=band+s;tx=x;max=w-x-s;body+=text(Array.from(p.name)[0]||"",band/2,h*.52,Math.min(band*.65,h*.25),contrastColor(a),700,band*.8,"middle")}
 if(style===3){body+=`<path d="M${w*.7} ${-b} H${w+b} V${h+b} H${w*.92} L${w*.76} ${h*.46} Z" fill="${a}"/>`;max=w*.69-s}
 if(style===4)body+=`<circle cx="${w}" cy="0" r="${Math.min(w,h)*.48}" fill="none" stroke="${fg}" opacity=".25" stroke-width=".5"/>`;
 const scale=Math.min(w,h);const lines=[p.company,p.name,p.role,p.phone,p.email];const ys=[h*.20,h*.43,h*.54,h*.77,h*.88];const sizes=[.062,.125,.062,.052,.052].map(n=>scale*n);lines.forEach((v,i)=>{body+=text(v,tx,Math.max(s+sizes[i],Math.min(h-s,ys[i])),sizes[i],i===0&&(dark||colored)?accent:fg,i===1?700:400,max,anchor)});
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="${-b} ${-b} ${W} ${H}" role="img" aria-label="${escapeXml("Design "+p.name)}">${body}</svg>`
}