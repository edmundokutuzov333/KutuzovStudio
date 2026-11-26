import {composeDocument,svgDocument} from '../src/engine.mjs';
import {templates} from '../src/templates.mjs';
import {builtIn} from '../src/catalog.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const out=process.argv[2]||'motion/assets';mkdirSync(out,{recursive:true});
const profile={name:'Ana Matola',role:'Directora Criativa',company:'MOSAICO',phone:'+258 84 123 4567',email:'ana@mosaico.example',website:'mosaico.example',badgeKind:'speaker',badgeId:'001',department:'Design',qr:'https://example.com'};
for (const [id,f,layout] of [['noir','luxury','editorial'],['blue','swiss','split'],['violet','creative','split'],['earth','editorial','center'],['tech','tech','rail'],['future','future','editorial']]) for(const product of ['card','badge']) {const d=composeDocument({format:builtIn.find(x=>x.id===(product==='card'?'eu-card':'vertical-badge')),profile,template:templates.find(x=>x.family.id===f&&x.layout===layout),variation:2});for(const side of ['front','back'])writeFileSync(join(out,product+'-'+id+'-'+side+'.svg'),svgDocument(d,side,false));}
