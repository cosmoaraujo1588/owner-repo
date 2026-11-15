from playwright.sync_api import sync_playwright
B="http://localhost:4181"; res=[]
def ck(n,c): res.append(bool(c)); print("OK  " if c else "FAIL",n)
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for vp in ({"width":1280,"height":800},{"width":390,"height":800}):
        ctx=br.new_context(viewport=vp); pg=ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        t=f"[{vp['width']}] "
        pg.goto(B+"/"); pg.wait_for_selector("#kxCookie",timeout=5000)
        ck(t+"aparece na home", True)
        ck(t+"link politica", pg.locator("#kxCookie a").get_attribute("href")=="/privacidade")
        box=pg.locator("#kxCookie").bounding_box(); ck(t+"dentro da tela", box["x"]>=0 and box["x"]+box["width"]<=vp["width"])
        pg.screenshot(path=f"/tmp/claude-0/-home-claude/5105b447-9b45-5d6c-92ab-ebae29095ae8/scratchpad/shots/ck{vp['width']}.png")
        pg.click("#kxCookie button"); ck(t+"fecha", pg.locator("#kxCookie").count()==0)
        pg.reload(); pg.wait_for_timeout(2500); ck(t+"nao reaparece", pg.locator("#kxCookie").count()==0)
        pg.goto(B+"/carrinho.html"); pg.wait_for_timeout(2500); ck(t+"lembra no carrinho", pg.locator("#kxCookie").count()==0)
        ck(t+"sem erros JS", not errs)
        ctx.close()
    ctx=br.new_context(); pg=ctx.new_page(); pg.goto(B+"/carrinho.html"); 
    try: pg.wait_for_selector("#kxCookie",timeout=5000); ck("aparece no carrinho", True)
    except Exception: ck("aparece no carrinho", False)
    pg.goto(B+"/admin.html"); pg.wait_for_timeout(2500); ck("nao aparece no admin", pg.locator("#kxCookie").count()==0)
    br.close()
print(sum(res),"/",len(res))
