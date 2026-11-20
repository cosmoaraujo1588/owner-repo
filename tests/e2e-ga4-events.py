# GA4: nomes padrao, e-commerce (currency/value/items), sem duplicados, sem parametros vazios,
# sem ui_click e modo ?ga_debug=1 (le o dataLayer; nao envia nada real ao Google).
from playwright.sync_api import sync_playwright
import json
B="http://localhost:4181"; ok=bad=0
def chk(n,c):
    global ok,bad
    if c: ok+=1
    else: bad+=1; print("FALHOU:",n)
def dl(pg): return pg.evaluate("()=>(window.dataLayer||[]).map(a=>Array.from(a))")
def evs(pg): return [(a[1],a[2] if len(a)>2 else {}) for a in dl(pg) if a[0]=="event"]
def names(pg): return [n for n,_ in evs(pg)]
def get(pg,n): return [p for k,p in evs(pg) if k==n]
def has_empty(params):
    def bad_(v):
        if isinstance(v,str): return v==""
        if isinstance(v,list): return any(bad_(i) for i in v)
        if isinstance(v,dict): return any(bad_(i) for i in v.values())
        return v is None
    return bad_(params)
def ecom_ok(p):
    it=(p.get("items") or [{}])[0]
    return p.get("currency")=="BRL" and isinstance(p.get("value"),(int,float)) and p["value"]>0 and it.get("item_id") and it.get("item_name") and it.get("price")==p["value"] and it.get("quantity")==1 and it.get("item_category")
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for w in (1280,390):
        pg=br.new_page(viewport={"width":w,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto(B+"/"); pg.wait_for_timeout(2200)
        cfg=[a for a in dl(pg) if a[0]=="config"]
        chk(f"{w} config sem debug_mode para visitante normal",cfg and "debug_mode" not in (cfg[0][2] if len(cfg[0])>2 else {}))
        pg.locator("#catalogGrid .product-card .pc-media").first.click(); pg.wait_for_timeout(900)
        pg.locator("#productModal [data-modal-action=cart]").first.evaluate("el=>el.click()"); pg.wait_for_timeout(500)
        pg.locator("#productModal [data-modal-action=buy]").first.evaluate("el=>{el.addEventListener('click',e=>e.preventDefault(),true);el.click()}"); pg.wait_for_timeout(500)
        pg.fill("#searchInput","fone"); pg.press("#searchInput","Enter"); pg.wait_for_timeout(600)
        pg.locator("#categoryRail a, #categoryRail button, #deptLinks a, #deptLinks button").first.evaluate("el=>el.click()"); pg.wait_for_timeout(600)
        pg.locator("#footerWhatsapp").evaluate("el=>{el.removeAttribute('target');el.href='https://wa.me/5519997607078#t';el.addEventListener('click',e=>e.preventDefault())}")
        pg.locator("#footerWhatsapp").evaluate("el=>el.click()"); pg.wait_for_timeout(400)
        n=names(pg)
        for ev in ("select_item","view_item","add_to_cart","begin_checkout","click_whatsapp","search","category_filter"):
            chk(f"{w} {ev} exatamente 1x",n.count(ev)==1)
        for ev in ("select_item","view_item","add_to_cart","begin_checkout"):
            g=get(pg,ev); chk(f"{w} {ev} com currency/value/items reais",g and ecom_ok(g[0]))
        chk(f"{w} search_term correto",get(pg,"search") and get(pg,"search")[0]=={"search_term":"fone"})
        chk(f"{w} category_filter com categoria",get(pg,"category_filter") and get(pg,"category_filter")[0].get("category"))
        chk(f"{w} click_whatsapp com source",get(pg,"click_whatsapp") and get(pg,"click_whatsapp")[0].get("source"))
        chk(f"{w} nenhum parametro vazio",not any(has_empty(pp) for _,pp in evs(pg)))
        chk(f"{w} sem ui_click",("ui_click" not in n))
        chk(f"{w} sem purchase/nomes antigos",not (set(n)&{"purchase","view_product","add_to_checkout","whatsapp_click","search_products","view_category","file_download","outbound_click"}))
        chk(f"{w} sem erros JS",not errs)
        pg.close()
    # carrinho: begin_checkout + add_to_cart (order bump)
    pg=br.new_page(viewport={"width":1280,"height":900}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
    pg.goto(B+"/"); pg.wait_for_timeout(1500)
    pid=pg.evaluate("()=>{const a=document.querySelector('#catalogGrid [data-product-id]');return a&&a.dataset.productId}")
    pg.evaluate("id=>localStorage.setItem('kairos:cart',JSON.stringify([id]))",pid)
    pg.goto(B+"/carrinho"); pg.wait_for_timeout(1800)
    pg.evaluate("()=>{window.open=()=>null}")
    pg.locator("[data-buy]").first.click(); pg.wait_for_timeout(300)
    g=get(pg,"begin_checkout"); chk("carrinho begin_checkout com e-commerce",len(g)==1 and ecom_ok(g[0]) and g[0].get("source")=="cart")
    if pg.locator("[data-bump-add]").count():
        pg.locator("[data-bump-add]").first.click(); pg.wait_for_timeout(300)
        g=get(pg,"add_to_cart"); chk("carrinho order bump add_to_cart com e-commerce",len(g)==1 and ecom_ok(g[0]))
    chk("carrinho sem parametros vazios",not any(has_empty(pp) for _,pp in evs(pg)))
    chk("carrinho sem erros",not errs); pg.close()
    # modo debug
    pg=br.new_page(); pg.goto(B+"/?ga_debug=1"); pg.wait_for_timeout(1200)
    cfg=[a for a in dl(pg) if a[0]=="config"]; chk("ga_debug=1 liga debug_mode",cfg and cfg[0][2].get("debug_mode") is True)
    pg.goto(B+"/carrinho"); pg.wait_for_timeout(800)
    cfg=[a for a in dl(pg) if a[0]=="config"]; chk("debug persiste na sessao (carrinho)",cfg and cfg[0][2].get("debug_mode") is True)
    pg.goto(B+"/?ga_debug=0"); pg.wait_for_timeout(800)
    cfg=[a for a in dl(pg) if a[0]=="config"]; chk("ga_debug=0 desliga",cfg and "debug_mode" not in cfg[0][2])
    pg.close()
    pg=br.new_page(); pg.goto(B+"/contato"); pg.wait_for_timeout(1000)
    cfg=[a for a in dl(pg) if a[0]=="config"]; chk("pagina institucional com config GA",bool(cfg))
    pg.goto(B+"/contato?ga_debug=1"); pg.wait_for_timeout(800)
    cfg=[a for a in dl(pg) if a[0]=="config"]; chk("ga_debug em pagina institucional",cfg and cfg[0][2].get("debug_mode") is True)
    br.close()
print("OK",ok,"FALHAS",bad)
