# Eventos GA4 da loja: nomes padrao e sem disparo duplicado (le dataLayer; nao envia nada real).
from playwright.sync_api import sync_playwright
B="http://localhost:4181"; ok=bad=0
def chk(n,c):
    global ok,bad
    if c: ok+=1
    else: bad+=1; print("FALHOU:",n)
def evs(pg):
    return pg.evaluate("()=>(window.dataLayer||[]).filter(a=>a[0]==='event').map(a=>a[1])")
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    pg=br.new_page(viewport={"width":1280,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.wait_for_timeout(2200)
    pg.locator("#catalogGrid .product-card .pc-media").first.click(); pg.wait_for_timeout(900)
    e=evs(pg)
    chk("select_item 1x",e.count("select_item")==1); chk("view_item 1x",e.count("view_item")==1)
    pg.locator("#productModal [data-modal-action=cart]").first.evaluate("el=>el.click()"); pg.wait_for_timeout(600)
    chk("add_to_cart 1x",evs(pg).count("add_to_cart")==1)
    pg.evaluate("()=>{document.dispatchEvent(new CustomEvent('x'))}")
    pg.fill("#searchInput","fone"); pg.press("#searchInput","Enter"); pg.wait_for_timeout(700)
    chk("search",evs(pg).count("search")>=1)
    pg.locator("#footerWhatsapp").evaluate("el=>{el.removeAttribute('target');el.href='https://wa.me/5519997607078#t';el.addEventListener('click',e=>e.preventDefault())}")
    pg.locator("#footerWhatsapp").evaluate("el=>el.click()"); pg.wait_for_timeout(400)
    chk("click_whatsapp 1x",evs(pg).count("click_whatsapp")==1)
    old={"view_product","add_to_checkout","whatsapp_click","search_products","view_category","file_download","outbound_click"}
    chk("sem nomes antigos/duplicados",not (set(evs(pg))&old))
    chk("sem purchase",("purchase" not in evs(pg)))
    chk("sem erros JS",not errs)
    br.close()
print("OK",ok,"FALHAS",bad)
