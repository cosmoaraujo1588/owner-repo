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
  const CART_KEY = "kairos:cart";
  const SESSION_KEY = "kairos:session";
  const SCARCITY_DEADLINE_KEY = "kairos:scarcity-deadline";
  const PUBLIC_SITE_URL = "https://www.kairosshopping.com.br";
  const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/HULOSXTZ7JoKi0yhfj5UMJ?s=cl&p=a&mlu=0";
  const DEFAULT_SETTINGS = window.KAIROS_DEFAULT_SETTINGS || {};
  const SEED_PRODUCTS = Array.isArray(window.KAIROS_SEED_PRODUCTS) ? window.KAIROS_SEED_PRODUCTS : [];
  const DEFAULT_MOBILE_NAV_ITEMS = [
    { icon: "&#127968;", label: "Inicio", href: "#inicio" },
    { icon: "&#128194;", label: "Categorias", href: "#categorias" },
    { icon: "&#128269;", label: "Busca", href: "#produtos" },
    { icon: "&#128717;", label: "Sacolinha", href: "/carrinho" },
    { icon: "&#128100;", label: "Conta", href: "/contato" }
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
    priceRange: "all",
    catalogPage: 1,
    loadedPages: 1,
    favorites: readJson(FAVORITES_KEY, []),
    cart: readJson(CART_KEY, []),
    sessionId: getSessionId(),
    supabaseConfig: null,
    bannerTimer: null,
    bannerIndex: 0,
    reviewTimer: null,
    countdownTimer: null
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
    priceFilter: document.getElementById("priceFilter"),
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
    headerWhatsapp: document.getElementById("headerWhatsapp"),
    floatingWhatsapp: document.getElementById("floatingWhatsapp"),
    cartCount: document.getElementById("cartCount"),
    mobileBottomNav: document.getElementById("mobileBottomNav"),
    departmentNav: document.getElementById("departmentNav"),
    departmentShowcase: document.getElementById("departmentShowcase"),
    newArrivalsGrid: document.getElementById("newArrivalsGrid"),
    featuredGrid: document.getElementById("featuredGrid"),
    categoryCollections: document.getElementById("categoryCollections")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    await loadCatalog();
    renderAll();
    renderCartCount();
    openProductFromLocation();
    trackEvent("page_view", { page: location.pathname || "/" });
    startPresence();
    startActivityPopup();
    startRealtimeRefresh();
    window.addEventListener("popstate", openProductFromLocation);
  }

  async function loadCatalog() {
    try {
      const response = await fetch(`/api/catalog?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Catalog API unavailable");
      const catalog = await response.json();
      const apiProducts = sanitizeProducts(extractCatalogProducts(catalog));
      const seedProducts = sanitizeProducts(Array.isArray(SEED_PRODUCTS) ? SEED_PRODUCTS : []);
      const publishedApiProducts = apiProducts.filter(isVisible);
      // A successful API response is authoritative: never replace an empty published catalog with stale seed data.
      state.products = publishedApiProducts;
      state.categories = normalizeCategories(extractCatalogList(catalog, "categories"));
      state.subcategories = normalizeSubcategories(extractCatalogList(catalog, "subcategories"));
      const catalogSettings = catalog.settings || catalog.response?.settings || catalog.data?.settings || {};
      const settingsBanners = Array.isArray(catalogSettings.banners) ? catalogSettings.banners : [];
      const apiReviews = Array.isArray(catalog.reviews) ? catalog.reviews : Array.isArray(catalog.response?.reviews) ? catalog.response.reviews : [];
      const activeSettings = catalogSettings;
      const settingsReviews = Array.isArray(activeSettings.reviews) ? activeSettings.reviews : [];
      state.settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...catalogSettings, banners: settingsBanners, reviews: apiReviews.length ? apiReviews : settingsReviews });
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

  function bindEvents() {
    const mobileDepartmentsToggle = document.getElementById("mobileDepartmentsToggle");
    mobileDepartmentsToggle?.addEventListener("click", () => {
      const expanded = els.departmentNav?.classList.toggle("is-mobile-open") || false;
      mobileDepartmentsToggle.setAttribute("aria-expanded", String(expanded));
    });
    document.addEventListener("click", (event) => {
      if (window.innerWidth <= 767 && !event.target.closest(".marketplace-header")) {
        els.departmentNav?.classList.remove("is-mobile-open");
        mobileDepartmentsToggle?.setAttribute("aria-expanded", "false");
      }
      const control = event.target.closest("[data-scroll-target]");
      if (!control) return;
      const rail = document.getElementById(control.dataset.scrollTarget);
      if (rail) rail.scrollBy({ left: (control.classList.contains("rail-prev") ? -1 : 1) * Math.max(rail.clientWidth * 0.8, 240), behavior: "smooth" });
    });
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

    els.priceFilter?.addEventListener("change", () => {
      state.priceRange = els.priceFilter.value;
      resetCatalogPagination();
      renderProducts();
    });

    els.productModal?.addEventListener("click", (event) => {
      const target = event.target.closest("[data-modal-action]");
      if (!target) return;
      const action = target.dataset.modalAction;
      if (action === "close") closeModal();
      if (action === "buy") buyProduct(target.dataset.productId);
      if (action === "cart") toggleCart(target.dataset.productId);
      if (action === "share") shareProduct(target.dataset.productId);
      if (action === "favorite") toggleFavorite(target.dataset.productId);
    });

    document.addEventListener("click", (event) => {
      trackGenericClick(event.target.closest("a,button"));
      const link = event.target.closest("a[href]");
      if (link) trackLinkAnalytics(link);

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
      if (button.dataset.action === "cart") toggleCart(id);
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
    // Render the catalog first and isolate optional modules so a non-critical widget
    // cannot prevent real products from appearing in the storefront.
    const steps = [
      ["products", renderProducts],
      ["settings", applySettings],
      ["banners", renderBanners],
      ["categories", renderCategories],
      ["departments", renderDepartmentNav],
      ["department showcase", renderDepartmentShowcase],
      ["subcategories", renderSubcategories],
      ["reviews", renderReviews],
      ["FAQ", renderFaq],
      ["assistant", renderAssistant],
      ["social links", renderSocial],
      ["mobile navigation", renderMobileBottomNav]
    ];
    steps.forEach(([name, render]) => {
      try { render(); }
      catch (error) { console.error("[Kairos] Falha ao renderizar " + name, error); }
    });
  }

  function applySettings() {
    const promo = state.settings.promoBar || {};
    const promoText = promoTextWithCountdown();
    setMarquee(els.promoBar, promo, promoText || "CONFIRA OS PRODUTOS E NOVIDADES DA KAIROS SHOPPING");
    setMarquee(els.footerPromoBar, promo, promoText || "FRETE GRATIS PARA TODO O BRASIL");
    startScarcityCountdown();

    if (els.trackingPortal) els.trackingPortal.href = state.settings.trackingUrl;
    if (els.footerWhatsapp) els.footerWhatsapp.href = whatsappUrl();
    if (els.headerWhatsapp) els.headerWhatsapp.href = whatsappUrl();
    if (els.floatingWhatsapp) els.floatingWhatsapp.href = whatsappUrl();
    document.querySelectorAll("[data-whatsapp-group]").forEach((link) => {
      link.href = whatsappGroupUrl();
    });
  }

  function setMarquee(container, promo, fallbackText) {
    if (!container) return;
    const enabled = promo.enabled !== false;
    const text = promo.text || fallbackText;
    if (container.classList.contains("marketplace-topbar")) { container.hidden = !enabled; return; }
    container.hidden = !enabled;
    container.style.background = container.id === "promoBar" ? "#111111" : "#171717";
    container.style.color = "#ffffff";
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
    return base;
  }

  function startScarcityCountdown() {
    if (state.countdownTimer) clearInterval(state.countdownTimer);
    return;
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

  function renderMobileBottomNav() {
    if (!els.mobileBottomNav) return;
    const conversion = conversionConfig();
    els.mobileBottomNav.hidden = conversion.mobileNavEnabled === false;
    if (els.mobileBottomNav.hidden) return;
    const items = normalizeMobileNavItems(conversion.mobileNavItems);
    els.mobileBottomNav.innerHTML = items.map((item) => {
      let href = item.href || "#inicio";
      const opensGroup = normalizeTerm(item.label).includes("ofertas") && (href === "#promocoes" || /chat\.whatsapp\.com/i.test(href));
      if (opensGroup) href = whatsappGroupUrl();
      const external = /^https?:\/\//i.test(href);
      return `
        <a href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ""} ${opensGroup ? 'data-whatsapp-group="mobile_bottom_nav"' : ""}>
          <span class="mobile-nav-icon" aria-hidden="true">${href === "/carrinho"
            ? '<svg viewBox="0 0 24 24" focusable="false"><path d="M3 3h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>'
            : href === "/contato"
              ? '<svg viewBox="0 0 24 24" focusable="false"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13h3v6H6a2 2 0 0 1-2-2v-4Zm16 0h-3v6h1a2 2 0 0 0 2-2v-4Z"/><path d="M17 19a5 5 0 0 1-5 2"/></svg>'
              : item.icon || "&#128717;"}</span>
          <small>${href === "/contato" ? "Contato" : escapeHtml(item.label || "Loja")}</small>
        </a>
      `;
    }).join("");
  }

  function renderBanners() {
    if (!els.heroCarousel) return;
    // Use a real, published catalog photo as the hero protagonist. No promotional
    // price, discount, or fabricated campaign copy is introduced here.
    const heroProduct = state.products.find((product) => product.featured || product.isFeatured) || state.products[0];
    if (!heroProduct || !heroProduct.image) {
      els.heroCarousel.innerHTML = "";
      return;
    }
    const title = "Produtos que facilitam o seu dia";
    const subtitle = "Descubra escolhas selecionadas em diferentes categorias.";
    const href = "/produto/" + encodeURIComponent(heroProduct.slug || slugify(heroProduct.title || heroProduct.id));
    els.heroCarousel.innerHTML = `
      <a class="hero-slide active hero-product-slide" href="${escapeHtml(href)}">
        <div class="hero-product-copy">
          <small>ESCOLHAS KAIROS</small>
          <strong>${escapeHtml(title)}</strong>
          <em>${escapeHtml(subtitle)}</em>
          <b>Conhecer produto <span aria-hidden="true">›</span></b>
        </div>
        <div class="hero-product-media">
          <img src="${escapeHtml(heroProduct.image)}" alt="${escapeHtml(heroProduct.title || "Produto em destaque")}" fetchpriority="high" decoding="async">
        </div>
      </a>`;
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
    if (!options.silent) {
      trackEvent("product_view", { product_id: product.id, product_name: product.title, category: product.category, price: Number(product.price || 0) });
      trackPixel("ViewContent", { content_ids: [product.id], content_name: product.title, content_category: product.category, value: Number(product.price || 0), currency: "BRL" });
    }
    const favorite = state.favorites.includes(product.id);
    const inCart = state.cart.includes(product.id);
    const related = relatedProducts(product);
    els.productModal.hidden = false;
    els.productModal.innerHTML = `
      <div class="modal-backdrop" data-modal-action="close"></div>
      <article class="modal-card">
        <button class="modal-close" type="button" data-modal-action="close">×</button>
        <div class="modal-media">
          ${(() => {
            const imgs = [product.image || FALLBACK_IMAGE, ...(product.gallery || []).filter(Boolean)];
            const unique = [...new Set(imgs)];
            if (unique.length <= 1) {
              return `<img id="modalMainImg" src="${escapeHtml(unique[0])}" alt="${escapeHtml(product.title)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">`;
            }
            const thumbs = unique.map((src, i) => `
              <button type="button" class="gallery-thumb${i === 0 ? " active" : ""}" data-src="${escapeHtml(src)}" aria-label="Imagem ${i + 1}" onclick="
                document.getElementById('modalMainImg').src=this.dataset.src;
                document.querySelectorAll('.gallery-thumb').forEach(t=>t.classList.remove('active'));
                this.classList.add('active');
              ">
                <img src="${escapeHtml(src)}" alt="Foto ${i + 1}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
              </button>
            `).join("");
            return `
              <img id="modalMainImg" src="${escapeHtml(unique[0])}" alt="${escapeHtml(product.title)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
              <div class="gallery-thumbs">${thumbs}</div>
            `;
          })()}
          ${product.videoUrl ? `<a class="video-link" href="${escapeHtml(product.videoUrl)}" target="_blank" rel="noopener">Assistir video do produto</a>` : ""}
        </div>
        <div class="modal-content">
          <span class="product-category">${escapeHtml(product.category)}${product.subcategory ? ` · ${escapeHtml(product.subcategory)}` : ""}</span>
          <h2>${escapeHtml(product.title)}</h2>
          ${product.reviewCount > 0 && product.reviewRating > 0 ? `<div class="rating">${stars(product.reviewRating)} <span>${formatNumber(product.reviewCount)} avaliacoes</span></div>` : ""}
          <div class="price-row large"><strong>${formatCurrency(product.price)}</strong>${product.oldPrice ? `<del>${formatCurrency(product.oldPrice)}</del>` : ""}</div>
          <p class="modal-short">${escapeHtml(product.shortDescription || "")}</p>
          <div class="modal-actions">
            <button class="primary-button" type="button" data-modal-action="buy" data-product-id="${escapeHtml(product.id)}">Comprar agora</button>
            <button class="cart-button" type="button" data-modal-action="cart" data-product-id="${escapeHtml(product.id)}">${inCart ? "Remover da sacolinha" : "Adicionar a sacolinha"}</button>
            <button class="secondary-button" type="button" data-modal-action="share" data-product-id="${escapeHtml(product.id)}">Compartilhar</button>
            <button class="secondary-button" type="button" data-modal-action="favorite" data-product-id="${escapeHtml(product.id)}">${favorite ? "Remover favorito" : "Favoritar"}</button>
          </div>
          ${accordion("Descricao completa", product.description)}
          ${accordion("Entrega", state.settings.content?.delivery || "Consulte as condições e os prazos informados no checkout do produto.")}
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
      price: Number(product.price || 0),
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
    const section = els.reviewGrid.closest(".reviews-section");
    if (section) section.hidden = reviews.length === 0;
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
    if (!els.faqList) return;
    const content = state.settings.content || {};
    const faq = [
      ["Como acompanhar meu pedido?", "Use o portal de rastreamento disponibilizado pela Kairos Shopping com o código do pedido."],
      ["Onde finalizo a compra?", "Cada produto direciona para o checkout externo indicado em sua página."],
      ["Onde consulto entrega, pagamento e condições?", "As condições aplicáveis são apresentadas no checkout do produto e nas políticas oficiais da loja."],
      ...(content.returns ? [["Como funcionam trocas e devoluções?", content.returns]] : [])
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
    // Social proof is displayed only when backed by real order data.
    return;
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
    trackGa4(type, payload);
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

  function toggleCart(id) {
    const product = findProduct(id);
    if (!product) return;
    const exists = state.cart.includes(id);
    state.cart = exists ? state.cart.filter((item) => item !== id) : [...state.cart, id];
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    renderCartCount();
    renderProducts();
    if (!els.productModal?.hidden) openProduct(id, { keepUrl: true, silent: true });
    toast(exists ? "Produto removido da sacolinha." : "Produto adicionado a sacolinha.");
    trackEvent(exists ? "cart_remove" : "cart_add", { product_id: id, product_name: product.title, price: product.price });
  }

  function renderCartCount() {
    if (els.cartCount) els.cartCount.textContent = String(state.cart.length);
    const mobileCart = els.mobileBottomNav?.querySelector('a[href="/carrinho"]');
    if (mobileCart) mobileCart.dataset.count = String(state.cart.length);
  }

  function trackGa4(type, payload = {}) {
    if (typeof window.gtag !== "function") return;
    const eventMap = {
      product_view: "view_product",
      checkout_click: "add_to_checkout",
      whatsapp_click: "whatsapp_click",
      whatsapp_group_click: "whatsapp_click",
      search: "search_products",
      category_filter: "view_category",
      lead: "generate_lead"
    };
    const eventName = eventMap[type];
    if (!eventName) return;
    window.gtag("event", eventName, {
      product_id: payload.product_id || "",
      product_name: payload.product_name || "",
      category: payload.category || "",
      price: Number(payload.price || 0),
      search_term: payload.query || "",
      source: payload.source || ""
    });
  }

  function trackLinkAnalytics(link) {
    if (typeof window.gtag !== "function") return;
    const href = String(link.href || "");
    if (!href) return;
    if (/wa\.me|whatsapp\.com/i.test(href)) {
      window.gtag("event", "whatsapp_click", { source: link.dataset.whatsappGroup || link.id || "link" });
    }
    if (/\.(pdf|xlsx?|csv|docx?|zip)(?:[?#]|$)/i.test(href)) {
      window.gtag("event", "file_download", { file_name: href.split("/").pop(), link_url: href });
    }
    try {
      if (new URL(href, location.href).origin !== location.origin) {
        window.gtag("event", "outbound_click", { link_url: href, link_text: link.textContent?.trim() || "" });
      }
    } catch {}
  }

  function trackGenericClick(control) {
    if (!control || typeof window.gtag !== "function") return;
    window.gtag("event", "click", {
      element_id: control.id || "",
      element_text: control.textContent?.trim().slice(0, 120) || "",
      link_url: control.href || ""
    });
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
    if (state.sort === "newest") sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (state.sort === "relevance") sorted.sort((a, b) => Number(b.featured) - Number(a.featured) || (a.order || 0) - (b.order || 0));
    return sorted;
  }

  function extractCatalogList(payload, key) {
    const queue = [payload];
    const seen = new Set();
    while (queue.length && seen.size < 24) {
      const node = queue.shift();
      if (!node || typeof node !== "object" || seen.has(node)) continue;
      seen.add(node);
      if (Array.isArray(node[key])) return node[key];
      if (node[key] && typeof node[key] === "object") return Object.values(node[key]).filter((item) => item && typeof item === "object");
      ["response", "data", "result", "catalog"].forEach((name) => { if (node[name] && typeof node[name] === "object") queue.push(node[name]); });
    }
    return [];
  }

  function extractCatalogProducts(payload) {
    const queue = [payload];
    const seen = new Set();
    while (queue.length && seen.size < 24) {
      const node = queue.shift();
      if (!node || typeof node !== "object" || seen.has(node)) continue;
      seen.add(node);
      if (Array.isArray(node.products)) return node.products;
      if (node.products && typeof node.products === "object") return Object.values(node.products).filter((item) => item && typeof item === "object");
      ["response", "data", "result", "catalog"].forEach((name) => { if (node[name] && typeof node[name] === "object") queue.push(node[name]); });
    }
    return Array.isArray(payload) ? payload : [];
  }

  function isDisabledValue(value) {
    return value === false || value === 0 || ["false", "0", "inactive", "inativo", "draft", "rascunho", "hidden", "unpublished", "archived", "deleted"].includes(String(value ?? "").trim().toLowerCase());
  }

  function sanitizeProducts(products) {
    if (!Array.isArray(products)) return [];
    return products.filter((product) => product && typeof product === "object").map((product, index) => ({
      ...product,
      id: String(product.id || `produto-${index + 1}`),
      title: String(product.title || product.name || product.product_name || `Produto ${index + 1}`),
      category: String(product.category || "Ofertas"),
      subcategory: String(product.subcategory || ""),
      price: Number(product.price || 0),
      oldPrice: Number(product.oldPrice ?? product.old_price ?? product.compare_at_price ?? 0) || null,
      image: safeImage(product.image || product.imageUrl || product.image_url || product.photo || product.thumbnail),
      gallery: Array.isArray(product.gallery) ? product.gallery : Array.isArray(product.images) ? product.images : [],
      checkoutUrl: String(product.checkoutUrl || product.checkout_url || product.buy_url || ""),
      slug: product.slug || slugify(product.title || product.name || `produto-${index + 1}`),
      keywords: Array.isArray(product.keywords) ? product.keywords : String(product.keywords || product.tags || "").split(",").map((item) => item.trim()).filter(Boolean),
      tag: String(product.tag || ""),
      reviewRating: Number(product.reviewRating || product.rating || 0),
      createdAt: product.createdAt || product.created_at || null,
      reviewCount: Number(product.reviewCount || product.reviewsCount || 0),
      visible: ![product.visible, product.is_visible, product.active, product.is_active, product.published].some(isDisabledValue) && !isDisabledValue(product.status),
      active: ![product.active, product.is_active, product.visible, product.is_visible].some(isDisabledValue),
      featured: Boolean(product.featured ?? product.is_featured ?? false),
      bestSeller: Boolean(product.bestSeller ?? product.best_seller ?? false),
      flashOffer: Boolean(product.flashOffer ?? product.flash_offer ?? false) || Boolean(product.oldPrice ?? product.old_price),
      order: Number(product.order ?? product.display_order ?? product.position ?? index),
      shortDescription: String(product.shortDescription || product.short_description || product.description || "").slice(0, 220),
      description: String(product.description || product.shortDescription || "")
    }));
  }

  function normalizeSettings(settings) {
    return {
      storeName: settings.storeName || "Kairos Shopping",
      storeEmail: settings.storeEmail || "kairossshopping@gmail.com",
      siteUrl: settings.siteUrl || "",
      whatsappGroupUrl: settings.whatsappGroupUrl || settings.social?.whatsappGroupUrl || WHATSAPP_GROUP_URL,
      logoUrl: settings.logoUrl || "./assets/logo-kairos-oficial.png",
      bannerUrl: settings.bannerUrl || "./assets/banner-kairos-claro-1.png",
      bannerMobileUrl: settings.bannerMobileUrl || settings.bannerUrl || "./assets/banner-kairos-claro-1.png",
      bannerVideoUrl: settings.bannerVideoUrl || "",
      bannerMobileVideoUrl: settings.bannerMobileVideoUrl || "",
      banners: Array.isArray(settings.banners) ? settings.banners : [],
      trackingUrl: settings.trackingUrl || "https://app.kaiross.com.br/rastreio",
      promoBar: settings.promoBar || { enabled: true, text: "Confira os produtos e novidades da Kairos Shopping", backgroundColor: "#F47721", textColor: "#111111" },
      assistant: settings.assistant || {},
      purchasePopup: settings.purchasePopup || { enabled: false },
      conversion: {
        ...defaultConversionConfig(),
        ...(settings.conversion || {}),
        mobileNavItems: normalizeMobileNavItems(settings.conversion?.mobileNavItems)
      },
      social: settings.social || {},
      content: settings.content || {},
      storefront: settings.storefront || {},
      reviews: Array.isArray(settings.reviews) ? settings.reviews : []
    };
  }

  function defaultConversionConfig() {
    return {
      scarcityEnabled: false,
      scarcityText: "Ofertas limitadas terminam em",
      countdownMinutes: 15,
      visitorCounterEnabled: false,
      visitorCounterType: "total",
      visitorCounterText: "Produtos com alto interesse dos clientes",
      mobileNavEnabled: true,
      socialProofEnabled: false,
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
    const normalized = source.slice(0, 5).map((item, index) => ({
      icon: String(item.icon || DEFAULT_MOBILE_NAV_ITEMS[index]?.icon || "&#128717;"),
      label: String(item.label || DEFAULT_MOBILE_NAV_ITEMS[index]?.label || "Loja"),
      href: String(item.href || DEFAULT_MOBILE_NAV_ITEMS[index]?.href || "#inicio")
    }));
    if (!normalized.some((item) => item.href === "/carrinho")) normalized[Math.max(0, normalized.length - 2)] = DEFAULT_MOBILE_NAV_ITEMS[3];
    if (!normalized.some((item) => item.href === "/contato")) normalized[normalized.length - 1] = DEFAULT_MOBILE_NAV_ITEMS[4];
    return normalized;
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

  function hasVisibleProducts(products) {
    return Array.isArray(products) && products.some(isVisible);
  }

  function isVisible(product) {
    if (!product || typeof product !== "object") return false;
    const flags = ["visible", "is_visible", "active", "is_active", "published"]
      .filter((key) => product[key] !== undefined && product[key] !== null)
      .map((key) => product[key]);
    return !flags.some(isDisabledValue) && !isDisabledValue(product.status);
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

  function whatsappGroupUrl() {
    const configured = String(state.settings.whatsappGroupUrl || state.settings.social?.whatsappGroupUrl || "").trim();
    return /^https:\/\/chat\.whatsapp\.com\//i.test(configured) ? configured : WHATSAPP_GROUP_URL;
  }

  function currentProductFromUrl() {
    const pathMatch = location.pathname.match(/^\/produto\/([^/?#]+)/);
    if (pathMatch) return decodeURIComponent(pathMatch[1]);
    return new URLSearchParams(location.search).get("produto") || "";
  }

  function productUrl(product) {
    const base = publicSiteUrl();
    return `${base}/produto/${encodeURIComponent(product.slug || slugify(product.title || product.id))}`;
  }

  function publicSiteUrl() {
    const configured = String(state.settings.siteUrl || "").replace(/\/+$/, "");
    return configured && !/\.vercel\.app$/i.test(configured) ? configured : PUBLIC_SITE_URL;
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
    renderDepartmentNav();
    renderDepartmentShowcase();
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
    const url = product ? productUrl(product) : `${publicSiteUrl()}/`;
    setMeta("og:url", url, true);
    setMeta("twitter:url", url);
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", url);
  }

  function setMeta(name, content, property = false) {
    const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    const node = document.querySelector(selector);
    if (node) node.setAttribute("content", content);
  }

  function absoluteUrl(value) {
    try {
      return new URL(value || "/", publicSiteUrl()).href;
    } catch {
      return `${PUBLIC_SITE_URL}/assets/banner-kairos-claro-1.png`;
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
        <span class="category-chip-symbol">${(() => { const record = state.categories.find((item) => categoryKey(item.name) === category.key); const product = visible.find((item) => categoryKey(item.category) === category.key && item.image && item.image !== FALLBACK_IMAGE); const src = record?.image && record.image !== FALLBACK_IMAGE ? record.image : product?.image; return src ? `<img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.remove()">` : escapeHtml(category.label.slice(0,1).toUpperCase()); })()}</span>
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
        renderDepartmentNav();
        renderDepartmentShowcase();
        renderSubcategories();
        renderProducts();
        document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
    renderSubcategories();
  }

  function departmentList() {
    const fromProducts = unique(state.products.filter(isVisible).map((product) => product.category).filter(Boolean));
    const productKeys = new Set(fromProducts.map(categoryKey));
    const fromCatalog = state.categories
      .filter((category) => category.active !== false && productKeys.has(categoryKey(category.name)))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((category) => category.name);
    return unique([...fromCatalog, ...fromProducts]).filter(Boolean);
  }

  function selectDepartment(name) {
    state.category = name || "Todos";
    state.categoryKey = name ? categoryKey(name) : "todos";
    state.subcategory = "Todas";
    state.subcategoryKey = "todas";
    state.search = "";
    if (els.searchInput) els.searchInput.value = "";
    resetCatalogPagination();
    renderCategories();
    renderDepartmentNav();
    renderProducts();
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    trackEvent("category_filter", { category: state.category });
  }

  function renderDepartmentNav() {
    if (!els.departmentNav) return;
    const categories = departmentList();
    const menuItems = categories.map((name) => {
      const category = state.categories.find((item) => categoryKey(item.name) === categoryKey(name));
      const subs = state.subcategories.filter((item) => item.active !== false && (!item.categoryId || item.categoryId === category?.id));
      const derived = unique(state.products.filter((product) => categoryKey(product.category) === categoryKey(name)).map((product) => product.subcategory).filter(Boolean));
      const subNames = unique([...subs.map((item) => item.name), ...derived]);
      return `<div class="mega-menu-group">
        <button type="button" class="mega-menu-title" data-nav-category="${escapeHtml(name)}">${escapeHtml(name)}</button>
        ${subNames.map((sub) => `<button type="button" class="mega-menu-sub" data-nav-category="${escapeHtml(name)}" data-nav-subcategory="${escapeHtml(sub)}">${escapeHtml(sub)}</button>`).join("")}
      </div>`;
    }).join("");
    const topDepartments = categories.slice(0, 4);
    els.departmentNav.innerHTML = `
      <details class="department-dropdown">

        <summary><span aria-hidden="true">☰</span> Departamentos <span class="nav-chevron">⌄</span></summary>
        <div class="department-mega-menu">
          <div class="mega-menu-intro">
            <strong>Explore por departamento</strong>
            <span>${categories.length} departamentos disponíveis</span>
            <button type="button" data-nav-category="">Ver todos os produtos</button>
          </div>
          <div class="mega-menu-grid">${menuItems || '<p class="mega-menu-empty">Os departamentos serão exibidos conforme o catálogo for publicado.</p>'}</div>
        </div>
      </details>
      ${topDepartments.map((name) => `<button type="button" class="department-nav-link" data-nav-category="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}
      <a href="#promocoes">Ofertas</a><a href="#novidades">Novidades</a><a href="#produtos">Catálogo</a>
    `;
    const mobileToggle = document.getElementById("mobileDepartmentsToggle");
    if (mobileToggle) {
      mobileToggle.setAttribute("aria-expanded", String(els.departmentNav.classList.contains("is-mobile-open")));
    }
    els.departmentNav.querySelectorAll("[data-nav-category]").forEach((button) => {
      button.addEventListener("click", () => {
        const name = button.dataset.navCategory || "";
        const sub = button.dataset.navSubcategory || "";
        selectDepartment(name);
        if (sub) {
          state.subcategory = sub;
          state.subcategoryKey = categoryKey(sub);
          renderSubcategories();
          renderProducts();
        }
        els.departmentNav.querySelector("details")?.removeAttribute("open");
      });
    });
  }

  function renderDepartmentShowcase() {
    if (!els.departmentShowcase) return;
    const categories = departmentList();
    const section = els.departmentShowcase.closest(".marketplace-categories");
    if (!categories.length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    els.departmentShowcase.innerHTML = categories.map((name) => {
      const category = state.categories.find((item) => categoryKey(item.name) === categoryKey(name));
      const product = state.products.find((item) => isVisible(item) && categoryKey(item.category) === categoryKey(name) && item.image && item.image !== FALLBACK_IMAGE);
      const image = category?.image && category.image !== FALLBACK_IMAGE ? category.image : category?.imageUrl || category?.image_url || product?.image || "";
      return `<button class="department-tile" type="button" data-department-tile="${escapeHtml(name)}">
        <span class="department-tile-image">${image ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.department-tile-image').classList.add('no-image');this.remove()">` : '<span class="department-tile-symbol" aria-hidden="true">' + escapeHtml(name.slice(0,1).toUpperCase()) + '</span>'}</span>
        <strong>${escapeHtml(name)}</strong>
        <span class="department-tile-count">${formatNumber(state.products.filter((item) => isVisible(item) && categoryKey(item.category) === categoryKey(name)).length)} produtos</span>
      </button>`;
    }).join("");
    els.departmentShowcase.querySelectorAll("[data-department-tile]").forEach((button) => {
      button.addEventListener("click", () => selectDepartment(button.dataset.departmentTile));
    });
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

  function renderCategoryCollections(visible) {
    if (!els.categoryCollections) return;
    const names = departmentList().filter((name) => visible.some((product) => categoryKey(product.category) === categoryKey(name))).slice(0, 4);
    if (!names.length) { els.categoryCollections.innerHTML = ""; return; }
    els.categoryCollections.innerHTML = names.map((name) => {
      const products = sortProducts(visible.filter((product) => categoryKey(product.category) === categoryKey(name))).slice(0, 5);
      return '<section class="category-collection"><div class="marketplace-section-heading"><div><span class="eyebrow">Departamento</span><h2>' + escapeHtml(name) + '</h2></div><button type="button" data-collection-category="' + escapeHtml(name) + '">Ver departamento ›</button></div><div class="product-grid marketplace-rail">' + products.map(productCard).join("") + '</div></section>';
    }).join("");
    els.categoryCollections.querySelectorAll("[data-collection-category]").forEach((button) => button.addEventListener("click", () => selectDepartment(button.dataset.collectionCategory)));
  }

  function renderProducts() {
    const visible = state.products.filter(isVisible);
    const usedInShowcases = new Set();
    const takeUnique = (items, limit = 10) => items.filter((item) => {
      const key = String(item.id);
      if (usedInShowcases.has(key)) return false;
      usedInShowcases.add(key);
      return true;
    }).slice(0, limit);
    const flash = takeUnique(visible.filter((item) => item.flashOffer || (item.oldPrice && item.oldPrice > item.price)));
    const best = takeUnique(visible.filter((item) => item.bestSeller));
    const recentCutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const newest = takeUnique(visible.filter((item) => item.createdAt && new Date(item.createdAt).getTime() >= recentCutoff).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    const featured = takeUnique(visible.filter((item) => item.featured));
    const videos = visible.filter((item) => item.videoUrl).slice(0, 10);
    const catalog = sortProducts(filterProducts(visible));
    const pagedCatalog = paginateProducts(catalog);
    const bestSection = els.bestSellerGrid?.closest(".section-block");
    const flashSection = els.flashGrid?.closest(".section-block");
    const videoSection = els.videoGrid?.closest(".section-block");
    const featuredSection = els.featuredGrid?.closest(".section-block");
    renderGrid(els.bestSellerGrid, best, "");
    renderGrid(els.newArrivalsGrid, newest, "");
    renderGrid(els.flashGrid, flash, "");
    renderGrid(els.featuredGrid, featured, "");
    renderGrid(els.videoGrid, videos, "");
    renderGrid(els.catalogGrid, pagedCatalog, "");
    renderPagination(catalog.length, pagedCatalog.length);
    if (bestSection) bestSection.hidden = best.length === 0;
    if (els.newArrivalsGrid?.closest(".section-block")) els.newArrivalsGrid.closest(".section-block").hidden = newest.length === 0;
    if (flashSection) flashSection.hidden = flash.length === 0;
    if (videoSection) videoSection.hidden = videos.length === 0;
    if (featuredSection) featuredSection.hidden = featured.length === 0;

    if (els.catalogCount) {
      const scope = state.subcategoryKey !== "todas" ? `em ${state.subcategory}` : state.categoryKey === "todos" ? "produtos ativos" : `em ${state.category}`;
      els.catalogCount.textContent = `${formatNumber(catalog.length)} ${scope}`;
    }
    if (els.emptyProducts) els.emptyProducts.hidden = catalog.length > 0;
    const catalogSection = els.catalogGrid?.closest(".section-block");
    if (catalogSection) catalogSection.dataset.productCount = String(catalog.length);
    if (els.heroControls) els.heroControls.innerHTML = (normalizeBanners().length > 1 ? normalizeBanners().map((_,i)=>`<button type="button" class="hero-dot ${i===state.bannerIndex?"active":""}" data-hero-index="${i}" aria-label="Banner ${i+1}"></button>`).join("") : "");
    els.heroControls?.querySelectorAll("[data-hero-index]").forEach((button)=>button.addEventListener("click",()=>{state.bannerIndex=Number(button.dataset.heroIndex)||0;els.heroCarousel?.querySelectorAll(".hero-slide").forEach((slide,i)=>slide.classList.toggle("active",i===state.bannerIndex));els.heroControls.querySelectorAll(".hero-dot").forEach((dot,i)=>dot.classList.toggle("active",i===state.bannerIndex));}));
    renderCategoryCollections(visible);
  }

  function productCard(product) {
    const discount = getDiscount(product);
    const favorite = state.favorites.includes(product.id);
    const showRating = storefrontConfig().showCardRating !== false;
    const rating = showRating && product.reviewCount > 0 && product.reviewRating > 0 ? '<div class="rating">' + stars(product.reviewRating) + '<span>' + formatNumber(product.reviewCount) + ' avaliações</span></div>' : '<div class="rating rating-empty" aria-hidden="true"></div>';
    const oldPrice = product.oldPrice && product.oldPrice > product.price ? '<del>' + formatCurrency(product.oldPrice) + '</del>' : "";
    const discountTag = discount ? '<span class="discount-chip">' + discount + '% OFF</span>' : "";
    return '<article class="product-card" data-product-id="' + escapeHtml(product.id) + '">' +
      '<div class="product-image-wrap"><img src="' + escapeHtml(product.image || FALLBACK_IMAGE) + '" alt="' + escapeHtml(product.title) + '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' + FALLBACK_IMAGE + '\';this.classList.add(\'image-fallback\')"></div>' +
      '<div class="product-info"><div class="product-meta"><span class="product-category">' + escapeHtml(product.category) + '</span><button class="favorite-button ' + (favorite ? "active" : "") + '" type="button" data-action="favorite" data-product-id="' + escapeHtml(product.id) + '" aria-label="' + (favorite ? "Remover dos favoritos" : "Adicionar aos favoritos") + '">' + (favorite ? "♥" : "♡") + '</button></div>' +
      '<button class="product-title-button" type="button" data-action="details" data-product-id="' + escapeHtml(product.id) + '"><h3>' + escapeHtml(product.title) + '</h3></button>' + rating +
      '<div class="price-row"><strong>' + formatCurrency(product.price) + '</strong>' + oldPrice + discountTag + '</div>' +
      '<div class="product-actions"><button type="button" class="primary-button compact" data-action="buy" data-product-id="' + escapeHtml(product.id) + '">Comprar agora</button><button type="button" class="secondary-button compact" data-action="details" data-product-id="' + escapeHtml(product.id) + '">Ver detalhes</button></div></div></article>';
  }
  function filterProducts(products) {
    const term = normalizeTerm(state.search);
    return products.filter((product) => {
      const matchCategory = state.categoryKey === "todos" || categoryKey(product.category) === state.categoryKey;
      const matchSubcategory = state.subcategoryKey === "todas" || categoryKey(product.subcategory) === state.subcategoryKey;
      const searchText = searchIndex(product);
      const matchPrice = state.priceRange === "all"
        || (state.priceRange === "under-100" && product.price < 100)
        || (state.priceRange === "100-200" && product.price >= 100 && product.price <= 200)
        || (state.priceRange === "over-200" && product.price > 200);
      return matchCategory && matchSubcategory && matchPrice && (!term || searchText.includes(term));
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
      desktopColumns: 5,
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
        : Math.max(3, Math.min(6, Number(config.desktopColumns || 5)));
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
    const rating = Math.max(0, Math.min(5, Math.round(Number(value || 0) * 2) / 2));
    return `<span class="stars" aria-label="${rating} de 5">&#9733;&#9733;&#9733;&#9733;&#9733;</span>`;
  }

  function installmentText(price) {
    return `ou 3x de ${formatCurrency(Number(price || 0) / 3)} sem juros`;
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
