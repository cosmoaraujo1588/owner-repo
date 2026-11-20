(function () {
  "use strict";

  const CART_KEY = "kairos:cart";
  const FALLBACK_IMAGE = "/images/placeholder.svg";
  const list = document.getElementById("cartList");
  const clearButton = document.getElementById("clearCart");
  const bump = document.getElementById("cartBump");
  const summary = document.getElementById("cartSummary");
  let products = [];
  let settings = {};
  let cart = readCart();

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      const response = await fetch(`/api/catalog?t=${Date.now()}`, { cache: "no-store" });
      const catalog = response.ok ? await response.json() : { products: [] };
      products = Array.isArray(catalog.products) ? catalog.products : [];
      settings = catalog.settings || {};
    } catch {
      products = [];
    }
    clearButton.addEventListener("click", clearCart);
    list.addEventListener("click", handleClick);
    if (bump) bump.addEventListener("click", handleBump);
    render();
  }

  function render() {
    const items = cart.map((id) => products.find((product) => String(product.id) === String(id))).filter(Boolean);
    clearButton.hidden = items.length === 0;
    renderSummary(items);
    renderBump(items);
    if (!items.length) {
      list.innerHTML = `<div class="empty"><h2>Sua sacolinha esta vazia</h2><p>Salve produtos para comparar e comprar quando quiser.</p><a class="btn btn-primary" href="/#produtos">Ver produtos</a></div>`;
      return;
    }
    list.innerHTML = items.map((product) => `
      <article class="cart-item">
        <div class="ci-photo"><img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"></div>
        <div><span class="ci-cat">${escapeHtml(product.category || "Produto")}</span><h2>${escapeHtml(product.title)}</h2><strong>${currency(product.price)}</strong><p>ou 3x de ${currency(Number(product.price || 0) / 3)} sem juros</p><p>Frete grátis para todo o Brasil</p></div>
        <div class="cart-actions"><button class="btn btn-primary" type="button" data-buy="${escapeHtml(product.id)}">Comprar agora</button><button class="remove" type="button" data-share="${escapeHtml(product.id)}">Compartilhar</button><button class="remove" type="button" data-remove="${escapeHtml(product.id)}">Remover</button></div>
      </article>
    `).join("");
  }

  function visible(product) {
    return product && product.visible !== false && product.active !== false;
  }

  function suggestions(items) {
    return window.KairosShort ? window.KairosShort.suggest(products, items, cart, settings.orderBump || {}) : [];
  }

  function renderBump(items) {
    if (!bump) return;
    const list = items.length ? suggestions(items) : [];
    if (!list.length) { bump.hidden = true; bump.innerHTML = ""; return; }
    bump.hidden = false;
    bump.innerHTML = `<h2>${escapeHtml((settings.orderBump || {}).title || "Complete sua compra")}</h2><div class="bump-grid">${list.map((product) => `
      <div class="bump-item">
        <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
        <div><h3>${escapeHtml(product.title)}</h3><strong>${currency(product.price)}</strong></div>
        <button class="btn btn-primary" type="button" data-bump-add="${escapeHtml(product.id)}">Adicionar ao carrinho</button>
      </div>`).join("")}</div>`;
  }

  function renderSummary(items) {
    if (!summary) return;
    if (!items.length) { summary.hidden = true; return; }
    const total = items.reduce((sum, p) => sum + Number(p.price || 0), 0);
    summary.hidden = false;
    summary.innerHTML = `<span>${items.length} ${items.length === 1 ? "item" : "itens"} na sacolinha</span><span>Soma dos itens: ${currency(total)} · cada item é finalizado em seu checkout</span>`;
  }

  function handleBump(event) {
    const button = event.target.closest("[data-bump-add]");
    if (!button) return;
    const id = button.dataset.bumpAdd;
    if (!cart.map(String).includes(String(id))) cart.push(id);
    save();
    render();
    const product = products.find((p) => String(p.id) === String(id));
    if (typeof window.gtag === "function" && product) window.gtag("event", "add_to_cart", { product_id: product.id, product_name: product.title, source: "order_bump" });
  }

  function handleClick(event) {
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      cart = cart.filter((id) => String(id) !== String(remove.dataset.remove));
      save();
      render();
      return;
    }
    const share = event.target.closest("[data-share]");
    if (share) { shareItem(share.dataset.share); return; }
    const buy = event.target.closest("[data-buy]");
    if (!buy) return;
    const product = products.find((item) => String(item.id) === String(buy.dataset.buy));
    if (!product?.checkoutUrl) return alert("Checkout ainda nao configurado para este produto.");
    if (typeof window.gtag === "function") window.gtag("event", "begin_checkout", { product_id: product.id, product_name: product.title, price: Number(product.price || 0), source: "cart" });
    window.open(product.checkoutUrl, "_blank", "noopener");
  }

  function publicUrl(product) {
    const origin = /\.vercel\.app$/i.test(location.hostname) || /localhost|127\.0\.0\.1/.test(location.hostname) ? "https://www.kairosshopping.com.br" : location.origin;
    if (window.KairosShort) {
      const code = window.KairosShort.buildCodes(products.filter(visible).map((p) => ({ id: p.id, title: p.title })), settings.shortLinks || {}).byId[product.id];
      if (code) return `${origin}/p/${code}`;
    }
    return `${origin}/produto/${encodeURIComponent(product.slug || product.id)}`;
  }

  async function shareItem(id) {
    const product = products.find((p) => String(p.id) === String(id));
    if (!product) return;
    const url = publicUrl(product);
    const text = `${product.title} - Confira esse produto na Kairos Shopping!`;
    if (navigator.share) {
      try { await navigator.share({ title: product.title, text, url }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch {}
    const note = document.createElement("div");
    note.className = "toast";
    note.innerHTML = copied ? "Link copiado! " : "";
    const wa = document.createElement("a");
    wa.href = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    wa.target = "_blank"; wa.rel = "noopener"; wa.textContent = "Enviar no WhatsApp";
    wa.style.cssText = "color:#ffb066;text-decoration:underline";
    note.appendChild(wa);
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 5000);
  }

  function clearCart() {
    cart = [];
    save();
    render();
  }

  function readCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
    catch { return []; }
  }

  function save() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function currency(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
}());
