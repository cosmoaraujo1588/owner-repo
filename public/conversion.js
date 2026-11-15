(function () {
  "use strict";
  // Campanha com contagem regressiva real + prova social sem dados inventados.
  const SEEN_KEY = "kairos:proof-seen";
  let campaignTimer = null;
  let proofTimer = null;
  let started = false;

  document.addEventListener("kairos:rendered", () => {
    if (started) return;
    started = true;
    try { renderCampaign(); } catch (e) { console.warn("campaign", e); }
    try { startProof(); } catch (e) { console.warn("proof", e); }
    document.addEventListener("kairos:cart-add", (event) => { try { showBump(event.detail.id); } catch (e) { console.warn("bump", e); } });
  });

  const api = () => window.KairosStore;
  const esc = (v) => api().escapeHtml(v);

  function storage(kind) { try { return window[kind]; } catch { return null; } }

  function campaignActive(c, now) {
    if (!c || c.enabled !== true) return false;
    const start = c.startAt ? Date.parse(c.startAt) : NaN;
    const end = Date.parse(c.endAt);
    if (Number.isNaN(end) || now >= end) return false;
    if (!Number.isNaN(start) && now < start) return false;
    return true;
  }

  function renderCampaign() {
    const c = api().settings.campaign;
    const old = document.getElementById("kxCampaign");
    if (old) old.remove();
    clearInterval(campaignTimer);
    if (!campaignActive(c, Date.now())) return;
    const bar = document.createElement("div");
    bar.id = "kxCampaign";
    bar.className = "kx-campaign";
    bar.setAttribute("role", "timer");
    const link = c.link || (c.productId ? "" : c.category ? "#produtos" : "#promocoes");
    bar.innerHTML = `<span><strong>${esc(c.title || "Campanha")}</strong>${c.text ? ` — ${esc(c.text)}` : ""}</span>
      <span class="kx-timer" aria-live="off"><span><b data-u="d">00</b><small>dias</small></span><span><b data-u="h">00</b><small>horas</small></span><span><b data-u="m">00</b><small>min</small></span><span><b data-u="s">00</b><small>seg</small></span></span>
      ${link ? `<a href="${esc(link)}">Ver ofertas</a>` : ""}`;
    const anchor = document.getElementById("promoBar");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
    const end = Date.parse(c.endAt);
    const tick = () => {
      const left = end - Date.now();
      if (left <= 0) { bar.remove(); clearInterval(campaignTimer); return; }
      const parts = { d: Math.floor(left / 86400000), h: Math.floor(left / 3600000) % 24, m: Math.floor(left / 60000) % 60, s: Math.floor(left / 1000) % 60 };
      Object.keys(parts).forEach((k) => { const n = bar.querySelector(`[data-u="${k}"]`); if (n) n.textContent = String(parts[k]).padStart(2, "0"); });
    };
    tick();
    campaignTimer = setInterval(tick, 1000);
  }

  // Prova social: não existem pedidos reais no banco, então só destacamos
  // atributos reais do catálogo (mais vendido / oferta relâmpago), sem citar compradores.
  function startProof() {
    const cfg = Object.assign({ enabled: true, firstDelay: 8, interval: 25, duration: 6, maxPerVisit: 5 }, api().settings.socialProof || {});
    if (cfg.enabled === false) return;
    const ss = storage("sessionStorage");
    const ls = storage("localStorage");
    try { if (ss && ss.getItem("kairos:proof-off")) return; } catch {}
    let seen = [];
    try { seen = JSON.parse(ls?.getItem(SEEN_KEY) || "[]"); } catch {}
    const candidates = api().products
      .filter((p) => api().isVisible(p) && p.image && (p.bestSeller || p.flashOffer))
      .sort(() => Math.random() - 0.5);
    let shown = 0;
    const next = () => {
      const pool = candidates.filter((p) => !seen.includes(String(p.id)));
      if (!pool.length || shown >= Number(cfg.maxPerVisit)) return;
      if (document.hidden) { proofTimer = setTimeout(next, 5000); return; }
      const p = pool[0];
      seen.push(String(p.id));
      try { ls?.setItem(SEEN_KEY, JSON.stringify(seen.slice(-60))); } catch {}
      shown += 1;
      show(p, Number(cfg.duration) * 1000, () => { proofTimer = setTimeout(next, Number(cfg.interval) * 1000); });
    };
    proofTimer = setTimeout(next, Number(cfg.firstDelay) * 1000);
  }

  function show(p, duration, done) {
    const slug = encodeURIComponent(p.slug || p.id);
    const label = p.flashOffer ? "Oferta relâmpago" : "Mais vendido";
    const msg = p.flashOffer ? "Aproveite enquanto a oferta está ativa" : "Um dos favoritos dos clientes da Kairos";
    const el = document.createElement("a");
    el.className = "kx-proof";
    el.href = `/produto/${slug}`;
    el.innerHTML = `<img src="${esc(p.image)}" alt="" width="64" height="64" loading="lazy"><div><b>${label}</b><span>${esc(p.title)}</span><span style="font-weight:400;font-size:.8rem;color:#555">${msg}</span></div><button type="button" aria-label="Fechar">×</button>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    let closed = false;
    const hide = () => { if (closed) return; closed = true; el.classList.remove("show"); setTimeout(() => { el.remove(); done(); }, 500); };
    el.querySelector("button").addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      try { sessionStorage.setItem("kairos:proof-off", "1"); } catch {}
      closed = true; el.classList.remove("show"); setTimeout(() => el.remove(), 500);
    });
    setTimeout(hide, duration);
  }

  // "Complete sua compra": mostra os complementos cadastrados no painel logo apos adicionar ao carrinho.
  function showBump(id) {
    const store = api();
    const main = store.products.find((p) => String(p.id) === String(id));
    const old = document.getElementById("kxBump");
    if (old) old.remove();
    if (!main || !window.KairosShort) return;
    const cfg = store.settings.orderBump || {};
    const list = window.KairosShort.suggest(store.products, [main], store.cart, cfg);
    if (!list.length) return;
    const el = document.createElement("aside");
    el.id = "kxBump";
    el.className = "kx-bump";
    el.setAttribute("aria-label", cfg.title || "Complete sua compra");
    el.innerHTML = `<div class="kxb-head"><b>${esc(cfg.title || "Complete sua compra")}</b><button type="button" data-kxb-close aria-label="Fechar">×</button></div>
      <div class="kxb-list">${list.map((p) => `<div class="kxb-item"><img src="${esc(p.image)}" alt="" loading="lazy"><div><span>${esc(p.title)}</span><strong>${esc(store.formatCurrency(p.price))}</strong></div><button type="button" data-kxb-add="${esc(p.id)}">Adicionar</button></div>`).join("")}</div>
      <a class="kxb-cart" href="/carrinho">Ver sacolinha</a>`;
    document.body.appendChild(el);
    el.addEventListener("click", (event) => {
      if (event.target.closest("[data-kxb-close]")) { el.remove(); return; }
      const add = event.target.closest("[data-kxb-add]");
      if (add) { store.addToCart(add.dataset.kxbAdd); add.textContent = "Adicionado ✓"; add.disabled = true; }
    });
  }
})();
