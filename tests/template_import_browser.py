import sys
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
    browser=p.chromium.launch()
    ctx=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8002/templates.html')
    page.locator('#template-file').set_input_files(sys.argv[1])
    expect(page.locator('#template-title')).to_have_text('Import proof')
    page.locator('#field-name').fill('Ana Studio')
    expect(page.locator('#template-preview')).to_be_visible()
    expect(page.locator('[data-export=pdf]')).to_be_enabled()
    if page.locator('#template-ack').is_visible():page.locator('#template-confirm').check()
    with page.expect_download(timeout=60000) as info:page.locator('[data-export=pdf]').click()
    d=info.value;assert d.failure() is None and d.path().read_bytes().startswith(b'%PDF-1.4')
    page.locator('#template-preview details summary').click()
    with page.expect_download(timeout=60000) as info:page.locator('[data-export=front]').click()
    d=info.value;assert d.failure() is None and b'Ana Studio' in d.path().read_bytes()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
    assert not errors,errors
    print('REAL IMPORT PACK / LIVE EDIT / PDF / SVG PASS',flush=True)
    browser.close()
