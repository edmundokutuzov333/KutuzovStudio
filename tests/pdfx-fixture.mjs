import {writeFileSync} from 'node:fs';import {deflateSync} from 'node:zlib';import {encodePdf,printGeometry} from '../src/print.mjs';
const g={w:85,h:55,b:3},p=printGeometry(g,true),image={width:2,height:2,bytes:new Uint8Array(deflateSync(new Uint8Array([0,100,200,255,255,255,20,40,50,200,80,20])))};
const page={image,media:p.media,trim:p.trim,bleed:p.bleed,placements:[p.placement],marks:true,g};
writeFileSync(process.argv[2],encodePdf([page,page]));
