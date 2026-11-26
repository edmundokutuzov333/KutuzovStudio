#!/usr/bin/env python3
"""Capture genuine Studio UI states from a local built release (no network needed)."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import re,json,base64,sys
root=Path(sys.argv[1] if len(sys.argv)>1 else 'dist');out=Path(sys.argv[2] if len(sys.argv)>2 else 'motion/assets');out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(args=['--no-sandbox'])
 pg=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 html=(root/'index.html').read_text();html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>','',html);html=re.sub(r'<link[^>]*>','',html);html=re.sub(r'<script[^>]*></script>','',html)
 imports={}
 for path in (root/'src').glob('*.mjs'):
  code=re.sub(r"(from\s*['\"])\./",r"\1studio/",path.read_text())
  imports['studio/'+path.name]='data:text/javascript;base64,'+base64.b64encode(code.encode()).decode()
 css=(root/'src/portfolio-theme.css').read_text()
 html=html.replace('</head>','<style>'+css+'</style><script type="importmap">'+json.dumps({'imports':imports})+'</script></head>')
 pg.set_content(html);pg.evaluate("import('studio/app.mjs').then(()=>true)");pg.wait_for_selector('#designs article',timeout=15000);pg.wait_for_timeout(650)
 pg.screenshot(path=str(out/'01-landing.png'),full_page=True)
 for field,value in [('name','Ana Matola'),('role','Directora Criativa'),('company','MOSAICO'),('phone','+258 84 123 4567'),('email','ana@mosaico.example')]:
  pg.locator(f'[name={field}]').fill(value);pg.wait_for_timeout(350)
 pg.wait_for_timeout(500);pg.screenshot(path=str(out/'02-filled.png'),full_page=True)
 pg.locator('#designs article button').nth(1).click();pg.wait_for_timeout(500);pg.screenshot(path=str(out/'03-selected.png'),full_page=True)
 pg.locator('#download-pdf').scroll_into_view_if_needed();pg.wait_for_timeout(300)
 if pg.locator('#preflight-confirm').is_visible():pg.locator('#accept-warnings').check()
 with pg.expect_download(timeout=15000) as d:pg.locator('#download-pdf').click()
 d.value.save_as(str(out/'mosaico-print.pdf'))
 pg.evaluate('window.scrollTo(0,0)');pg.wait_for_timeout(400);pg.screenshot(path=str(out/'04-download.png'),full_page=True)
 pg.locator('[data-product=badge]').click();pg.wait_for_timeout(500);pg.screenshot(path=str(out/'05-badge.png'),full_page=True)
 pg.set_viewport_size({'width':390,'height':844});pg.evaluate('window.scrollTo(0,0)');pg.wait_for_timeout(300);pg.screenshot(path=str(out/'06-mobile.png'),full_page=True)
 b.close()
