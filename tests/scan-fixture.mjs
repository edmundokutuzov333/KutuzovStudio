import {writeFileSync,mkdirSync} from 'node:fs';import {join} from 'node:path';import {qrMatrix} from '../src/qr.mjs';import {code39Bars} from '../src/badge.mjs';
const out=process.argv[2];mkdirSync(out,{recursive:true});
function pgm(path,w,h,pixel){const data=Buffer.alloc(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++)data[y*w+x]=pixel(x,y)?0:255;writeFileSync(path,Buffer.concat([Buffer.from('P5\n'+w+' '+h+'\n255\n'),data]))}
for(const [i,value] of ['https://example.com/studio','x'.repeat(106),'Olá Moçambique'].entries()){const m=qrMatrix(value),scale=8,n=45*scale;pgm(join(out,'qr-'+i+'.pgm'),n,n,(x,y)=>m[Math.floor(y/scale)-4]?.[Math.floor(x/scale)-4]===1);writeFileSync(join(out,'qr-'+i+'.txt'),value+'\n')}
const value='STUDIO-001',c=code39Bars(value),scale=4;pgm(join(out,'barcode.pgm'),c.modules*scale,180,(x,y)=>y>20&&y<160&&c.bars.some(b=>x>=b.x*scale&&x<(b.x+b.width)*scale));writeFileSync(join(out,'barcode.txt'),value+'\n');
