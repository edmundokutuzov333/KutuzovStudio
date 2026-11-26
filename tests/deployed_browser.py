"""Production HTTPS browser check with real catalog and local export; no real PII."""
import os, time, io, zipfile
from pypdf import PdfReader
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect
origin=os.environ['STUDIO_URL']
u=urlparse(origin)
assert u.scheme=='https' and u.netloc and not u.path and not u.query and not u.fragment
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    page=context.new_page()
    page.set_default_timeout(25000)
    errors=[]; requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    context.on('request',lambda r:requests.append((r.method,r.url,r.post_data or '')))
    page.add_init_script("window.__qaCsp=[]; document.addEventListener('securitypolicyviolation',e=>window.__qaCsp.push(e.violatedDirective))")
    page.goto(origin+'/',wait_until='domcontentloaded')
    expect(page.locator('#designs article')).to_have_count(5)
    expect(page.locator('#catalog-status')).to_have_text('Catálogo online')
    expect(page.locator('#editorial-status')).to_contain_text('catálogo editorial online')
    expect(page.locator('#editor')).to_be_visible()
    page.locator('[name=name]').fill('QA Production 24b8')
    expect(page.locator('#designs')).to_have_attribute('aria-busy','false')
    expect(page.locator('#editor')).to_be_visible()
    if page.locator('#preflight-confirm').is_visible():page.locator('#accept-warnings').check()
    with page.expect_download(timeout=60000) as info:page.locator('#download-front').click()
    d=info.value
    assert d.failure() is None and b'QA Production 24b8' in d.path().read_bytes()
    if page.locator('#preflight-confirm').is_visible():page.locator('#accept-warnings').check()
    with page.expect_download(timeout=60000) as info:page.locator('#download-pdf').click()
    d=info.value
    assert d.failure() is None and d.path().read_bytes().startswith(b'%PDF-1.4')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
    expect(page.locator('#offline-status')).to_contain_text('Modo offline preparado',timeout=30000)
    deadline=time.monotonic()+30
    while not page.evaluate("() => Boolean(navigator.serviceWorker.controller)"):
        assert time.monotonic()<deadline,'Service worker did not claim public page'
        time.sleep(.1)
    assert page.evaluate("async()=> !(await caches.match(new URL('/admin.html',location.origin).href))")
    page.locator('#my-studio summary').click()
    page.locator('#project-title').fill('Production QA only')
    page.locator('#project-new').click()
    expect(page.locator('#workspace-status')).to_contain_text('Projecto guardado')
    context.set_offline(True)
    page.reload(wait_until='domcontentloaded')
    expect(page.locator('#designs article')).to_have_count(5)
    expect(page.locator('#editor')).to_be_visible()
    page.locator('#my-studio summary').click()
    expect(page.locator('#project-list option')).to_have_count(2)
    page.locator('#project-list').select_option(index=1)
    page.locator('#project-open').click()
    expect(page.locator('#workspace-status')).to_have_text('Projecto aberto.')
    expect(page.locator('[name=name]')).to_have_value('QA Production 24b8')
    page.locator('[data-product=badge]').click()
    expect(page.locator('#designs')).to_have_attribute('aria-busy','false')
    expect(page.locator('#badge-fields')).to_be_visible()
    page.locator('#batch-csv').set_input_files({'name':'qa.csv','mimeType':'text/csv','buffer':b'name,badgeId,barcode,qr\\nQA One,001,ABC-001,https://example.com/a\\nQA Two,002,ABC-002,https://example.com/b'})
    page.locator('#batch-warnings').check()
    with page.expect_download(timeout=60000) as info:page.locator('#batch-run').click()
    d=info.value
    assert d.failure() is None
    with zipfile.ZipFile(io.BytesIO(d.path().read_bytes())) as z:
        assert z.testzip() is None
        assert set(z.namelist())=={'badge-001.pdf','badge-002.pdf','PRINT-README.txt'}
        for n in ('badge-001.pdf','badge-002.pdf'):
            pdf=PdfReader(io.BytesIO(z.read(n)))
            assert len(pdf.pages)==2 and all(x.trimbox.width>0 for x in pdf.pages)
    page.locator('#clear-profile').click()
    expect(page.locator('#editor')).to_be_hidden()
    expect(page.locator('[name=name]')).to_have_value('')
    expect(page.locator('#project-undo')).to_be_disabled()
    context.set_offline(False)
    page.goto(origin+'/admin.html',wait_until='domcontentloaded')
    expect(page.locator('#login-panel')).to_be_visible()
    expect(page.locator('#editor-panel')).to_be_hidden()
    assert not page.evaluate('window.__qaCsp'),page.evaluate('window.__qaCsp')
    assert not any('QA Production 24b8' in url or 'QA Production 24b8' in body for _,url,body in requests)
    assert not any(method not in ('GET','HEAD') and url.startswith('http') for method,url,body in requests)
    assert not errors,errors
    print('LIVE HTTPS / MOBILE / CATALOG / EXPORT / OFFLINE / BATCH / PRIVACY PASS',flush=True)
    browser.close()
