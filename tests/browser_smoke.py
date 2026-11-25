"""Run the existing full browser contract with wall-clock waits and diagnostics."""
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:8000/tests/browser.html',wait_until='domcontentloaded')
    page.wait_for_function("document.querySelector('#result').textContent!=='RUNNING'",timeout=90000)
    result=page.locator('#result').inner_text()
    print(result)
    assert result=='STUDIO_BROWSER_PASS',f'{result}; page errors: {errors}'
    assert not errors,errors
    browser.close()
