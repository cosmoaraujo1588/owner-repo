# Painel: Brasil/Internacional/Robos declarados (fonte indicada) e cartao GA4 (separado do Supabase).
from playwright.sync_api import sync_playwright
import json,os
B="http://localhost:4181"; SP=os.environ.get("KAIROS_FIXTURES","/tmp/claude-0/-home-claude/5105b447-9b45-5d6c-92ab-ebae29095ae8/scratchpad")
ok=bad=0
def chk(n,c):
    global ok,bad
    if c: ok+=1
    else: bad+=1; print("FALHOU:",n)
live=json.load(open(SP+"/live.json")); live.update({"brazil":3,"international":5,"botsDeclared":2}); rep=open(SP+"/report.json").read()
GA={"configured":True,"source":"Google Analytics Data API (propriedade 540539657)","propertyId":"540539657","days":7,"fetchedAt":"2026-11-20T12:00:00Z",
 "events":[{"name":"view_item","host":"www.kairosshopping.com.br","env":"producao","count":12,"users":5},{"name":"view_item","host":"x.vercel.app","env":"preview","count":3,"users":1},{"name":"view_product","host":"www.kairosshopping.com.br","env":"producao","count":40,"users":9}],
 "countries":[{"country":"Brazil","sessions":9,"users":7,"engaged":4}],"sources":[{"source":"facebook","medium":"referral","sessions":6,"engaged":2}]}
state={"ga":{"configured":False,"missing":["GA4_CLIENT_EMAIL (ou GA4_SERVICE_ACCOUNT_JSON)","GA4_PRIVATE_KEY (ou GA4_SERVICE_ACCOUNT_JSON)"],"propertyId":"540539657","source":"x"}}
def handler(route):
    u=route.request.url
    body=json.dumps(live) if "live=1" in u else json.dumps(state["ga"]) if "ga=1" in u else rep
    route.fulfill(status=200,content_type="application/json",body=body)
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for w in (1280,390):
        pg=br.new_context(viewport={"width":w,"height":900}).new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.route("**/api/events?*",handler); pg.goto(B+"/admin.html"); pg.wait_for_timeout(1200)
        if w<600: pg.click("#adminMenuToggle")
        pg.click('[data-section="live"]'); pg.wait_for_timeout(800)
        t=pg.locator("#liveRoot").inner_text(); k=pg.locator("#liveRoot .kpi")
        chk(f"{w} Brasil=3",any(k.nth(i).inner_text().startswith("Brasil") and "3" in k.nth(i).inner_text() for i in range(k.count())))
        chk(f"{w} Internacional=5","Internacional" in t and "5" in pg.locator("#liveRoot .kpi:has-text('Internacional') strong").inner_text())
        chk(f"{w} Robos declarados=2 com fonte no tooltip",pg.locator("#liveRoot .kpi[title*='online_visitors']:has-text('Robôs') strong").inner_text().strip()=="2")
        if w<600: pg.click("#adminMenuToggle")
        pg.click('[data-section="performance"]'); pg.wait_for_timeout(1000)
        chk(f"{w} cartao GA4 presente",pg.locator("#gaRoot h3:has-text('Google Analytics')").count()==1)
        chk(f"{w} informa fonte separada do Supabase","não é misturada" in pg.locator("#gaRoot").inner_text().lower() or "Não é misturada" in pg.locator("#gaRoot").inner_text())
        pg.click("#gaLoad"); pg.wait_for_timeout(700)
        tx=pg.locator("#gaRoot").inner_text()
        chk(f"{w} nao configurado lista variaveis faltantes","GA4_PRIVATE_KEY" in tx and "GA4_CLIENT_EMAIL" in tx and "540539657" in tx)
        state["ga"]=GA; pg.click("#gaLoad"); pg.wait_for_timeout(700)
        tx=pg.locator("#gaRoot").inner_text()
        chk(f"{w} tabela por evento com novo/legado",("view_item" in tx) and ("novo" in tx) and ("legado" in tx))
        row=pg.locator("#gaRoot tr:has-text('view_item')").inner_text()
        chk(f"{w} separa Producao (12) de Preview/teste (3)","12" in row and "3" in row)
        chk(f"{w} fonte e periodo exibidos","propriedade 540539657" in tx and "7 dia" in tx)
        chk(f"{w} paises e origem GA4","Brazil" in tx and "facebook / referral" in tx)
        state["ga"]={"configured":True,"propertyId":"540539657","source":"x","error":"no_access","message":"sem permissao"}; pg.click("#gaLoad"); pg.wait_for_timeout(700)
        chk(f"{w} erro de acesso explicado","Leitor" in pg.locator("#gaRoot").inner_text())
        chk(f"{w} sem erros JS",not errs)
        state["ga"]={"configured":False,"missing":["GA4_CLIENT_EMAIL (ou GA4_SERVICE_ACCOUNT_JSON)","GA4_PRIVATE_KEY (ou GA4_SERVICE_ACCOUNT_JSON)"],"propertyId":"540539657","source":"x"}
    br.close()
print("OK",ok,"FALHAS",bad)
