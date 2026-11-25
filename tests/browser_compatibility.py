"""Real browser compatibility: actual inputs, downloads, local persistence and layout."""
import sys, struct, zlib, io, zipfile, time
from playwright.sync_api import sync_playwright, expect

def png_fixture():
    def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',320,240,8,2,0,0,0))+chunk(b'IDAT',zlib.compress((b'\0'+b'\x44\x77\xaa'*320)*240))+chunk(b'IEND',b'')

with sync_playwright() as p:
    engine=sys.argv[1]
    browser=getattr(p,engine).launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':900},accept_downloads=True)
    context.route('https://*.supabase.co/**',lambda route:route.abort())
    page=context.new_page()
    page.set_default_timeout(30000)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    page.goto('http://127.0.0.1:8000/index.html')
    def ready():
        expect(page.locator('#designs article')).to_have_count(5)
        expect(page.locator('#designs')).to_have_attribute('aria-busy','false')
        expect(page.locator('#editor')).to_be_visible()
    def download(selector):
        if page.locator('#preflight-confirm').is_visible(): page.locator('#accept-warnings').check()
        with page.expect_download(timeout=60000) as info: page.locator(selector).click()
        d=info.value
        assert d.failure() is None,d.failure()
        return d.suggested_filename,d.path().read_bytes()
    ready()
    page.locator('[name=name]').fill('Ana Compatibilidade')
    ready()
    name,svg=download('#download-front')
    assert name.endswith('.svg') and b'Ana Compatibilidade' in svg
    deadline=time.monotonic()+30
    while not page.evaluate("() => {const im=document.querySelector('#front');return im.complete && im.naturalWidth>0}"):
        assert time.monotonic()<deadline,'Preview image did not decode'
        time.sleep(.1)
    for width in (390,320,1440):
        page.set_viewport_size({'width':width,'height':900})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth+2'),f'Overflow {width}px'
    page.locator('.background-gallery-panel summary').click()
    page.locator('#background-filter').fill('Grid')
    expect(page.locator('#background-gallery button:visible')).to_have_count(1)
    page.locator('#background-filter').fill('')
    page.locator('#background-rights').select_option('flattened')
    page.locator('[name=backgroundImage]').set_input_files({'name':'test.png','mimeType':'image/png','buffer':png_fixture()})
    ready()
    expect(page.locator('#download-front')).to_be_disabled()
    expect(page.locator('#download-zip')).to_be_disabled()
    expect(page.locator('#native-print-button')).to_be_disabled()
    name,pdf=download('#download-pdf')
    assert name.endswith('.pdf') and pdf.startswith(b'%PDF-1.4') and b'/TrimBox' in pdf
    name,png=download('#download-png-front')
    assert name.endswith('.png') and png.startswith(b'\x89PNG') and b'pHYs' in png
    name,jpg=download('#download-jpg-front')
    assert name.endswith('.jpg') and jpg.startswith(b'\xff\xd8') and b'JFIF' in jpg
    page.locator('[data-clear=backgroundImage]').click()
    ready()
    expect(page.locator('#download-zip')).to_be_enabled()
    name,data=download('#download-zip')
    assert name.endswith('.zip')
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        assert z.testzip() is None
        names=z.namelist()
        assert any(n.endswith('.pdf') for n in names) and any(n.endswith('.svg') for n in names)
        assert any(n.endswith('pdfx.py') for n in names)
    page.locator('#my-studio summary').click()
    page.locator('#project-title').fill('Compatibilidade')
    page.locator('#project-new').click()
    expect(page.locator('#workspace-status')).to_contain_text('Projecto guardado')
    page.locator('[name=name]').fill('Alterado')
    ready()
    page.locator('#project-open').click()
    expect(page.locator('#workspace-status')).to_have_text('Projecto aberto.')
    expect(page.locator('[name=name]')).to_have_value('Ana Compatibilidade')
    page.locator('[data-product=badge]').click()
    ready()
    expect(page.locator('#badge-fields')).to_be_visible()
    expect(page.locator('[data-product=badge]')).to_have_attribute('aria-pressed','true')
    assert not errors, errors
    print('COMPATIBILITY PASS',engine,flush=True)
    browser.close()
