// Private organization/event badges, not official identity documents.
export const badgeKinds=Object.freeze({employee:'COLABORADOR',visitor:'VISITANTE',event:'EVENTO',speaker:'ORADOR',student:'ESTUDANTE',crew:'EQUIPA'});
export function badgeFields(p){const kind=p.badgeKind||'employee';if(!Object.hasOwn(badgeKinds,kind))throw Error('Tipo de crachá inválido.');const id=String(p.badgeId||'').trim(),department=String(p.department||'').trim(),expiry=String(p.expiry||'').trim();if(id.length>40||department.length>80||/[\u0000-\u001f]/.test(id+department))throw Error('Identificação inválida.');if(expiry&&(!/^\d{4}-\d{2}-\d{2}$/.test(expiry)||!Number.isFinite(Date.parse(expiry))||new Date(expiry).toISOString().slice(0,10)!==expiry))throw Error('Validade inválida.');return {kind,label:badgeKinds[kind],id,department,expiry};}
export function parseCsv(text){
 if(typeof text!=='string'||text.length>1000000)throw Error('CSV demasiado grande.');
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0],sep=first.includes(';')&&!first.includes(',')?';':',';
 const records=[];let row=[],cell='',quoted=false,closed=false;
 const push=()=>{row.push(cell);cell='';closed=false};const line=()=>{push();if(row.some(v=>v.trim()))records.push(row);row=[]};
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=c;continue}
 if(c===sep){push();continue}if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();continue}if(closed)throw Error('CSV: texto após aspas.');if(c==='"'){if(cell)throw Error('CSV: aspas inválidas.');quoted=true}else cell+=c}
 if(quoted)throw Error('CSV: aspas não fechadas.');if(cell||row.length||closed)line();
 const headers=records.shift()?.map(x=>x.trim())||[],allowed=['name','role','company','department','badgeId','badgeKind','expiry','qr','photo','phone','email','website','address','slogan'];
 if(!headers.includes('name')||new Set(headers).size!==headers.length||headers.some(h=>!allowed.includes(h)))throw Error('CSV: cabeçalhos inválidos; name é obrigatório.');
 if(!records.length||records.length>50)throw Error('CSV: entre 1 e 50 pessoas por lote.');
 const ids=new Set();return records.map((r,i)=>{if(r.length!==headers.length)throw Error('Linha '+(i+2)+': número de colunas inválido.');const p=Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]));if(!p.name)throw Error('Linha '+(i+2)+': nome obrigatório.');badgeFields(p);if(p.badgeId){if(ids.has(p.badgeId))throw Error('Identificador duplicado: '+p.badgeId);ids.add(p.badgeId)}if(p.photo&&!/^[^/\\\u0000-\u001f]{1,150}\.(jpg|jpeg|png|webp)$/i.test(p.photo))throw Error('Nome de fotografia inválido.');return p});
}
