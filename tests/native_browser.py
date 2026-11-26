import hashlib, pathlib, sys
from playwright.sync_api import sync_playwright, expect
source=pathlib.Path(sys.argv[1])
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':844},accept_downloads=True)
    page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8003/native.html')
    page.locator('#native-file').set_input_files(source)
    expect(page.locator('#native-save')).to_be_enabled()
    with page.expect_download() as info:page.locator('#native-save').click()
    download=info.value;assert download.suggested_filename.endswith('.kutuzov');assert download.path().read_bytes()==source.read_bytes()
    page.locator('#native-ext').select_option('ai')
    with page.expect_download() as info:page.locator('#native-save').click()
    assert info.value.suggested_filename.endswith('.ai') and info.value.path().read_bytes()==source.read_bytes()
    page.locator('#native-file').set_input_files({'name':'bad.kutuzov','mimeType':'application/json','buffer':b'{"kind":"not-native"}'})
    expect(page.locator('#native-save')).to_be_disabled();expect(page.locator('#native-status')).not_to_be_empty()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
    assert not errors,errors
    print('Browser native AI to .kutuzov to .ai byte identity / rejection PASS',flush=True)
    browser.close()
