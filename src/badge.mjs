// Private organization/event badges, not official identity documents.
export const badgeKinds=Object.freeze({employee:'COLABORADOR',visitor:'VISITANTE',event:'EVENTO',speaker:'ORADOR',student:'ESTUDANTE',crew:'EQUIPA'});
export function badgeFields(p){const kind=p.badgeKind||'employee';if(!Object.hasOwn(badgeKinds,kind))throw Error('Tipo de crachá inválido.');const id=String(p.badgeId||'').trim(),department=String(p.department||'').trim(),expiry=String(p.expiry||'').trim();if(id.length>40||department.length>80||/[\u0000-\u001f]/.test(id+department))throw Error('Identificação inválida.');if(expiry&&(!/^\d{4}-\d{2}-\d{2}$/.test(expiry)||!Number.isFinite(Date.parse(expiry))||new Date(expiry).toISOString().slice(0,10)!==expiry))throw Error('Validade inválida.');const barcode=String(p.barcode||'').trim().toUpperCase();if(barcode&&!/^[0-9A-Z .\-$/+%]{1,24}$/.test(barcode))throw Error('Code 39: até 24 caracteres A–Z, 0–9 e símbolos permitidos.');return {kind,label:badgeKinds[kind],id,department,expiry,barcode};}
export function parseCsv(text){
 if(typeof text!=='string'||text.length>1000000)throw Error('CSV demasiado grande.');
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/,1)[0],sep=first.includes(';')&&!first.includes(',')?';':',';
 const records=[];let row=[],cell='',quoted=false,closed=false;
 const push=()=>{row.push(cell);cell='';closed=false};const line=()=>{push();if(row.some(v=>v.trim()))records.push(row);row=[]};
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=c;continue}
 if(c===sep){push();continue}if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line();continue}if(closed)throw Error('CSV: texto após aspas.');if(c==='"'){if(cell)throw Error('CSV: aspas inválidas.');quoted=true}else cell+=c}
 if(quoted)throw Error('CSV: aspas não fechadas.');if(cell||row.length||closed)line();
 const headers=records.shift()?.map(x=>x.trim())||[],allowed=['name','role','company','department','badgeId','badgeKind','expiry','qr','barcode','photo','phone','email','website','address','slogan'];
 if(!headers.includes('name')||new Set(headers).size!==headers.length||headers.some(h=>!allowed.includes(h)))throw Error('CSV: cabeçalhos inválidos; name é obrigatório.');
 if(!records.length||records.length>50)throw Error('CSV: entre 1 e 50 pessoas por lote.');
 const ids=new Set();return records.map((r,i)=>{if(r.length!==headers.length)throw Error('Linha '+(i+2)+': número de colunas inválido.');const p=Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]));if(!p.name)throw Error('Linha '+(i+2)+': nome obrigatório.');badgeFields(p);if(p.badgeId){if(ids.has(p.badgeId))throw Error('Identificador duplicado: '+p.badgeId);ids.add(p.badgeId)}if(p.photo&&!/^[^/\\\u0000-\u001f]{1,150}\.(jpg|jpeg|png|webp)$/i.test(p.photo))throw Error('Nome de fotografia inválido.');return p});
}

const code39Alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const code39Patterns=[0x034,0x121,0x061,0x160,0x031,0x130,0x070,0x025,0x124,0x064,0x109,0x049,0x148,0x019,0x118,0x058,0x00D,0x10C,0x04C,0x01C,0x103,0x043,0x142,0x013,0x112,0x052,0x007,0x106,0x046,0x016,0x181,0x0C1,0x1C0,0x091,0x190,0x0D0,0x085,0x184,0x0C4,0x0A8,0x0A2,0x08A,0x02A];
export function code39Bars(value){if(typeof value!=='string'||!value||value.length>24||Array.from(value).some(c=>!code39Alphabet.includes(c)))throw Error('Code 39 inválido.');
 const bars=[];let x=10;const text='*'+value+'*';for(let i=0;i<text.length;i++){const p=text[i]==='*'?0x094:code39Patterns[code39Alphabet.indexOf(text[i])];for(let j=0;j<9;j++){const width=(p&(1<<(8-j)))?3:1;if(j%2===0)bars.push({x,width});x+=width}if(i!==text.length-1)x++}return {bars,modules:x+10}}
export function code39Svg(value,x,y,w,h){const {bars,modules}=code39Bars(value),unit=w/modules;return '<g><rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="#fff"/>'+bars.map(b=>'<rect x="'+(x+b.x*unit)+'" y="'+y+'" width="'+b.width*unit+'" height="'+h+'" fill="#000"/>').join('')+'</g>'}
