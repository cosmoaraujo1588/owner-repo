(function () {
  "use strict";

  const FALLBACK_IMAGE = "./images/placeholder.svg";
  const LOCAL_PRODUCTS_KEY = "kairos:local-products";
  const LOCAL_SETTINGS_KEY = "kairos:local-settings";
  const TOKEN_KEY = "kairos:admin-token";
  const DEFAULT_MOBILE_NAV_ITEMS = [
    { icon: "&#127968;", label: "Inicio", href: "#inicio" },
    { icon: "&#128717;&#65039;", label: "Produtos", href: "#produtos" },
    { icon: "&#128194;", label: "Categorias", href: "#categoryRail" },
    { icon: "&#9889;", label: "Ofertas", href: "#promocoes" },
    { icon: "&#128230;", label: "Rastreio", href: "#rastreio" }
  ];
  const BASE_CATEGORIES = [
    "Eletrônicos",
    "Roupas",
    "Utilidades",
    "Brinquedos",
    "Automotivo",
    "Promoções"
  ];

  const state = {
    products: [],
    settings: window.KAIROS_DEFAULT_SETTINGS || {},
    categories: [],
    subcategories: [],
    token: localStorage.getItem(TOKEN_KEY) || "",
    reports: [],
    reportSummary: {},
    leads: [],
    reportTimer: null
  };

  const forms = {};
  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheEls();
    await ensureAdminAccess();
    bindNavigation();
    bindForms();
    await loadCatalog();
    await loadReports();
    await loadLeads();
    renderAll();
    state.reportTimer = setInterval(async () => {
      await loadReports();
      await loadLeads();
      renderReports();
      renderMetrics();
      renderLeads();
    }, 15000);
  }

  async function ensureAdminAccess() {
    try {
      const config = await fetch("/api/config", { cache: "no-store" }).then((res) => res.json());
      if (!config.adminProtected || state.token) return;
      const user = prompt("Usuario administrador");
      const password = prompt("Senha do painel");
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password })
      });
      if (!response.ok) {
        alert("Acesso administrativo invalido.");
        location.href = "./index.html";
        return;
      }
      const data = await response.json();
      state.token = data.token || "";
      if (state.token) localStorage.setItem(TOKEN_KEY, state.token);
    } catch {
      // If the API is not available, keep local open mode for development.
    }
  }

  function cacheEls() {
    [
      "metricGrid", "connectionStatus", "productList", "productCount", "categoryList",
      "reviewList", "categoryOptions", "subcategoryOptions", "subcategoryList", "productReportRows",
      "visitsChart", "liveMetricGrid", "storeHealthGrid", "topProductRows",
      "leadRows", "leadCount", "bannerList"
    ].forEach((id) => els[id] = document.getElementById(id));

    [
      "productForm", "categoryForm", "subcategoryForm", "bannerForm", "reviewForm", "contentForm",
      "marketingForm", "settingsForm"
    ].forEach((id) => forms[id] = document.getElementById(id));
  }

  async function loadCatalog() {
    try {
      const response = await fetch(`/api/catalog?includeInactive=1&t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("API indisponivel");
      const catalog = await response.json();
      state.products = normalizeProducts(catalog.products || []);
      const apiReviews = Array.isArray(catalog.reviews) ? catalog.reviews : [];
      state.settings = normalizeSettings({ ...(window.KAIROS_DEFAULT_SETTINGS || {}), ...(catalog.settings || {}) });
      if (apiReviews.length) state.settings.reviews = apiReviews;
      state.categories = normalizeCategories(catalog.categories || []);
      state.subcategories = normalizeSubcategories(catalog.subcategories || []);
      setStatus("Conectado ao backend Supabase/Vercel quando as variaveis estiverem configuradas. Produtos carregados.");
    } catch {
      state.products = normalizeProducts(readJson(LOCAL_PRODUCTS_KEY, window.KAIROS_SEED_PRODUCTS || []));
      state.settings = normalizeSettings({ ...(window.KAIROS_DEFAULT_SETTINGS || {}), ...readJson(LOCAL_SETTINGS_KEY, {}) });
      state.categories = normalizeCategories([]);
      state.subcategories = normalizeSubcategories([]);
      setStatus("Modo local ativo. O painel funciona para edicao local e esta pronto para Supabase/Vercel quando as variaveis forem configuradas.");
    }

    ensureCategoriesFromProducts();
    ensureSubcategoriesFromProducts();
    fillForms();
  }

  async function saveCatalog() {
    if (!ensureProductImagesArePublic()) return;
    const payload = {
      products: state.products,
      categories: state.categories,
      subcategories: state.subcategories,
      settings: state.settings
    };

    try {
      const response = await fetch("/api/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(await response.text());
      await loadCatalog();
      toast("Alteracoes salvas no backend.");
    } catch (error) {
      if (location.protocol === "https:") {
        alert(`Nao foi possivel salvar no Supabase/Vercel. Nada foi publicado para os clientes. Erro: ${error.message || "falha desconhecida"}`);
        throw error;
      }
      localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(state.products));
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(state.settings));
      toast("Alteracoes salvas localmente. Configure Supabase/Vercel para salvar em producao.");
    }

    renderAll();
  }

  async function loadReports() {
    try {
      const range = document.getElementById("reportRange")?.value || "today";
      const response = await fetch(`/api/events?range=${encodeURIComponent(range)}&t=${Date.now()}`, {
        headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
        cache: "no-store"
      });
      if (!response.ok) throw new Error("reports unavailable");
      const data = await response.json();
      state.reports = Array.isArray(data.events) ? data.events : [];
      state.reportSummary = data.summary || {};
    } catch {
      state.reports = readJson("kairos:local-events", []);
      state.reportSummary = {};
    }
  }

  async function loadLeads() {
    try {
      const response = await fetch(`/api/leads?t=${Date.now()}`, {
        headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
        cache: "no-store"
      });
      if (!response.ok) throw new Error("leads unavailable");
      const data = await response.json();
      state.leads = Array.isArray(data.leads) ? data.leads : [];
    } catch {
      state.leads = readJson("kairos:local-leads", []);
    }
  }

  function bindNavigation() {
    document.getElementById("adminNav")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-section]");
      if (!button) return;
      document.querySelectorAll(".admin-nav button").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".admin-section").forEach((section) => section.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(`section-${button.dataset.section}`)?.classList.add("active");
      document.body.classList.remove("admin-menu-open");
    });

    document.getElementById("adminMenuToggle")?.addEventListener("click", () => {
      document.body.classList.toggle("admin-menu-open");
    });
    document.getElementById("saveAllButton")?.addEventListener("click", saveCatalog);
    document.getElementById("newProductButton")?.addEventListener("click", () => forms.productForm.reset());
    document.getElementById("newCategoryButton")?.addEventListener("click", () => forms.categoryForm.reset());
    document.getElementById("newSubcategoryButton")?.addEventListener("click", () => forms.subcategoryForm?.reset());
    document.getElementById("newReviewButton")?.addEventListener("click", () => forms.reviewForm.reset());
    document.getElementById("newBannerButton")?.addEventListener("click", () => resetBannerCarouselFields());
    document.getElementById("refreshReports")?.addEventListener("click", async () => {
      await loadReports();
      renderReports();
    });
    document.getElementById("refreshLeads")?.addEventListener("click", async () => {
      await loadLeads();
      renderLeads();
    });
    document.getElementById("exportCsv")?.addEventListener("click", exportReportsCsv);
    document.getElementById("exportLeadsCsv")?.addEventListener("click", exportLeadsCsv);
  }

  function bindForms() {
    forms.productForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const file = form.elements.imageFile.files?.[0];
      let productImage = clean(data.image);
      try {
        if (file) {
          productImage = await uploadMedia(file, data.title, "product-image");
          form.elements.image.value = productImage;
        } else {
          productImage = normalizePublicImageUrl(productImage || FALLBACK_IMAGE);
        }
      } catch (error) {
        alert(error.message || "Nao foi possivel enviar a imagem para o storage publico.");
        return;
      }
      if (!productImage) {
        alert("Imagem invalida. Envie um arquivo de imagem ou use uma URL publica https.");
        return;
      }
      const id = data.id || slugify(data.title);
      const product = {
        id,
        title: clean(data.title),
        category: clean(data.category),
        subcategory: clean(data.subcategory),
        sku: clean(data.sku),
        price: number(data.price),
        oldPrice: data.oldPrice ? number(data.oldPrice) : null,
        tag: clean(data.tag),
        shortDescription: clean(data.shortDescription),
        description: clean(data.description),
        checkoutUrl: clean(data.checkoutUrl),
        image: productImage,
        gallery: [],
        videoUrl: clean(data.videoUrl),
        videoThumb: clean(data.videoThumb),
        reviewRating: number(data.reviewRating) || 5,
        reviewCount: Math.round(number(data.reviewCount)),
        featured: Boolean(form.elements.featured.checked),
        bestSeller: Boolean(form.elements.bestSeller.checked),
        flashOffer: Boolean(form.elements.flashOffer.checked),
        visible: Boolean(form.elements.visible.checked),
        order: state.products.find((item) => item.id === id)?.order ?? state.products.length
      };
      upsert(state.products, product);
      ensureCategoriesFromProducts();
      ensureSubcategoriesFromProducts();
      form.reset();
      await saveCatalog();
    });

    forms.categoryForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      upsert(state.categories, {
        id: data.id || slugify(data.name),
        name: clean(data.name),
        image: clean(data.image),
        order: number(data.order),
        active: Boolean(form.elements.active.checked)
      });
      form.reset();
      await saveCatalog();
    });

    forms.subcategoryForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const category = state.categories.find((item) => item.name === clean(data.category) || item.id === clean(data.category));
      upsert(state.subcategories, {
        id: data.id || slugify(`${data.category}-${data.name}`),
        categoryId: category?.id || slugify(data.category),
        categoryName: clean(data.category),
        name: clean(data.name),
        image: clean(data.image),
        order: number(data.order),
        active: Boolean(form.elements.active.checked)
      });
      form.reset();
      await saveCatalog();
    });

    forms.bannerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        data.bannerUrl = await mediaValue(form, "bannerFile", data.bannerUrl, "banner-principal-desktop", "banner-image");
        data.bannerMobileUrl = await mediaValue(form, "bannerMobileFile", data.bannerMobileUrl, "banner-principal-mobile", "banner-image");
        data.bannerVideoUrl = await mediaValue(form, "bannerVideoFile", data.bannerVideoUrl, "video-banner-principal-desktop", "banner-video");
        data.bannerMobileVideoUrl = await mediaValue(form, "bannerMobileVideoFile", data.bannerMobileVideoUrl, "video-banner-principal-mobile", "banner-video");
        data.carouselDesktopImage = await mediaValue(form, "carouselDesktopFile", data.carouselDesktopImage, data.carouselTitle || "banner-desktop", "banner-image");
        data.carouselMobileImage = await mediaValue(form, "carouselMobileFile", data.carouselMobileImage, data.carouselTitle || "banner-mobile", "banner-image");
        data.carouselVideoUrl = await mediaValue(form, "carouselVideoFile", data.carouselVideoUrl, data.carouselTitle || "video-banner-desktop", "banner-video");
        data.carouselMobileVideoUrl = await mediaValue(form, "carouselMobileVideoFile", data.carouselMobileVideoUrl, data.carouselTitle || "video-banner-mobile", "banner-video");
      } catch (error) {
        alert(error.message || "Nao foi possivel enviar a midia do banner.");
        return;
      }
      state.settings.bannerUrl = clean(data.bannerUrl) || state.settings.bannerUrl;
      state.settings.bannerMobileUrl = clean(data.bannerMobileUrl);
      state.settings.bannerVideoUrl = clean(data.bannerVideoUrl);
      state.settings.bannerMobileVideoUrl = clean(data.bannerMobileVideoUrl);
      state.settings.heroTitle = clean(data.heroTitle);
      state.settings.heroSubtitle = clean(data.heroSubtitle);
      state.settings.heroButtonText = clean(data.heroButtonText);
      state.settings.heroButtonLink = clean(data.heroButtonLink);
      state.settings.promoBar = {
        ...(state.settings.promoBar || {}),
        enabled: Boolean(form.elements.promoEnabled.checked),
        text: clean(data.promoText) || "Frete gratis para todo o Brasil",
        backgroundColor: data.promoColor || "#ff6b00",
        textColor: data.promoTextColor || "#111827",
        speedSeconds: number(data.promoSpeed) || 22
      };
      const desktopImage = clean(data.carouselDesktopImage);
      const mobileImage = clean(data.carouselMobileImage);
      const videoUrl = clean(data.carouselVideoUrl);
      const mobileVideoUrl = clean(data.carouselMobileVideoUrl);
      if (desktopImage || mobileImage || videoUrl || mobileVideoUrl || clean(data.bannerId)) {
        const banners = Array.isArray(state.settings.banners) ? state.settings.banners : [];
        upsert(banners, {
          id: clean(data.bannerId) || slugify(`${data.carouselTitle || "banner"}-${Date.now()}`),
          title: clean(data.carouselTitle) || "Kairos Shopping",
          subtitle: clean(data.carouselSubtitle),
          desktopImage: desktopImage || state.settings.bannerUrl,
          mobileImage: mobileImage || desktopImage || state.settings.bannerMobileUrl,
          videoUrl,
          mobileVideoUrl: mobileVideoUrl || videoUrl,
          link: clean(data.carouselLink) || "#produtos",
          order: number(data.carouselOrder) || banners.length + 1,
          active: Boolean(form.elements.carouselActive.checked)
        });
        state.settings.banners = banners;
        resetBannerCarouselFields();
      }
      await saveCatalog();
    });

    forms.reviewForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const reviews = Array.isArray(state.settings.reviews) ? state.settings.reviews : [];
      upsert(reviews, {
        id: data.id || slugify(`${data.name}-${Date.now()}`),
        name: clean(data.name),
        city: clean(data.city),
        product: clean(data.product),
        rating: number(data.rating),
        text: clean(data.text),
        date: new Date().toISOString(),
        featured: Boolean(form.elements.featured.checked)
      });
      state.settings.reviews = reviews;
      form.reset();
      await saveCatalog();
    });

    forms.contentForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      state.settings.content = { ...(state.settings.content || {}), ...Object.fromEntries(new FormData(event.currentTarget).entries()) };
      await saveCatalog();
    });

    forms.marketingForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      state.settings.trackingPixels = Object.fromEntries(new FormData(event.currentTarget).entries());
      await saveCatalog();
    });

    forms.settingsForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      state.settings.storeName = clean(data.storeName);
      state.settings.storeEmail = clean(data.storeEmail);
      state.settings.siteUrl = clean(data.siteUrl);
      state.settings.trackingUrl = clean(data.trackingUrl);
      state.settings.social = {
        ...(state.settings.social || {}),
        whatsapp: clean(data.whatsapp),
        instagram: clean(data.instagram),
        facebook: clean(data.facebook),
        tiktok: clean(data.tiktok),
        youtube: clean(data.youtube)
      };
      state.settings.seo = {
        ...(state.settings.seo || {}),
        metaTitle: clean(data.metaTitle),
        metaDescription: clean(data.metaDescription),
        keywords: clean(data.keywords)
      };
      state.settings.storefront = {
        desktopPerPage: number(data.desktopPerPage) || 12,
        tabletPerPage: number(data.tabletPerPage) || 9,
        mobilePerPage: number(data.mobilePerPage) || 6,
        desktopColumns: number(data.desktopColumns) || 4,
        tabletColumns: number(data.tabletColumns) || 3,
        mobileColumns: number(data.mobileColumns) || 2,
        paginationEnabled: Boolean(event.currentTarget.elements.paginationEnabled.checked),
        loadMoreEnabled: Boolean(event.currentTarget.elements.loadMoreEnabled.checked),
        showCardDescription: Boolean(event.currentTarget.elements.showCardDescription.checked),
        showCardRating: Boolean(event.currentTarget.elements.showCardRating.checked),
        showCardBadge: Boolean(event.currentTarget.elements.showCardBadge.checked)
      };
      state.settings.conversion = {
        ...defaultConversionConfig(),
        scarcityEnabled: Boolean(event.currentTarget.elements.scarcityEnabled.checked),
        scarcityText: clean(data.scarcityText) || "Ofertas limitadas terminam em",
        countdownMinutes: number(data.countdownMinutes) || 15,
        visitorCounterEnabled: Boolean(event.currentTarget.elements.visitorCounterEnabled.checked),
        visitorCounterType: clean(data.visitorCounterType) || "total",
        visitorCounterText: clean(data.visitorCounterText) || "Produtos com alto interesse dos clientes",
        mobileNavEnabled: Boolean(event.currentTarget.elements.mobileNavEnabled.checked),
        socialProofEnabled: Boolean(event.currentTarget.elements.socialProofEnabled.checked),
        mobileNavItems: mobileNavItemsFromForm(event.currentTarget)
      };
      await saveCatalog();
    });
  }

  async function uploadMedia(file, title = "arquivo", purpose = "product-image") {
    if (!file || !file.size) throw new Error("Selecione um arquivo valido para enviar.");
    const isVideo = purpose.includes("video");
    const expectedType = isVideo ? "video/" : "image/";
    if (!file.type || !file.type.startsWith(expectedType)) {
      throw new Error(isVideo ? "O arquivo selecionado precisa ser um video." : "O arquivo selecionado precisa ser uma imagem.");
    }
    if (!isVideo && file.size > 4 * 1024 * 1024) throw new Error("Imagem muito grande. Use uma imagem de ate 4MB.");
    if (isVideo && file.size > 25 * 1024 * 1024) throw new Error("Video muito grande. Use um video curto ate 25MB.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("purpose", purpose);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
      body: formData
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Falha ao enviar arquivo para o storage publico.");
    }
    const publicUrl = normalizePublicMediaUrl(data.url, isVideo ? "video" : "image");
    if (!publicUrl) {
      throw new Error("O storage nao retornou uma URL publica https para o arquivo.");
    }
    return publicUrl;
  }

  async function mediaValue(form, fileField, urlValue, title, purpose) {
    const file = form.elements[fileField]?.files?.[0];
    if (file) return uploadMedia(file, title, purpose);
    const value = clean(urlValue);
    if (!value) return "";
    const type = purpose.includes("video") ? "video" : "image";
    const publicUrl = normalizePublicMediaUrl(value, type);
    if (!publicUrl) {
      throw new Error(type === "video" ? "Use uma URL publica https para o video do banner." : "Use uma URL publica https para a imagem do banner.");
    }
    return publicUrl;
  }

  function renderAll() {
    renderMetrics();
    renderProducts();
    renderCategories();
    renderSubcategories();
    renderBanners();
    renderReviews();
    renderReports();
    renderLeads();
    fillDatalists();
  }

  function renderMetrics() {
    const active = state.products.filter((item) => item.visible !== false);
    const inactive = state.products.filter((item) => item.visible === false);
    const flash = active.filter((item) => item.flashOffer);
    const views = state.reports.filter((event) => event.type === "page_view" || event.type === "product_view");
    const clicks = state.reports.filter((event) => ["checkout_click", "buy_click", "product_click", "whatsapp_click", "whatsapp_group_click", "share_product"].includes(event.type));
    const checkoutClicks = state.reports.filter((event) => event.type === "checkout_click");
    const subs = unique(state.products.map((item) => item.subcategory).filter(Boolean));
    const conversion = views.length ? Math.round((checkoutClicks.length / views.length) * 100) : 0;
    const mostViewed = state.reportSummary.mostViewedProduct?.name || productStats(state.reports)[0]?.name || "Sem dados";
    if (els.metricGrid) els.metricGrid.innerHTML = [
      ["Online agora", Number(state.reportSummary.onlineNow || 0)],
      ["Visitas do dia", Number(state.reportSummary.visitsToday || views.length)],
      ["Ultimos 7 dias", Number(state.reportSummary.visits7d || 0)],
      ["Visitas no mes", Number(state.reportSummary.visitsMonth || 0)],
      ["Visitas no ano", Number(state.reportSummary.visitsYear || 0)],
      ["Total geral de visitas", Number(state.reportSummary.visitsTotal || views.length)],
      ["Produto mais visto", mostViewed],
      ["Cliques checkout", Number(state.reportSummary.checkoutClicks || checkoutClicks.length)],
      ["Taxa de interesse", `${Number(state.reportSummary.interestRate ?? conversion)}%`],
      ["Produtos ativos", active.length],
      ["Produtos inativos", inactive.length],
      ["Promocoes", flash.length],
      ["Categorias", state.categories.length],
      ["Subcategorias", subs.length],
      ["Leads", state.leads.length],
      ["Cliques gerais", clicks.length]
    ].map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${typeof value === "number" ? formatNumber(value) : escapeHtml(value)}</strong></div>`).join("");

    const missingImage = active.filter((item) => !item.image || item.image === FALLBACK_IMAGE).length;
    const missingCheckout = active.filter((item) => !item.checkoutUrl).length;
    const missingDescription = active.filter((item) => !item.description && !item.shortDescription).length;
    const missingCategory = active.filter((item) => !item.category).length;
    if (els.storeHealthGrid) els.storeHealthGrid.innerHTML = [
      ["Sem imagem", missingImage],
      ["Sem checkout", missingCheckout],
      ["Sem descricao", missingDescription],
      ["Sem categoria", missingCategory]
    ].map(([label, value]) => `<div class="metric-card ${value ? "warning" : "ok"}"><span>${label}</span><strong>${formatNumber(value)}</strong></div>`).join("");

    if (els.topProductRows) {
      els.topProductRows.innerHTML = productStats(state.reports).slice(0, 10).map((item) => `
        <tr><td>${escapeHtml(item.name)}</td><td>${formatNumber(item.views)}</td><td>${formatNumber(item.checkouts)}</td><td>${item.rate}%</td></tr>
      `).join("");
    }
  }

  function renderProducts() {
    els.productCount.textContent = String(state.products.length);
    els.productList.innerHTML = state.products
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((product) => `
        <article class="admin-item">
          <img src="${escapeHtml(product.image || FALLBACK_IMAGE)}" alt="${escapeHtml(product.title)}" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
          <div>
            <h3>${escapeHtml(product.title)}</h3>
            <p>${escapeHtml(product.category)} · ${formatCurrency(product.price)} · ${product.visible === false ? "Inativo" : "Ativo"}</p>
          </div>
          <div class="admin-item-actions">
            <button class="secondary-button compact" type="button" data-product-edit="${escapeHtml(product.id)}">Editar</button>
            <button class="danger-button compact" type="button" data-product-delete="${escapeHtml(product.id)}">Excluir</button>
          </div>
        </article>
      `).join("");

    els.productList.querySelectorAll("[data-product-edit]").forEach((button) => {
      button.addEventListener("click", () => fillProductForm(state.products.find((item) => item.id === button.dataset.productEdit)));
    });
    els.productList.querySelectorAll("[data-product-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir este produto?")) return;
        state.products = state.products.filter((item) => item.id !== button.dataset.productDelete);
        await saveCatalog();
      });
    });
  }

  function renderCategories() {
    els.categoryList.innerHTML = state.categories.map((category) => `
      <article class="admin-item">
        <img src="${escapeHtml(category.image || "./assets/logo-kairos-oficial.png")}" alt="${escapeHtml(category.name)}">
        <div>
          <h3>${escapeHtml(category.name)}</h3>
          <p>${category.active === false ? "Inativa" : "Ativa"} · ordem ${category.order || 0}</p>
        </div>
        <div class="admin-item-actions">
          <button class="secondary-button compact" type="button" data-category-edit="${escapeHtml(category.id)}">Editar</button>
          <button class="danger-button compact" type="button" data-category-delete="${escapeHtml(category.id)}">Excluir</button>
        </div>
      </article>
    `).join("");

    els.categoryList.querySelectorAll("[data-category-edit]").forEach((button) => {
      button.addEventListener("click", () => fillCategoryForm(state.categories.find((item) => item.id === button.dataset.categoryEdit)));
    });
    els.categoryList.querySelectorAll("[data-category-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir esta categoria?")) return;
        state.categories = state.categories.filter((item) => item.id !== button.dataset.categoryDelete);
        await saveCatalog();
      });
    });
  }

  function renderSubcategories() {
    if (!els.subcategoryList) return;
    els.subcategoryList.innerHTML = state.subcategories.map((subcategory) => `
      <article class="admin-item">
        <img src="${escapeHtml(subcategory.image || "./assets/logo-kairos-oficial.png")}" alt="${escapeHtml(subcategory.name)}">
        <div>
          <h3>${escapeHtml(subcategory.name)}</h3>
          <p>${escapeHtml(categoryNameById(subcategory.categoryId) || subcategory.categoryName || "Categoria")} - ${subcategory.active === false ? "Inativa" : "Ativa"} - ordem ${subcategory.order || 0}</p>
        </div>
        <div class="admin-item-actions">
          <button class="secondary-button compact" type="button" data-subcategory-edit="${escapeHtml(subcategory.id)}">Editar</button>
          <button class="danger-button compact" type="button" data-subcategory-delete="${escapeHtml(subcategory.id)}">Excluir</button>
        </div>
      </article>
    `).join("");

    els.subcategoryList.querySelectorAll("[data-subcategory-edit]").forEach((button) => {
      button.addEventListener("click", () => fillSubcategoryForm(state.subcategories.find((item) => item.id === button.dataset.subcategoryEdit)));
    });
    els.subcategoryList.querySelectorAll("[data-subcategory-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir esta subcategoria?")) return;
        state.subcategories = state.subcategories.filter((item) => item.id !== button.dataset.subcategoryDelete);
        await saveCatalog();
      });
    });
  }

  function renderBanners() {
    if (!els.bannerList) return;
    const banners = Array.isArray(state.settings.banners) ? state.settings.banners : [];
    els.bannerList.innerHTML = banners
      .slice()
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((banner) => `
        <article class="admin-item">
          <img src="${escapeHtml(banner.desktopImage || banner.mobileImage || state.settings.bannerUrl || "./assets/banner-principal-kairos.jpg")}" alt="${escapeHtml(banner.title || "Banner")}" onerror="this.onerror=null;this.src='./assets/banner-principal-kairos.jpg'">
          <div>
            <h3>${escapeHtml(banner.title || "Banner Kairos")}</h3>
            <p>${banner.active === false ? "Inativo" : "Ativo"} - ordem ${banner.order || 0}</p>
          </div>
          <div class="admin-item-actions">
            <button class="secondary-button compact" type="button" data-banner-edit="${escapeHtml(banner.id)}">Editar</button>
            <button class="danger-button compact" type="button" data-banner-delete="${escapeHtml(banner.id)}">Excluir</button>
          </div>
        </article>
      `).join("");

    els.bannerList.querySelectorAll("[data-banner-edit]").forEach((button) => {
      button.addEventListener("click", () => fillBannerForm(banners.find((item) => item.id === button.dataset.bannerEdit)));
    });
    els.bannerList.querySelectorAll("[data-banner-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir este banner do carrossel?")) return;
        state.settings.banners = banners.filter((item) => item.id !== button.dataset.bannerDelete);
        await saveCatalog();
      });
    });
  }

  function renderReviews() {
    const reviews = Array.isArray(state.settings.reviews) ? state.settings.reviews : [];
    els.reviewList.innerHTML = reviews.map((review) => `
      <article class="admin-item">
        <img src="./assets/logo-kairos-oficial.png" alt="">
        <div>
          <h3>${escapeHtml(review.name)}</h3>
          <p>${escapeHtml(review.product || "Compra Kairos")} · ${review.rating || 5} estrelas</p>
        </div>
        <div class="admin-item-actions">
          <button class="secondary-button compact" type="button" data-review-edit="${escapeHtml(review.id)}">Editar</button>
          <button class="danger-button compact" type="button" data-review-delete="${escapeHtml(review.id)}">Excluir</button>
        </div>
      </article>
    `).join("");

    els.reviewList.querySelectorAll("[data-review-edit]").forEach((button) => {
      button.addEventListener("click", () => fillReviewForm(reviews.find((item) => item.id === button.dataset.reviewEdit)));
    });
    els.reviewList.querySelectorAll("[data-review-delete]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!confirm("Excluir esta avaliacao?")) return;
        state.settings.reviews = reviews.filter((item) => item.id !== button.dataset.reviewDelete);
        await saveCatalog();
      });
    });
  }

  function renderReports() {
    const events = state.reports;
    const online = unique(events.filter((event) => event.type === "presence").map((event) => event.session_id)).length;
    const views = events.filter((event) => event.type === "page_view" || event.type === "product_view").length;
    const checkouts = events.filter((event) => event.type === "checkout_click").length;
    const leads = events.filter((event) => event.type === "lead").length;
    const stats = productStats(events);
    els.liveMetricGrid.innerHTML = [
      ["Online agora", Number(state.reportSummary.onlineNow || online)],
      ["Visitas do dia", Number(state.reportSummary.visitsToday || views)],
      ["Ultimos 7 dias", Number(state.reportSummary.visits7d || 0)],
      ["Mes atual", Number(state.reportSummary.visitsMonth || 0)],
      ["Ano atual", Number(state.reportSummary.visitsYear || 0)],
      ["Total geral", Number(state.reportSummary.visitsTotal || views)],
      ["Produto mais visto", state.reportSummary.mostViewedProduct?.name || stats[0]?.name || "Sem dados"],
      ["Cliques checkout", Number(state.reportSummary.checkoutClicks || checkouts)],
      ["Taxa interesse", `${Number(state.reportSummary.interestRate || 0)}%`],
      ["Leads", leads],
      ["Fuso horario", "Brasilia"]
    ].map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${typeof value === "number" ? formatNumber(value) : escapeHtml(value)}</strong></div>`).join("");

    els.productReportRows.innerHTML = stats.map((item) => `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${formatNumber(item.views)}</td>
        <td>${formatNumber(item.checkouts)}</td>
        <td>${formatNumber(item.favorites)}</td>
        <td>${item.rate}%</td>
      </tr>
    `).join("");
    drawLineChart(events);
  }

  function renderLeads() {
    if (els.leadCount) els.leadCount.textContent = `${formatNumber(state.leads.length)} leads`;
    if (!els.leadRows) return;
    els.leadRows.innerHTML = state.leads.map((lead) => `
      <tr>
        <td>${escapeHtml(lead.name || "")}</td>
        <td>${escapeHtml(lead.whatsapp || "")}</td>
        <td>${escapeHtml(lead.city || "")}</td>
        <td>${formatDateTime(lead.created_at || lead.date || "")}</td>
        <td>${escapeHtml(lead.source || "home")}</td>
      </tr>
    `).join("");
  }

  function drawLineChart(events) {
    const canvas = els.visitsChart;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#e5e7eb";
    for (let i = 0; i < 5; i++) {
      const y = 30 + i * 55;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }

    const minuteMap = new Map();
    events.forEach((event) => {
      const date = new Date(event.created_at || Date.now());
      if (Number.isNaN(date.getTime())) return;
      const key = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
      minuteMap.set(key, (minuteMap.get(key) || 0) + 1);
    });
    const buckets = Array.from(minuteMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);
    if (!buckets.length) buckets.push([new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), 0]);
    const max = Math.max(1, ...buckets.map(([, value]) => value));
    ctx.strokeStyle = "#ff6b00";
    ctx.lineWidth = 4;
    ctx.beginPath();
    buckets.forEach(([, value], index) => {
      const x = 42 + index * ((width - 80) / Math.max(1, buckets.length - 1));
      const y = height - 34 - (value / max) * (height - 70);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    buckets.forEach(([, value], index) => {
      const x = 42 + index * ((width - 80) / Math.max(1, buckets.length - 1));
      const y = height - 34 - (value / max) * (height - 70);
      ctx.beginPath();
      ctx.fillStyle = "#ff6b00";
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.fillStyle = "#102a43";
      ctx.font = "800 12px sans-serif";
      const label = String(value);
      ctx.fillText(label, Math.max(8, x - ctx.measureText(label).width / 2), Math.max(14, y - 12));
    });
    ctx.fillStyle = "#102a43";
    ctx.font = "700 18px sans-serif";
    ctx.fillText("Visitas e eventos por minuto", 42, 28);
    ctx.font = "12px sans-serif";
    buckets.forEach(([label], index) => {
      const x = 42 + index * ((width - 80) / Math.max(1, buckets.length - 1));
      ctx.fillText(label, Math.max(8, x - 16), height - 10);
    });
  }

  function fillForms() {
    const s = state.settings || {};
    if (forms.bannerForm) {
      forms.bannerForm.elements.bannerUrl.value = s.bannerUrl || "./assets/banner-kairos-claro-1.png";
      forms.bannerForm.elements.bannerMobileUrl.value = s.bannerMobileUrl || "";
      forms.bannerForm.elements.bannerVideoUrl.value = s.bannerVideoUrl || "";
      forms.bannerForm.elements.bannerMobileVideoUrl.value = s.bannerMobileVideoUrl || "";
      forms.bannerForm.elements.heroTitle.value = s.heroTitle || "";
      forms.bannerForm.elements.heroSubtitle.value = s.heroSubtitle || "";
      forms.bannerForm.elements.heroButtonText.value = s.heroButtonText || "Ver produtos";
      forms.bannerForm.elements.heroButtonLink.value = s.heroButtonLink || "#produtos";
      forms.bannerForm.elements.promoText.value = s.promoBar?.text || "Frete gratis para todo o Brasil";
      forms.bannerForm.elements.promoColor.value = s.promoBar?.backgroundColor || "#ff6b00";
      forms.bannerForm.elements.promoTextColor.value = s.promoBar?.textColor || "#111827";
      forms.bannerForm.elements.promoSpeed.value = s.promoBar?.speedSeconds || 22;
      forms.bannerForm.elements.promoEnabled.checked = s.promoBar?.enabled !== false;
    }

    fillObjectForm(forms.contentForm, s.content || {});
    fillObjectForm(forms.marketingForm, s.trackingPixels || {});
    fillObjectForm(forms.settingsForm, {
      storeName: s.storeName,
      storeEmail: s.storeEmail,
      siteUrl: s.siteUrl,
      trackingUrl: s.trackingUrl,
      whatsapp: s.social?.whatsapp,
      instagram: s.social?.instagram,
      facebook: s.social?.facebook,
      tiktok: s.social?.tiktok,
      youtube: s.social?.youtube,
      metaTitle: s.seo?.metaTitle,
      metaDescription: s.seo?.metaDescription,
      keywords: s.seo?.keywords,
      desktopPerPage: s.storefront?.desktopPerPage || 12,
      tabletPerPage: s.storefront?.tabletPerPage || 9,
      mobilePerPage: s.storefront?.mobilePerPage || 6,
      desktopColumns: s.storefront?.desktopColumns || 4,
      tabletColumns: s.storefront?.tabletColumns || 3,
      mobileColumns: s.storefront?.mobileColumns || 2,
      scarcityText: s.conversion?.scarcityText || "Ofertas limitadas terminam em",
      countdownMinutes: s.conversion?.countdownMinutes || 15,
      visitorCounterType: s.conversion?.visitorCounterType || "total",
      visitorCounterText: s.conversion?.visitorCounterText || "Produtos com alto interesse dos clientes"
    });
    if (forms.settingsForm) {
      forms.settingsForm.elements.paginationEnabled.checked = s.storefront?.paginationEnabled !== false;
      forms.settingsForm.elements.loadMoreEnabled.checked = s.storefront?.loadMoreEnabled !== false;
      forms.settingsForm.elements.showCardDescription.checked = s.storefront?.showCardDescription !== false;
      forms.settingsForm.elements.showCardRating.checked = s.storefront?.showCardRating !== false;
      forms.settingsForm.elements.showCardBadge.checked = s.storefront?.showCardBadge !== false;
      forms.settingsForm.elements.scarcityEnabled.checked = s.conversion?.scarcityEnabled !== false;
      forms.settingsForm.elements.visitorCounterEnabled.checked = s.conversion?.visitorCounterEnabled !== false;
      forms.settingsForm.elements.mobileNavEnabled.checked = s.conversion?.mobileNavEnabled !== false;
      forms.settingsForm.elements.socialProofEnabled.checked = s.conversion?.socialProofEnabled !== false;
      normalizeMobileNavItems(s.conversion?.mobileNavItems).forEach((item, index) => {
        forms.settingsForm.elements[`mobileNavIcon${index}`].value = item.icon;
        forms.settingsForm.elements[`mobileNavLabel${index}`].value = item.label;
        forms.settingsForm.elements[`mobileNavHref${index}`].value = item.href;
      });
    }

    const rating = forms.reviewForm?.elements.rating;
    if (rating && !rating.options.length) {
      [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = `${value} estrelas`;
        if (value === 5) option.selected = true;
        rating.appendChild(option);
      });
    }
  }

  function fillProductForm(product) {
    if (!product) return;
    fillObjectForm(forms.productForm, product);
    forms.productForm.elements.featured.checked = product.featured !== false;
    forms.productForm.elements.bestSeller.checked = Boolean(product.bestSeller);
    forms.productForm.elements.flashOffer.checked = Boolean(product.flashOffer);
    forms.productForm.elements.visible.checked = product.visible !== false;
  }

  function fillCategoryForm(category) {
    fillObjectForm(forms.categoryForm, category || {});
    forms.categoryForm.elements.active.checked = category?.active !== false;
  }

  function fillSubcategoryForm(subcategory) {
    fillObjectForm(forms.subcategoryForm, {
      ...(subcategory || {}),
      category: categoryNameById(subcategory?.categoryId) || subcategory?.categoryName || ""
    });
    if (forms.subcategoryForm?.elements.active) forms.subcategoryForm.elements.active.checked = subcategory?.active !== false;
  }

  function fillReviewForm(review) {
    fillObjectForm(forms.reviewForm, review || {});
    forms.reviewForm.elements.featured.checked = review?.featured !== false;
  }

  function fillBannerForm(banner) {
    if (!banner || !forms.bannerForm) return;
    forms.bannerForm.elements.bannerId.value = banner.id || "";
    forms.bannerForm.elements.carouselTitle.value = banner.title || "";
    forms.bannerForm.elements.carouselSubtitle.value = banner.subtitle || "";
    forms.bannerForm.elements.carouselDesktopImage.value = banner.desktopImage || banner.image || "";
    forms.bannerForm.elements.carouselMobileImage.value = banner.mobileImage || "";
    forms.bannerForm.elements.carouselVideoUrl.value = banner.videoUrl || banner.desktopVideoUrl || "";
    forms.bannerForm.elements.carouselMobileVideoUrl.value = banner.mobileVideoUrl || "";
    forms.bannerForm.elements.carouselLink.value = banner.link || "#produtos";
    forms.bannerForm.elements.carouselOrder.value = banner.order || 1;
    forms.bannerForm.elements.carouselActive.checked = banner.active !== false;
    forms.bannerForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetBannerCarouselFields() {
    if (!forms.bannerForm) return;
    ["bannerId", "carouselTitle", "carouselSubtitle", "carouselDesktopImage", "carouselMobileImage", "carouselVideoUrl", "carouselMobileVideoUrl", "carouselLink"].forEach((name) => {
      if (forms.bannerForm.elements[name]) forms.bannerForm.elements[name].value = "";
    });
    ["carouselDesktopFile", "carouselMobileFile", "carouselVideoFile", "carouselMobileVideoFile"].forEach((name) => {
      if (forms.bannerForm.elements[name]) forms.bannerForm.elements[name].value = "";
    });
    if (forms.bannerForm.elements.carouselOrder) forms.bannerForm.elements.carouselOrder.value = (state.settings.banners || []).length + 1;
    if (forms.bannerForm.elements.carouselActive) forms.bannerForm.elements.carouselActive.checked = true;
  }

  function fillObjectForm(form, values) {
    if (!form) return;
    Object.entries(values || {}).forEach(([key, value]) => {
      if (form.elements[key] && form.elements[key].type !== "file") {
        form.elements[key].value = value ?? "";
      }
    });
  }

  function fillDatalists() {
    els.categoryOptions.innerHTML = state.categories.map((cat) => `<option value="${escapeHtml(cat.name)}"></option>`).join("");
    const subs = unique([
      ...state.subcategories.map((subcategory) => subcategory.name),
      ...state.products.map((product) => product.subcategory)
    ].filter(Boolean));
    els.subcategoryOptions.innerHTML = subs.map((sub) => `<option value="${escapeHtml(sub)}"></option>`).join("");
  }

  function ensureCategoriesFromProducts() {
    const existing = new Set(state.categories.map((item) => item.name));
    BASE_CATEGORIES.forEach((name, index) => {
      if (!existing.has(name)) {
        state.categories.push({ id: slugify(name), name, image: "", order: index, active: true });
        existing.add(name);
      }
    });
    unique(state.products.map((item) => item.category)).forEach((name, index) => {
      if (!existing.has(name)) {
        state.categories.push({ id: slugify(name), name, image: "", order: state.categories.length + index, active: true });
        existing.add(name);
      }
    });
  }

  function ensureSubcategoriesFromProducts() {
    const existing = new Set(state.subcategories.map((item) => `${item.categoryId}:${item.name}`));
    state.products.forEach((product, index) => {
      if (!product.subcategory) return;
      const category = state.categories.find((item) => item.name === product.category) || { id: slugify(product.category), name: product.category };
      const key = `${category.id}:${product.subcategory}`;
      if (existing.has(key)) return;
      state.subcategories.push({
        id: slugify(`${category.id}-${product.subcategory}`),
        categoryId: category.id,
        categoryName: category.name,
        name: product.subcategory,
        image: "",
        order: state.subcategories.length + index,
        active: true
      });
      existing.add(key);
    });
  }

  function categoryNameById(id) {
    return state.categories.find((category) => category.id === id)?.name || "";
  }

  function productStats(events) {
    const map = new Map();
    const names = Object.fromEntries(state.products.map((product) => [product.id, product.title]));
    events.forEach((event) => {
      const id = event.payload?.product_id || event.product_id;
      if (!id) return;
      const row = map.get(id) || { id, name: names[id] || id, views: 0, checkouts: 0, favorites: 0, rate: 0 };
      if (event.payload?.product_name && !names[id]) row.name = event.payload.product_name;
      if (event.type === "product_view") row.views += 1;
      if (event.type === "checkout_click" || event.type === "buy_click") row.checkouts += 1;
      if (event.type === "favorite_add") row.favorites += 1;
      map.set(id, row);
    });
    return Array.from(map.values())
      .map((row) => ({ ...row, rate: row.views ? Math.round((row.checkouts / row.views) * 100) : 0 }))
      .sort((a, b) => b.views + b.checkouts - (a.views + a.checkouts))
      .slice(0, 20);
  }

  function exportReportsCsv() {
    const rows = [["tipo", "data", "sessao", "pagina", "payload"]];
    state.reports.forEach((event) => rows.push([
      event.type,
      event.created_at,
      event.session_id,
      event.page,
      JSON.stringify(event.payload || {})
    ]));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `kairos-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportLeadsCsv() {
    const rows = [["nome", "whatsapp", "cidade", "data", "origem"]];
    state.leads.forEach((lead) => rows.push([
      lead.name || "",
      lead.whatsapp || "",
      lead.city || "",
      lead.created_at || lead.date || "",
      lead.source || "home"
    ]));
    downloadCsv(rows, `kairos-leads-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function normalizeSettings(settings) {
    return {
      ...(settings || {}),
      storeName: settings?.storeName || "Kairos Shopping",
      storeEmail: settings?.storeEmail || "kairossshopping@gmail.com",
      promoBar: settings?.promoBar || { enabled: true, text: "Frete gratis para todo o Brasil", backgroundColor: "#ff6b00", textColor: "#111827", speedSeconds: 22 },
      conversion: {
        ...defaultConversionConfig(),
        ...(settings?.conversion || {}),
        mobileNavItems: normalizeMobileNavItems(settings?.conversion?.mobileNavItems)
      }
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

  function normalizeMobileNavItems(items) {
    const source = Array.isArray(items) && items.length ? items : DEFAULT_MOBILE_NAV_ITEMS;
    return source.slice(0, 5).map((item, index) => ({
      icon: clean(item.icon || DEFAULT_MOBILE_NAV_ITEMS[index]?.icon || "&#128717;"),
      label: clean(item.label || DEFAULT_MOBILE_NAV_ITEMS[index]?.label || "Loja"),
      href: clean(item.href || DEFAULT_MOBILE_NAV_ITEMS[index]?.href || "#inicio")
    }));
  }

  function mobileNavItemsFromForm(form) {
    return DEFAULT_MOBILE_NAV_ITEMS.map((fallback, index) => ({
      icon: clean(form.elements[`mobileNavIcon${index}`]?.value) || fallback.icon,
      label: clean(form.elements[`mobileNavLabel${index}`]?.value) || fallback.label,
      href: clean(form.elements[`mobileNavHref${index}`]?.value) || fallback.href
    }));
  }

  function downloadCsv(rows, filename) {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function normalizeProducts(products) {
    return products.map((product, index) => ({
      ...product,
      id: String(product.id || slugify(product.title || `produto-${index}`)),
      title: clean(product.title || product.name || `Produto ${index + 1}`),
      category: clean(product.category || "Ofertas"),
      price: number(product.price),
      image: normalizePublicImageUrl(product.image || product.imageUrl) || defaultPublicImageUrl(),
      visible: product.visible !== false && product.active !== false,
      order: Number(product.order || product.position || index)
    }));
  }

  function normalizeCategories(categories) {
    const list = Array.isArray(categories) ? categories : [];
    return list.map((category, index) => ({
      id: category.id || slugify(category.name || `categoria-${index}`),
      name: clean(category.name || category.title || `Categoria ${index + 1}`),
      image: clean(category.image || category.imageUrl),
      order: number(category.order || category.position || index),
      active: category.active !== false
    }));
  }

  function normalizeSubcategories(subcategories) {
    const list = Array.isArray(subcategories) ? subcategories : [];
    return list.map((subcategory, index) => ({
      id: subcategory.id || slugify(subcategory.name || `subcategoria-${index}`),
      categoryId: clean(subcategory.categoryId || subcategory.category_id),
      categoryName: clean(subcategory.categoryName || subcategory.category),
      name: clean(subcategory.name || subcategory.title || `Subcategoria ${index + 1}`),
      image: clean(subcategory.image || subcategory.imageUrl),
      order: number(subcategory.order || subcategory.position || index),
      active: subcategory.active !== false
    }));
  }

  function upsert(list, item) {
    const index = list.findIndex((entry) => entry.id === item.id);
    if (index >= 0) list[index] = item;
    else list.push(item);
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

  function clean(value) {
    return String(value ?? "").trim();
  }

  function normalizePublicImageUrl(value) {
    return normalizePublicMediaUrl(value, "image");
  }

  function normalizePublicMediaUrl(value, type = "image") {
    const image = clean(value);
    if (!image) return "";
    if (isBlockedImageUrl(image)) return "";
    if (/^https:\/\//i.test(image)) return image;
    const localFolderPattern = type === "video" ? /^(?:\.\/|\/)?(?:assets|videos)\//i : /^(?:\.\/|\/)?(?:assets|images)\//i;
    if (localFolderPattern.test(image) && location.protocol === "https:") {
      return new URL(image, location.origin).href;
    }
    return "";
  }

  function defaultPublicImageUrl() {
    return normalizePublicImageUrl(FALLBACK_IMAGE) || FALLBACK_IMAGE;
  }

  function isBlockedImageUrl(value) {
    return /^(?:data:image|blob:|file:|[a-zA-Z]:\\|\\\\)/i.test(clean(value));
  }

  function ensureProductImagesArePublic() {
    if (location.protocol !== "https:") return true;
    for (const product of state.products) {
      const publicImage = normalizePublicImageUrl(product.image || FALLBACK_IMAGE);
      if (!publicImage) {
        alert(`Imagem invalida no produto "${product.title}". Envie uma imagem ou informe uma URL publica https antes de salvar.`);
        return false;
      }
      product.image = publicImage;
    }
    return true;
  }

  function number(value) {
    const parsed = Number(String(value ?? "0").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function slugify(value) {
    return clean(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `item-${Date.now()}`;
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("pt-BR");
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(message) {
    if (els.connectionStatus) els.connectionStatus.textContent = message;
  }

  function toast(message) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
}());
