import json,sys,urllib.request
from playwright.sync_api import sync_playwright
M="/tmp/claude-0/-home-claude/5105b447-9b45-5d6c-92ab-ebae29095ae8/scratchpad/media/"
B="http://localhost:4181"; ok=0;bad=0
def chk(n,c):
    global ok,bad
    if c: ok+=1
    else: bad+=1; print("FALHOU:",n)
def state(): return json.load(urllib.request.urlopen(B+"/api/catalog"))
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"]); pg=br.new_page(viewport={"width":1280,"height":900})
    errs=[]; pg.on("pageerror",lambda e:errs.append(str(e))); pg.on("dialog",lambda d:d.accept())
    c0=state(); c0["settings"]["banners"]=[]; c0["settings"].pop("carousel",None)
    urllib.request.urlopen(urllib.request.Request(B+"/api/catalog",data=json.dumps({"settings":c0["settings"],"products":[]}).encode(),method="PUT",headers={"content-type":"application/json"}))
    pg.goto(B+"/admin"); pg.wait_for_timeout(1500)
    pg.evaluate("document.querySelector('[data-section=banners]').click()"); pg.wait_for_timeout(1500)
    chk("root",pg.locator("#carouselRoot").count()==1)
    def add(title,typ,files,active=True,link="#produtos"):
        pg.click("[data-car=new]"); pg.select_option("[data-f=type]",typ); pg.fill("[data-f=title]",title); pg.fill("[data-f=link]",link)
        for slot,f in files:
            pg.set_input_files(f'[data-slot={slot}] input[type=file]',M+f); pg.wait_for_timeout(1800)
        return pg.inner_text(".car-editor")
    t=add("Teste JPG","image",[("desktopImage","a.jpg"),("mobileImage","b.jpeg")])
    chk("jpg salvo e verificado","Salvo e verificado" in t)
    pg.click("#carSave"); pg.wait_for_timeout(1000)
    s=state()["settings"]; b=s["banners"]
    chk("persistiu 1",len(b)==1 and b[0]["desktopImage"].startswith("http://localhost:4181/storage/banners/desktop/"))
    chk("mobile em pasta mobile",b[0]["mobileImage"] and "/banners/mobile/" in b[0]["mobileImage"])
    chk("webp convertido",b[0]["desktopImage"].endswith(".webp") or b[0]["desktopImage"].endswith(".jpg"))
    r=urllib.request.urlopen(b[0]["desktopImage"]); chk("url publica acessivel",r.status==200 and r.read(4)[:4]==b"RIFF")
    for n,f in [("PNG","c.png"),("WebP","d.webp")]:
        t=add("Teste "+n,"image",[("desktopImage",f)]); chk(n+" ok","Salvo e verificado" in t); pg.click("#carSave"); pg.wait_for_timeout(800)
    # invalidos
    add("Falso","image",[("desktopImage","fake.jpg")]); chk("fake.jpg rejeitado","nao foi alterado" in pg.inner_text("#carErr")); 
    pg.set_input_files('[data-slot=desktopImage] input[type=file]',M+"bad.gif"); pg.wait_for_timeout(800); chk("gif rejeitado","nao foi alterado" in pg.inner_text("#carErr"))
    pg.click("#carSave"); chk("nao salva sem midia","Envie" in pg.inner_text("#carErr")); pg.click("[data-close]"); 
    # verificacao falha
    urllib.request.urlopen(B+"/_fail?v=1")
    add("VerifFail","image",[("desktopImage","a.jpg")]); chk("verify falha bloqueia","nao foi publicado" in pg.inner_text("#carErr") or "NAO foi publicado" in pg.inner_text("#carErr")); chk("sem url no draft",pg.locator('[data-slot=desktopImage] .car-thumb').count()==0)
    pg.click("[data-close]"); urllib.request.urlopen(B+"/_fail?v=0")
    # video
    t=add("Video 1","video",[("videoUrl","v.mp4"),("mobileVideoUrl","vm.mp4")]); chk("video ok","Enviado" in t)
    chk("poster gerado",pg.locator('[data-slot=poster] img.car-thumb').count()==1)
    pg.set_input_files('[data-slot=videoUrl] input[type=file]',M+"v.mov"); pg.wait_for_timeout(800); chk("mov rejeitado","nao foi alterado" in pg.inner_text("#carErr"))
    pg.click("#carSave"); pg.wait_for_timeout(800)
    s=state()["settings"]; v=[x for x in s["banners"] if x["title"]=="Video 1"][0]
    chk("video persistiu",v["type"]=="video" and "/banners/videos/" in v["videoUrl"] and v["poster"])
    # limite 5 ativos
    for i in range(3):
        add("Extra %d"%i,"image",[("desktopImage","a.jpg")]); pg.click("#carSave"); pg.wait_for_timeout(900)
    s=state()["settings"]; act=[x for x in s["banners"] if x["active"]]
    chk("max 5 ativos (total %d)"%len(s["banners"]),len(act)<=5 and len(s["banners"])==7)
    # reordenar, toggle, excluir
    first=sorted(s["banners"],key=lambda x:x["order"])[0]["title"]
    pg.click(".car-item:first-child [data-car=down]"); pg.wait_for_timeout(800)
    s=state()["settings"]; chk("reordenou",sorted(s["banners"],key=lambda x:x["order"])[1]["title"]==first)
    n=len(s["banners"]); pg.click(".car-item:last-child [data-car=del]"); pg.wait_for_timeout(800)
    chk("excluiu",len(state()["settings"]["banners"])==n-1)
    pg.click(".car-item:first-child [data-car=toggle]"); pg.wait_for_timeout(800)
    chk("toggle persistiu",any(not x["active"] for x in state()["settings"]["banners"]))
    # config
    pg.fill("[data-cfg=interval]","9"); pg.uncheck("[data-cfg=dots]"); pg.click("[data-car=saveCfg]"); pg.wait_for_timeout(800)
    c=state()["settings"]["carousel"]; chk("config persistiu",c["interval"]==9 and c["dots"] is False)
    chk("sem erros js",not errs)
    if errs: print(errs)
    # loja desktop/mobile
    for w,h,lab in [(1280,800,"desktop"),(390,800,"mobile")]:
        sp=br.new_page(viewport={"width":w,"height":h}); sp.goto(B+"/"); sp.wait_for_timeout(2500)
        sl=sp.locator(".banner-slide").count(); chk(lab+" slides>0",sl>0); 
        chk(lab+" sem dots (config)",sp.locator(".banner-dots button, .bn-dots button").count()==0)
        sp.screenshot(path="/tmp/kairos-shot-%s.png"%lab); sp.close()
    br.close()
print("OK",ok,"FALHAS",bad)
