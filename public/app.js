(function () {
  "use strict";

  const FALLBACK_IMAGE = "./images/placeholder.svg";
  const FAVORITES_KEY = "kairos:favorites";
  const CART_KEY = "kairos:cart";
  const SESSION_KEY = "kairos:session";
  const SCARCITY_DEADLINE_KEY = "kairos:scarcity-deadline";
  const PUBLIC_SITE_URL = "https://www.kairosshopping.com.br";
  const WHATSAPP_GROUP_URL = "https://chat.whatsapp.com/HULOSXTZ7JoKi0yhfj5UMJ?s=cl&p=a&mlu=0";
  const DEFAULT_SETTINGS = window.KAIROS_DEFAULT_SETTINGS || {};
  const SEED_PRODUCTS = Array.isArray(window.KAIROS_SEED_PRODUCTS) ? window.KAIROS_SEED_PRODUCTS : [];
  const DEFAULT_MOBILE_NAV_ITEMS = [
    { icon: "home", label: "Inicio", href: "#inicio" },
    { icon: "grid", label: "Categorias", href: "#categorias" },
    { icon: "search", label: "Busca", href: "#produtos" },
    { icon: "bag", label: "Sacolinha", href: "/carrinho" },
    { icon: "user", label: "Conta", href: "/contato" }
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
    countdownTimer: null,
    heroTimer: null,
    heroIndex: 0
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
    heroStage: document.getElementById("heroStage"),
    heroStats: document.getElementById("heroStats"),
    siteHeader: document.getElementById("siteHeader"),
    menuToggle: document.getElementById("menuToggle"),
    deptButton: document.getElementById("deptButton"),
    deptMenu: document.getElementById("deptMenu"),
    deptLinks: document.getElementById("deptLinks"),
    reviewSection: document.getElementById("avaliacoes")
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    await loadCatalog();
    renderAll();
    renderCartCount();
    applyQueryParams();
    openProductFromLocation();
    trackEvent("page_view", { page: location.pathname || "/" });
    startPresence();
    startRealtimeRefresh();
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    window.addEventListener("popstate", () => {
      if (currentProductFromUrl()) openProductFromLocation();
      else if (els.productModal && !els.productModal.hidden) closeModal({ keepUrl: true });
    });
  }

  async function loadCatalog() {
    try {
      const response = await fetch(`/api/catalog?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Catalog API unavailable");
      const catalog = await response.json();
      const apiProducts = sanitizeProducts(catalog.products || []);
const seedProducts = sanitizeProducts(SEED_PRODUCTS || []);

state.products = hasVisibleProducts(apiProducts) ? apiProducts : seedProducts;
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
      state.settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...(localSettings || {}), reviews: [] });
    }

    try {
      const configResponse = await fetch("/api/config", { cache: "no-store" });
      if (configResponse.ok) state.supabaseConfig = await configResponse.json();
    } catch {
      state.supabaseConfig = null;
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
      if (action === "category") { closeModal(); selectCategory(target.dataset.category); }
      if (action === "gallery") showGalleryImage(target);
      if (action === "video") showGalleryVideo(target);
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

      const heroThumb = event.target.closest("[data-hero-index]");
      if (heroThumb) {
        setHeroSlide(Number(heroThumb.dataset.heroIndex));
        if (state.heroTimer) clearInterval(state.heroTimer);
        return;
      }

      const dept = event.target.closest("[data-dept]");
      if (dept) {
        const label = dept.dataset.dept;
        selectCategory(label, dept.dataset.sub || "");
        return;
      }

      const chip = event.target.closest("[data-category-key]");
      if (chip) {
        selectCategory(chip.dataset.category);
        return;
      }

      const subChip = event.target.closest("[data-subcategory-key]");
      if (subChip) {
        state.subcategory = subChip.dataset.subcategory || "Todas";
        state.subcategoryKey = subChip.dataset.subcategoryKey || categoryKey(state.subcategory);
        resetCatalogPagination();
        trackEvent("category_filter", { category: state.category, subcategory: state.subcategory });
        renderSubcategories();
        renderProducts();
        return;
      }

      if (event.target.closest("#deptButton, #menuToggle")) {
        toggleDepartments();
        return;
      }
      if (els.deptMenu && !els.deptMenu.hidden && !event.target.closest(".dept-trigger")) closeDepartments();

      const button = event.target.closest("[data-action]");
      if (!button) return;
      if (button.tagName === "A" && !(event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1)) event.preventDefault();
      else if (button.tagName === "A") return;
      const id = button.dataset.productId;
      if (button.dataset.action === "details") openProduct(id);
      if (button.dataset.action === "buy") buyProduct(id);
      if (button.dataset.action === "cart") toggleCart(id);
      if (button.dataset.action === "share") shareProduct(id);
      if (button.dataset.action === "favorite") toggleFavorite(id);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (els.productModal && !els.productModal.hidden) closeModal();
      closeDepartments();
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
    renderDepartments();
    renderProducts();
    renderHero();
    renderReviews();
    renderFaq();
    renderAssistant();
    renderSocial();
    renderMobileBottomNav();
  }

  function applySettings() {
    const promo = state.settings.promoBar || {};
    const promoText = promoTextWithCountdown();
    setMarquee(els.promoBar, promo, promoText);
    if (els.footerPromoBar) els.footerPromoBar.textContent = promoText;

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
    container.hidden = promo.enabled === false;
    const text = promo.text || fallbackText;
    container.innerHTML = `
      <div class="ub-inner">
        <span class="ub-msg">${icon("truck")}${escapeHtml(text)}</span>
        <span class="ub-links"><a href="/rastreio">Rastrear pedido</a><a href="/contato">Atendimento</a></span>
      </div>
    `;
  }

  function promoTextWithCountdown() {
    return state.settings.promoBar?.text || "Frete gratis para todo o Brasil";
  }

  function startScarcityCountdown() {
    if (state.countdownTimer) clearInterval(state.countdownTimer);
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
          ${icon(navIconFor(item))}
          <small>${escapeHtml(item.label || "Loja")}</small>
        </a>
      `;
    }).join("");
    renderCartCount();
  }

  function renderHero() {
    if (!els.heroStage) return;
    const visible = state.products.filter(isVisible).filter((item) => item.image && item.image !== FALLBACK_IMAGE);
    const pool = [...visible.filter((item) => item.featured && item.bestSeller), ...visible.filter((item) => item.featured), ...visible];
    const seenCategories = new Set();
    const picks = [];
    pool.forEach((item) => {
      if (picks.length >= 4 || picks.includes(item)) return;
      const key = categoryKey(item.category);
      if (seenCategories.has(key)) return;
      seenCategories.add(key);
      picks.push(item);
    });
    const categoriesCount = new Set(visible.map((item) => categoryKey(item.category))).size;
    if (els.heroStats) {
      els.heroStats.innerHTML = `
        <li><strong>${formatNumber(state.products.filter(isVisible).length)}</strong><span>produtos no catálogo</span></li>
        <li><strong>${formatNumber(categoriesCount)}</strong><span>departamentos</span></li>
        <li><strong>100%</strong><span>com frete grátis</span></li>
      `;
    }
    if (!picks.length) {
      els.heroStage.innerHTML = "";
      return;
    }
    state.heroIndex = Math.min(state.heroIndex, picks.length - 1);
    els.heroStage.innerHTML = `
      <div class="stage-main">
        ${picks.map((product, index) => {
          const discount = getDiscount(product);
          const id = escapeHtml(product.id);
          return `
            <article class="stage-slide ${index === state.heroIndex ? "active" : ""}" data-hero-slide="${index}">
              <a class="stage-photo" href="/produto/${encodeURIComponent(product.slug)}" data-action="details" data-product-id="${id}" aria-label="${escapeHtml(product.title)}"><img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" ${index === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></a>
              <div class="stage-info">
                <span class="stage-cat">${escapeHtml(product.category)}</span>
                <h2>${escapeHtml(product.title)}</h2>
                <div class="price-row"><strong>${formatCurrency(product.price)}</strong>${product.oldPrice && discount ? `<del>${formatCurrency(product.oldPrice)}</del><span class="off">-${discount}%</span>` : ""}</div>
                <span class="installment">${installmentText(product.price)}</span>
                <a class="btn btn-primary" href="/produto/${encodeURIComponent(product.slug)}" data-action="details" data-product-id="${id}">Ver produto ${icon("arrow")}</a>
              </div>
            </article>`;
        }).join("")}
      </div>
      <div class="stage-thumbs" role="tablist" aria-label="Produtos em destaque">
        ${picks.map((product, index) => `
          <button type="button" role="tab" class="${index === state.heroIndex ? "active" : ""}" data-hero-index="${index}" aria-selected="${index === state.heroIndex}" aria-label="${escapeHtml(shortTitle(product.title))}">
            <img src="${escapeHtml(product.image)}" alt="" loading="lazy" decoding="async">
          </button>`).join("")}
      </div>
    `;
    if (state.heroTimer) clearInterval(state.heroTimer);
    if (picks.length > 1) {
      state.heroTimer = setInterval(() => setHeroSlide((state.heroIndex + 1) % picks.length), 6000);
    }
  }

  function setHeroSlide(index) {
    state.heroIndex = index;
    els.heroStage?.querySelectorAll("[data-hero-slide]").forEach((node) => node.classList.toggle("active", Number(node.dataset.heroSlide) === index));
    els.heroStage?.querySelectorAll("[data-hero-index]").forEach((node) => {
      const on = Number(node.dataset.heroIndex) === index;
      node.classList.toggle("active", on);
      node.setAttribute("aria-selected", String(on));
    });
  }

  function selectCategory(label, sub) {
    state.category = label || "Todos";
    state.categoryKey = categoryKey(state.category);
    state.subcategory = sub || "Todas";
    state.subcategoryKey = sub ? categoryKey(sub) : "todas";
    state.search = "";
    if (els.searchInput) els.searchInput.value = "";
    resetCatalogPagination();
    trackEvent("category_filter", { category: state.category, subcategory: state.subcategory });
    closeDepartments();
    renderCategories();
    renderProducts();
    document.getElementById("produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function departmentData() {
    const visible = state.products.filter(isVisible);
    const map = new Map();
    visible.forEach((product) => {
      const key = categoryKey(product.category);
      if (!map.has(key)) map.set(key, { label: product.category, count: 0, subs: new Map() });
      const entry = map.get(key);
      entry.count += 1;
      if (product.subcategory) entry.subs.set(product.subcategory, (entry.subs.get(product.subcategory) || 0) + 1);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
  }

  function renderDepartments() {
    const departments = departmentData();
    if (els.deptLinks) {
      els.deptLinks.innerHTML = departments.slice(0, 6).map((entry) => `<button type="button" data-dept="${escapeHtml(entry.label)}">${escapeHtml(entry.label)}</button>`).join("");
    }
    if (els.deptMenu) {
      els.deptMenu.innerHTML = `
        <div class="dept-grid">
          ${departments.map((entry) => `
            <div class="dept-col">
              <button type="button" class="dept-title" data-dept="${escapeHtml(entry.label)}">${escapeHtml(entry.label)} <small>${formatNumber(entry.count)}</small></button>
              ${Array.from(entry.subs.keys()).slice(0, 5).map((sub) => `<button type="button" class="dept-sub" data-dept="${escapeHtml(entry.label)}" data-sub="${escapeHtml(sub)}">${escapeHtml(sub)}</button>`).join("")}
            </div>`).join("")}
        </div>
        <button type="button" class="dept-all" data-dept="Todos">Ver todos os produtos ${icon("arrow")}</button>
      `;
    }
  }

  function toggleDepartments(force) {
    const open = typeof force === "boolean" ? force : els.deptMenu?.hidden;
    if (els.deptMenu) els.deptMenu.hidden = !open;
    els.deptButton?.setAttribute("aria-expanded", String(Boolean(open)));
    els.menuToggle?.setAttribute("aria-expanded", String(Boolean(open)));
    els.siteHeader?.classList.toggle("nav-open", Boolean(open));
    if (open && els.siteHeader) {
      const main = els.siteHeader.querySelector(".header-main");
      els.siteHeader.style.setProperty("--hdr", `${Math.round(main.getBoundingClientRect().bottom)}px`);
    }
  }

  function closeDepartments() {
    toggleDepartments(false);
  }

  function renderBanners() {
    if (!els.heroCarousel) return;
    const banners = normalizeBanners();
    if (state.bannerTimer) clearInterval(state.bannerTimer);
    if (!banners.length) {
      els.heroCarousel.hidden = true;
      els.heroCarousel.innerHTML = "";
      return;
    }
    els.heroCarousel.hidden = false;
    state.bannerIndex = Math.min(state.bannerIndex, banners.length - 1);
    els.heroCarousel.innerHTML = banners.map((banner, index) => {
      const desktop = banner.desktopImage || banner.image || state.settings.bannerUrl;
      const mobile = banner.mobileImage || desktop;
      const desktopVideo = banner.videoUrl || banner.desktopVideoUrl || "";
      const mobileVideo = banner.mobileVideoUrl || desktopVideo || "";
      const href = banner.link || banner.buttonLink || "#produtos";
      return `
        <a class="banner-slide ${index === state.bannerIndex ? "active" : ""}" href="${escapeHtml(href)}" ${/^https?:/i.test(href) ? 'target="_blank" rel="noopener"' : ""}>
          ${desktopVideo || mobileVideo ? bannerVideoMarkup(desktopVideo, mobileVideo, desktop, banner.title) : `
            <picture>
              <source media="(max-width: 640px)" srcset="${escapeHtml(mobile)}">
              <img src="${escapeHtml(desktop)}" alt="${escapeHtml(banner.title || "Campanha Kairos Shopping")}" loading="lazy">
            </picture>
          `}
        </a>
      `;
    }).join("");
    if (banners.length > 1) {
      state.bannerTimer = setInterval(() => {
        state.bannerIndex = (state.bannerIndex + 1) % banners.length;
        els.heroCarousel.querySelectorAll(".banner-slide").forEach((slide, index) => {
          slide.classList.toggle("active", index === state.bannerIndex);
        });
      }, 6000);
    }
  }

  function bannerVideoMarkup(desktopVideo, mobileVideo, poster, title) {
    return `
      <video class="hero-video" autoplay muted loop playsinline preload="metadata" poster="${escapeHtml(poster || "")}" aria-label="${escapeHtml(title || "Banner Kairos Shopping")}">
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
      history.pushState({ productId: product.id }, "", `/produto/${encodeURIComponent(product.slug || slugify(product.title))}`);
    }
    applyProductSeo(product);
    if (!options.silent) {
      trackEvent("product_view", { product_id: product.id, product_name: product.title, category: product.category, price: Number(product.price || 0) });
      trackPixel("ViewContent", { content_ids: [product.id], content_name: product.title, content_category: product.category, value: Number(product.price || 0), currency: "BRL" });
    }
    const previousScroll = options.silent ? (els.productModal.scrollTop || 0) : 0;
    const favorite = state.favorites.includes(product.id);
    const inCart = state.cart.includes(product.id);
    const related = relatedProducts(product);
    const discount = getDiscount(product);
    const images = [...new Set([product.image || FALLBACK_IMAGE, ...(product.gallery || []).filter(Boolean)])];
    const ytId = youtubeId(product.videoUrl);
    const pid = escapeHtml(product.id);
    const thumbs = [
      ...images.map((src, index) => `<button type="button" class="gthumb ${index === 0 ? "active" : ""}" data-modal-action="gallery" data-src="${escapeHtml(src)}" aria-label="Foto ${index + 1}"><img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"></button>`),
      ...(product.videoUrl ? [`<button type="button" class="gthumb gthumb-video" data-modal-action="video" aria-label="Vídeo do produto">${icon("play")}<span>Vídeo</span></button>`] : [])
    ];
    els.productModal.hidden = false;
    document.body.classList.add("product-open");
    els.productModal.innerHTML = `
      <div class="pp-topbar">
        <button type="button" class="pp-back" data-modal-action="close">${icon("arrow")}<span>Voltar à loja</span></button>
        <a class="brand" href="/"><img src="/assets/logo-kairos-oficial.png" alt="" width="40" height="40"><span class="brand-text"><strong>KAIRÓS</strong><small>SHOPPING</small></span></a>
        <a class="pp-cart" href="/carrinho">${icon("bag")}<span>Sacolinha</span><b>${state.cart.length}</b></a>
      </div>
      <article class="pp">
        <nav class="pp-crumbs" aria-label="Você está em">
          <button type="button" data-modal-action="close">Início</button><span>/</span>
          <button type="button" data-modal-action="category" data-category="${escapeHtml(product.category)}">${escapeHtml(product.category)}</button>
          ${product.subcategory ? `<span>/</span><span>${escapeHtml(product.subcategory)}</span>` : ""}
        </nav>
        <div class="pp-grid">
          <div class="pp-gallery ${thumbs.length > 1 ? "has-thumbs" : ""}">
            ${thumbs.length > 1 ? `<div class="gthumbs">${thumbs.join("")}</div>` : ""}
            <div class="gstage" id="gStage">
              <img id="modalMainImg" src="${escapeHtml(images[0])}" alt="${escapeHtml(product.title)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
              ${discount ? `<span class="pc-badge">-${discount}%</span>` : ""}
            </div>
          </div>
          <div class="pp-buy">
            <span class="pc-cat">${escapeHtml(product.category)}${product.subcategory ? ` · ${escapeHtml(product.subcategory)}` : ""}</span>
            <h1>${escapeHtml(product.title)}</h1>
            ${product.reviewCount > 0 ? `<div class="rating">${stars(product.reviewRating)}<span>${Number(product.reviewRating).toLocaleString("pt-BR")} · ${formatNumber(product.reviewCount)} avaliações</span></div>` : ""}
            <div class="pp-price">
              <div class="price-row large"><strong>${formatCurrency(product.price)}</strong>${product.oldPrice && discount ? `<del>${formatCurrency(product.oldPrice)}</del><span class="off">-${discount}%</span>` : ""}</div>
              <p class="installment">${installmentText(product.price)}</p>
            </div>
            <ul class="pp-perks">
              <li>${icon("truck")}<span><strong>Frete grátis</strong> para todo o Brasil</span></li>
              <li>${icon("shield")}<span><strong>Compra segura</strong> no checkout oficial</span></li>
              <li>${icon("pin")}<span><strong>Pedido com rastreamento</strong></span></li>
            </ul>
            <div class="pp-actions">
              <button class="btn btn-primary btn-lg" type="button" data-modal-action="buy" data-product-id="${pid}">Comprar agora</button>
              <button class="btn btn-outline btn-lg" type="button" data-modal-action="cart" data-product-id="${pid}">${icon("bag")}${inCart ? "Remover da sacolinha" : "Adicionar à sacolinha"}</button>
              <div class="pp-secondary">
                <button type="button" data-modal-action="favorite" data-product-id="${pid}" class="${favorite ? "active" : ""}">${icon("heart")}${favorite ? "Favoritado" : "Favoritar"}</button>
                <button type="button" data-modal-action="share" data-product-id="${pid}">${icon("share")}Compartilhar</button>
                <a href="${escapeHtml(whatsappUrl(product))}" target="_blank" rel="noopener">${icon("chat")}Tirar dúvidas</a>
              </div>
            </div>
          </div>
        </div>
        <div class="pp-details">
          <section>
            <h2>Sobre o produto</h2>
            <div class="pp-text">${escapeHtml(product.description || product.shortDescription || "Consulte o atendimento para mais detalhes deste produto.")}</div>
          </section>
          <aside>
            <h3>Entrega</h3>
            <p>Logo após o pagamento, o pedido é processado em até 2 dias úteis. O envio geralmente leva de 3 a 15 dias úteis, conforme o fornecedor e a sua localidade.</p>
            <h3>Trocas e devoluções</h3>
            <p>${escapeHtml(state.settings.content?.returns || "Consulte a política de trocas e devoluções da loja.")}</p>
          </aside>
        </div>
        ${related.length ? `
          <section class="pp-related">
            <h2>Você também pode gostar</h2>
            <div class="product-grid">${related.map(productCard).join("")}</div>
          </section>` : ""}
      </article>
    `;
    els.productModal.scrollTop = previousScroll;
    els.productModal.dataset.ytId = ytId;
    els.productModal.dataset.videoUrl = product.videoUrl || "";
  }

  function closeModal(options = {}) {
    els.productModal.hidden = true;
    els.productModal.innerHTML = "";
    document.body.classList.remove("product-open");
    if (!options.keepUrl && location.pathname.startsWith("/produto/")) {
      history.pushState({}, "", "/");
    }
    applyProductSeo(null);
  }

  function showGalleryImage(button) {
    const stage = document.getElementById("gStage");
    if (!stage) return;
    stage.querySelector("iframe, video")?.remove();
    let img = document.getElementById("modalMainImg");
    if (!img) {
      img = document.createElement("img");
      img.id = "modalMainImg";
      stage.prepend(img);
    }
    img.hidden = false;
    img.src = button.dataset.src;
    els.productModal.querySelectorAll(".gthumb").forEach((node) => node.classList.toggle("active", node === button));
  }

  function showGalleryVideo(button) {
    const stage = document.getElementById("gStage");
    if (!stage) return;
    const ytId = els.productModal.dataset.ytId;
    const url = els.productModal.dataset.videoUrl || "";
    stage.querySelector("iframe, video")?.remove();
    const img = document.getElementById("modalMainImg");
    if (ytId) {
      if (img) img.hidden = true;
      stage.insertAdjacentHTML("afterbegin", `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId)}?rel=0" title="Vídeo do produto" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`);
    } else if (/\.(mp4|webm)(\?|$)/i.test(url)) {
      if (img) img.hidden = true;
      stage.insertAdjacentHTML("afterbegin", `<video src="${escapeHtml(url)}" controls playsinline></video>`);
    } else if (url) {
      window.open(url, "_blank", "noopener");
      return;
    }
    els.productModal.querySelectorAll(".gthumb").forEach((node) => node.classList.toggle("active", node === button));
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
    if (els.reviewSection) els.reviewSection.hidden = reviews.length === 0;
    if (!els.reviewGrid) return;
    els.reviewGrid.innerHTML = reviews.map((review) => `
      <article class="review-card">
        <div class="rc-head">${stars(review.rating)}<strong>${escapeHtml(review.name)}</strong></div>
        <p>${escapeHtml(review.text)}</p>
        <span>${escapeHtml(review.product || "Compra Kairos")}${review.city ? ` · ${escapeHtml(review.city)}` : ""}${review.date ? ` · ${formatReviewDate(review.date)}` : ""}</span>
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
    if (els.cartCount) {
      els.cartCount.textContent = String(state.cart.length);
      els.cartCount.hidden = state.cart.length === 0;
    }
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
      flashOffer: Boolean(product.flashOffer),
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
      whatsappGroupUrl: settings.whatsappGroupUrl || settings.social?.whatsappGroupUrl || WHATSAPP_GROUP_URL,
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
      reviews: Array.isArray(settings.reviews) ? settings.reviews : []
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
    const normalized = source.slice(0, 5).map((item, index) => ({
      icon: String(item.icon || DEFAULT_MOBILE_NAV_ITEMS[index]?.icon || "bag"),
      label: String(item.label || DEFAULT_MOBILE_NAV_ITEMS[index]?.label || "Loja"),
      href: String(item.href || DEFAULT_MOBILE_NAV_ITEMS[index]?.href || "#inicio")
    }));
    if (!normalized.some((item) => item.href === "/carrinho")) normalized[Math.max(0, normalized.length - 2)] = DEFAULT_MOBILE_NAV_ITEMS[3];
    if (!normalized.some((item) => item.href === "/contato")) normalized[normalized.length - 1] = DEFAULT_MOBILE_NAV_ITEMS[4];
    return normalized;
  }

  function navIconFor(item) {
    const text = normalizeTerm(item.label);
    if (item.href === "/carrinho" || text.includes("sacol") || text.includes("carrinho")) return "bag";
    if (item.href === "/contato" || text.includes("conta") || text.includes("contato")) return "user";
    if (text.includes("rastre")) return "box";
    if (text.includes("oferta") || text.includes("promo")) return "bolt";
    if (text.includes("busca")) return "search";
    if (text.includes("categ") || text.includes("produto")) return "grid";
    return "home";
  }

  function normalizeReviews(value) {
    const reviews = Array.isArray(value) ? value : [];
    return reviews
      .filter((item) => item.featured !== false)
      .sort((a, b) => new Date(b.date || b.created_at || 0) - new Date(a.date || a.created_at || 0));
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
    const others = state.products.filter((item) => isVisible(item) && item.id !== product.id);
    const same = others.filter((item) => categoryKey(item.category) === categoryKey(product.category));
    return [...same, ...others.filter((item) => !same.includes(item))].slice(0, 4);
  }

  function normalizeBanners() {
    return (state.settings.banners || [])
      .filter((banner) => banner && banner.active !== false && (banner.desktopImage || banner.image || banner.videoUrl || banner.desktopVideoUrl))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .slice(0, 4);
  }

  function applyProductSeo(product) {
    document.title = product ? `${product.title} | Kairos Shopping` : "Kairos Shopping | Produtos selecionados com frete gratis para todo o Brasil";
    setMeta("description", product ? (product.shortDescription || product.description || "Produto Kairos Shopping").slice(0, 155) : "Compre produtos selecionados na Kairos Shopping. Frete gratis para todo o Brasil, pedido com rastreamento e checkout externo oficial por produto.");
    setMeta("og:title", product ? product.title : "Kairos Shopping", true);
    setMeta("og:description", product ? (product.shortDescription || product.description || "Produto Kairos Shopping").slice(0, 180) : "Tudo que voce procura, em um so lugar. Produtos selecionados, frete gratis e rastreamento.", true);
    setMeta("og:image", absoluteUrl(product?.image || "./assets/capa-kairos-nova.jpeg"), true);
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
      return `${PUBLIC_SITE_URL}/assets/capa-kairos-nova.jpeg`;
    }
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
    const departments = departmentData();
    const total = state.products.filter(isVisible).length;
    const tiles = [{ label: "Todos", count: total }, ...departments];
    els.categoryRail.innerHTML = tiles.map((entry) => {
      const key = categoryKey(entry.label);
      return `
      <button class="category-tile ${state.categoryKey === key ? "active" : ""}" type="button" data-category="${escapeHtml(entry.label)}" data-category-key="${escapeHtml(key)}">
        <span class="ct-photo"><img src="${escapeHtml(categoryCover(entry.label))}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"></span>
        <strong>${entry.label === "Todos" ? "Todos os produtos" : escapeHtml(entry.label)}</strong>
        <small>${formatNumber(entry.count)} ${entry.count === 1 ? "item" : "itens"}</small>
      </button>`;
    }).join("");
    renderSubcategories();
  }

  function renderSubcategories() {
    if (!els.subcategoryRail) return;
    const visible = state.products.filter(isVisible);
    const productsInCategory = visible.filter((product) => state.categoryKey === "todos" || categoryKey(product.category) === state.categoryKey);
    const counts = new Map();
    productsInCategory.forEach((product) => {
      if (!product.subcategory) return;
      const key = categoryKey(product.subcategory);
      const entry = counts.get(key) || { label: product.subcategory, key, count: 0 };
      entry.count += 1;
      counts.set(key, entry);
    });
    const subs = Array.from(counts.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "pt-BR"));
    const chips = [{ label: "Todas", key: "todas", count: productsInCategory.length }, ...subs];
    const filtered = state.categoryKey !== "todos";
    els.subcategoryRail.hidden = !filtered || subs.length === 0;
    els.subcategoryRail.innerHTML = chips.map((chip) => `
      <button class="chip ${state.subcategoryKey === chip.key ? "active" : ""}" type="button" data-subcategory="${escapeHtml(chip.label)}" data-subcategory-key="${escapeHtml(chip.key)}">${escapeHtml(chip.label)} <small>${formatNumber(chip.count)}</small></button>
    `).join("");
  }

  function renderProducts() {
    const visible = state.products.filter(isVisible);
    const best = visible.filter((item) => item.bestSeller).slice(0, 8);
    const flash = visible.filter((item) => item.flashOffer).slice(0, 8);
    const videos = visible.filter((item) => item.videoUrl).slice(0, 8);
    const catalog = sortProducts(filterProducts(visible));
    const pagedCatalog = paginateProducts(catalog);
    const bestSection = els.bestSellerGrid?.closest(".section-block");
    const flashSection = els.flashGrid?.closest(".section-block");
    const videoSection = els.videoGrid?.closest(".section-block");
    renderGrid(els.bestSellerGrid, best.length ? best : visible.slice(0, 8), "");
    renderGrid(els.flashGrid, flash, "");
    renderGrid(els.videoGrid, videos, "");
    renderGrid(els.catalogGrid, pagedCatalog, "");
    renderPagination(catalog.length, pagedCatalog.length);
    if (bestSection) bestSection.hidden = visible.length === 0;
    if (flashSection) flashSection.hidden = flash.length === 0;
    if (videoSection) videoSection.hidden = videos.length === 0;
    if (els.catalogCount) {
      const scope = state.subcategoryKey !== "todas" ? `em ${state.subcategory}` : state.categoryKey === "todos" ? (catalog.length === 1 ? "produto" : "produtos") : `em ${state.category}`;
      els.catalogCount.textContent = `${formatNumber(catalog.length)} ${scope}`;
    }
    if (els.emptyProducts) els.emptyProducts.hidden = catalog.length > 0;
  }

  function productCard(product) {
    const discount = getDiscount(product);
    const favorite = state.favorites.includes(product.id);
    const inCart = state.cart.includes(product.id);
    const storefront = storefrontConfig();
    const badge = storefront.showCardBadge !== false ? badgeText(product) : "";
    const href = `/produto/${encodeURIComponent(product.slug || slugify(product.title))}`;
    const id = escapeHtml(product.id);
    return `
      <article class="product-card" data-product-id="${id}">
        <a class="pc-media" href="${href}" data-action="details" data-product-id="${id}" aria-label="${escapeHtml(product.title)}">
          <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
          ${badge ? `<span class="pc-badge">${escapeHtml(badge)}</span>` : ""}
          ${product.videoUrl ? `<span class="pc-video">${icon("play")}Vídeo</span>` : ""}
        </a>
        <button class="pc-fav ${favorite ? "active" : ""}" type="button" data-action="favorite" data-product-id="${id}" aria-label="${favorite ? "Remover dos favoritos" : "Favoritar"}" aria-pressed="${favorite}">${icon("heart")}</button>
        <div class="pc-body">
          <span class="pc-cat">${escapeHtml(product.subcategory || product.category)}</span>
          <h3><a href="${href}" data-action="details" data-product-id="${id}">${escapeHtml(product.title)}</a></h3>
          ${storefront.showCardRating !== false && product.reviewCount > 0 ? `<div class="rating">${stars(product.reviewRating)}<span>${formatNumber(product.reviewCount)}</span></div>` : ""}
          <div class="price-row">
            <strong>${formatCurrency(product.price)}</strong>
            ${product.oldPrice && discount ? `<del>${formatCurrency(product.oldPrice)}</del><span class="off">-${discount}%</span>` : ""}
          </div>
          <span class="installment">${installmentText(product.price)}</span>
          <span class="pc-ship">${icon("truck")}Frete grátis</span>
          <div class="pc-actions">
            <button type="button" class="btn btn-primary" data-action="buy" data-product-id="${id}">Comprar agora</button>
            <button type="button" class="btn-icon ${inCart ? "active" : ""}" data-action="cart" data-product-id="${id}" aria-label="${inCart ? "Remover da sacolinha" : "Adicionar à sacolinha"}" title="${inCart ? "Na sacolinha" : "Adicionar à sacolinha"}">${icon("bag")}</button>
          </div>
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



  function stars(value) {
    const rating = Math.max(0, Math.min(5, Number(value || 0)));
    return `<span class="stars" style="--p:${(rating / 5 * 100).toFixed(0)}%" role="img" aria-label="${rating.toLocaleString("pt-BR")} de 5">&#9733;&#9733;&#9733;&#9733;&#9733;</span>`;
  }

  function icon(name) {
    return `<svg class="ic" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  }

  function badgeText(product) {
    const tag = String(product.tag || "").replace(/[^\p{L}\p{N}\s%$.,-]/gu, "").trim();
    if (!tag || /frete/i.test(tag)) return "";
    return tag.slice(0, 28);
  }

  function youtubeId(url) {
    const match = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/|watch\?(?:.*&)?v=))([\w-]{11})/i);
    return match ? match[1] : "";
  }

  function categoryCover(label) {
    const key = categoryKey(label);
    const item = state.products.filter(isVisible).find((product) => key === "todos" || categoryKey(product.category) === key);
    return item ? item.image : FALLBACK_IMAGE;
  }

  function applyQueryParams() {
    const q = new URLSearchParams(location.search).get("q");
    if (!q) return;
    state.search = q.trim();
    if (els.searchInput) els.searchInput.value = state.search;
    renderProducts();
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
