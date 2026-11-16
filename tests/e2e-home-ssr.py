import urllib.request
from playwright.sync_api import sync_playwright
B="http://localhost:4181"; ok=bad=0
def chk(n,c):
    global ok,bad
    if c: ok+=1
    else: bad+=1; print("FALHOU:",n)
raw=urllib.request.urlopen(B+"/").read().decode()
chk("cards no HTML inicial",raw.count('class="product-card"')>=10 and '<a class="pc-media" href="/produto/' in raw)
chk("pixel e GA mantidos","fbq('init'" in raw and "G-M3PTCCK08X" in raw)
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for w in (1280,390):
        pg=br.new_page(viewport={"width":w,"height":800}); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        pg.goto(B+"/"); pg.wait_for_timeout(2200)
        n=pg.locator("#catalogGrid .product-card").count()
        chk(f"{w} grade hidratada com botoes",n>0 and pg.locator("#catalogGrid [data-action=buy]").count()==n)
        chk(f"{w} sem duplicar cards",n<=24+0 and pg.locator("#catalogGrid .product-card h3 a").count()==n)
        chk(f"{w} sem erros",not errs)
        pg.locator("#catalogGrid .product-card .pc-media").first.click(); pg.wait_for_timeout(800)
        chk(f"{w} abre produto",pg.locator("#productModal [data-modal-action=buy]").count()>=1)
        pg.close()
    br.close()
print("OK",ok,"FALHAS",bad)
