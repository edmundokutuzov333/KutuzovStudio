// Original, deterministic vector backgrounds. No third-party stock payloads.
export const backgrounds=Object.freeze([["none","Sem fundo"],["geometric","Geometric"],["lines","Fine Lines"],["orbit","Orbit"],["grid","Grid"],["paper","Paper Fold"],["diagonal","Diagonal"],["waves","Wave"],["dots","Dot Matrix"],["steps","Steps"],["rings","Rings"],["stripes","Stripes"],["arch","Arch"]].map(([id,label])=>Object.freeze({id,label})));
export function validBackground(id){return backgrounds.some(b=>b.id===id)}
function tint(bg,fg,weight=.065){const rgb=(s,i)=>parseInt(s.slice(i,i+2),16);return '#'+[1,3,5].map(i=>Math.round(rgb(bg,i)*(1-weight)+rgb(fg,i)*weight).toString(16).padStart(2,'0')).join('')}
export function backgroundNodes(id,g,bg,fg){
 if(!validBackground(id))throw Error('Fundo inválido.');if(id==='none')return [];
 const {w,h,b}=g,W=w+2*b,H=h+2*b,x=-b,y=-b,c=tint(bg,fg),nodes=[],r=(x,y,w,h)=>nodes.push({kind:'rect',x,y,w,h,fill:c}),p=d=>nodes.push({kind:'path',d,fill:c}),ring=(x,y,r)=>nodes.push({kind:'circle',x,y,r,fill:c});
 if(id==='geometric')p('M'+x+' '+y+'H'+(x+W*.62)+'L'+x+' '+(y+H*.66)+'Z');
 if(id==='lines'||id==='stripes')for(let i=0;i<12;i++){const xx=x+i*W/12;r(xx,y,id==='lines'?.22:W/36,H)}
 if(id==='grid'){for(let i=0;i<12;i++)r(x+i*W/12,y,.18,H);for(let i=0;i<10;i++)r(x,y+i*H/10,W,.18)}
 if(id==='orbit'||id==='rings')for(let i=1;i<=6;i++)ring(id==='orbit'?x+W:x+W*.5,id==='orbit'?y:y+H*.5,Math.min(W,H)*i/9);
 if(id==='paper')p('M'+x+' '+(y+H)+'H'+(x+W)+'V'+(y+H*.35)+'L'+(x+W*.36)+' '+(y+H*.82)+'Z');
 if(id==='diagonal')for(let i=-2;i<7;i++){const xx=x+i*W/5;p('M'+xx+' '+y+'h'+W/13+'l'+W*.55+' '+H+'h'+(-W/13)+'Z')}
 if(id==='waves')for(let i=0;i<5;i++){const yy=y+H*i/5;p('M'+x+' '+yy+'Q'+(x+W*.25)+' '+(yy-H*.12)+' '+(x+W*.5)+' '+yy+'T'+(x+W)+' '+yy+'v'+H/45+'Q'+(x+W*.75)+' '+(yy+H*.12)+' '+(x+W*.5)+' '+(yy+H/45)+'T'+x+' '+(yy+H/45)+'Z')}
 if(id==='dots')for(let i=0;i<12;i++)for(let j=0;j<9;j++)r(x+(i+.5)*W/12,y+(j+.5)*H/9,.35,.35);
 if(id==='steps')for(let i=0;i<5;i++)r(x+W*i/10,y+H*(.8-i*.1),W*(1-i/10),H*.04);
 if(id==='arch')for(let i=1;i<6;i++)ring(x+W*.5,y+H,Math.min(W,H)*i/6);
 return nodes;
}
