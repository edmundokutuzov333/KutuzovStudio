"""Production HTTPS browser check with real catalog and local export; no real PII."""
import os
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
    assert not page.evaluate('window.__qaCsp'),page.evaluate('window.__qaCsp')
    assert not any('QA Production 24b8' in url or 'QA Production 24b8' in body for _,url,body in requests)
    assert not any(method not in ('GET','HEAD') and url.startswith('http') for method,url,body in requests)
    assert not errors,errors
    print('LIVE HTTPS / MOBILE / CATALOG / EXPORT PASS',flush=True)
    browser.close()
