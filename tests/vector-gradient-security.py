import importlib.util, sys, tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('studio_vector','tools/vector_pdf.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
good='<svg xmlns="http://www.w3.org/2000/svg" width="91mm" height="61mm" viewBox="-3 -3 91 61"><defs><linearGradient id="front-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#123456"/><stop offset="100%" stop-color="#abcdef"/></linearGradient></defs><rect x="0" y="0" width="85" height="55" fill="url(#front-gradient-1)"/></svg>'
with tempfile.TemporaryDirectory() as tmp:
 p=Path(tmp)/'proof.svg'
 p.write_text(good);m.validate_svg(p,85,55,3)
 for bad in [good.replace('url(#front-gradient-1)','url(https://example.com/x)'),good.replace('url(#front-gradient-1)','url(#missing)'),good.replace('stop-color="#123456"','stop-color="url(https://example.com/x)"'),good.replace('<linearGradient id=','<linearGradient href="https://example.com/x" id='),good.replace('<rect x=','<rect id="front-gradient-1" x=')]:
  p.write_text(bad)
  try:m.validate_svg(p,85,55,3)
  except ValueError:continue
  raise AssertionError('Unsafe SVG accepted')
print('Gradient allowlist security PASS')
