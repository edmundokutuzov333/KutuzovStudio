#!/usr/bin/env python3
"""Create an exact-size, two-page vector PDF from a Studio production ZIP.
Requires Inkscape, Poppler and pypdf. Run locally; no network or uploads.
"""
import argparse
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pypdf import PdfReader, PdfWriter, PageObject
from pypdf.generic import RectangleObject, NameObject, DecodedStreamObject

PT=72/25.4
NS='{http://www.w3.org/2000/svg}'
TAGS={'svg','rect','path','circle','ellipse','text','g','defs','clipPath','image','linearGradient','stop'}
ATTRS={'width','height','viewBox','role','x','y','fill','d','stroke','stroke-width','stroke-dasharray','cx','cy','r','font-family','font-size','font-weight','text-anchor','id','href','clip-path','preserveAspectRatio','transform','shape-rendering','opacity','rx','ry','x1','y1','x2','y2','offset','stop-color'}

def validate_svg(path,w,h,b):
    if not path.is_file() or path.stat().st_size>65_000_000: raise ValueError('Invalid SVG file size')
    raw=path.read_text(encoding='utf-8')
    if re.search(r'<!|<\?',raw): raise ValueError('SVG declarations are not allowed')
    root=ET.fromstring(raw)
    if root.tag!=NS+'svg': raise ValueError('Expected Studio SVG')
    for dim,expected in [('width',w+2*b),('height',h+2*b)]:
        v=root.get(dim,'')
        if not re.fullmatch(r'[0-9.]+mm',v) or abs(float(v[:-2])-expected)>1e-7: raise ValueError('SVG dimension mismatch')
    vb=[float(x) for x in root.get('viewBox','').split()]
    if len(vb)!=4 or any(not math.isfinite(x) or abs(x-y)>1e-7 for x,y in zip(vb,[-b,-b,w+2*b,h+2*b])): raise ValueError('SVG viewBox mismatch')
    refs={}
    for node in root.iter():
        ident=node.get('id')
        if ident:
            if not re.fullmatch(r'[a-zA-Z0-9-]+',ident) or ident in refs: raise ValueError('Invalid or duplicate SVG ID')
            refs[ident]=node.tag
    for node in root.iter():
        if not node.tag.startswith(NS) or node.tag[len(NS):] not in TAGS: raise ValueError('Unexpected SVG element')
        for key,value in node.attrib.items():
            if key not in ATTRS: raise ValueError('Unexpected SVG attribute: '+key)
            if key=='href':
                if node.tag!=NS+'image' or not re.fullmatch(r'data:image/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}',value): raise ValueError('Only embedded images are allowed')
            elif key=='clip-path' or key=='fill' and value.startswith('url('):
                ref=re.fullmatch(r'url\(#([a-zA-Z0-9-]+)\)',value)
                target=NS+('clipPath' if key=='clip-path' else 'linearGradient')
                if not ref or refs.get(ref.group(1))!=target: raise ValueError('Invalid or external SVG reference')
            elif key=='stop-color':
                if not re.fullmatch(r'#[0-9a-fA-F]{6}',value): raise ValueError('Invalid gradient colour')
            elif key in ('x1','x2','y1','y2','offset'):
                if not re.fullmatch(r'(?:0|100)%',value): raise ValueError('Invalid gradient coordinate')
            elif re.search(r'url\s*\(|(?:https?|file|javascript|data):',value,re.I): raise ValueError('External SVG resource')
    return root

def geometry(spec):
    if spec.get('version')!=1: raise ValueError('Unsupported print specification')
    w,h=spec['trim_mm']; b=spec['bleed_mm']
    if not all(isinstance(x,(int,float)) and math.isfinite(x) for x in [w,h,b]) or not(25<=w<=200 and 25<=h<=200 and 0<=b<=5): raise ValueError('Invalid geometry')
    media=spec['boxes_pt']['media']; marks=abs(media[2]/PT-(w+2*b+10))<.0001
    m=5 if marks else 0
    expected=[0,0,(w+2*b+2*m)*PT,(h+2*b+2*m)*PT]
    if len(media)!=4 or any(abs(a-z)>1e-5 for a,z in zip(media,expected)): raise ValueError('Invalid media box')
    return w,h,b,m

def mark_stream(w,h,b,m):
    stream=DecodedStreamObject()
    lines=['0 G 0.25 w']
    if m:
        x=(m+b)*PT;y=(m+b)*PT;X=x+w*PT;Y=y+h*PT
        for xx in [x,X]:
            for yy in [y,Y]:
                ox=(m-1)*PT if xx==x else (m+w+2*b+1)*PT
                oy=(m-1)*PT if yy==y else (m+h+2*b+1)*PT
                lines.append(f'{ox:.5f} {yy:.5f} m {ox+(-2 if xx==x else 2)*PT:.5f} {yy:.5f} l S')
                lines.append(f'{xx:.5f} {oy:.5f} m {xx:.5f} {oy+(-2 if yy==y else 2)*PT:.5f} l S')
    stream.set_data(('\n'.join(lines)+'\n').encode('ascii'))
    return stream

def convert(front,back,specpath,output):
    front,back,specpath,output=map(lambda p:Path(p).resolve(),(front,back,specpath,output))
    if output.exists(): raise ValueError('Choose a new output file')
    if not shutil.which('inkscape') or not shutil.which('pdffonts'): raise RuntimeError('Install Inkscape and Poppler first')
    if specpath.stat().st_size>65536: raise ValueError('Print specification too large')
    w,h,b,m=geometry(json.loads(specpath.read_text(encoding='utf-8')))
    for path in [front,back]: validate_svg(path,w,h,b)
    aw,ah=(w+2*b)*PT,(h+2*b)*PT
    W,H=aw+2*m*PT,ah+2*m*PT
    with tempfile.TemporaryDirectory(prefix='studio-vector-') as tmp:
        tmp=Path(tmp); writer=PdfWriter()
        for i,path in enumerate([front,back]):
            rendered=tmp/f'{i}.pdf'
            subprocess.run(['inkscape',str(path),'--export-type=pdf',f'--export-filename={rendered}'],check=True,capture_output=True,timeout=120)
            reader=PdfReader(rendered)
            if len(reader.pages)!=1: raise ValueError('Unexpected PDF page count')
            art=reader.pages[0]
            if abs(float(art.mediabox.width)-aw)>.3 or abs(float(art.mediabox.height)-ah)>.3: raise ValueError('Renderer geometry mismatch')
            art.scale_to(aw,ah)
            page=PageObject.create_blank_page(width=W,height=H)
            page[NameObject('/Contents')]=mark_stream(w,h,b,m)
            page.merge_translated_page(art,m*PT,m*PT,over=True)
            page.trimbox=RectangleObject([(m+b)*PT,(m+b)*PT,(m+b+w)*PT,(m+b+h)*PT])
            page.bleedbox=RectangleObject([m*PT,m*PT,m*PT+aw,m*PT+ah])
            writer.add_page(page)
        candidate=tmp/'vector.pdf'
        with candidate.open('wb') as file: writer.write(file)
        fonts=subprocess.run(['pdffonts',str(candidate)],check=True,capture_output=True,text=True,timeout=30).stdout.splitlines()[2:]
        if any(line.strip() and not re.search(r'\byes\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$',line) for line in fonts): raise RuntimeError('Unembedded font; use an embeddable local font')
        with output.open('xb') as out,candidate.open('rb') as src: shutil.copyfileobj(src,out)
    return 2

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['front','back','spec','output']:p.add_argument(name)
    a=p.parse_args()
    try: convert(a.front,a.back,a.spec,a.output)
    except (OSError,ValueError,RuntimeError,KeyError,TypeError,ET.ParseError,subprocess.SubprocessError) as e:p.exit(1,f'Error: {e}\n')
    print('Two-page vector PDF created with exact trim and bleed boxes. Verify fonts and print proof.')
if __name__=='__main__':main()
