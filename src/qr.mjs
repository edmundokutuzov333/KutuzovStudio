// ISO/IEC 18004: QR Model 2, version 5-L, byte mode, mask 0.
export function qrMatrix(value) {
  const bytes=new TextEncoder().encode(value);
  if(!bytes.length||bytes.length>106)throw Error('QR: máximo 106 bytes UTF-8.');
  const bits=[];const add=(n,k)=>{for(let i=k-1;i>=0;i--)bits.push(n>>>i&1)};
  add(4,4);add(bytes.length,8);for(const b of bytes)add(b,8);
  add(0,Math.min(4,864-bits.length));while(bits.length%8)bits.push(0);
  const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((n,b)=>2*n+b,0));
  for(let i=0;data.length<108;i++)data.push(i%2?17:236);
  const mul=(x,y)=>{let z=0;while(y){if(y&1)z^=x;y>>>=1;x<<=1;if(x&256)x^=285;}return z};
  let gen=[1],root=1;for(let i=0;i<26;i++){const next=Array(gen.length+1).fill(0);gen.forEach((a,j)=>{next[j]^=a;next[j+1]^=mul(a,root)});gen=next;root=mul(root,2)}
  const rem=[...data,...Array(26).fill(0)];for(let i=0;i<data.length;i++){const a=rem[i];for(let j=0;j<gen.length;j++)rem[i+j]^=mul(gen[j],a)}
  const code=[...data,...rem.slice(108)],n=37,m=Array.from({length:n},()=>Array(n).fill(null));
  const set=(x,y,b)=>{if(x>=0&&x<n&&y>=0&&y<n)m[y][x]=Number(b)};
  for(let i=0;i<n;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  for(const [cx,cy] of [[3,3],[n-4,3],[3,n-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,d!==2&&d!==4)}
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(30+dx,30+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
  const fmt=0x77c4,b=i=>fmt>>>i&1;
  for(let i=0;i<=5;i++)set(8,i,b(i));set(8,7,b(6));set(8,8,b(7));set(7,8,b(8));for(let i=9;i<15;i++)set(14-i,8,b(i));
  for(let i=0;i<8;i++)set(n-1-i,8,b(i));for(let i=8;i<15;i++)set(8,n-15+i,b(i));set(8,n-8,1);
  let k=0;for(let right=n-1;right>=1;right-=2){if(right===6)right=5;const up=((right+1)&2)===0;for(let vert=0;vert<n;vert++){const y=up?n-1-vert:vert;for(let j=0;j<2;j++){const x=right-j;if(m[y][x]!==null)continue;const bit=k<code.length*8?(code[k>>>3]>>>(7-(k&7)))&1:0;k++;set(x,y,bit^Number((x+y)%2===0));}}}
  if(k!==1079)throw Error('QR geometry mismatch: '+k);
  return m;
}
export function qrSvg(value,x,y,size){const m=qrMatrix(value),step=size/(m.length+8);let path='';for(let r=0;r<m.length;r++)for(let c=0;c<m.length;c++)if(m[r][c])path+='M'+(c+4)+' '+(r+4)+'h1v1h-1z';return '<g transform="translate('+x+' '+y+') scale('+step+')" shape-rendering="crispEdges"><rect width="45" height="45" fill="#fff"/><path d="'+path+'" fill="#000"/></g>';}
