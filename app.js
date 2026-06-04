(function () {
  "use strict";

  const FALLBACK_IMAGE = "./images/placeholder.svg";
  const FAVORITES_KEY = "kairos:favorites";
  const SESSION_KEY = "kairos:session";
  const DEFAULT_SETTINGS = window.KAIROS_DEFAULT_SETTINGS || {};
  const SEED_PRODUCTS = Array.isArray(window.KAIROS_SEED_PRODUCTS) ? window.KAIROS_SEED_PRODUCTS : [];

  const state = {
  products: [],
  settings: normalizeSettings(DEFAULT_SETTINGS),
  banners: [],
  subcategories: [],
  pages: [],
  category: "Todos",
  subcategory: "Todas",
  search: "",
  sort: "relevance",
  favorites: readJson(FAVORITES_KEY, []),
  sessionId: getSessionId(),
  supabaseConfig: null
};

  const els = {
    promoBar: document.getElementById("promoBar"),
    categoryRail: document.getElementById("categoryRail"),
    bestSellerGrid: document.getElementById("bestSellerGrid"),
    flashGrid: document.getElementById("flashGrid"),
    catalogGrid: document.getElementById("catalogGrid"),
    videoGrid: document.getElementById("videoGrid"),
    emptyProducts: document.getElementById("emptyProducts"),
    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("searchInput"),
    sortSelect: document.getElementById("sortSelect"),
    productModal: document.getElementById("productModal"),
    reviewGrid: document.getElementById("reviewGrid"),
    faqList: document.getElementById("faqList"),
    trackingForm: document.getElementById("trackingForm"),
    trackingCode: document.getElementById("trackingCode"),
    trackingPortal: document.getElementById("trackingPortal"),
    leadForm: document.getElementById("leadForm"),
    assistantWidget: document.getElementById("assistantWidget"),
    activityPopup: document.getElementById("activityPopup"),
    socialLinks: document.getElementById("socialLinks"),
    footerWhatsapp: document.getElementById("footerWhatsapp")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    await loadCatalog();
    renderAll();
    trackEvent("page_view", { page: location.pathname || "/" });
    startPresence();
    startActivityPopup();
    startRealtimeRefresh();
  }

  async function loadCatalog() {
    try {
      const response = await fetch(`/api/catalog?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Catalog API unavailable");
      const catalog = await response.json();
      state.products = sanitizeProducts(catalog.products || []);
      state.settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...(catalog.settings || {}) });
    } catch {
      const localProducts = readJson("kairos:local-products", null);
      const localSettings = readJson("kairos:local-settings", null);
      state.products = sanitizeProducts(localProducts || SEED_PRODUCTS);
      state.settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...(localSettings || {}) });
    }
state.banners = Array.isArray(catalog.banners) ? catalog.banners : [];
state.subcategories = Array.isArray(catalog.subcategories) ? catalog.subcategories : [];
state.pages = Array.isArray(catalog.pages) ? catalog.pages : [];
    try {
      const configResponse = await fetch("/api/config", { cache: "no-store" });
      if (configResponse.ok) state.supabaseConfig = await configResponse.json();
    } catch { state.banners = [];
state.subcategories = [];
state.pages = [];
      state.supabaseConfig = null;
    }
  }

  function bindEvents() {
    els.searchForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.search = (els.searchInput?.value || "").trim();
      trackEvent("search", { query: state.search });
      renderProducts();
      document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
    });

    els.sortSelect?.addEventListener("change", () => {
      state.sort = els.sortSelect.value;
      renderProducts();
    });

    els.productModal?.addEventListener("click", (event) => {
      const target = event.target.closest("[data-modal-action]");
      if (!target) return;
      const action = target.dataset.modalAction;
      if (action === "close") closeModal();
      if (action === "buy") buyProduct(target.dataset.productId);
      if (action === "share") shareProduct(target.dataset.productId);
      if (action === "favorite") toggleFavorite(target.dataset.productId);
    });

    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const id = button.dataset.productId;
      if (button.dataset.action === "details") openProduct(id);
      if (button.dataset.action === "buy") buyProduct(id);
      if (button.dataset.action === "share") shareProduct(id);
      if (button.dataset.action === "favorite") toggleFavorite(id);
    });

    els.trackingForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const code = (els.trackingCode?.value || "").trim();
      const url = state.settings.trackingUrl || "https://app.kaiross.com.br/rastreio";
      trackEvent("tracking_open", { code: code ? "filled" : "empty" });
      window.open(code ? `${url}?codigo=${encodeURIComponent(code)}` : url, "_blank", "noopener");
    });

    els.leadForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(els.leadForm).entries());
      await sendLead(data);
      els.leadForm.reset();
      toast("Cadastro recebido. Obrigado por fazer parte da Kairos Shopping.");
    });
  }

  function renderAll() {
    applySettings();
    renderCategories();
    renderProducts();
    renderReviews();
    renderFaq();
    renderAssistant();
    renderSocial();
  }

  function applySettings() {
    const promo = state.settings.promoBar || {};
    if (els.promoBar) {
      els.promoBar.textContent = promo.enabled === false ? "" : (promo.text || "Frete gratis para todo o Brasil");
      els.promoBar.hidden = promo.enabled === false;
      els.promoBar.style.background = promo.backgroundColor || "#ff6b00";
      els.promoBar.style.color = promo.textColor || "#111827";
    }

    if (els.trackingPortal) els.trackingPortal.href = state.settings.trackingUrl;
    if (els.footerWhatsapp) els.footerWhatsapp.href = whatsappUrl();
  }

  function renderCategories() {
    const categories = ["Todos", ...unique(state.products.filter(isVisible).map((item) => item.category)).sort()];
    els.categoryRail.innerHTML = categories.map((category) => `
      <button class="category-chip ${state.category === category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">
        <span>${categoryIcon(category)}</span>${escapeHtml(category)}
      </button>
    `).join("");

    els.categoryRail.querySelectorAll("[data-category]").forEach((button) => {
      button.addEventListener("click", () => {
        state.category = button.dataset.category;
        trackEvent("category_filter", { category: state.category });
        renderCategories();
        renderProducts();
      });
    });
  }

  function renderProducts() {
    const visible = state.products.filter(isVisible);
    const best = visible.filter((item) => item.bestSeller).slice(0, 8);
    const flash = visible.filter((item) => item.flashOffer || item.oldPrice).slice(0, 8);
    const videos = visible.filter((item) => item.videoUrl).slice(0, 8);
    const catalog = sortProducts(filterProducts(visible));

    renderGrid(els.bestSellerGrid, best.length ? best : visible.slice(0, 8), "Nenhum produto em ranking agora.");
    renderGrid(els.flashGrid, flash, "");
    renderGrid(els.videoGrid, videos, "Videos serao exibidos aqui quando cadastrados no painel.");
    renderGrid(els.catalogGrid, catalog, "");

    if (els.flashGrid.closest(".section-block")) {
      els.flashGrid.closest(".section-block").hidden = flash.length === 0;
    }
    if (els.videoGrid.closest(".section-block")) {
      els.videoGrid.closest(".section-block").hidden = videos.length === 0;
    }
    els.emptyProducts.hidden = catalog.length > 0;
  }

  function renderGrid(container, products, emptyText) {
    if (!container) return;
    if (!products.length) {
      container.innerHTML = emptyText ? `<p class="empty-state">${escapeHtml(emptyText)}</p>` : "";
      return;
    }
    container.innerHTML = products.map(productCard).join("");
  }

  function productCard(product) {
    const discount = getDiscount(product);
    const favorite = state.favorites.includes(product.id);
    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}">
        <div class="product-image-wrap">
          <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
          <button class="icon-button favorite ${favorite ? "active" : ""}" type="button" data-action="favorite" data-product-id="${escapeHtml(product.id)}" aria-label="Favoritar produto">♡</button>
          <div class="badges">
            ${product.videoUrl ? "<span>Video disponivel</span>" : ""}
            ${discount ? `<span>${discount}% OFF</span>` : ""}
            ${product.tag ? `<span>${escapeHtml(product.tag)}</span>` : ""}
          </div>
        </div>
        <div class="product-info">
          <span class="product-category">${escapeHtml(product.category)}</span>
          <h3>${escapeHtml(product.title)}</h3>
          <p>${escapeHtml(product.shortDescription || product.description || "").slice(0, 120)}</p>
          <div class="rating">${stars(product.reviewRating)} <span>${formatNumber(product.reviewCount)} avaliacoes</span></div>
          <div class="price-row">
            <strong>${formatCurrency(product.price)}</strong>
            ${product.oldPrice ? `<del>${formatCurrency(product.oldPrice)}</del>` : ""}
          </div>
          <span class="free-shipping">Frete gratis</span>
          <div class="product-actions">
            <button type="button" class="secondary-button compact" data-action="details" data-product-id="${escapeHtml(product.id)}">Ver detalhes</button>
            <button type="button" class="primary-button compact" data-action="buy" data-product-id="${escapeHtml(product.id)}">Comprar agora</button>
          </div>
          <button type="button" class="share-link" data-action="share" data-product-id="${escapeHtml(product.id)}">Compartilhar produto</button>
        </div>
      </article>
    `;
  }

  function openProduct(id) {
    const product = findProduct(id);
    if (!product) return;
    trackEvent("product_view", { product_id: product.id, product_name: product.title, category: product.category });
    const favorite = state.favorites.includes(product.id);
    els.productModal.hidden = false;
    els.productModal.innerHTML = `
      <div class="modal-backdrop" data-modal-action="close"></div>
      <article class="modal-card">
        <button class="modal-close" type="button" data-modal-action="close">×</button>
        <div class="modal-media">
          <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
          ${product.videoUrl ? `<a class="video-link" href="${escapeHtml(product.videoUrl)}" target="_blank" rel="noopener">Assistir video do produto</a>` : ""}
        </div>
        <div class="modal-content">
          <span class="product-category">${escapeHtml(product.category)}${product.subcategory ? ` · ${escapeHtml(product.subcategory)}` : ""}</span>
          <h2>${escapeHtml(product.title)}</h2>
          <div class="rating">${stars(product.reviewRating)} <span>${formatNumber(product.reviewCount)} avaliacoes</span></div>
          <div class="price-row large"><strong>${formatCurrency(product.price)}</strong>${product.oldPrice ? `<del>${formatCurrency(product.oldPrice)}</del>` : ""}</div>
          <p class="modal-short">${escapeHtml(product.shortDescription || "")}</p>
          <div class="modal-actions">
            <button class="primary-button" type="button" data-modal-action="buy" data-product-id="${escapeHtml(product.id)}">Comprar agora</button>
            <button class="secondary-button" type="button" data-modal-action="share" data-product-id="${escapeHtml(product.id)}">Compartilhar</button>
            <button class="secondary-button" type="button" data-modal-action="favorite" data-product-id="${escapeHtml(product.id)}">${favorite ? "Remover favorito" : "Favoritar"}</button>
          </div>
          ${accordion("Descricao completa", product.description)}
          ${accordion("Entrega", "Logo apos o pagamento, o pedido sera processado em ate 2 dias uteis. O tempo total de envio geralmente varia entre 3 e 15 dias uteis, dependendo do fornecedor e da sua localidade.")}
          ${accordion("Trocas e devolucoes", state.settings.content?.returns || "Consulte a politica de trocas e devolucoes da loja.")}
        </div>
      </article>
    `;
  }

  function closeModal() {
    els.productModal.hidden = true;
    els.productModal.innerHTML = "";
  }

  async function buyProduct(id) {
    const product = findProduct(id);
    if (!product) return;
    await trackEvent("checkout_click", {
      product_id: product.id,
      product_name: product.title,
      category: product.category,
      checkout_url: product.checkoutUrl
    });
    if (!product.checkoutUrl) {
      toast("Checkout ainda nao configurado para este produto.");
      return;
    }
    window.open(product.checkoutUrl, "_blank", "noopener");
  }

  async function shareProduct(id) {
    const product = findProduct(id);
    if (!product) return;
    const url = `${location.origin}${location.pathname}?produto=${encodeURIComponent(product.id)}`;
    await trackEvent("share_product", { product_id: product.id, product_name: product.title });
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, text: product.shortDescription, url });
        return;
      } catch {
        // The user may cancel native sharing.
      }
    }
    await navigator.clipboard?.writeText(url);
    toast("Link do produto copiado.");
  }

  function toggleFavorite(id) {
    const product = findProduct(id);
    if (!product) return;
    const exists = state.favorites.includes(id);
    state.favorites = exists ? state.favorites.filter((item) => item !== id) : [...state.favorites, id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
    trackEvent(exists ? "favorite_remove" : "favorite_add", { product_id: id, product_name: product.title });
    renderProducts();
  }

  function renderReviews() {
    const reviews = normalizeReviews(state.settings.reviews);
    els.reviewGrid.innerHTML = reviews.map((review) => `
      <article class="review-card">
        <div>${stars(review.rating)} <strong>${escapeHtml(review.name)}</strong></div>
        <p>${escapeHtml(review.text)}</p>
        <span>${escapeHtml(review.product || "Compra Kairos")}${review.city ? ` · ${escapeHtml(review.city)}` : ""}</span>
      </article>
    `).join("");
  }

  function renderFaq() {
    const faq = [
      ["Qual o prazo de entrega?", "Logo apos a confirmacao do pagamento, o pedido e processado em ate 2 dias uteis. O envio geralmente varia entre 3 e 15 dias uteis."],
      ["Como recebo o codigo de rastreio?", "As informacoes de rastreamento ficam disponiveis conforme o pedido avanca no processo logistico."],
      ["A compra e segura?", "A compra e finalizada em checkout externo oficial do produto, com os metodos de pagamento disponibilizados pela plataforma parceira."],
      ["Como funciona troca ou devolucao?", state.settings.content?.returns || "As regras ficam disponiveis na pagina de trocas e devolucoes."]
    ];
    els.faqList.innerHTML = faq.map(([question, answer]) => accordion(question, answer)).join("");
  }

  function renderAssistant() {
    const assistant = state.settings.assistant || {};
    els.assistantWidget.innerHTML = `
      <button class="assistant-toggle" type="button" aria-label="Abrir assistente virtual">?</button>
      <div class="assistant-panel" hidden>
        <strong>Assistente Virtual Kairos</strong>
        <p>${escapeHtml(assistant.greeting || "Ola! Sou a Assistente Virtual da Kairos Shopping. Como posso ajudar?")}</p>
        <div class="assistant-buttons">
          <button data-answer="delivery">Prazo de entrega</button>
          <button data-answer="payment">Formas de pagamento</button>
          <button data-answer="returns">Trocas</button>
          <button data-answer="tracking">Rastrear pedido</button>
          <button data-answer="support">Falar com atendimento</button>
        </div>
        <p class="assistant-answer"></p>
      </div>
    `;
    const toggle = els.assistantWidget.querySelector(".assistant-toggle");
    const panel = els.assistantWidget.querySelector(".assistant-panel");
    const answer = els.assistantWidget.querySelector(".assistant-answer");
    toggle.addEventListener("click", () => panel.hidden = !panel.hidden);
    panel.querySelectorAll("[data-answer]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.answer;
        if (key === "support") {
          window.open(whatsappUrl(), "_blank", "noopener");
          trackEvent("whatsapp_click", { source: "assistant" });
          return;
        }
        answer.textContent = assistant[key] || "Nossa equipe pode ajudar voce pelo WhatsApp.";
      });
    });
  }

  function renderSocial() {
    const social = state.settings.social || {};
    const links = [
      ["Instagram", social.instagram],
      ["Facebook", social.facebook],
      ["TikTok", social.tiktok],
      ["YouTube", social.youtube],
      ["WhatsApp", social.whatsapp || whatsappUrl()]
    ].filter(([, url]) => url);
    els.socialLinks.innerHTML = links.map(([name, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(name)}</a>`).join("");
  }

  function startActivityPopup() {
    const config = state.settings.purchasePopup || {};
    if (config.enabled === false) return;
    const delay = Math.max(3, Number(config.delaySeconds || 8)) * 1000;
    const interval = Math.max(20, Number(config.intervalSeconds || 36)) * 1000;
    setTimeout(showActivityPopup, delay);
    setInterval(showActivityPopup, interval);
  }

  function showActivityPopup() {
    const products = state.products.filter(isVisible);
    if (!products.length || !els.activityPopup) return;
    const product = products[Math.floor(Math.random() * products.length)];
    els.activityPopup.hidden = false;
    els.activityPopup.innerHTML = `
      <button type="button" aria-label="Fechar">×</button>
      <strong>Produto em destaque</strong>
      <span>${escapeHtml(product.title)}</span>
      <a href="#produtos" data-action="details" data-product-id="${escapeHtml(product.id)}">Ver</a>
    `;
    els.activityPopup.querySelector("button").onclick = () => els.activityPopup.hidden = true;
    setTimeout(() => { if (els.activityPopup) els.activityPopup.hidden = true; }, Math.max(4, Number(state.settings.purchasePopup?.visibleSeconds || 6)) * 1000);
  }

  function startRealtimeRefresh() {
    setInterval(async () => {
      await loadCatalog();
      renderAll();
    }, 45000);
  }

  function startPresence() {
    const tick = () => trackEvent("presence", { page: location.pathname, product_id: currentProductFromUrl(), session_id: state.sessionId });
    tick();
    setInterval(tick, 30000);
  }

  async function sendLead(data) {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, source: "home", session_id: state.sessionId })
    }).catch(() => null);
    await trackEvent("lead", { source: "whatsapp_group" });
  }

  async function trackEvent(type, payload = {}) {
    const body = {
      type,
      payload,
      session_id: state.sessionId,
      page: location.pathname,
      referrer: document.referrer || "",
      device: getDevice(),
      created_at: new Date().toISOString()
    };
    try {
      await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true
      });
    } catch {
      const localEvents = readJson("kairos:local-events", []);
      localEvents.push(body);
      localStorage.setItem("kairos:local-events", JSON.stringify(localEvents.slice(-500)));
    }
  }

  function filterProducts(products) {
    const term = state.search.toLowerCase();
    return products.filter((product) => {
      const matchCategory = state.category === "Todos" || product.category === state.category;
      const searchText = `${product.title} ${product.category} ${product.subcategory} ${product.description}`.toLowerCase();
      return matchCategory && (!term || searchText.includes(term));
    });
  }

  function sortProducts(products) {
    const sorted = [...products];
    if (state.sort === "price-low") sorted.sort((a, b) => a.price - b.price);
    if (state.sort === "price-high") sorted.sort((a, b) => b.price - a.price);
    if (state.sort === "rating") sorted.sort((a, b) => (b.reviewRating || 0) - (a.reviewRating || 0));
    if (state.sort === "relevance") sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || (a.order || 0) - (b.order || 0));
    return sorted;
  }

  function sanitizeProducts(products) {
    return products.map((product, index) => ({
      ...product,
      id: String(product.id || `produto-${index + 1}`),
      title: String(product.title || product.name || `Produto ${index + 1}`),
      category: String(product.category || "Ofertas"),
      subcategory: String(product.subcategory || ""),
      price: Number(product.price || 0),
      oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
      image: safeImage(product.image || product.imageUrl),
      gallery: Array.isArray(product.gallery) ? product.gallery : [],
      checkoutUrl: String(product.checkoutUrl || ""),
      reviewRating: Number(product.reviewRating || product.rating || 4.8),
      reviewCount: Number(product.reviewCount || product.reviewsCount || 0),
      visible: product.visible !== false && product.active !== false,
      featured: product.featured !== false,
      bestSeller: Boolean(product.bestSeller),
      flashOffer: Boolean(product.flashOffer) || Boolean(product.oldPrice),
      order: Number(product.order || product.position || index),
      shortDescription: String(product.shortDescription || product.description || "").slice(0, 220),
      description: String(product.description || product.shortDescription || "")
    }));
  }

  function normalizeSettings(settings) {
    return {
      storeName: settings.storeName || "Kairos Shopping",
      storeEmail: settings.storeEmail || "kairossshopping@gmail.com",
      logoUrl: settings.logoUrl || "./assets/logo-kairos-oficial.png",
      bannerUrl: settings.bannerUrl || "./assets/banner-principal-kairos.jpg",
      trackingUrl: settings.trackingUrl || "https://app.kaiross.com.br/rastreio",
      promoBar: settings.promoBar || { enabled: true, text: "Frete gratis para todo o Brasil", backgroundColor: "#ff6b00", textColor: "#111827" },
      assistant: settings.assistant || {},
      purchasePopup: settings.purchasePopup || { enabled: true, delaySeconds: 8, intervalSeconds: 36, visibleSeconds: 6 },
      social: settings.social || {},
      content: settings.content || {},
      reviews: settings.reviews || defaultReviews()
    };
  }

  function normalizeReviews(value) {
    const reviews = Array.isArray(value) ? value : [];
    return reviews.filter((item) => item.featured !== false).slice(0, 6);
  }

  function defaultReviews() {
    return [
      { name: "Ana Clara", product: "Compra online", city: "SP", rating: 5, text: "Loja organizada e facil de comprar pelo celular.", featured: true },
      { name: "Marcos Silva", product: "Atendimento", city: "MG", rating: 5, text: "Encontrei o produto rapido e o checkout abriu certinho.", featured: true },
      { name: "Juliana Rocha", product: "Rastreamento", city: "RJ", rating: 4.5, text: "Gostei das informacoes de entrega e rastreio.", featured: true }
    ];
  }

  function safeImage(value) {
    const src = String(value || "");
    if (!src || src.startsWith("data:") || /\/images\/products\//.test(src)) return FALLBACK_IMAGE;
    return src;
  }

  function findProduct(id) {
    return state.products.find((product) => product.id === id);
  }

  function isVisible(product) {
    return product.visible !== false && product.active !== false;
  }

  function getDiscount(product) {
    if (!product.oldPrice || product.oldPrice <= product.price) return 0;
    return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  }

  function accordion(title, text) {
    return `<details class="accordion-item"><summary>${escapeHtml(title)}</summary><p>${escapeHtml(text || "")}</p></details>`;
  }

  function stars(value) {
    const rating = Math.round(Number(value || 5) * 2) / 2;
    return `<span class="stars" aria-label="${rating} de 5">★★★★★</span>`;
  }

  function whatsappUrl(product) {
    const phone = String(state.settings.social?.whatsapp || "").replace(/\D/g, "");
    const text = product
      ? `Ola, tenho interesse no produto: ${product.title} - ${location.origin}${location.pathname}?produto=${product.id}`
      : state.settings.whatsappMessage || "Ola, vim pelo site da Kairos Shopping e gostaria de atendimento.";
    return `https://wa.me/${phone || ""}?text=${encodeURIComponent(text)}`;
  }

  function categoryIcon(category) {
    const text = String(category).toLowerCase();
    if (text.includes("eletr")) return "⌁";
    if (text.includes("casa")) return "⌂";
    if (text.includes("beleza")) return "✦";
    if (text.includes("moda")) return "◈";
    if (text.includes("infantil")) return "★";
    if (text.includes("auto")) return "◎";
    return "◆";
  }

  function currentProductFromUrl() {
    return new URLSearchParams(location.search).get("produto") || "";
  }

  function getDevice() {
    const width = window.innerWidth;
    if (width < 640) return "mobile";
    if (width < 1024) return "tablet";
    return "desktop";
  }

  function getSessionId() {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  }

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("pt-BR");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}());
