from playwright.sync_api import sync_playwright
B="http://localhost:4181"; ok=bad=0
def chk(n,c):
    global ok,bad
    if c: ok+=1
    else: bad+=1; print("FALHOU:",n)
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for url,lab in [("/","home"),("/p/projetor-natal","curta"),("/produto/projetor-de-natal-astronauta-bivolt","completa")]:
        for w in (1280,390):
            pg=br.new_page(viewport={"width":w,"height":800}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
            reqs=[]; pg.on("request",lambda r:reqs.append(r.url))
            pg.goto(B+url); pg.wait_for_timeout(1800)
            chk(f"{lab}{w} fbq definido",pg.evaluate("typeof window.fbq==='function'"))
            chk(f"{lab}{w} pixel solicitado",any("connect.facebook.net/en_US/fbevents.js" in r for r in reqs))
            q=pg.evaluate("(window.fbq&&window.fbq.queue||[]).map(a=>a[0]+':'+a[1])")
            chk(f"{lab}{w} init+PageView {q[:2]}",q[:2]==["init:897410516544780","track:PageView"])
            chk(f"{lab}{w} sem erros js",not errs)
            chk(f"{lab}{w} conteudo renderizado",pg.locator("body").inner_text().count("R$")>0)
            if lab!="home": chk(f"{lab}{w} ViewContent","track:ViewContent" in q or pg.evaluate("(window.fbq.queue||[]).some(a=>a[1]==='ViewContent')"))
            pg.close()
    pg=br.new_page(); pg.goto(B+"/"); pg.wait_for_timeout(1200)
    import urllib.request; chk("whatsapp rodape estatico real","wa.me/5519997607078" in urllib.request.urlopen(B+"/").read().decode())
    br.close()
print("OK",ok,"FALHAS",bad)
