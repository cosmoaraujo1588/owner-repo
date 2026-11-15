from playwright.sync_api import sync_playwright
import json
B="http://localhost:4181"
res=[]
def ck(n,c,extra=""):
    res.append(bool(c)); print(("OK  " if c else "FAIL"),n,extra if not c else "")
S=lambda: json.load(open('/tmp/claude-0/-home-claude/5105b447-9b45-5d6c-92ab-ebae29095ae8/scratchpad/mock/state.json'))
errs=[]
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=br.new_context(viewport={"width":1280,"height":900})
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
    pg.goto(B+"/admin.html"); pg.wait_for_timeout(1500)
    ck("menu com icones", pg.locator("#adminNav .nav-ic").count()>=8)
    ck("badge produtos", pg.locator('[data-section="products"] .nav-badge').count()==1)
    pg.click('[data-section="products"]'); pg.wait_for_timeout(300)
    ck("secao complementares existe", pg.locator("#prodComp").count()==1)
    # ordem: complementares antes do checkbox destaque
    order=pg.evaluate("(()=>{const c=document.getElementById('prodComp');const f=document.querySelector('#productForm [name=featured]');return !!(c.compareDocumentPosition(f)&Node.DOCUMENT_POSITION_FOLLOWING)})()")
    ck("complementares antes das opcoes de publicacao", order)
    # novo produto com 3 complementares + tentativa do 4º
    pg.click("#newProductButton")
    f=pg.locator("#productForm")
    f.locator("[name=title]").fill("Produto Teste Bloco A"); f.locator("[name=category]").fill("Casa"); f.locator("[name=price]").fill("49.9")
    f.locator("[name=checkoutUrl]").fill("https://pay.kaiross.com.br/checkout/abc"); f.locator("[name=image]").fill("https://example.com/a.jpg")
    for term,n in (("projetor",1),("garrafa",2),("pote",3)):
        pg.fill("#compSearch",term); pg.wait_for_timeout(150)
        pg.locator("#compResults [data-comp-add]").first.click(); pg.wait_for_timeout(100)
    ck("3 selecionados", pg.locator("[data-comp-remove]").count()==3)
    pg.fill("#compSearch","luz"); pg.wait_for_timeout(150)
    ck("4o bloqueado", pg.locator("#compResults [data-comp-add]").count()==0)
    pg.fill("#compSearch","")
    pg.click('[data-comp-up="2"]'); pg.wait_for_timeout(100)
    pg.click('[data-comp-remove="2"]'); pg.wait_for_timeout(100)
    ck("remover/reordenar -> 2", pg.locator("[data-comp-remove]").count()==2)
    f.locator("button[type=submit]").first.click(); pg.wait_for_timeout(1200)
    st=S(); prod=[x for x in st["products"] if x["title"]=="Produto Teste Bloco A"]
    ck("produto salvo", len(prod)==1)
    pid=prod[0]["id"] if prod else ""
    ck("associacao salva junto", len(st["settings"]["orderBump"]["links"].get(pid,[]))==2, str(st["settings"]["orderBump"]["links"].get(pid)))
    # persistencia + sincronia com tela Associacoes
    pg.reload(); pg.wait_for_timeout(1500)
    pg.click('[data-section="associations"]'); pg.wait_for_timeout(200)
    ck("tela Associacoes mostra o novo", pg.locator("#assocOverview [data-assoc-main='%s']"%pid).count()==1)
    pg.click('[data-section="products"]'); pg.wait_for_timeout(200)
    pg.locator(f'[data-product-edit="{pid}"]').first.click(); pg.wait_for_timeout(300)
    ck("editar carrega complementares", pg.locator("[data-comp-remove]").count()==2)
    # desativar + editar nao apaga gallery
    pg.uncheck("#compEnabled"); f.locator("button[type=submit]").first.click(); pg.wait_for_timeout(1200)
    st=S(); ck("desativado salvo", st["settings"]["orderBump"]["disabled"].get(pid) is True)
    ck("sem duplicidade (links unicos)", len(set(st["settings"]["orderBump"]["links"][pid]))==2)
    ck("sem erros JS", not errs, str(errs))
    br.close()
print(sum(res),"/",len(res))
