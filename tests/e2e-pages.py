import json,urllib.request
from playwright.sync_api import sync_playwright
B="http://localhost:4181"; ok=0;bad=0
def chk(n,c):
    global ok,bad
    if c: ok+=1
    else: bad+=1; print("FALHOU:",n)
c0=json.load(urllib.request.urlopen(B+"/api/catalog")); c0["settings"]["social"]={"whatsapp":"https://wa.me/5519997607078"}; c0["settings"]["storeEmail"]="kairossshopping@gmail.com"
urllib.request.urlopen(urllib.request.Request(B+"/api/catalog",data=json.dumps({"settings":c0["settings"],"products":[]}).encode(),method="PUT",headers={"content-type":"application/json"}))
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for w,lab in [(1280,"d"),(390,"m")]:
        ctx=br.new_context(viewport={"width":w,"height":900}); ctx.route("**/app.kaiross.com.br/**",lambda r:r.fulfill(status=200,body="ok",content_type="text/html")); pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto(B+"/rastreio"); pg.wait_for_timeout(1200)
        t=pg.inner_text("main")
        chk(lab+" titulo","Acompanhe seu pedido" in t); chk(lab+" texto","Seu pedido está a caminho!" in t); chk(lab+" botao","Rastrear pedido" in t)
        chk(lab+" achadinhos <=3 dinamicos",1<=pg.locator(".find").count()<=3 and "Enquanto seu pedido chega, conheça nossos achadinhos!" in t)
        pg.click("#trackForm button"); chk(lab+" vazio erro","Informe o código" in pg.inner_text("#trackMsg"))
        pg.fill("#trackCode","ab c!"); pg.click("#trackForm button"); chk(lab+" invalido","inválido" in pg.inner_text("#trackMsg"))
        pg.fill("#trackCode","BR123456789XX")
        with pg.context.expect_page() as np_: pg.click("#trackForm button")
        np=np_.value; np.wait_for_load_state(); chk(lab+" abre portal com codigo","app.kaiross.com.br/rastreio?codigo=BR123456789XX" in np.url or False); np.close()
        pg.wait_for_timeout(1000); chk(lab+" resultado","Rastreamento aberto" in pg.inner_text("#trackResult"))
        chk(lab+" sem overflow",pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        pg.screenshot(path="/tmp/kairos-rast-%s.png"%lab,full_page=True)
        pg.goto(B+"/contato"); pg.wait_for_timeout(500); t=pg.inner_text("main")
        chk(lab+" contato titulo","Estamos aqui para ajudar!" in t and "Nossa equipe está pronta para orientar você." in t)
        chk(lab+" 4 cards",pg.locator(".card").count()==4 and all(x in t for x in ["Atendimento ao cliente","Suporte de pedidos","Dúvidas sobre produtos","Rastreamento de pedidos"]))
        hs=pg.eval_on_selector_all("a.btn","els=>els.map(e=>e.href)")
        chk(lab+" whatsapp real",any("wa.me/5519997607078?text=" in h for h in hs)); chk(lab+" email real",any(h.startswith("mailto:kairossshopping@gmail.com") for h in hs))
        chk(lab+" links internos",any(h.endswith("/rastreio") for h in hs) and any(h.endswith("/#faq") for h in hs))
        chk(lab+" sem overflow c",pg.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        pg.screenshot(path="/tmp/kairos-cont-%s.png"%lab,full_page=True); chk(lab+" sem erros js",not errs); pg.close()
    br.close()
print("OK",ok,"FALHAS",bad)
