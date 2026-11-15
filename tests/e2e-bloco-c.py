from playwright.sync_api import sync_playwright
import json
B="http://localhost:4181"; SP="/tmp/claude-0/-home-claude/5105b447-9b45-5d6c-92ab-ebae29095ae8/scratchpad"
res=[]
def ck(n,c,extra=""):
    res.append(bool(c)); print(("OK  " if c else "FAIL"),n,extra if not c else "")
live=open(SP+"/live.json").read(); rep=open(SP+"/report.json").read()
errs=[]; urls=[]
def handler(route):
    u=route.request.url; urls.append(u)
    route.fulfill(status=200,content_type="application/json",body=live if "live=1" in u else rep if "report=1" in u else route.fetch().text())
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for vp in ({"width":1280,"height":900},{"width":390,"height":800}):
        ctx=br.new_context(viewport=vp); pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.route("**/api/events?*live=1*",handler); pg.route("**/api/events?*report=1*",handler)
        pg.goto(B+"/admin.html"); pg.wait_for_timeout(1200)
        tag=f"[{vp['width']}] "
        if vp["width"]<600: pg.click("#adminMenuToggle")
        pg.click('[data-section="live"]'); pg.wait_for_timeout(800)
        ck(tag+"ativos=9", "9" in pg.locator("#liveRoot .kpi.big strong").inner_text())
        ck(tag+"mapa com 27 UFs", pg.locator("#liveRoot svg.live-map rect").count()==27)
        ck(tag+"SP=4 no mapa", "São Paulo: 4" in pg.locator("#liveRoot svg").inner_html())
        ck(tag+"Localização indisponível", "Localização indisponível" in pg.locator("#liveRoot").inner_text())
        ck(tag+"tabela de visitantes", pg.locator("#liveRoot tbody tr").count()==9)
        pg.select_option("#liveWin","10"); pg.wait_for_timeout(500)
        ck(tag+"janela configuravel enviada", any("window=10" in u for u in urls))
        if vp["width"]<600: pg.click("#adminMenuToggle")
        pg.click('[data-section="performance"]'); pg.wait_for_timeout(800)
        txt=pg.locator("#perfRoot").inner_text()
        ck(tag+"4 grupos separados", all(k in txt for k in ("1. Visualizações","2. Cliques","3. Intenção de compra","4. Compras confirmadas")))
        ck(tag+"compras nao inventadas", "Cliques no checkout não são vendas" in txt and "—" in txt)
        ck(tag+"grafico e ranking", pg.locator("svg.perf-chart").count()==1 and pg.locator("#perfRoot tbody tr").count()>=2)
        pg.click('[data-range="30d"]'); pg.wait_for_timeout(500)
        ck(tag+"filtro 30d", any("report=1" in u for u in urls))
        pg.locator("[data-pick]").nth(0).check(); pg.wait_for_timeout(200)
        ck(tag+"comparar produtos", pg.locator(".bar-group").count()==1)
        pg.click('[data-tab="categories"]'); pg.wait_for_timeout(200)
        ck(tag+"aba categorias", "categoria" in pg.locator("#perfRoot thead").inner_text().lower())
        ov=pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth+2")
        ck(tag+"sem scroll horizontal", ov)
        pg.screenshot(path=f"{SP}/shots/c{vp['width']}.png",full_page=False)
        ctx.close()
    ck("sem erros JS", not errs, str(errs))
    br.close()
print(sum(res),"/",len(res))
