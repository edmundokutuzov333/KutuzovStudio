"""Real file format interoperability proof; synthetic SVG/PDF/EPS plus upstream PSD."""
import base64, hashlib, io, json, os, subprocess, sys, tempfile, zipfile
from pathlib import Path
from PIL import Image, ImageChops
import pymupdf
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
import template_import as m
def spec(front,back,**overrides):
    return {'id':'proof','title':'Import proof','product':'card','rights':'editable','width':85,'height':55,'bleed':3,'safe':3,'dpi':300,'sides':{'front':front,'back':back},**overrides}
def config(file,key='name',page=0):
    return {'file':file,'page':page,'map':{key:{'field':'name','box':[7,9,60,12],'size':5,'color':'#ffffff'}}}
def image(face):
    return Image.open(io.BytesIO(base64.b64decode(face['art']['data'].split(',')[1]))).convert('RGB')
def check(pack):
    assert pack['status']=='draft' and pack['sides']['front']['slots'][0]['field']=='name'
    im=image(pack['sides']['front']);assert im.width>0 and im.height>0
    assert pack['sides']['front']['sourceHash']
    return im
root=Path(sys.argv[1]);root.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as t:
    tmp=Path(t)
    svg=tmp/'front.svg';svg.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="91mm" height="61mm" viewBox="0 0 91 61"><rect width="91" height="61" fill="#203040"/><text id="name" x="10" y="20" font-size="5" fill="#ffffff">{{name}}</text></svg>')
    back=tmp/'back.svg';back.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="91mm" height="61mm" viewBox="0 0 91 61"><rect width="91" height="61" fill="#102030"/></svg>')
    z=tmp/'design.zip'
    with zipfile.ZipFile(z,'w') as f:f.write(svg,'design/front.svg');f.write(back,'design/back.svg')
    work=tmp/'svg-work';work.mkdir();files=m.archive(z,work)
    pack=m.compile_pack(files,spec(config('design/front.svg'),{'file':'design/back.svg'}),work)
    im=check(pack);assert im.getpixel((200,200))==(32,48,64);assert im.getextrema()==((32,32),(48,48),(64,64)), 'Original placeholder remains'
    (root/'proof.kutuzov-template').write_text(json.dumps(pack))
    print('ZIP / SVG real removal and exact output PASS',flush=True)
    for name in ('../outside.svg','/absolute.svg'):
        bad=tmp/'bad.zip'
        with zipfile.ZipFile(bad,'w') as f:f.writestr(name,'x')
        try:m.archive(bad,work)
        except ValueError:pass
        else:raise AssertionError('Unsafe archive accepted')
    # A real two-page PDF-compatible representation stored with AI extension.
    ai=tmp/'design.ai';d=pymupdf.open()
    for side in ('front','back'):
        p=d.new_page(width=91*72/25.4,height=61*72/25.4);p.draw_rect(p.rect,fill=(.12,.2,.3),color=None)
        if side=='front':p.insert_text((30,50),'{{name}}',fontsize=12,color=(1,1,1));p.insert_text((30,100),'KEEP',fontsize=12,color=(1,1,1))
    d.save(ai);d.close()
    w=tmp/'ai-work';w.mkdir();a=m.compile_pack({'design.ai':ai},spec(config('design.ai','span-0'),{'file':'design.ai','page':1}),w);check(a)
    print('AI PDF-compatible representation / selective text removal PASS',flush=True)
    eps=tmp/'front.eps';eps.write_text('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 258 173\n0.1 0.2 0.3 setrgbcolor 0 0 258 173 rectfill\n/Helvetica findfont 12 scalefont setfont 1 1 1 setrgbcolor 30 120 moveto ({{name}}) show\nshowpage\n%%EOF\n')
    w=tmp/'eps-work';w.mkdir();e=m.compile_pack({'front.eps':eps,'back.svg':back},spec(config('front.eps','span-0'),{'file':'back.svg'}),w);check(e)
    print('EPS Ghostscript conversion / real text mapping PASS',flush=True)
    psd=Path(sys.argv[2]);blob=psd.read_bytes();assert hashlib.sha1(b'blob '+str(len(blob)).encode()+b'\0'+blob).hexdigest()=='d920df70baf977c2fc04d5e47147ef831d5c53e6'
    p=m.psd_open(psd);entries,layers=m.psd_candidates(p);assert entries,'No real PSD type layer'
    selected=entries[0]['id'];ratio=p.width/p.height;h=round(85/ratio,2);wmm=85
    if h<25:h=25;wmm=round(h*ratio,2)
    if h>200:h=100;wmm=round(h*ratio,2)
    assert 25<=wmm<=200 and 25<=h<=200
    w=tmp/'psd-work';w.mkdir();cfg={'file':psd.name,'map':{selected:{'field':'name','box':[3,3,wmm-6,min(10,h-6)],'size':4}}}
    q=m.compile_pack({psd.name:psd},spec(cfg,{'file':psd.name,'map':{}},width=wmm,height=h,bleed=0,safe=2),w);check(q)
    assert ImageChops.difference(image(q['sides']['front']),image(q['sides']['back'])).getbbox() is not None,'PSD text layer not removed'
    print('Real upstream PSD type layer / recomposition PASS',flush=True)
