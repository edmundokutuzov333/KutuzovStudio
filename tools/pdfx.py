#!/usr/bin/env python3
"""Offline conversion of a Studio direct PDF to a PDF/X-3 candidate.
Requires Ghostscript and Poppler. Use a printer-approved CMYK output ICC.
No uploads, network, bundled profiles or claim of ISO certification.
"""
import argparse
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

def run(args):
    r = subprocess.run([str(x) for x in args], capture_output=True, text=True, timeout=180, check=False, env={**os.environ, 'LC_ALL':'C'})
    if r.returncode:
        raise RuntimeError(f'{args[0]}: {r.stderr[-1500:]} {r.stdout[-1000:]}')
    return r.stdout

def inspect(path):
    info=run(['pdfinfo',path])
    if not re.search(r'^Encrypted:\s+no$',info,re.M): raise ValueError('Encrypted PDF not supported')
    pages=int(re.search(r'^Pages:\s+(\d+)',info,re.M).group(1))
    if pages not in (1,2): raise ValueError('Expected one or two pages')
    boxes=run(['pdfinfo','-f','1','-l',str(pages),'-box',path])
    result={}
    for page,kind,values in re.findall(r'^Page\s+(\d+)\s+(MediaBox|TrimBox|BleedBox):\s+([0-9.\- ]+)$',boxes,re.M):
        result[(int(page),kind)]=tuple(float(v) for v in values.split())
    if len(result)!=pages*3 or any(len(v)!=4 for v in result.values()): raise ValueError('Missing page boxes')
    return pages,result

def convert(source, profile, output, condition):
    source,profile,output=map(lambda p:Path(p).resolve(),(source,profile,output))
    if output.exists() or source==output: raise ValueError('Choose a new output file')
    if not re.fullmatch(r'[A-Za-z0-9 ._()+/-]{1,100}',condition): raise ValueError('Use an ASCII printing condition identifier')
    if not source.is_file() or source.stat().st_size>150_000_000: raise ValueError('Invalid source PDF')
    if not profile.is_file() or not 128<=profile.stat().st_size<=20_000_000: raise ValueError('Invalid ICC file size')
    icc=profile.read_bytes()
    if icc[12:16]!=b'prtr' or icc[16:20]!=b'CMYK' or icc[36:40]!=b'acsp' or int.from_bytes(icc[:4],'big')!=len(icc): raise ValueError('Expected a CMYK printer ICC profile')
    for tool in ('gs','pdfinfo','pdffonts'):
        if not shutil.which(tool): raise RuntimeError(f'Install {tool} first')
    pages,before=inspect(source)
    with tempfile.TemporaryDirectory(prefix='studio-pdfx-') as temp:
        temp=Path(temp); dst=temp/'candidate.pdf'; prefix=temp/'intent.ps'; iccpath=temp/'output.icc'; iccpath.write_bytes(icc)
        # Hex PostScript strings avoid interpolation of executable PostScript.
        def ps(value): return '<'+value.encode('utf-8').hex()+'>'
        prefix.write_text(f'''%!
[ /GTS_PDFXVersion (PDF/X-3:2002) /Title (Kutuzov Studio) /Trapped /False /DOCINFO pdfmark
[/_objdef {{icc_PDFX}} /type /stream /OBJ pdfmark
[{{icc_PDFX}} << /N 4 >> /PUT pdfmark
[{{icc_PDFX}} {ps(str(iccpath))} (r) file /PUT pdfmark
[/_objdef {{OutputIntent_PDFX}} /type /dict /OBJ pdfmark
[{{OutputIntent_PDFX}} << /Type /OutputIntent /S /GTS_PDFX /OutputConditionIdentifier {ps(condition)} /Info {ps(condition)} /DestOutputProfile {{icc_PDFX}} >> /PUT pdfmark
[{{Catalog}} << /OutputIntents [{{OutputIntent_PDFX}}] >> /PUT pdfmark
''',encoding='ascii')
        run(['gs','-dSAFER','-dPDFX=3','-dBATCH','-dNOPAUSE','-dEmbedAllFonts=true','-dSubsetFonts=true','-dAutoRotatePages=/None','-dDownsampleColorImages=false','-dDownsampleGrayImages=false','-dDownsampleMonoImages=false','-sColorConversionStrategy=CMYK',f'-sOutputICCProfile={iccpath}',f'--permit-file-read={iccpath}','-sDEVICE=pdfwrite',f'-sOutputFile={dst}',prefix,source])
        actual,after=inspect(dst)
        if actual!=pages or any(max(abs(a-b) for a,b in zip(before[k],after[k]))>.08 for k in before): raise RuntimeError('Page geometry changed')
        info=run(['pdfinfo','-meta',dst])+run(['pdfinfo','-box',dst])
        if 'PDF/X-3:2002' not in info: raise RuntimeError('PDF/X identifier missing')
        fonts=run(['pdffonts',dst]).splitlines()[2:]
        for line in fonts:
            if line.strip() and not re.search(r'\byes\s+(yes|no)\s+(yes|no)\s+\d+\s+\d+\s*$',line): raise RuntimeError('Unembedded font')
        run(['gs','-dSAFER','-dBATCH','-dNOPAUSE','-sDEVICE=nullpage',dst])
        with output.open('xb') as dest, dst.open('rb') as src: shutil.copyfileobj(src,dest)
    return pages
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source');parser.add_argument('profile');parser.add_argument('output');parser.add_argument('--condition',required=True)
    args=parser.parse_args()
    try: pages=convert(args.source,args.profile,args.output,args.condition)
    except (ValueError,RuntimeError,OSError,subprocess.TimeoutExpired) as exc: parser.exit(1,f'Error: {exc}\n')
    print(f'{pages} pages: CMYK PDF/X-3 candidate generated. Independent preflight and print proof required.')
if __name__=='__main__': main()
