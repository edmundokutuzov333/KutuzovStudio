#!/usr/bin/env python3
"""Local editorial compiler. Never run on a public upload server. Use an isolated
offline environment for untrusted artwork. Original documents are read-only."""
import argparse, base64, hashlib, json, math, os, re, stat, subprocess, tempfile, zipfile
from pathlib import Path, PurePosixPath
from defusedxml import ElementTree as SafeET
import xml.etree.ElementTree as ET
from PIL import Image
Image.MAX_IMAGE_PIXELS=40_000_000
NS='{http://www.w3.org/2000/svg}'
EXT={'.svg','.eps','.ai','.psd','.pdf'}
FIELDS={'name','role','company','phone','email','website','address','slogan','department','badgeId','badgeKind','expiry','qr','barcode','photo','logo'}
TEXT=FIELDS-{'qr','barcode','photo','logo'}
MAX=100_000_000
def require(condition,message):
    if not condition: raise ValueError(message)
def call(args):
    r=subprocess.run(args,check=True,capture_output=True,text=True,timeout=120)
    return r.stdout
def read_json(p):
    require(p.stat().st_size<1_000_000,'Specification too large')
    return json.loads(p.read_text(encoding='utf-8'))
def archive(source,work):
    require(source.is_file() and source.stat().st_size<=MAX,'Source missing or too large')
    if source.suffix.lower()!='.zip':
        require(source.suffix.lower() in EXT,'Unsupported file type')
        return {source.name:source}
    files={}; seen=set()
    with zipfile.ZipFile(source) as z:
        entries=z.infolist()
        require(len(entries)<=200 and sum(i.file_size for i in entries)<=200_000_000,'Archive limit exceeded')
        for i in entries:
            p=PurePosixPath(i.filename);require(bool(i.filename) and not i.filename.startswith('/'),'Unsafe archive path')
            require(not p.is_absolute() and not any(x in ('.','..') for x in p.parts) and '\\' not in i.filename and ':' not in i.filename and '\x00' not in i.filename,'Unsafe archive path')
            require(not stat.S_ISLNK(i.external_attr>>16) and not i.flag_bits&1,'Unsupported archive entry')
            require(i.filename.casefold() not in seen,'Duplicate archive entry');seen.add(i.filename.casefold())
            if i.is_dir() or p.suffix.lower() not in EXT or '__MACOSX' in p.parts:continue
            require(i.file_size<=MAX and i.file_size<=max(1,i.compress_size)*300,'Archive compression limit exceeded')
            dest=work/(str(len(files))+p.suffix.lower())
            with z.open(i) as f, dest.open('xb') as out:
                left=i.file_size
                while left:
                    chunk=f.read(min(left,1024*1024));require(bool(chunk),'Truncated entry');out.write(chunk);left-=len(chunk)
                require(not f.read(1),'Archive size mismatch')
            files[i.filename]=dest
    require(bool(files),'No supported artwork in ZIP')
    return files
def marker(text,name=''):
    for v in (name.strip(),text.strip()):
        m=re.fullmatch(r'\{\{([a-zA-Z]+)\}\}',v)
        if m and m[1] in TEXT:return m[1]
        if v in TEXT:return v
    return None
def font(name):
    n=name.lower()
    return 'monospace' if 'mono' in n or 'courier' in n else 'serif' if 'serif' in n and 'sans' not in n or 'times' in n or 'garamond' in n else 'sans-serif'
def rect(box):return [round(float(x),4) for x in box]
def candidate(i,text,box,size=0,color='#000000',family='sans-serif',weight=400,align='start',name=''):
    return {'id':i,'text':text[:500],'suggested':marker(text,name),'bbox':rect(box),'size':round(float(size),4),'color':color,'font':font(family),'weight':weight,'align':align,'sourceFont':family}
def pdf_open(path,work):
    import pymupdf
    with path.open('rb') as f:magic=f.read(16)
    if magic.startswith(b'%PDF-'):return pymupdf.open(stream=path.read_bytes(),filetype='pdf')
    if magic.startswith(b'%!PS'):
        out=work/'converted.pdf'
        call(['gs','-dSAFER','-dBATCH','-dNOPAUSE','-dEPSCrop','-sDEVICE=pdfwrite','-sOutputFile='+str(out),str(path.resolve())])
        require(out.stat().st_size<=MAX,'Converted PDF too large')
        return pymupdf.open(out)
    raise ValueError('AI/EPS requires a PDF-compatible or PostScript representation. Re-export from Illustrator.')
def svg_prepare(path,work):
    root=SafeET.parse(path).getroot();require(root.tag==NS+'svg','Not SVG')
    require(len(list(root.iter()))<=50000,'SVG too complex')
    denied={'script','foreignObject','iframe','object','audio','video','animate','animateMotion','animateTransform','set'}
    ids=set()
    for n in root.iter():
        require(n.tag.startswith(NS) and n.tag[len(NS):] not in denied,'Unsupported SVG element')
        for k,v in n.attrib.items():
            key=k.split('}')[-1].lower()
            require(not key.startswith('on'),'Active SVG content')
            if key=='href':require(v.startswith('#') or bool(re.fullmatch(r'data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+',v)),'External SVG reference')
            for link in re.findall(r'url\s*\((.*?)\)',v,re.I):require(link.strip(" '\"").startswith('#'),'External SVG resource')
        if n.tag==NS+'style':
            css=n.text or '';require(not re.search(r'@import|@font-face',css,re.I),'External CSS not supported')
            for link in re.findall(r'url\s*\((.*?)\)',css,re.I):require(link.strip(" '\"").startswith('#'),'External CSS resource')
        if n.get('id'):require(n.get('id') not in ids,'Duplicate SVG ID');ids.add(n.get('id'))
    texts=[n for n in root.iter(NS+'text')]
    for i,n in enumerate(texts):
        if not n.get('id'):
            key='studio-slot-'+str(i)
            require(key not in ids,'Reserved SVG ID collision');n.set('id',key);ids.add(key)
    def px(v):
        m=re.fullmatch(r'([0-9.]+)(mm|cm|in|pt|px)?',v or '')
        if not m:return None
        return float(m[1])*{None:1,'px':1,'mm':96/25.4,'cm':96/2.54,'in':96,'pt':96/72}[m[2]]
    w,h=px(root.get('width')),px(root.get('height'))
    require(w and h and w>0 and h>0,'SVG requires explicit width and height, not percentages')
    p=work/'source.svg';ET.register_namespace('',NS[1:-1]);ET.ElementTree(root).write(p,encoding='utf-8')
    bounds={}
    for line in call(['inkscape',str(p),'--query-all']).splitlines():
        a=line.rsplit(',',4)
        if len(a)==5:
            try:bounds[a[0]]=[float(v) for v in a[1:]]
            except ValueError:pass
    parents={child:node for node in root.iter() for child in node}
    entries=[]
    for n in texts:
        key=n.get('id')
        if key not in bounds:continue
        style={}
        chain=[];q=n
        while q is not None:chain.append(q);q=parents.get(q)
        for q in reversed(chain):
            style.update(q.attrib);style.update({k.strip():v.strip() for k,v in (x.split(':',1) for x in q.get('style','').split(';') if ':' in x)})
        x,y,bw,bh=bounds[key]
        color=style.get('fill','#000000')
        if re.fullmatch(r'#[0-9a-fA-F]{3}',color):color='#'+''.join(c*2 for c in color[1:])
        if not re.fullmatch(r'#[0-9a-fA-F]{6}',color):color='#000000'
        c=candidate(key,''.join(n.itertext()),[x/w,y/h,(x+bw)/w,(y+bh)/h],bh/h,color,style.get('font-family','sans-serif'),700 if style.get('font-weight') in ('bold','700','800','900') else 400,'middle' if style.get('text-anchor')=='middle' else 'start',key)
        c['requiresReview']=True
        entries.append(c)
    return root,parents,texts,entries,w/h
def pdf_candidates(page):
    require(page.rotation==0,'Rotated PDF artboard needs normalization')
    w,h=page.rect.width,page.rect.height;entries=[]
    for b in page.get_text('dict',flags=0)['blocks']:
        for line in b.get('lines',[]):
            if tuple(line.get('dir',(1,0)))!=(1.0,0.0):continue
            for s in line['spans']:
                if not s['text'].strip():continue
                x,y,X,Y=s['bbox'];c=candidate('span-'+str(len(entries)),s['text'],[x/w,y/h,X/w,Y/h],s['size']/h,'#'+format(s['color']&0xffffff,'06x'),s['font'],700 if s.get('flags',0)&16 else 400);c['requiresReview']=True;entries.append(c)
    return entries
def psd_open(path):
    from psd_tools import PSDImage
    p=PSDImage.open(path)
    require(p.width*p.height<=40_000_000,'PSD canvas too large')
    return p
def psd_candidates(psd):
    entries=[];layers={}
    for i,l in enumerate(psd.descendants()):
        if l.kind!='type' or not l.is_visible():continue
        x,y,X,Y=l.bbox
        c=candidate('layer-'+str(i),l.text,[x/psd.width,y/psd.height,X/psd.width,Y/psd.height],(Y-y)/psd.height,name=l.name)
        c['requiresReview']=True;c['layerName']=l.name;entries.append(c);layers[c['id']]=l
    return entries,layers
def inspect_file(path,work):
    if path.suffix.lower()=='.svg':
        _,_,_,entries,ratio=svg_prepare(path,work);return {'type':'svg','pages':[{'page':0,'aspect':ratio,'candidates':entries}]}
    if path.suffix.lower()=='.psd':
        p=psd_open(path);entries,_=psd_candidates(p);return {'type':'psd','pages':[{'page':0,'aspect':p.width/p.height,'candidates':entries}]}
    with pdf_open(path,work) as doc:
        require(not doc.needs_pass and 1<=len(doc)<=50,'Encrypted or oversized PDF')
        return {'type':'pdf-compatible','pages':[{'page':i,'aspect':p.rect.width/p.rect.height,'candidates':pdf_candidates(p)} for i,p in enumerate(doc)]}
def mapping(entries,config,W,H,b,safe):
    byid={e['id']:e for e in entries};m=config.get('map')
    if m is None:
        m={e['id']:{'field':e['suggested']} for e in entries if e['suggested']}
    require(isinstance(m,dict) and len(m)<=32,'Invalid field map')
    slots=[]
    for key,v in m.items():
        require(key in byid and isinstance(v,dict) and v.get('field') in TEXT,'Invalid text mapping: '+str(key))
        c=byid[key];x,y,X,Y=c['bbox'];box=v.get('box',[x*W-b,y*H-b,(X-x)*W,(Y-y)*H])
        # Exact detected box by default; expand the slot explicitly for long replacements.
        slots.append({'kind':'text','field':v['field'],'x':round(box[0],4),'y':round(box[1],4),'w':round(box[2],4),'h':round(box[3],4),'size':round(v.get('size',max(.5,c['size']*H*.85)),4),'color':v.get('color',c['color']),'font':v.get('font',c['font']),'weight':v.get('weight',c['weight']),'align':v.get('align',c['align']),'required':v.get('required',v['field']=='name')})
    for slot in config.get('cleanSlots',[]):
        require(config.get('cleanArtworkConfirmed') is True,'Manual slots require a verified clean master')
        slots.append(slot)
    require(len(slots)<=32,'Too many slots')
    for n in slots:
        require(n['field'] in FIELDS and n['kind'] in ('text','qr','barcode','photo','logo'),'Invalid slot')
        x,y,w,h=[n[k] for k in ('x','y','w','h')]
        require(all(isinstance(v,(int,float)) and math.isfinite(v) for v in (x,y,w,h)) and w>=.1 and h>=.1 and x>=safe and y>=safe and x+w<=W-2*b-safe+.001 and y+h<=H-2*b-safe+.001,'Slot outside safe area: '+n['field'])
    return m,slots
def render_face(path,config,work,W,H,b,safe,dpi):
    page=config.get('page',0);require(isinstance(page,int) and page>=0,'Invalid page')
    png=work/'art.png';target_w=round(W*dpi/25.4);target_h=round(H*dpi/25.4)
    require(target_w*target_h<=12_000_000,'Output exceeds pixel limit')
    if path.suffix.lower()=='.svg':
        require(page==0,'SVG has one artboard in this adapter')
        root,parents,texts,entries,ratio=svg_prepare(path,work)
        require(abs(ratio/(W/H)-1)<.003,'SVG aspect mismatch; include the specified bleed in the master')
        m,slots=mapping(entries,config,W,H,b,safe)
        for n in texts:
            if n.get('id') in m:parents[n].remove(n)
        clean=work/'clean.svg';ET.ElementTree(root).write(clean,encoding='utf-8')
        call(['inkscape',str(clean),'--export-area-page','--export-width='+str(target_w),'--export-filename='+str(png)])
    elif path.suffix.lower()=='.psd':
        require(page==0,'PSD has one canvas')
        p=psd_open(path);require(abs((p.width/p.height)/(W/H)-1)<.003,'PSD aspect mismatch')
        entries,layers=psd_candidates(p);m,slots=mapping(entries,config,W,H,b,safe)
        excluded={id(layers[k]) for k in m}
        im=p.composite(ignore_preview=True,layer_filter=lambda l:l.is_visible() and id(l) not in excluded)
        require(im is not None,'PSD cannot be composited')
        im.save(png)
    else:
        import pymupdf
        with pdf_open(path,work) as pdf:
            require(not pdf.needs_pass and page<len(pdf)<=50,'Invalid PDF page')
            p=pdf[page];require(abs((p.rect.width/p.rect.height)/(W/H)-1)<.003,'PDF aspect mismatch')
            entries=pdf_candidates(p);m,slots=mapping(entries,config,W,H,b,safe)
            for c in entries:
                if c['id'] not in m:continue
                r=pymupdf.Rect(c['bbox'][0]*p.rect.width,c['bbox'][1]*p.rect.height,c['bbox'][2]*p.rect.width,c['bbox'][3]*p.rect.height)
                # Never redact overlapping unselected text.
                for other in entries:
                    if other['id'] in m:continue
                    z=pymupdf.Rect(other['bbox'][0]*p.rect.width,other['bbox'][1]*p.rect.height,other['bbox'][2]*p.rect.width,other['bbox'][3]*p.rect.height)
                    require((r&z).get_area()<.02,'PDF text overlaps another field; prepare clean master')
                p.add_redact_annot(r,fill=False,cross_out=False)
            if m:
                p.apply_redactions(images=0,graphics=0,text=0)
                remaining=pdf_candidates(p)
                for old in entries:
                    if old['id'] not in m:
                        require(any(c['text']==old['text'] and all(abs(x-y)<.002 for x,y in zip(c['bbox'],old['bbox'])) for c in remaining),'Nonselected PDF text changed; prepare clean master')
                    else:
                        require(not any(c['text']==old['text'] and all(abs(x-y)<.002 for x,y in zip(c['bbox'],old['bbox'])) for c in remaining),'Mapped PDF text was not removed')
            p.get_pixmap(matrix=pymupdf.Matrix(target_w/p.rect.width,target_h/p.rect.height),alpha=False).save(png)
    with Image.open(png) as im:
        require(im.width*im.height<=12_000_000,'Artwork exceeds pixel limit')
        require(abs((im.width/im.height)/(W/H)-1)<.003,'Artwork render aspect mismatch')
        # Preserve native PSD resolution; never fake higher effective DPI by resampling.
        im.convert('RGBA').save(png)
        width,height=im.size
    data=png.read_bytes()
    require(len(data)<24_000_000,'Artwork too large')
    return {'art':{'data':'data:image/png;base64,'+base64.b64encode(data).decode(),'width':width,'height':height},'slots':slots,'sourceHash':hashlib.sha256(path.read_bytes()).hexdigest()}
def compile_pack(files,spec,work):
    require(spec.get('rights')=='editable','Explicit editable redistribution rights required')
    require(re.fullmatch(r'[a-z0-9-]{1,64}',spec['id']) and spec['product'] in ('card','badge') and isinstance(spec['title'],str) and 0<len(spec['title'])<=100,'Invalid metadata')
    w,h,b,s=map(float,(spec['width'],spec['height'],spec['bleed'],spec['safe']))
    require(all(math.isfinite(x) and abs(x*100-round(x*100))<1e-7 for x in (w,h,b,s)) and 25<=w<=200 and 25<=h<=200 and 0<=b<=5 and 2<=s<=8 and min(w,h)>2*s,'Invalid physical geometry')
    dpi=spec.get('dpi',600);require(dpi in (300,600),'Invalid DPI')
    faces={}
    for side in ('front','back'):
        d=spec['sides'][side];require(d['file'] in files,'Missing source face')
        tmp=work/side;tmp.mkdir();faces[side]=render_face(files[d['file']],d,tmp,w+2*b,h+2*b,b,s,dpi)
    require(any(n['field']=='name' for q in faces.values() for n in q['slots']),'No editable name; map a live text layer or supply a clean master')
    require(sum(len(q['art']['data']) for q in faces.values())<=32_000_000,'Pack too large')
    return {'version':1,'kind':'kutuzov-template','id':spec['id'],'title':spec['title'],'product':spec['product'],'status':'draft','rights':'editable','width':w,'height':h,'bleed':b,'safe':s,'sides':faces}
def main():
    p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='command',required=True)
    a=sub.add_parser('inspect');a.add_argument('source',type=Path)
    a=sub.add_parser('compile');a.add_argument('source',type=Path);a.add_argument('spec',type=Path);a.add_argument('output',type=Path)
    a=sub.add_parser('approve');a.add_argument('source',type=Path);a.add_argument('output',type=Path);a.add_argument('--confirm-rights',action='store_true');a.add_argument('--confirm-proof',action='store_true')
    args=p.parse_args()
    try:
        if args.command=='approve':
            require(args.confirm_rights and args.confirm_proof,'Review proof and rights first')
            require(args.source.stat().st_size<=32_100_000,'Pack too large')
            pack=json.loads(args.source.read_text());require(pack.get('kind')=='kutuzov-template' and pack.get('status')=='draft' and pack.get('rights')=='editable','Expected a draft pack')
            pack['status']='approved'
            with args.output.open('x',encoding='utf-8') as f:json.dump(pack,f,separators=(',',':'),ensure_ascii=False)
            return
        with tempfile.TemporaryDirectory(prefix='studio-import-') as tmp:
            work=Path(tmp);files=archive(args.source.resolve(),work)
            if args.command=='inspect':
                report={}
                for i,(name,path) in enumerate(files.items()):
                    d=work/('inspect-'+str(i));d.mkdir()
                    try:report[name]=inspect_file(path,d)
                    except Exception as e:report[name]={'error':str(e)}
                print(json.dumps(report,ensure_ascii=False,indent=2));return
            pack=compile_pack(files,read_json(args.spec),work)
            with args.output.open('x',encoding='utf-8') as f:json.dump(pack,f,separators=(',',':'),ensure_ascii=False)
    except Exception as e:p.exit(1,'Import error: '+str(e)+'\n')
if __name__=='__main__':main()
