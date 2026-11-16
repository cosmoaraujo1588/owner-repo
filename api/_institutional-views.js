// Corpos HTML das paginas /rastreio e /contato (identidade Kairos). Somente contatos reais vindos das configuracoes.
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

const ICON = {
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.7 7L4 20l1.1-4.2A8 8 0 1 1 21 12Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
};
const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] || ""}</svg>`;

export function trackingBody({ trackingUrl }) {
  return `<section class="hero-card track">
  <span class="chip">${icon("truck")} Entrega Kairos Shopping</span>
  <h1>Acompanhe seu pedido</h1>
  <p class="lead">Seu pedido está a caminho! Informe seu código de rastreamento e acompanhe as atualizações da entrega diretamente pela Kairos Shopping.</p>
  <form id="trackForm" class="track-form" novalidate data-url="${esc(trackingUrl)}">
    <label for="trackCode">Código de rastreamento</label>
    <div class="track-row">
      <span class="field">${icon("box")}<input id="trackCode" name="codigo" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="60" placeholder="Ex.: BR123456789XX" aria-describedby="trackMsg"></span>
      <button type="submit" class="btn">${icon("search")} Rastrear pedido</button>
    </div>
    <p id="trackMsg" class="msg" role="status" aria-live="polite"></p>
  </form>
  <div id="trackResult" class="result" hidden></div>
  <p class="hint">O processamento do pedido pode levar até 2 dias úteis e o envio geralmente varia entre 3 e 15 dias úteis. As informações de status e movimentações são exibidas exatamente como retornadas pelo sistema logístico.</p>
</section>
<section class="finds" id="finds" hidden aria-label="Achadinhos">
  <h2>Enquanto seu pedido chega, conheça nossos achadinhos!</h2>
  <div class="finds-grid" id="findsGrid"></div>
</section>`;
}

export function contactBody({ whatsapp, email }) {
  const wa = (text) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  const waBtn = (text, label) => whatsapp ? `<a class="btn" href="${esc(wa(text))}" target="_blank" rel="noopener" data-contact="whatsapp">${icon("chat")} ${label}</a>` : "";
  const mailBtn = (subject) => email ? `<a class="btn ghost" href="mailto:${esc(email)}?subject=${encodeURIComponent(subject)}" data-contact="email">${icon("mail")} Enviar e-mail</a>` : "";
  const cards = [
    { i: "chat", t: "Atendimento ao cliente", d: "Fale com a nossa equipe para qualquer assunto sobre a sua experiência na Kairos Shopping.", a: waBtn("Olá, vim pelo site da Kairos Shopping e gostaria de atendimento.", "Falar no WhatsApp") + mailBtn("Atendimento Kairos Shopping") },
    { i: "box", t: "Suporte de pedidos", d: "Dúvidas sobre pagamento, prazo, troca ou devolução? Informe o número do seu pedido para agilizar.", a: waBtn("Olá! Preciso de ajuda com o meu pedido. Número do pedido: ", "Falar sobre meu pedido") + mailBtn("Suporte ao meu pedido") },
    { i: "help", t: "Dúvidas sobre produtos", d: "Quer saber mais sobre um produto antes de comprar? Veja as perguntas frequentes ou chame a equipe.", a: `<a class="btn" href="/#faq">${icon("help")} Ver perguntas frequentes</a>` + waBtn("Olá! Tenho uma dúvida sobre um produto da Kairos Shopping: ", "Perguntar no WhatsApp") },
    { i: "pin", t: "Rastreamento de pedidos", d: "Acompanhe a entrega com o seu código de rastreamento, sem precisar falar com ninguém.", a: `<a class="btn" href="/rastreio">${icon("pin")} Rastrear pedido</a>` }
  ];
  return `<section class="hero-card contact">
  <h1>Estamos aqui para ajudar!</h1>
  <p class="lead">Precisa de ajuda com seu pedido ou deseja tirar alguma dúvida? Nossa equipe está pronta para orientar você.</p>
</section>
<section class="cards" aria-label="Canais de atendimento">
${cards.map((c) => `  <article class="card"><span class="card-ic">${icon(c.i)}</span><h2>${c.t}</h2><p>${c.d}</p><div class="card-actions">${c.a}</div></article>`).join("\n")}
</section>`;
}

export const EXTRA_CSS = `
:root{--k-orange:#ff6b00;--k-ink:#101827;--k-line:#e6e9ef}
body.k{background:#f4f5f7;font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;color:#1a2233}
body.k main{width:min(1040px,calc(100% - 28px));padding:32px 0 8px;min-height:60vh}
.hero-card{background:linear-gradient(135deg,#0b0b0c,#1b1b1f);color:#fff;border-radius:18px;padding:clamp(24px,5vw,48px);position:relative;overflow:clip;box-shadow:0 18px 40px rgba(16,24,39,.18)}
.hero-card:before{content:"";position:absolute;inset:-40% -10% auto auto;width:380px;height:380px;background:radial-gradient(circle,rgba(255,107,0,.35),transparent 65%);pointer-events:none}
.hero-card h1{margin:10px 0 12px;font-size:clamp(1.9rem,6vw,3rem);line-height:1.08;letter-spacing:-.02em;position:relative}
.lead{max-width:62ch;color:#d5d9e2;font-size:1.05rem;margin:0 0 22px;position:relative;white-space:normal}
.chip{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:rgba(255,107,0,.16);color:#ffb36b;font-weight:700;font-size:.82rem;position:relative}
.ic{width:20px;height:20px;flex:none}
.track-form{position:relative;display:grid;gap:8px}.track-form label{font-weight:700;font-size:.9rem;color:#ffd7b3}
.track-row{display:flex;gap:10px;flex-wrap:wrap}
.field{flex:1 1 280px;display:flex;align-items:center;gap:10px;background:#fff;color:#6b7280;border-radius:12px;padding:0 14px;border:2px solid transparent}
.field:focus-within{border-color:var(--k-orange)}
.field input{flex:1;border:0;outline:0;background:transparent;font:inherit;font-size:1rem;padding:15px 0;color:#111827;min-width:0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 20px;border-radius:12px;background:var(--k-orange);color:#101827;font-weight:800;text-decoration:none;border:0;cursor:pointer;font:inherit;font-weight:800;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(255,107,0,.32)}.btn:focus-visible{outline:3px solid #ffd7b3;outline-offset:2px}
.btn.ghost{background:#fff;color:#101827;border:1px solid var(--k-line)}.btn[disabled]{opacity:.65;cursor:progress}
.msg{min-height:1.3em;margin:0;font-size:.92rem;color:#ffd7b3;white-space:normal}.msg.err{color:#ffb4b4}
.result{position:relative;margin-top:14px;padding:16px 18px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}
.result h2{margin:0 0 6px;font-size:1.05rem}.result p{margin:4px 0;color:#d5d9e2;white-space:normal}.result a{color:#ffb36b;font-weight:700}
.result .code{font-family:ui-monospace,monospace;background:rgba(255,255,255,.1);padding:2px 8px;border-radius:6px}
.hint{position:relative;margin:18px 0 0;color:#aab1c0;font-size:.85rem;white-space:normal}
.finds{margin-top:26px}.finds h2{font-size:1.15rem;margin:0 0 12px;color:#1a2233}
.finds-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.find{display:grid;grid-template-rows:auto 1fr;background:#fff;border:1px solid var(--k-line);border-radius:14px;overflow:hidden;text-decoration:none;color:inherit;transition:box-shadow .15s}
.find:hover{box-shadow:0 10px 24px rgba(16,24,39,.12)}.find img{width:100%;aspect-ratio:1;object-fit:cover;background:#eef0f3}
.find div{padding:10px 12px;display:grid;gap:4px}.find strong{font-size:.9rem;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.find span{color:var(--k-orange);font-weight:800}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:18px}
.card{background:#fff;border:1px solid var(--k-line);border-radius:16px;padding:20px;display:grid;gap:8px;align-content:start;box-shadow:0 6px 18px rgba(16,24,39,.05)}
.card h2{margin:0;font-size:1.1rem}.card p{margin:0;color:#4b5563;white-space:normal;font-size:.94rem}
.card-ic{width:46px;height:46px;border-radius:12px;background:#fff1e6;color:var(--k-orange);display:grid;place-items:center}
.card-actions{display:grid;gap:8px;margin-top:8px}.card .btn{padding:12px 14px;font-size:.92rem}
@media(max-width:600px){.btn{width:100%}.track-row{display:grid}}
@media(prefers-reduced-motion:reduce){.btn,.find{transition:none}}
`;

export const TRACK_JS = `
(function(){
  var f=document.getElementById("trackForm"); if(!f) return;
  var input=document.getElementById("trackCode"), msg=document.getElementById("trackMsg"), res=document.getElementById("trackResult"), btn=f.querySelector("button");
  var base=f.dataset.url;
  function slug(v){return String(v).normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,90)||"produto";}
  function say(t,err){msg.textContent=t||"";msg.className="msg"+(err?" err":"");}
  f.addEventListener("submit",function(e){
    e.preventDefault(); res.hidden=true; var code=(input.value||"").trim().replace(/\\s+/g,"");
    if(!code){say("Informe o código de rastreamento para continuar.",true);input.focus();return;}
    if(!/^[A-Za-z0-9._-]{4,60}$/.test(code)){say("Código inválido. Use apenas letras e números, sem espaços ou símbolos.",true);input.focus();return;}
    var url=base+"?codigo="+encodeURIComponent(code);
    btn.disabled=true; say("Consultando o sistema de rastreamento...");
    try{ if(window.gtag) gtag("event","tracking_open",{code:"filled"}); }catch(_){}
    var w=null; try{ w=window.open(url,"_blank","noopener"); }catch(_){}
    setTimeout(function(){
      btn.disabled=false; say("");
      res.hidden=false;
      res.innerHTML='<h2>Rastreamento aberto</h2><p>Código <span class="code"></span></p><p>As atualizações e movimentações da entrega aparecem no portal oficial de rastreamento, em uma nova aba. Se ela não abriu, <a target="_blank" rel="noopener"></a>.</p><p>Ainda sem movimentações? É normal nos primeiros dias: a transportadora só registra o pedido após a postagem.</p>';
      res.querySelector(".code").textContent=code; var a=res.querySelector("a"); a.href=url; a.textContent="clique aqui para abrir o portal";
    },700);
  });
  fetch("/api/catalog").then(function(r){return r.ok?r.json():null;}).then(function(c){
    if(!c||!Array.isArray(c.products)) return;
    var list=c.products.filter(function(p){return p&&p.active!==false&&p.visible!==false&&p.image&&p.title;});
    var drafts=(c.settings&&c.settings.drafts)||{}, arch=(c.settings&&c.settings.archived)||{};
    list=list.filter(function(p){return !drafts[p.id]&&!arch[p.id];});
    if(!list.length) return;
    var pick=[]; while(pick.length<3&&list.length){pick.push(list.splice(Math.floor(Math.random()*list.length),1)[0]);}
    var g=document.getElementById("findsGrid"); g.textContent="";
    pick.forEach(function(p){
      var a=document.createElement("a"); a.className="find"; a.href="/produto/"+encodeURIComponent(p.slug||slug(p.title));
      var im=document.createElement("img"); im.loading="lazy"; im.alt=p.title; im.src=p.image;
      var d=document.createElement("div"), s=document.createElement("strong"), pr=document.createElement("span");
      s.textContent=p.title; if(Number(p.price)>0) pr.textContent=Number(p.price).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
      d.appendChild(s); d.appendChild(pr); a.appendChild(im); a.appendChild(d); g.appendChild(a);
    });
    document.getElementById("finds").hidden=false;
  }).catch(function(){});
})();
`;
