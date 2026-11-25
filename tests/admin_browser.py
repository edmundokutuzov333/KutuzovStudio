"""Browser contract for editorial UI. Auth/HTTP fixtures are synthetic; SQL permissions are tested separately."""
import base64, json, time
from urllib.parse import urlsplit, parse_qs
from playwright.sync_api import sync_playwright, expect

def token(aal):
    payload=base64.urlsafe_b64encode(json.dumps({'aal':aal,'exp':int(time.time())+3600,'app_metadata':{'studio_role':'editor'}}).encode()).decode().rstrip('=')
    return 'test.'+payload+'.signature'

with sync_playwright() as p:
    browser=p.chromium.launch()
    page=browser.new_page()
    page.set_default_timeout(20000)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    state={'allowed':True,'aal':'aal1','rows':[],'candidates':[],'calls':[]}
    def api(route):
        req=route.request
        path=urlsplit(req.url).path
        params=parse_qs(urlsplit(req.url).query)
        headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,authorization,content-type,prefer','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS','Content-Type':'application/json'}
        if req.method=='OPTIONS':
            route.fulfill(status=204,headers=headers,body='');return
        state['calls'].append(path)
        body=req.post_data_json if req.post_data else {}
        status=200
        if path=='/auth/v1/token': state['aal']='aal1';data={'access_token':token('aal1')}
        elif path.endswith('/studio_editor_status'): data={'member':state['allowed'],'mfa':state['allowed'] and state['aal']=='aal2'}
        elif path=='/auth/v1/user': data={'factors':[{'id':'test-factor','factor_type':'totp','status':'verified'}]}
        elif path.endswith('/challenge'): data={'id':'challenge'}
        elif path.endswith('/verify'):
            assert body['challenge_id']=='challenge' and body['code']=='123456'
            state['aal']='aal2';data={'access_token':token('aal2')}
        elif path.endswith('/studio_releases'): data=[r for r in state['rows'] if not params.get('status') or r['status']=='published']
        elif path.endswith('/studio_create_draft'):
            data='draft-1';state['rows'].append({'id':data,'title':body['draft_title'],'manifest':body['draft_manifest'],'status':'draft','created_at':'2026-01-01T00:00:00Z'})
        elif path.endswith('/studio_publish_release'):
            assert body=={'target':'draft-1','expected_current':'published-1'}
            for r in state['rows']: r['status']='published' if r['id']=='draft-1' else 'archived'
            data={}
        elif path.endswith('/studio_asset_candidates'):
            if req.method=='PATCH': state['candidates'][0]['status']=body['status'];data={}
            else: data=state['candidates']
        elif path.endswith('/studio_audit_feed'): data=[]
        elif path.endswith('/studio_curate_asset'):
            state['candidates']=[{'provider':'magnific','external_id':body['asset_id'],'title':body['asset_title'],'author':body['asset_author'],'source_url':body['asset_url'],'quoted_credits':body['asset_credits'],'status':'review'}];data={}
        elif path.endswith('/studio-stock-search'): status=503;data={'message':'Pesquisa desactivada'}
        elif path.endswith('/logout'): data={}
        else: status=404;data={'message':'Unexpected mock path '+path}
        route.fulfill(status=status,headers=headers,body=json.dumps(data))
    page.route('https://*.supabase.co/**',api)
    page.goto('http://127.0.0.1:8000/admin.html')
    manifest=page.evaluate("async()=> (await import('./src/editorial-default.mjs')).defaultManifest")
    state['rows']=[{'id':'published-1','title':'Original','manifest':manifest,'status':'published','created_at':'2026-01-01T00:00:00Z'}]
    page.locator('#admin-email').fill('editor@example.invalid')
    page.locator('#admin-password').fill('fixture-only')
    page.locator('#login-panel button').click()
    expect(page.locator('#mfa-panel')).to_be_visible()
    expect(page.locator('#editor-panel')).to_be_hidden()
    page.locator('#admin-code').fill('123456')
    page.locator('#mfa-panel button').click()
    expect(page.locator('#admin-status')).to_have_text('Catálogo carregado.')
    expect(page.locator('body')).to_have_attribute('aria-busy','false')
    page.locator('#admin-title').fill('Rascunho de teste')
    page.locator('#admin-save').click()
    expect(page.locator('#admin-status')).to_contain_text('Rascunho guardado')
    page.locator('#admin-publish').click()
    expect(page.locator('#admin-status')).to_have_text('Publicação concluída.')
    assert state['rows'][1]['status']=='published'
    state['allowed']=False
    page.locator('#admin-refresh').click()
    expect(page.locator('#login-panel')).to_be_visible()
    expect(page.locator('#editor-panel')).to_be_hidden()
    expect(page.locator('#admin-status')).to_contain_text('Acesso editorial retirado')
    assert not errors,errors
    print('EDITORIAL UI MOCK PASS',flush=True)
    browser.close()
