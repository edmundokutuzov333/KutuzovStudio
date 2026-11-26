import {parsePack} from '../src/template-runtime.mjs';
import {readFile,mkdir,writeFile,rm,readdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
export async function build({out=join(root,'dist'),env=process.env}={}){
 const dest=resolve(out);if(dest===resolve(root)||!dest.startsWith(resolve(root)+ '/')&&env.STUDIO_TEST_BUILD!=='1')throw Error('Invalid build directory');
 const src=(await readdir(join(root,'src'))).filter(x=>/\.(mjs|css)$/.test(x)).map(x=>'src/'+x).sort();
 const files=['index.html','templates.html','native.html','tools/open-kutuzov.jsx','admin.html','privacy.html','icon.svg','manifest.webmanifest','sw.js','docs/print-production.html','tools/pdfx.py','tools/vector_pdf.py','404.html',...src];
 const bytes=new Map();for(const f of files)bytes.set(f,await readFile(join(root,f)));
 const library=[];let librarySize=0;for(const name of (await readdir(join(root,'template-library'))).sort()){if(!/^[a-z0-9-]{1,64}\.json$/.test(name))continue;const data=await readFile(join(root,'template-library',name));const p=parsePack(data.toString());if(p.status!=='approved'||name!==p.id+'.json')throw Error('Unapproved or mismatched library template: '+name);librarySize+=data.length;if(library.length>=100||librarySize>80000000)throw Error('Template library exceeds budget');library.push({id:p.id,title:p.title,product:p.product});bytes.set('template-library/'+name,data)}
 bytes.set('template-library/catalog.json',Buffer.from(JSON.stringify(library)));
 const sourceHash=createHash('sha256');for(const [name,data] of bytes){sourceHash.update(name+'\0');sourceHash.update(data)}for(const name of ['package.json','tools/build.mjs']){sourceHash.update(name+'\0');sourceHash.update(await readFile(join(root,name)))}const digest=sourceHash.digest('hex');
 let commit=env.VERCEL_GIT_COMMIT_SHA||env.GITHUB_SHA||'';if(!commit){try{commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}catch{}}if(!/^[a-f0-9]{40}$/.test(commit))commit=null;
 let origin=env.STUDIO_PUBLIC_ORIGIN||(env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+env.VERCEL_PROJECT_PRODUCTION_URL:'');
 if(origin){const u=new URL(origin);if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw Error('Invalid public origin');}
 // The release hash covers source and deploy origin; cached shell changes whenever either changes.
 const release=createHash('sha256').update(digest+'\0'+origin).digest('hex').slice(0,20);
 const html=bytes.get('index.html').toString();bytes.set('index.html',Buffer.from(html.replace('</head>',(origin?'<link rel="canonical" href="'+origin+'/"><meta property="og:url" content="'+origin+'/">':'<meta name="robots" content="noindex">')+'</head>')));
 bytes.set('sw.js',Buffer.from(bytes.get('sw.js').toString().replace('kutuzov-shell-v11-source','kutuzov-shell-'+release)));
 const shell=bytes.get('sw.js').toString().match(/const SHELL=\[([^\]]+)\]/)?.[1];if(!shell)throw Error('Missing offline shell');for(const match of shell.matchAll(/'\.\/([^']*)'/g)){if(match[1]&&!bytes.has(match[1]))throw Error('Missing offline asset: '+match[1]);}
 const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));bytes.set('health.json',Buffer.from(JSON.stringify({service:'kutuzov-studio',status:'ok',version:pkg.version,commit,release,mode:'static'},null,2)+'\n'));
 bytes.set('robots.txt',Buffer.from(origin?'User-agent: *\nDisallow: /tools/\nDisallow: /health.json\nSitemap: '+origin+'/sitemap.xml\n':'User-agent: *\nDisallow: /\n'));
 if(origin)bytes.set('sitemap.xml',Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+['/','/privacy.html','/docs/print-production.html'].map(p=>'<url><loc>'+origin+p+'</loc></url>').join('')+'</urlset>\n'));
 const size=[...bytes.values()].reduce((n,b)=>n+b.length,0);if(size-librarySize>750000)throw Error('Static shell exceeds 750 KB budget: '+size);
 await rm(dest,{recursive:true,force:true});for(const [name,data] of bytes){const p=join(dest,name);await mkdir(dirname(p),{recursive:true});await writeFile(p,data)}
 return {files:[...bytes.keys()].sort(),size,release,commit,origin};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(JSON.stringify(await build(),null,2));
