// Private metadata-only Magnific adapter. No image/download/AI endpoint exists here.
export const STOCK_ENDPOINT='https://api.magnific.com/v1/resources';
export function stockQuery(term){if(typeof term!=='string')throw Error('Invalid query');const q=term.trim();if(q.length<3||q.length>80||/[\u0000-\u001f\u007f]/.test(q))throw Error('Invalid query');const u=new URL(STOCK_ENDPOINT);u.searchParams.set('term',q);u.searchParams.set('limit','20');u.searchParams.set('page','1');return u}
export function sanitizeStock(payload){if(!payload||!Array.isArray(payload.data))throw Error('Invalid provider response');const result=[],seen=new Set();for(const r of payload.data.slice(0,50)){if(!r||!['photo','vector'].includes(r.image?.type)||!Number.isSafeInteger(r.id)||r.id<=0||typeof r.title!=='string'||typeof r.author?.name!=='string'||typeof r.url!=='string')continue;
 let u;try{u=new URL(r.url)}catch{continue}const id=String(r.id);if(u.protocol!=='https:'||!['www.freepik.com','www.magnific.com'].includes(u.hostname)||u.username||u.password||u.port||!/^\/[a-z-]+\/[a-z0-9-]+_[0-9]+\.htm$/.test(u.pathname)||!u.pathname.endsWith('_'+id+'.htm')||seen.has(id))continue;
 const title=r.title.trim().slice(0,150),author=r.author.name.trim().slice(0,100);if(!title||!author||/[\u0000-\u001f]/.test(title+author))continue;seen.add(id);
 result.push({external_id:id,title,author,source_url:'https://www.magnific.com'+u.pathname,type:r.image.type,quoted_credits:null});if(result.length===20)break}
 return result}
export function makeHandler({env,fetcher=fetch}){
 const origins=new Set((env('STUDIO_ADMIN_ORIGINS')||'').split(',').map(s=>s.trim()).filter(s=>/^https:\/\/[^/]+$/.test(s)||/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(s)));
 return async req=>{
  const origin=req.headers.get('origin'),allowed=!origin||origins.has(origin),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(origin&&allowed){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='authorization, apikey, content-type';headers['Access-Control-Allow-Methods']='POST, OPTIONS'}
  const respond=(status,body)=>new Response(JSON.stringify(body),{status,headers});
  if(!allowed)return respond(403,{error:'Origin not allowed'});if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return respond(405,{error:'Method not allowed'});
  const auth=req.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth)||auth.length>8192)return respond(401,{error:'Authentication required'});
  const apiKey=env('SUPABASE_ANON_KEY')||env('SUPABASE_PUBLISHABLE_KEY')||(()=>{try{return JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}').default}catch{return ''}})(),project=env('SUPABASE_URL');
  if(!apiKey||!project)return respond(503,{error:'Service unavailable'});
  const dbHeaders={authorization:auth,apikey:apiKey,'content-type':'application/json'};
  try{
   const who=await fetcher(new URL('/auth/v1/user',project),{headers:dbHeaders,redirect:'error',signal:AbortSignal.timeout(5000)});if(!who.ok)return respond(401,{error:'Invalid session'});
   const user=await who.json();if(!user?.id)return respond(401,{error:'Invalid session'});
   const rpc=async name=>fetcher(new URL('/rest/v1/rpc/'+name,project),{method:'POST',headers:dbHeaders,body:'{}',redirect:'error',signal:AbortSignal.timeout(5000)});
   const access=await rpc('studio_editor_status');if(!access.ok||!(await access.json())?.mfa)return respond(403,{error:'Editor MFA required'});
   const key=env('MAGNIFIC_API_KEY');if(env('MAGNIFIC_CURATION_ENABLED')!=='true'||!key)return respond(503,{error:'Magnific search disabled: written authorization and verified zero-cost search required'});
   if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return respond(415,{error:'JSON required'});
   const raw=await req.text();if(raw.length>1024)return respond(413,{error:'Request too large'});let url;try{url=stockQuery(JSON.parse(raw).term)}catch{return respond(400,{error:'Invalid search term'})}
   const reservation=await rpc('studio_reserve_stock_search');if(!reservation.ok)return respond(503,{error:'Budget unavailable'});const remaining=await reservation.json();if(remaining===-1)return respond(429,{error:'Daily search quota reached'});if(!Number.isInteger(remaining)||remaining<0||remaining>19)return respond(503,{error:'Budget unavailable'});
   const response=await fetcher(url,{method:'GET',headers:{'x-magnific-api-key':key,'Accept-Language':'en-US','Accept':'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return respond(response.status===429?429:502,{error:'Provider unavailable'});
   const declared=Number(response.headers.get('content-length')||0);if(declared>2000000)return respond(502,{error:'Provider response too large'});
   const reader=response.body?.getReader();if(!reader)return respond(502,{error:'Provider unavailable'});const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000){await reader.cancel();return respond(502,{error:'Provider response too large'})}chunks.push(value)}
   const all=new Uint8Array(size);let pos=0;for(const chunk of chunks){all.set(chunk,pos);pos+=chunk.length}const items=sanitizeStock(JSON.parse(new TextDecoder().decode(all)));
   return respond(200,{items,remaining,delivery:'metadata-only'});
  }catch{return respond(502,{error:'Search temporarily unavailable'})}
 }
}
