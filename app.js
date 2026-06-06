(function () {
  "use strict";

  const FALLBACK_IMAGE = "./images/placeholder.svg";
  const DEFAULT_HERO_BANNERS = [
    {
      id: "kairos-claro-1",
      title: "Kairos Shopping",
      desktopImage: "./assets/banner-kairos-claro-1.png",
      mobileImage: "./assets/banner-kairos-claro-1.png",
      link: "#produtos",
      active: true,
      order: 1
    },
    {
      id: "kairos-claro-2",
      title: "Kairos Shopping",
      desktopImage: "./assets/banner-kairos-claro-2.png",
      mobileImage: "./assets/banner-kairos-claro-2.png",
      link: "#produtos",
      active: true,
      order: 2
    }
  ];
  const FAVORITES_KEY = "kairos:favorites";
  const SESSION_KEY = "kairos:session";
  const SCARCITY_DEADLINE_KEY = "kairos:scarcity-deadline";
  const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/EOzxSL6u8QP6LPXmXO6Ym7?s=cl&p=a&mlu=0";
  const DEFAULT_SETTINGS = window.KAIROS_DEFAULT_SETTINGS || {};
  const SEED_PRODUCTS = Array.isArray(window.KAIROS_SEED_PRODUCTS) ? window.KAIROS_SEED_PRODUCTS : [];
  const DEFAULT_MOBILE_NAV_ITEMS = [
    { icon: "&#127968;", label: "Inicio", href: "#inicio" },
    { icon: "&#128717;&#65039;", label: "Produtos", href: "#produtos" },
    { icon: "&#128194;", label: "Categorias", href: "#categoryRail" },
    { icon: "&#9889;", label: "Ofertas", href: "#promocoes" },
    { icon: "&#128230;", label: "Rastreio", href: "#rastreio" }
  ];

  const state = {
    products: [],
    settings: normalizeSettings(DEFAULT_SETTINGS),
    categories: [],
    subcategories: [],
    category: "Todos",
    categoryKey: "todos",
    subcategory: "Todas",
    subcategoryKey: "todas",
    search: "",
    sort: "relevance",
    catalogPage: 1,
    loadedPages: 1,
    favorites: readJson(FAVORITES_KEY, []),
    sessionId: getSessionId(),
    supabaseConfig: null,
    publicStats: { onlineNow: 0, visitsTotal: 0 },
    bannerTimer: null,
    bannerIndex: 0,
    reviewTimer: null,
    countdownTimer: null,
    statsTimer: null
  };

  const els = {
    promoBar: document.getElementById("promoBar"),
    footerPromoBar: document.getElementById("footerPromoBar"),
    heroCarousel: document.getElementById("heroCarousel"),
    categoryRail: document.getElementById("categoryRail"),
    subcategoryRail: document.getElementById("subcategoryRail"),
    bestSellerGrid: document.getElementById("bestSellerGrid"),
    flashGrid: document.getElementById("flashGrid"),
    catalogGrid: document.getElementById("catalogGrid"),
    catalogPagination: document.getElementById("catalogPagination"),
    catalogCount: document.getElementById("catalogCount"),
    videoGrid: document.getElementById("videoGrid"),
    emptyProducts: document.getElementById("emptyProducts"),
    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("searchInput"),
    searchSuggestions: document.getElementById("searchSuggestions"),
    sortSelect: document.getElementById("sortSelect"),
    productModal: document.getElementById("productModal"),
    shareMenu: document.getElementById("shareMenu"),
    reviewGrid: document.getElementById("reviewGrid"),
    faqList: document.getElementById("faqList"),
    trackingForm: document.getElementById("trackingForm"),
    trackingCode: document.getElementById("trackingCode"),
    trackingPortal: document.getElementById("trackingPortal"),
    leadForm: document.getElementById("leadForm"),
    assistantWidget: document.getElementById("assistantWidget"),
    activityPopup: document.getElementById("activityPopup"),
    socialLinks: document.getElementById("socialLinks"),
    footerWhatsapp: document.getElementById("footerWhatsapp"),
    storeSignalRow: document.getElementById("storeSignalRow"),
    mobileBottomNav: document.getElementById("mobileBottomNav")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    await loadCatalog();
    await loadPublicStats();
    renderAll();
    openProductFromLocation();
    trackEvent("page_view", { page: location.pathname || "/" });
    startPresence();
    startActivityPopup();
    startPublicStatsRefresh();
    startRealtimeRefresh();
    window.addEventListener("popstate", openProductFromLocation);
  }

  async function loadCatalog() {
    try {
      const response = await fetch(`/api/catalog?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Catalog API unavailable");
      const catalog = await response.json();
      const apiProducts = sanitizeProducts(catalog.products || []);
const seedProducts = sanitizeProducts(SEED_PRODUCTS || []);

state.products = apiProducts.some((product) => product.visible !== false && product.active !== false)
  ? apiProducts
  : seedProducts;
      state.categories = normalizeCategories(catalog.categories || []);
      state.subcategories = normalizeSubcategories(catalog.subcategories || []);
      const settingsBanners = Array.isArray(catalog.settings?.banners) ? catalog.settings.banners : [];
      const apiReviews = Array.isArray(catalog.reviews) ? catalog.reviews : [];
      const settingsReviews = Array.isArray(catalog.settings?.reviews) ? catalog.settings.reviews : [];
      state.settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...(catalog.settings || {}), banners: settingsBanners, reviews: apiReviews.length ? apiReviews : settingsReviews });
    } catch {
      const localProducts = readJson("kairos:local-products", null);
      const localSettings = readJson("kairos:local-settings", null);
      state.products = sanitizeProducts(localProducts || SEED_PRODUCTS);
      state.categories = normalizeCategories([]);
      state.subcategories = normalizeSubcategories([]);
      state.settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...(localSettings || {}) });
    }

    try {
      const configResponse = await fetch("/api/config", { cache: "no-store" });
      if (configResponse.ok) state.supabaseConfig = await configResponse.json();
    } catch {
      state.supabaseConfig = null;
    }
  }

  async function loadPublicStats() {
    try {
      const response = await fetch(`/api/public-stats?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("stats unavailable");
      const data = await response.json();
      state.publicStats = {
        onlineNow: Number(data.onlineNow || 0),
        visitsTotal: Number(data.visitsTotal || 0)
      };
    } catch {
      state.publicStats = { onlineNow: 0, visitsTotal: 0 };
    }
  }

  function bindEvents() {
    els.searchForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.search = (els.searchInput?.value || "").trim();
      trackEvent("search", { query: state.search });
      if (state.search) trackPixel("Search", { search_string: state.search });
      resetCatalogPagination();
      hideSuggestions();
      renderProducts();
      document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth" });
    });

    els.searchInput?.addEventListener("input", () => {
      state.search = (els.searchInput.value || "").trim();
      resetCatalogPagination();
      renderSearchSuggestions();
      renderProducts();
    });

    els.searchInput?.addEventListener("focus", renderSearchSuggestions);

    els.sortSelect?.addEventListener("change", () => {
      state.sort = els.sortSelect.value;
      resetCatalogPagination();
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
      const groupLink = event.target.closest("[data-whatsapp-group]");
      if (groupLink) {
        trackEvent("whatsapp_group_click", { source: groupLink.dataset.whatsappGroup || "home" });
        return;
      }

      if (els.shareMenu && !event.target.closest(".share-menu") && !event.target.closest("[data-action='share']") && !event.target.closest("[data-modal-action='share']")) {
        hideShareMenu();
      }

      const suggestion = event.target.closest("[data-suggestion]");
      if (suggestion) {
        event.preventDefault();
        applySuggestion(suggestion.dataset.suggestion, suggestion.dataset.kind);
        return;
      }

      const shareButton = event.target.closest("[data-share-network]");
      if (shareButton) {
        event.preventDefault();
        handleShareNetwork(shareButton.dataset.shareNetwork, shareButton.dataset.productId);
        return;
      }

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
      try {
        await sendLead(data);
        trackPixel("Lead");
        els.leadForm.reset();
        toast("Cadastro recebido. Obrigado por fazer parte da Kairos Shopping.");
      } catch (error) {
        toast(error.message || "Nao foi possivel salvar seu cadastro agora.");
      }
    });
  }

  function renderAll() {
    applySettings();
    renderBanners();
    renderCategories();
    renderProducts();
    renderReviews();
    renderFaq();
    renderAssistant();
    renderSocial();
    renderConversionSignals();
    renderMobileBottomNav();
  }

  function applySettings() {
    const promo = state.settings.promoBar || {};
    const promoText = promoTextWithCountdown();
    setMarquee(els.promoBar, promo, promoText || "FRETE GRATIS PARA TODO O BRASIL");
    setMarquee(els.footerPromoBar, promo, promoText || "FRETE GRATIS PARA TODO O BRASIL");
    startScarcityCountdown();

    if (els.trackingPortal) els.trackingPortal.href = state.settings.trackingUrl;
    if (els.footerWhatsapp) els.footerWhatsapp.href = whatsappUrl();
  }

  function setMarquee(container, promo, fallbackText) {
    if (!container) return;
    const enabled = promo.enabled !== false;
    const text = promo.text || fallbackText;
    container.hidden = !enabled;
    container.style.background = promo.backgroundColor || "#ff6b00";
    container.style.color = promo.textColor || "#111827";
    container.style.setProperty("--marquee-speed", `${Math.max(8, Number(promo.speedSeconds || promo.speed || 22))}s`);
    container.innerHTML = `
      <div class="marquee-track">
        <span>&#128666; ${escapeHtml(text)}</span>
        <span>&#9889; ${escapeHtml(text)}</span>
        <span>&#128230; ${escapeHtml(text)}</span>
        <span>&#128666; ${escapeHtml(text)}</span>
      </div>
    `;
  }

  function promoTextWithCountdown() {
    const conversion = conversionConfig();
    const base = state.settings.promoBar?.text || "FRETE GRATIS PARA TODO O BRASIL";
    if (conversion.scarcityEnabled === false) return base;
    return `${conversion.scarcityText || "Ofertas limitadas terminam em"} ${formatCountdownRemaining()}`;
  }

  function startScarcityCountdown() {
    if (state.countdownTimer) clearInterval(state.countdownTimer);
    const conversion = conversionConfig();
    if (conversion.scarcityEnabled === false) return;
    ensureScarcityDeadline();
    state.countdownTimer = setInterval(() => {
      const promo = state.settings.promoBar || {};
      const text = promoTextWithCountdown();
      setMarquee(els.promoBar, promo, text);
      setMarquee(els.footerPromoBar, promo, text);
    }, 1000);
  }

  function ensureScarcityDeadline() {
    const conversion = conversionConfig();
    const minutes = Math.max(1, Math.min(240, Number(conversion.countdownMinutes || 15)));
    const current = Number(sessionStorage.getItem(SCARCITY_DEADLINE_KEY) || 0);
    if (!current || current <= Date.now()) {
      sessionStorage.setItem(SCARCITY_DEADLINE_KEY, String(Date.now() + minutes * 60 * 1000));
    }
  }

  function formatCountdownRemaining() {
    ensureScarcityDeadline();
    const deadline = Number(sessionStorage.getItem(SCARCITY_DEADLINE_KEY) || 0);
    const remaining = Math.max(0, deadline - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  function renderConversionSignals() {
    if (!els.storeSignalRow) return;
    const conversion = conversionConfig();
    const hasCounter = conversion.visitorCounterEnabled !== false;
    const hasProof = conversion.socialProofEnabled !== false;
    els.storeSignalRow.hidden = !hasCounter && !hasProof;
    if (els.storeSignalRow.hidden) return;
    const counterText = hasCounter ? visitorCounterText(conversion) : "";
    els.storeSignalRow.innerHTML = `
      ${hasCounter ? `<div><strong>${escapeHtml(counterText)}</strong><span>Movimento acompanhado em tempo real</span></div>` : ""}
      ${hasProof ? `
        <div><strong>Produtos em destaque</strong><span>Vitrine atualizada pelo painel</span></div>
        <div><strong>Frete gratis</strong><span>Envio para todo o Brasil</span></div>
        <div><strong>Compra segura</strong><span>Checkout externo oficial</span></div>
      ` : ""}
    `;
  }

  function visitorCounterText(conversion) {
    const type = conversion.visitorCounterType || "total";
    if (type === "online") {
      return `${formatNumber(state.publicStats.onlineNow || 0)} pessoas navegando agora`;
    }
    if (type === "custom") {
      return conversion.visitorCounterText || "Produtos com alto interesse dos clientes";
    }
    const total = Number(state.publicStats.visitsTotal || 0);
    return total > 0
      ? `${formatNumber(total)} visitas acumuladas na Kairos Shopping`
      : (conversion.visitorCounterText || "Produtos com alto interesse dos clientes");
  }

  function renderMobileBottomNav() {
    if (!els.mobileBottomNav) return;
    const conversion = conversionConfig();
    els.mobileBottomNav.hidden = conversion.mobileNavEnabled === false;
    if (els.mobileBottomNav.hidden) return;
    const items = normalizeMobileNavItems(conversion.mobileNavItems);
    els.mobileBottomNav.innerHTML = items.map((item) => {
      const href = item.href || "#inicio";
      const external = /^https?:\/\//i.test(href);
      return `
        <a href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ""}>
          <span aria-hidden="true">${item.icon || "&#128717;"}</span>
          <small>${escapeHtml(item.label || "Loja")}</small>
        </a>
      `;
    }).join("");
  }

  function renderBanners() {
    if (!els.heroCarousel) return;
    const banners = normalizeBanners();
    if (!banners.length) return;
    els.heroCarousel.innerHTML = banners.map((banner, index) => {
      const desktop = banner.desktopImage || banner.image || state.settings.bannerUrl;
      const mobile = banner.mobileImage || desktop;
      const desktopVideo = banner.videoUrl || banner.desktopVideoUrl || state.settings.bannerVideoUrl || "";
      const mobileVideo = banner.mobileVideoUrl || desktopVideo || state.settings.bannerMobileVideoUrl || "";
      const href = banner.link || banner.buttonLink || "#produtos";
      return `
        <a class="hero-slide ${index === state.bannerIndex ? "active" : ""}" href="${escapeHtml(href)}" ${href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>
          ${desktopVideo || mobileVideo ? bannerVideoMarkup(desktopVideo, mobileVideo, desktop, banner.title) : `
            <picture>
              <source media="(max-width: 640px)" srcset="${escapeHtml(mobile)}">
              <img src="${escapeHtml(desktop)}" alt="${escapeHtml(banner.title || "Banner Kairos Shopping")}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} onerror="this.onerror=null;this.src='./assets/banner-kairos-claro-1.png'">
            </picture>
          `}
        </a>
      `;
    }).join("");

    if (state.bannerTimer) clearInterval(state.bannerTimer);
    if (banners.length > 1) {
      state.bannerTimer = setInterval(() => {
        state.bannerIndex = (state.bannerIndex + 1) % banners.length;
        els.heroCarousel.querySelectorAll(".hero-slide").forEach((slide, index) => {
          slide.classList.toggle("active", index === state.bannerIndex);
        });
      }, 5000);
    }
  }

  function bannerVideoMarkup(desktopVideo, mobileVideo, poster, title) {
    return `
      <video class="hero-video" autoplay muted loop playsinline preload="metadata" poster="${escapeHtml(poster || "./assets/banner-kairos-claro-1.png")}" aria-label="${escapeHtml(title || "Banner Kairos Shopping")}">
        ${mobileVideo ? `<source media="(max-width: 640px)" src="${escapeHtml(mobileVideo)}">` : ""}
        <source src="${escapeHtml(desktopVideo || mobileVideo)}">
      </video>
    `;
  }

  function renderGrid(container, products, emptyText) {
    if (!container) return;
    if (!products.length) {
      container.innerHTML = emptyText ? `<p class="empty-state">${escapeHtml(emptyText)}</p>` : "";
      return;
    }
    container.innerHTML = products.map(productCard).join("");
  }

  function openProduct(id, options = {}) {
    const product = findProduct(id);
    if (!product) return;
    if (!options.keepUrl) {
      const url = productUrl(product);
      history.pushState({ productId: product.id }, "", url);
      applyProductSeo(product);
    }
    trackEvent("product_view", { product_id: product.id, product_name: product.title, category: product.category });
    trackPixel("ViewContent", { content_ids: [product.id], content_name: product.title, content_category: product.category, value: Number(product.price || 0), currency: "BRL" });
    const favorite = state.favorites.includes(product.id);
    const related = relatedProducts(product);
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
          ${related.length ? `
            <section class="related-products">
              <h3>Voce tambem pode gostar</h3>
              <div class="related-grid">
                ${related.map((item) => `
                  <button type="button" class="related-card" data-action="details" data-product-id="${escapeHtml(item.id)}">
                    <img src="${escapeHtml(item.image || FALLBACK_IMAGE)}" alt="${escapeHtml(item.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
                    <span>${escapeHtml(item.title)}</span>
                    <strong>${formatCurrency(item.price)}</strong>
                  </button>
                `).join("")}
              </div>
            </section>
          ` : ""}
        </div>
      </article>
    `;
  }

  function closeModal() {
    els.productModal.hidden = true;
    els.productModal.innerHTML = "";
    if (location.pathname.startsWith("/produto/")) {
      history.pushState({}, "", "/");
      applyProductSeo(null);
    }
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
    trackPixel("InitiateCheckout", { content_ids: [product.id], content_name: product.title, content_category: product.category, value: Number(product.price || 0), currency: "BRL" });
    window.open(product.checkoutUrl, "_blank", "noopener");
  }

  async function shareProduct(id) {
    const product = findProduct(id);
    if (!product) return;
    const url = productUrl(product);
    await trackEvent("share_product", { product_id: product.id, product_name: product.title });
    showShareMenu(product, url);
  }

  function showShareMenu(product, url) {
    if (!els.shareMenu) return;
    els.shareMenu.hidden = false;
    els.shareMenu.innerHTML = `
      <div class="share-menu-card">
        <button class="share-close" type="button" data-share-network="close" data-product-id="${escapeHtml(product.id)}">x</button>
        <div class="share-product">
          <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
          <div>
            <strong>${escapeHtml(product.title)}</strong>
            <span>${formatCurrency(product.price)}</span>
          </div>
        </div>
        <div class="share-options">
          ${["whatsapp", "facebook", "x", "telegram", "pinterest", "copy"].map((network) => `
            <button type="button" data-share-network="${network}" data-product-id="${escapeHtml(product.id)}">${shareLabel(network)}</button>
          `).join("")}
        </div>
        <input readonly value="${escapeHtml(url)}" aria-label="Link do produto">
      </div>
    `;
  }

  async function handleShareNetwork(network, id) {
    if (network === "close") {
      hideShareMenu();
      return;
    }
    const product = findProduct(id);
    if (!product) return;
    const url = productUrl(product);
    const text = `${product.title} - ${product.shortDescription || "Oferta Kairos Shopping"}`;
    const image = product.image || "";
    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      pinterest: `https://www.pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(image)}&description=${encodeURIComponent(text)}`
    };
    if (network === "copy") {
      await navigator.clipboard?.writeText(url);
      toast("Link do produto copiado.");
      hideShareMenu();
      return;
    }
    if (shareUrls[network]) window.open(shareUrls[network], "_blank", "noopener");
    hideShareMenu();
  }

  function hideShareMenu() {
    if (!els.shareMenu) return;
    els.shareMenu.hidden = true;
    els.shareMenu.innerHTML = "";
  }

  function shareLabel(network) {
    return { whatsapp: "WhatsApp", facebook: "Facebook", x: "X", telegram: "Telegram", pinterest: "Pinterest", copy: "Copiar link" }[network] || network;
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
    if (!els.reviewGrid) return;
    els.reviewGrid.innerHTML = reviews.map((review) => `
      <article class="review-card">
        <div>${stars(review.rating)} <strong>${escapeHtml(review.name)}</strong></div>
        <p>${escapeHtml(review.text)}</p>
        <span>${escapeHtml(review.product || "Compra Kairos")}${review.city ? ` - ${escapeHtml(review.city)}` : ""}${review.date ? ` - ${formatReviewDate(review.date)}` : ""}</span>
      </article>
    `).join("");
    if (state.reviewTimer) clearInterval(state.reviewTimer);
    state.reviewTimer = setInterval(() => {
      if (!els.reviewGrid || els.reviewGrid.scrollWidth <= els.reviewGrid.clientWidth) return;
      const next = els.reviewGrid.scrollLeft + Math.min(320, els.reviewGrid.clientWidth);
      const resetAt = els.reviewGrid.scrollWidth - els.reviewGrid.clientWidth - 8;
      els.reviewGrid.scrollTo({ left: next >= resetAt ? 0 : next, behavior: "smooth" });
    }, 5000);
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
    const products = state.products.filter(isVisible).slice(0, 20);
    if (!products.length || !els.activityPopup) return;
    const product = products[Math.floor(Math.random() * products.length)];
    const soldToday = soldCount(product);
    els.activityPopup.hidden = false;
    els.activityPopup.innerHTML = `
      <button type="button" class="activity-close" aria-label="Fechar">x</button>
      <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
      <div>
        <strong>${formatNumber(soldToday)} clientes compraram</strong>
        <span>${escapeHtml(shortTitle(product.title))}</span>
      </div>
      <button type="button" class="activity-link" data-action="details" data-product-id="${escapeHtml(product.id)}">Ver produto</button>
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

  function startPublicStatsRefresh() {
    if (state.statsTimer) clearInterval(state.statsTimer);
    state.statsTimer = setInterval(async () => {
      await loadPublicStats();
      renderConversionSignals();
    }, 30000);
  }

  function startPresence() {
    const tick = () => trackEvent("presence", { page: location.pathname, product_id: currentProductFromUrl(), session_id: state.sessionId });
    tick();
    setInterval(tick, 30000);
  }

  async function sendLead(data) {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, source: "home", session_id: state.sessionId })
    });
    if (!response.ok) throw new Error("Nao foi possivel salvar o cadastro agora.");
    await trackEvent("lead", { source: "whatsapp_group" });
  }

  async function trackEvent(type, payload = {}) {
    if (isAdminPath(location.pathname)) return;
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

  function isAdminPath(path) {
    const value = String(path || "").toLowerCase();
    return value.includes("/admin") || value.includes("/admin.html") || value.includes("/painel") || value.includes("/dashboard");
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
      slug: product.slug || slugify(product.title || product.name || `produto-${index + 1}`),
      keywords: Array.isArray(product.keywords) ? product.keywords : String(product.keywords || product.tags || "").split(",").map((item) => item.trim()).filter(Boolean),
      tag: String(product.tag || ""),
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
      siteUrl: settings.siteUrl || "",
      logoUrl: settings.logoUrl || "./assets/logo-kairos-oficial.png",
      bannerUrl: settings.bannerUrl || "./assets/banner-kairos-claro-1.png",
      bannerMobileUrl: settings.bannerMobileUrl || settings.bannerUrl || "./assets/banner-kairos-claro-1.png",
      bannerVideoUrl: settings.bannerVideoUrl || "",
      bannerMobileVideoUrl: settings.bannerMobileVideoUrl || "",
      banners: Array.isArray(settings.banners) ? settings.banners : [],
      trackingUrl: settings.trackingUrl || "https://app.kaiross.com.br/rastreio",
      promoBar: settings.promoBar || { enabled: true, text: "Frete gratis para todo o Brasil", backgroundColor: "#ff6b00", textColor: "#111827" },
      assistant: settings.assistant || {},
      purchasePopup: settings.purchasePopup || { enabled: true, delaySeconds: 8, intervalSeconds: 36, visibleSeconds: 6 },
      conversion: {
        ...defaultConversionConfig(),
        ...(settings.conversion || {}),
        mobileNavItems: normalizeMobileNavItems(settings.conversion?.mobileNavItems)
      },
      social: settings.social || {},
      content: settings.content || {},
      storefront: settings.storefront || {},
      reviews: Array.isArray(settings.reviews) ? settings.reviews : defaultReviews()
    };
  }

  function defaultConversionConfig() {
    return {
      scarcityEnabled: true,
      scarcityText: "Ofertas limitadas terminam em",
      countdownMinutes: 15,
      visitorCounterEnabled: true,
      visitorCounterType: "total",
      visitorCounterText: "Produtos com alto interesse dos clientes",
      mobileNavEnabled: true,
      socialProofEnabled: true,
      mobileNavItems: DEFAULT_MOBILE_NAV_ITEMS
    };
  }

  function conversionConfig() {
    return {
      ...defaultConversionConfig(),
      ...(state.settings.conversion || {}),
      mobileNavItems: normalizeMobileNavItems(state.settings.conversion?.mobileNavItems)
    };
  }

  function normalizeMobileNavItems(items) {
    const source = Array.isArray(items) && items.length ? items : DEFAULT_MOBILE_NAV_ITEMS;
    return source.slice(0, 5).map((item, index) => ({
      icon: String(item.icon || DEFAULT_MOBILE_NAV_ITEMS[index]?.icon || "&#128717;"),
      label: String(item.label || DEFAULT_MOBILE_NAV_ITEMS[index]?.label || "Loja"),
      href: String(item.href || DEFAULT_MOBILE_NAV_ITEMS[index]?.href || "#inicio")
    }));
  }

  function normalizeReviews(value) {
    const reviews = Array.isArray(value) ? value : [];
    return reviews
      .filter((item) => item.featured !== false)
      .sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
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
    if (!src || /^(data:|blob:|file:)/i.test(src) || /^[a-z]:\\/i.test(src)) return FALLBACK_IMAGE;
    return src;
  }

  function findProduct(id) {
    const value = String(id || "");
    return state.products.find((product) => product.id === value || product.slug === value || slugify(product.title) === value);
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

  function whatsappUrl(product) {
    const phone = String(state.settings.social?.whatsapp || "").replace(/\D/g, "");
    const text = product
      ? `Ola, tenho interesse no produto: ${product.title} - ${productUrl(product)}`
      : state.settings.whatsappMessage || "Ola, vim pelo site da Kairos Shopping e gostaria de atendimento.";
    return `https://wa.me/${phone || ""}?text=${encodeURIComponent(text)}`;
  }

  function currentProductFromUrl() {
    const pathMatch = location.pathname.match(/^\/produto\/([^/?#]+)/);
    if (pathMatch) return decodeURIComponent(pathMatch[1]);
    return new URLSearchParams(location.search).get("produto") || "";
  }

  function productUrl(product) {
    const base = (state.settings.siteUrl || location.origin).replace(/\/+$/, "");
    return `${base}/produto/${encodeURIComponent(product.slug || slugify(product.title || product.id))}`;
  }

  function slugify(value) {
    return normalizeTerm(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "produto";
  }

  function categoryKey(value) {
    return value === "Todos" ? "todos" : slugify(value || "ofertas");
  }

  function normalizeTerm(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function searchIndex(product) {
    return normalizeTerm([
      product.title,
      product.category,
      product.subcategory,
      product.description,
      product.shortDescription,
      product.tag,
      ...(product.keywords || [])
    ].join(" "));
  }

  function renderSearchSuggestions() {
    if (!els.searchSuggestions) return;
    const term = normalizeTerm(els.searchInput?.value || "");
    if (term.length < 2) {
      hideSuggestions();
      return;
    }
    const products = state.products.filter(isVisible).filter((product) => searchIndex(product).includes(term)).slice(0, 6);
    const categories = unique(state.products.filter(isVisible).map((product) => product.category))
      .filter((category) => normalizeTerm(category).includes(term))
      .slice(0, 3);
    const rows = [
      ...products.map((product) => ({ kind: "product", value: product.id, label: product.title, meta: formatCurrency(product.price) })),
      ...categories.map((category) => ({ kind: "category", value: category, label: category, meta: "Categoria" }))
    ];
    els.searchSuggestions.hidden = rows.length === 0;
    els.searchSuggestions.innerHTML = rows.map((row) => `
      <button type="button" data-suggestion="${escapeHtml(row.value)}" data-kind="${escapeHtml(row.kind)}">
        <span>${escapeHtml(row.label)}</span>
        <small>${escapeHtml(row.meta)}</small>
      </button>
    `).join("");
  }

  function applySuggestion(value, kind) {
    if (kind === "product") {
      hideSuggestions();
      openProduct(value);
      return;
    }
    state.category = value;
    state.categoryKey = categoryKey(value);
    state.search = "";
    if (els.searchInput) els.searchInput.value = "";
    hideSuggestions();
    renderCategories();
    renderProducts();
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hideSuggestions() {
    if (!els.searchSuggestions) return;
    els.searchSuggestions.hidden = true;
    els.searchSuggestions.innerHTML = "";
  }

  function openProductFromLocation() {
    const value = currentProductFromUrl();
    if (!value) return;
    const product = findProduct(value);
    if (product) {
      openProduct(product.id, { keepUrl: true });
      applyProductSeo(product);
    }
  }

  function relatedProducts(product) {
    return state.products
      .filter((item) => isVisible(item) && item.id !== product.id && categoryKey(item.category) === categoryKey(product.category))
      .slice(0, 4);
  }

  function normalizeBanners() {
    const active = (state.settings.banners || [])
      .filter((banner) => banner && banner.active !== false)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (active.length) return active.slice(0, 4);
    return DEFAULT_HERO_BANNERS;
  }

  function applyProductSeo(product) {
    document.title = product ? `${product.title} | Kairos Shopping` : "Kairos Shopping | Produtos selecionados com frete gratis para todo o Brasil";
    setMeta("description", product ? (product.shortDescription || product.description || "Produto Kairos Shopping").slice(0, 155) : "Compre produtos selecionados na Kairos Shopping. Frete gratis para todo o Brasil, pedido com rastreamento e checkout externo oficial por produto.");
    setMeta("og:title", product ? product.title : "Kairos Shopping", true);
    setMeta("og:description", product ? (product.shortDescription || product.description || "Produto Kairos Shopping").slice(0, 180) : "Tudo que voce procura, em um so lugar. Produtos selecionados, frete gratis e rastreamento.", true);
    setMeta("og:image", absoluteUrl(product?.image || "./assets/banner-kairos-claro-1.png"), true);
    setMeta("og:url", product ? productUrl(product) : `${location.origin}/`, true);
  }

  function setMeta(name, content, property = false) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", content);
  }

  function absoluteUrl(value) {
    try {
      return new URL(value || "/", location.origin).href;
    } catch {
      return `${location.origin}/assets/banner-kairos-claro-1.png`;
    }
  }

  function soldCount(product) {
    const base = Array.from(String(product.id || product.title || "")).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return 18 + (base % 43);
  }

  function shortTitle(value) {
    const text = String(value || "");
    return text.length > 42 ? `${text.slice(0, 39)}...` : text;
  }

  function formatReviewDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
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

  function renderCategories() {
    if (!els.categoryRail) return;
    const visible = state.products.filter(isVisible);
    const counts = visible.reduce((acc, product) => {
      const label = product.category || "Ofertas";
      const key = categoryKey(label);
      if (!acc[key]) acc[key] = { label, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {});
    const merged = new Map();
    state.categories
      .filter((category) => category.active !== false)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .forEach((category) => {
        const key = categoryKey(category.name);
        merged.set(key, { id: category.id, label: category.name, key, count: counts[key]?.count || 0 });
      });
    Object.values(counts).forEach((category) => {
      const key = categoryKey(category.label);
      if (!merged.has(key)) merged.set(key, { label: category.label, key, count: category.count });
    });
    const categories = [
      { label: "Todos", key: "todos", count: visible.length },
      ...Array.from(merged.values()).sort((a, b) => (b.count || 0) - (a.count || 0) || a.label.localeCompare(b.label, "pt-BR"))
    ];
    els.categoryRail.innerHTML = categories.map((category) => `
      <button class="category-chip ${state.categoryKey === category.key ? "active" : ""}" type="button" data-category="${escapeHtml(category.label)}" data-category-key="${escapeHtml(category.key)}">
        <span>${categoryIcon(category.label)}</span>
        <strong>${escapeHtml(category.label)}</strong>
        <small>${formatNumber(category.count)}</small>
      </button>
    `).join("");
    els.categoryRail.querySelectorAll("[data-category-key]").forEach((button) => {
      button.addEventListener("click", () => {
        state.category = button.dataset.category;
        state.categoryKey = button.dataset.categoryKey || categoryKey(state.category);
        state.subcategory = "Todas";
        state.subcategoryKey = "todas";
        resetCatalogPagination();
        trackEvent("category_filter", { category: state.category });
        renderCategories();
        renderSubcategories();
        renderProducts();
        document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    renderSubcategories();
  }

  function renderSubcategories() {
    if (!els.subcategoryRail) return;
    const visible = state.products.filter(isVisible);
    const selectedCategory = state.categories.find((category) => categoryKey(category.name) === state.categoryKey);
    const productsInCategory = visible.filter((product) => state.categoryKey === "todos" || categoryKey(product.category) === state.categoryKey);
    const counts = productsInCategory.reduce((acc, product) => {
      if (!product.subcategory) return acc;
      const key = categoryKey(product.subcategory);
      if (!acc[key]) acc[key] = { label: product.subcategory, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {});
    const merged = new Map();
    state.subcategories
      .filter((subcategory) => subcategory.active !== false)
      .filter((subcategory) => state.categoryKey === "todos" || !subcategory.categoryId || subcategory.categoryId === selectedCategory?.id)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .forEach((subcategory) => {
        const key = categoryKey(subcategory.name);
        merged.set(key, { label: subcategory.name, key, count: counts[key]?.count || 0 });
      });
    Object.values(counts).forEach((subcategory) => {
      const key = categoryKey(subcategory.label);
      if (!merged.has(key)) merged.set(key, { label: subcategory.label, key, count: subcategory.count });
    });
    const subcategories = [
      { label: "Todas", key: "todas", count: productsInCategory.length },
      ...Array.from(merged.values()).sort((a, b) => (b.count || 0) - (a.count || 0) || a.label.localeCompare(b.label, "pt-BR"))
    ];
    els.subcategoryRail.hidden = subcategories.length <= 1;
    els.subcategoryRail.innerHTML = subcategories.map((subcategory) => `
      <button class="subcategory-chip ${state.subcategoryKey === subcategory.key ? "active" : ""}" type="button" data-subcategory="${escapeHtml(subcategory.label)}" data-subcategory-key="${escapeHtml(subcategory.key)}">
        ${escapeHtml(subcategory.label)}
        <small>${formatNumber(subcategory.count)}</small>
      </button>
    `).join("");
    els.subcategoryRail.querySelectorAll("[data-subcategory-key]").forEach((button) => {
      button.addEventListener("click", () => {
        state.subcategory = button.dataset.subcategory || "Todas";
        state.subcategoryKey = button.dataset.subcategoryKey || categoryKey(state.subcategory);
        resetCatalogPagination();
        trackEvent("category_filter", { category: state.category, subcategory: state.subcategory });
        renderSubcategories();
        renderProducts();
        document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderProducts() {
    const visible = state.products.filter(isVisible);
    const best = visible.filter((item) => item.bestSeller).slice(0, 8);
    const flash = visible.filter((item) => item.flashOffer || item.oldPrice).slice(0, 8);
    const videos = visible.filter((item) => item.videoUrl).slice(0, 8);
    const catalog = sortProducts(filterProducts(visible));
    const pagedCatalog = paginateProducts(catalog);
    const bestSection = els.bestSellerGrid?.closest(".section-block");
    const flashSection = els.flashGrid?.closest(".section-block");
    const videoSection = els.videoGrid?.closest(".section-block");
    renderGrid(els.bestSellerGrid, best.length ? best : visible.slice(0, 8), "Novos produtos serao destacados em breve.");
    renderGrid(els.flashGrid, flash, "");
    renderGrid(els.videoGrid, videos, "Videos serao exibidos aqui quando cadastrados no painel.");
    renderGrid(els.catalogGrid, pagedCatalog, "");
    renderPagination(catalog.length, pagedCatalog.length);
    if (bestSection) bestSection.hidden = visible.length === 0;
    if (flashSection) flashSection.hidden = flash.length === 0;
    if (videoSection) videoSection.hidden = videos.length === 0;
    if (els.catalogCount) {
      const scope = state.subcategoryKey !== "todas" ? `em ${state.subcategory}` : state.categoryKey === "todos" ? "produtos ativos" : `em ${state.category}`;
      els.catalogCount.textContent = `${formatNumber(catalog.length)} ${scope}`;
    }
    if (els.emptyProducts) els.emptyProducts.hidden = catalog.length > 0;
  }

  function productCard(product) {
    const discount = getDiscount(product);
    const favorite = state.favorites.includes(product.id);
    const storefront = storefrontConfig();
    const showBadges = storefront.showCardBadge !== false;
    const showRating = storefront.showCardRating !== false;
    const showDescription = storefront.showCardDescription !== false;
    return `
      <article class="product-card" data-product-id="${escapeHtml(product.id)}">
        <div class="product-image-wrap">
          <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
          <button class="icon-button favorite ${favorite ? "active" : ""}" type="button" data-action="favorite" data-product-id="${escapeHtml(product.id)}" aria-label="Favoritar produto">&#9825;</button>
          ${showBadges ? `<div class="badges">
            ${product.videoUrl ? "<span>Video disponivel</span>" : ""}
            ${discount ? `<span>${discount}% OFF</span>` : ""}
            ${product.tag ? `<span>${escapeHtml(product.tag)}</span>` : ""}
          </div>` : ""}
        </div>
        <div class="product-info">
          <span class="product-category">${escapeHtml(product.category)}</span>
          <h3>${escapeHtml(product.title)}</h3>
          ${showDescription ? `<p>${escapeHtml(product.shortDescription || product.description || "").slice(0, 120)}</p>` : ""}
          ${showRating ? `<div class="rating">${stars(product.reviewRating)} <span>${formatNumber(product.reviewCount)} avaliacoes</span></div>` : ""}
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

  function filterProducts(products) {
    const term = normalizeTerm(state.search);
    return products.filter((product) => {
      const matchCategory = state.categoryKey === "todos" || categoryKey(product.category) === state.categoryKey;
      const matchSubcategory = state.subcategoryKey === "todas" || categoryKey(product.subcategory) === state.subcategoryKey;
      const searchText = searchIndex(product);
      return matchCategory && matchSubcategory && (!term || searchText.includes(term));
    });
  }

  function paginateProducts(products) {
    const config = storefrontConfig();
    applyCatalogGridLayout(config);
    if (config.paginationEnabled === false) return products;
    const size = pageSizeForViewport(config);
    const totalPages = Math.max(1, Math.ceil(products.length / size));
    state.catalogPage = Math.min(Math.max(1, state.catalogPage), totalPages);
    if (config.loadMoreEnabled && getDevice() === "mobile") {
      return products.slice(0, size * Math.max(1, state.loadedPages));
    }
    const start = (state.catalogPage - 1) * size;
    return products.slice(start, start + size);
  }

  function renderPagination(total, shown) {
    if (!els.catalogPagination) return;
    const config = storefrontConfig();
    const size = pageSizeForViewport(config);
    const totalPages = Math.max(1, Math.ceil(total / size));
    if (config.paginationEnabled === false || total <= size) {
      els.catalogPagination.innerHTML = "";
      return;
    }
    if (config.loadMoreEnabled && getDevice() === "mobile") {
      els.catalogPagination.innerHTML = shown < total
        ? `<button class="secondary-button" type="button" data-page-action="more">Ver mais produtos</button>`
        : `<span class="pagination-status">Todos os produtos carregados</span>`;
    } else {
      const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
        .map((page) => `<button class="${page === state.catalogPage ? "active" : ""}" type="button" data-page="${page}">${page}</button>`)
        .join("");
      els.catalogPagination.innerHTML = `
        <button type="button" data-page-action="prev" ${state.catalogPage <= 1 ? "disabled" : ""}>Anterior</button>
        ${pages}
        <button type="button" data-page-action="next" ${state.catalogPage >= totalPages ? "disabled" : ""}>Proxima</button>
      `;
    }
    els.catalogPagination.querySelectorAll("[data-page], [data-page-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.pageAction;
        if (action === "more") state.loadedPages += 1;
        if (action === "prev") state.catalogPage -= 1;
        if (action === "next") state.catalogPage += 1;
        if (button.dataset.page) state.catalogPage = Number(button.dataset.page);
        renderProducts();
        document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function resetCatalogPagination() {
    state.catalogPage = 1;
    state.loadedPages = 1;
  }

  function storefrontConfig() {
    return {
      desktopPerPage: 12,
      tabletPerPage: 9,
      mobilePerPage: 6,
      desktopColumns: 4,
      tabletColumns: 3,
      mobileColumns: 2,
      paginationEnabled: true,
      loadMoreEnabled: true,
      showCardDescription: true,
      showCardRating: true,
      showCardBadge: true,
      ...(state.settings.storefront || {})
    };
  }

  function pageSizeForViewport(config) {
    const device = getDevice();
    if (device === "mobile") return Math.max(2, Number(config.mobilePerPage || 6));
    if (device === "tablet") return Math.max(3, Number(config.tabletPerPage || 9));
    return Math.max(4, Number(config.desktopPerPage || 12));
  }

  function applyCatalogGridLayout(config) {
    if (!els.catalogGrid) return;
    const device = getDevice();
    const columns = device === "mobile"
      ? Math.max(2, Math.min(3, Number(config.mobileColumns || 2)))
      : device === "tablet"
        ? Math.max(2, Math.min(4, Number(config.tabletColumns || 3)))
        : Math.max(3, Math.min(6, Number(config.desktopColumns || 4)));
    els.catalogGrid.style.setProperty("--catalog-columns", columns);
  }

  function normalizeCategories(categories) {
    return (Array.isArray(categories) ? categories : []).map((category, index) => ({
      id: String(category.id || slugify(category.name || `categoria-${index + 1}`)),
      name: String(category.name || category.title || `Categoria ${index + 1}`),
      image: safeImage(category.image || category.imageUrl),
      active: category.active !== false,
      order: Number(category.order || category.position || index)
    }));
  }

  function normalizeSubcategories(subcategories) {
    return (Array.isArray(subcategories) ? subcategories : []).map((subcategory, index) => ({
      id: String(subcategory.id || slugify(subcategory.name || `subcategoria-${index + 1}`)),
      categoryId: String(subcategory.categoryId || subcategory.category_id || ""),
      name: String(subcategory.name || subcategory.title || `Subcategoria ${index + 1}`),
      image: safeImage(subcategory.image || subcategory.imageUrl),
      active: subcategory.active !== false,
      order: Number(subcategory.order || subcategory.position || index)
    }));
  }

  function categoryIcon(category) {
    const text = normalizeTerm(category);
    if (text.includes("eletr")) return "&#128241;";
    if (text.includes("roup") || text.includes("moda")) return "&#128085;";
    if (text.includes("util") || text.includes("casa")) return "&#127968;";
    if (text.includes("brinqu") || text.includes("infantil")) return "&#129528;";
    if (text.includes("auto")) return "&#128663;";
    if (text.includes("promo") || text.includes("oferta")) return "&#9889;";
    return "&#128717;";
  }

  function stars(value) {
    const rating = Math.round(Number(value || 5) * 2) / 2;
    return `<span class="stars" aria-label="${rating} de 5">&#9733;&#9733;&#9733;&#9733;&#9733;</span>`;
  }

  function trackPixel(event, payload) {
    if (typeof window.fbq === "function") window.fbq("track", event, payload || {});
  }

  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}());
