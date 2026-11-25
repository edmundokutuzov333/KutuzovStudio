"""Test the actual static release, offline shell, real batch export and privacy isolation."""
import io, json, zipfile, time
from playwright.sync_api import sync_playwright, expect
from pypdf import PdfReader
BASE='http://127.0.0.1:8001'
MARKER='Private QA 7c9e'
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True,service_workers='allow')
    context.route('https://*.supabase.co/**',lambda route:route.abort())
    page=context.new_page()
    errors=[];requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    context.on('request',lambda r:requests.append((r.method,r.url,r.post_data or '')))
    page.on('dialog',lambda d:d.accept())
    page.goto(BASE+'/index.html')
    def ready():
        expect(page.locator('#designs article')).to_have_count(5,timeout=15000)
        expect(page.locator('#designs')).to_have_attribute('aria-busy','false')
        expect(page.locator('#editor')).to_be_visible()
    def download(selector):
        if page.locator('#preflight-confirm').is_visible():page.locator('#accept-warnings').check()
        with page.expect_download(timeout=60000) as info:page.locator(selector).click()
        d=info.value
        assert d.failure() is None,d.failure()
        return d.suggested_filename,d.path().read_bytes()
    ready()
    page.wait_for_function("!!navigator.serviceWorker.controller",timeout=30000)
    expect(page.locator('#offline-status')).to_contain_text('Modo offline preparado')
    health=page.request.get(BASE+'/health.json').json()
    assert health['service']=='kutuzov-studio' and health['status']=='ok' and health['commit']
    context.set_offline(True)
    page.reload(wait_until='domcontentloaded')
    ready()
    expect(page.locator('#catalog-status')).to_contain_text('Catálogo local')
    page.locator('[name=name]').fill(MARKER)
    ready()
    name,svg=download('#download-front')
    assert name.endswith('.svg') and MARKER.encode() in svg
    page.locator('#my-studio summary').click()
    page.locator('#project-title').fill('Offline QA')
    page.locator('#project-new').click()
    expect(page.locator('#workspace-status')).to_contain_text('Projecto guardado')
    page.reload(wait_until='domcontentloaded')
    ready()
    page.locator('#my-studio summary').click()
    page.locator('#project-list').select_option(label=page.locator('#project-list option').nth(1).inner_text())
    page.locator('#project-open').click()
    expect(page.locator('#workspace-status')).to_have_text('Projecto aberto.')
    expect(page.locator('[name=name]')).to_have_value(MARKER)
    page.locator('[name=company]').fill('QA Company')
    page.locator('[name=website]').fill('https://private.example')
    page.locator('[name=address]').fill('Private address')
    ready()
    page.locator('[data-product=badge]').click()
    ready()
    page.locator('#batch-csv').set_input_files({'name':'people.csv','mimeType':'text/csv','buffer':b'name,badgeId,barcode,qr\nAna,001,ABC-001,https://example.com/a\nJoao,002,ABC-002,https://example.com/b'})
    page.locator('#batch-warnings').check()
    name,data=download('#batch-run')
    assert name.endswith('.zip')
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        assert z.testzip() is None
        assert {'badge-001.pdf','badge-002.pdf','PRINT-README.txt'}==set(z.namelist())
        for n in ('badge-001.pdf','badge-002.pdf'):
            pdf=PdfReader(io.BytesIO(z.read(n)))
            assert len(pdf.pages)==2
            assert all(p.trimbox.width>0 and p.bleedbox.width>=p.trimbox.width for p in pdf.pages)
    page.locator('#clear-profile').click()
    expect(page.locator('#editor')).to_be_hidden()
    for k in ('name','company','website','address','qr','barcode','badgeId'):
        expect(page.locator('[name='+k+']')).to_have_value('')
    expect(page.locator('#project-undo')).to_be_disabled()
    assert not any(MARKER in u or MARKER in b or 'private.example' in u or 'private.example' in b for _,u,b in requests)
    assert not any(m not in ('GET','HEAD') and u.startswith('http') for m,u,_ in requests),requests
    assert not errors,errors
    print('OFFLINE / BATCH / PRIVACY / RELEASE PASS',flush=True)
    browser.close()
