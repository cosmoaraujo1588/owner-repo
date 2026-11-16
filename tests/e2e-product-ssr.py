import urllib.request
from playwright.sync_api import sync_playwright
B="http://localhost:4181"; ok=bad=0
def chk(n,c):
    global ok,bad
    if c: ok+=1
    else: bad+=1; print("FALHOU:",n)
for u in ["/produto/projetor-de-natal-astronauta-bivolt","/p/projetor-natal"]:
    raw=urllib.request.urlopen(B+u).read().decode()
    chk(u+" h1 no HTML",'<h1>Projetor de Natal Astronauta Bivolt</h1>' in raw); chk(u+" preco no HTML","R$" in raw.split('id="productModal"')[1][:3000])
try: urllib.request.urlopen(B+"/produto/nao-existe"); chk("404",False)
except urllib.error.HTTPError as e: chk("404 produto inexistente",e.code==404)
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for w in (1280,390):
        pg=br.new_page(viewport={"width":w,"height":800}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto(B+"/produto/projetor-de-natal-astronauta-bivolt",wait_until="commit"); pg.wait_for_selector("#productModal h1",timeout=5000)
        chk(f"{w} h1 visivel cedo",pg.locator("#productModal h1").is_visible())
        pg.wait_for_timeout(2000)
        chk(f"{w} modal completo apos JS",pg.locator("#productModal [data-modal-action=buy]").count()>=1)
        chk(f"{w} sem erros",not errs)
        pg.click("#productModal .pp-back, #productModal [data-modal-action=close]"); pg.wait_for_timeout(500)
        chk(f"{w} fecha e volta a loja",pg.locator("#productModal").is_hidden() and pg.url.rstrip("/")==B)
        pg.screenshot(path=f"ssr-{w}.png"); pg.close()
    br.close()
print("OK",ok,"FALHAS",bad)
