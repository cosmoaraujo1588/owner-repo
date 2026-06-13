(function () {
  "use strict";

  const CART_KEY = "kairos:cart";
  const FALLBACK_IMAGE = "/images/placeholder.svg";
  const list = document.getElementById("cartList");
  const clearButton = document.getElementById("clearCart");
  let products = [];
  let cart = readCart();

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      const response = await fetch(`/api/catalog?t=${Date.now()}`, { cache: "no-store" });
      const catalog = response.ok ? await response.json() : { products: [] };
      products = Array.isArray(catalog.products) ? catalog.products : [];
    } catch {
      products = [];
    }
    clearButton.addEventListener("click", clearCart);
    list.addEventListener("click", handleClick);
    render();
  }

  function render() {
    const items = cart.map((id) => products.find((product) => String(product.id) === String(id))).filter(Boolean);
    clearButton.hidden = items.length === 0;
    if (!items.length) {
      list.innerHTML = `<div class="empty"><h2>Sua sacolinha esta vazia</h2><p>Salve produtos para comparar e comprar quando quiser.</p><a href="/#produtos">Ver produtos</a></div>`;
      return;
    }
    list.innerHTML = items.map((product) => `
      <article class="cart-item">
        <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
        <div><span>${escapeHtml(product.category || "Produto")}</span><h2>${escapeHtml(product.title)}</h2><strong>${currency(product.price)}</strong><p>ou 3x de ${currency(Number(product.price || 0) / 3)} sem juros</p><p>Frete gratis para todo o Brasil</p></div>
        <div class="cart-actions"><button class="buy" type="button" data-buy="${escapeHtml(product.id)}">Comprar</button><button class="remove" type="button" data-remove="${escapeHtml(product.id)}">Remover</button></div>
      </article>
    `).join("");
  }

  function handleClick(event) {
    const remove = event.target.closest("[data-remove]");
    if (remove) {
      cart = cart.filter((id) => String(id) !== String(remove.dataset.remove));
      save();
      render();
      return;
    }
    const buy = event.target.closest("[data-buy]");
    if (!buy) return;
    const product = products.find((item) => String(item.id) === String(buy.dataset.buy));
    if (!product?.checkoutUrl) return alert("Checkout ainda nao configurado para este produto.");
    if (typeof window.gtag === "function") window.gtag("event", "add_to_checkout", { product_id: product.id, product_name: product.title, price: Number(product.price || 0), source: "cart" });
    window.open(product.checkoutUrl, "_blank", "noopener");
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
