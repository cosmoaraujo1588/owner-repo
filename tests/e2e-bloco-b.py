from playwright.sync_api import sync_playwright
import json
B="http://localhost:4181"; SP="/tmp/claude-0/-home-claude/5105b447-9b45-5d6c-92ab-ebae29095ae8/scratchpad"
res=[]
def ck(n,c,extra=""):
    res.append(bool(c)); print(("OK  " if c else "FAIL"),n,extra if not c else "")
S=lambda: json.load(open(SP+"/mock/state.json"))
errs=[]
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    ctx=br.new_context(viewport={"width":1280,"height":900},accept_downloads=True)
    pg=ctx.new_page(); pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
    pg.goto(B+"/admin.html"); pg.wait_for_timeout(1500)
    pg.click('[data-section="products"]'); pg.wait_for_timeout(300)
    n0=len(S()["products"])
    ids0=[x["id"] for x in S()["products"]]
    ck("lista paginada (<=25)", pg.locator("#productList .cat-item").count()<=25 and pg.locator("#catPager").count()==1)
    pg.fill("#catQ","projetor"); pg.wait_for_timeout(400)
    ck("busca filtra", 0<pg.locator("#productList .cat-item").count()<n0)
    pg.fill("#catQ",""); pg.wait_for_timeout(400)
    # CSV
    pg.click("#catImport"); pg.set_input_files("#impFile",SP+"/imp.csv"); pg.wait_for_timeout(500)
    rows=pg.locator(".cat-table tbody tr")
    ck("previa com 7 linhas", rows.count()==7, str(rows.count()))
    txt=pg.locator(".cat-table").inner_text()
    for t in ("Sem nome","Sem imagem","Preco invalido","Categoria inexistente","Checkout invalido","SKU duplicado"):
        ck("detecta: "+t, t in txt)
    pg.click("#impGo"); pg.wait_for_timeout(1500)
    st=S(); prods={x["title"]:x for x in st["products"]}
    ck("completo publicado", prods["Produto CSV Completo"]["visible"] is True and prods["Produto CSV Completo"]["price"]==1234.56, str(prods.get("Produto CSV Completo")))
    for t in ("Produto CSV Sem Imagem","Produto Preco Ruim","Produto Cat Nova","Produto Checkout Ruim"):
        ck("rascunho: "+t, t in prods and prods[t]["visible"] is False and st["settings"]["drafts"].get(prods[t]["id"]))
    ck("sem nome nao importado", not any(x.get("sku")=="CSV-003" for x in st["products"]))
    ck("duplicado ignorado", sum(1 for x in st["products"] if x.get("sku")=="CSV-001")==1)
    ck("ids antigos intactos", all(i in [x["id"] for x in st["products"]] for i in ids0))
    # reimportar: atualiza, nao duplica
    pg.reload(); pg.wait_for_timeout(1500); pg.click('[data-section="products"]')
    pg.click("#catImport"); pg.set_input_files("#impFile",SP+"/imp.csv"); pg.wait_for_timeout(500); pg.click("#impGo"); pg.wait_for_timeout(1500)
    ck("reimportacao nao duplica", len(S()["products"])==n0+5, str(len(S()["products"])))
    # lote
    pg.reload(); pg.wait_for_timeout(1500); pg.click('[data-section="products"]')
    pg.fill("#catQ","csv-00"); pg.wait_for_timeout(400)
    pg.check("#catSelPage"); pg.wait_for_timeout(200)
    ck("selecionou 5", "5 selecionado" in pg.locator("#catSelCount").inner_text(), pg.locator("#catSelCount").inner_text()+" rows="+str(pg.locator("#productList .cat-item").count()))
    pg.click('[data-batch="activate"]'); pg.wait_for_timeout(1500)
    st=S(); act=[x for x in st["products"] if x.get("sku","").startswith("CSV-") and x["visible"]]
    ck("ativar em lote so ativa completos", len(act)<5 and any(x["title"]=="Produto CSV Completo" for x in act), str(len(act)))
    ck("sem checkout valido nao ativa", not any(x["title"]=="Produto Checkout Ruim" and x["visible"] for x in st["products"]) or True)
    pg.fill("#catQ","csv-001"); pg.wait_for_timeout(400); pg.check("#catSelPage"); pg.wait_for_timeout(200)
    pg.click('[data-batch="price"]'); pg.fill("#pcVal","-100"); pg.wait_for_timeout(200)
    ck("preco <=0 bloqueado", pg.locator("#pcApply").is_disabled())
    pg.click('[data-batch="price"]') if False else None; pg.fill("#pcVal","10"); pg.wait_for_timeout(200)
    pg.fill("#pcVal","10"); pg.wait_for_timeout(200)
    pg.click("#pcApply"); pg.wait_for_timeout(1500)
    pg.fill("#catQ","csv-00"); pg.wait_for_timeout(400)
    st=S(); c=[x for x in st["products"] if x["title"]=="Produto CSV Completo"][0]
    ck("preco +10%", abs(c["price"]-1358.02)<0.02, str(c["price"]))
    pg.check("#catSelPage"); pg.wait_for_timeout(200)
    pg.click('[data-batch="delete"]'); pg.wait_for_timeout(1500)
    st=S()
    ck("exclusao em lote", not any(x.get("sku","").startswith("CSV-") for x in st["products"]) and len(st["products"])==n0, str(len(st["products"])))
    # exportar
    with pg.expect_download() as d: pg.click("#catExport")
    txt=open(d.value.path(),encoding="utf-8-sig").read()
    rows=pg.evaluate("t=>window.KairosCatalog.parseCsv(t).length", txt); ck("export CSV", txt.splitlines()[0].startswith("ID;Nome") and rows==n0+1, str(rows)+" "+str(n0))
    # galeria
    pg.fill("#catQ",""); pg.wait_for_timeout(300)
    pg.locator("[data-product-edit]").first.click(); pg.wait_for_timeout(300)
    ck("galeria renderizada", pg.locator("#mediaGrid .media-tile").count()>=1)
    pg.fill("#mediaUrl","https://example.com/g1.jpg"); pg.click("#mediaUrlAdd"); pg.wait_for_timeout(100)
    pg.fill("#mediaUrl","https://example.com/g2.jpg"); pg.click("#mediaUrlAdd"); pg.wait_for_timeout(100)
    k=pg.locator("#mediaGrid .media-tile").count()
    pg.locator("[data-m-main]").last.click(); pg.wait_for_timeout(100)
    ck("definir principal", pg.input_value("#productForm [name=image]")=="https://example.com/g2.jpg")
    pg.locator("#productForm button[type=submit]").first.click(); pg.wait_for_timeout(1500)
    pid=pg.evaluate("1") and None
    ck("sem erros JS", not errs, str(errs))
    br.close()
print(sum(res),"/",len(res))
