(function () {
  "use strict";

  const FALLBACK_IMAGE = "./images/placeholder.svg";
  const LOCAL_PRODUCTS_KEY = "kairos:local-products";
  const LOCAL_SETTINGS_KEY = "kairos:local-settings";
  const TOKEN_KEY = "kairos:admin-token";
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
    token: localStorage.getItem(TOKEN_KEY) || "",
    reports: []
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
    renderAll();
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
      "reviewList", "categoryOptions", "subcategoryOptions", "productReportRows",
      "visitsChart", "liveMetricGrid"
    ].forEach((id) => els[id] = document.getElementById(id));

    [
      "productForm", "categoryForm", "bannerForm", "reviewForm", "contentForm",
      "marketingForm", "settingsForm"
    ].forEach((id) => forms[id] = document.getElementById(id));
  }

  async function loadCatalog() {
    try {
      const response = await fetch(`/api/catalog?includeInactive=1&t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("API indisponivel");
      const catalog = await response.json();
      state.products = normalizeProducts(catalog.products || []);
      state.settings = { ...(window.KAIROS_DEFAULT_SETTINGS || {}), ...(catalog.settings || {}) };
      state.categories = normalizeCategories(catalog.categories || []);
      setStatus("Conectado ao backend Supabase/Vercel quando as variaveis estiverem configuradas. Produtos carregados.");
    } catch {
      state.products = normalizeProducts(readJson(LOCAL_PRODUCTS_KEY, window.KAIROS_SEED_PRODUCTS || []));
      state.settings = { ...(window.KAIROS_DEFAULT_SETTINGS || {}), ...readJson(LOCAL_SETTINGS_KEY, {}) };
      state.categories = normalizeCategories([]);
      setStatus("Modo local ativo. O painel funciona para edicao local e esta pronto para Supabase/Vercel quando as variaveis forem configuradas.");
    }

    ensureCategoriesFromProducts();
    fillForms();
  }

  async function saveCatalog() {
    if (!ensureProductImagesArePublic()) return;
    const payload = {
      products: state.products,
      categories: state.categories,
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
      toast("Alteracoes salvas no backend.");
    } catch {
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
    } catch {
      state.reports = readJson("kairos:local-events", []);
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
    });

    document.getElementById("saveAllButton")?.addEventListener("click", saveCatalog);
    document.getElementById("newProductButton")?.addEventListener("click", () => forms.productForm.reset());
    document.getElementById("newCategoryButton")?.addEventListener("click", () => forms.categoryForm.reset());
    document.getElementById("newReviewButton")?.addEventListener("click", () => forms.reviewForm.reset());
    document.getElementById("refreshReports")?.addEventListener("click", async () => {
      await loadReports();
      renderReports();
    });
    document.getElementById("exportCsv")?.addEventListener("click", exportReportsCsv);
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
          productImage = await uploadImage(file, data.title);
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

    forms.bannerForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget).entries());
      state.settings.bannerUrl = clean(data.bannerUrl) || state.settings.bannerUrl;
      state.settings.bannerMobileUrl = clean(data.bannerMobileUrl);
      state.settings.heroTitle = clean(data.heroTitle);
      state.settings.heroSubtitle = clean(data.heroSubtitle);
      state.settings.heroButtonText = clean(data.heroButtonText);
      state.settings.heroButtonLink = clean(data.heroButtonLink);
      state.settings.promoBar = {
        ...(state.settings.promoBar || {}),
        enabled: Boolean(event.currentTarget.elements.promoEnabled.checked),
        text: clean(data.promoText) || "Frete gratis para todo o Brasil",
        backgroundColor: data.promoColor || "#ff6b00"
      };
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
      await saveCatalog();
    });
  }

  async function uploadImage(file, title = "produto") {
    if (!file || !file.size) throw new Error("Selecione uma imagem valida para enviar.");
    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error("O arquivo selecionado precisa ser uma imagem.");
    }
    if (file.size > 4 * 1024 * 1024) {
      throw new Error("Imagem muito grande. Use uma imagem de ate 4MB.");
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
      body: formData
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Falha ao enviar imagem para o storage publico.");
    }
    const publicUrl = normalizePublicImageUrl(data.url);
    if (!publicUrl) {
      throw new Error("O storage nao retornou uma URL publica https para a imagem.");
    }
    return publicUrl;
  }

  function renderAll() {
    renderMetrics();
    renderProducts();
    renderCategories();
    renderReviews();
    renderReports();
    fillDatalists();
  }

  function renderMetrics() {
    const active = state.products.filter((item) => item.visible !== false);
    const flash = active.filter((item) => item.flashOffer);
    const clicks = state.reports.filter((event) => event.type === "checkout_click");
    els.metricGrid.innerHTML = [
      ["Produtos ativos", active.length],
      ["Promocoes", flash.length],
      ["Cliques checkout", clicks.length],
      ["Categorias", state.categories.length]
    ].map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${formatNumber(value)}</strong></div>`).join("");
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
    els.liveMetricGrid.innerHTML = [
      ["Online agora", online],
      ["Visitas/eventos", views],
      ["Cliques checkout", checkouts],
      ["Leads", leads]
    ].map(([label, value]) => `<div class="metric-card"><span>${label}</span><strong>${formatNumber(value)}</strong></div>`).join("");

    const stats = productStats(events);
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

    const buckets = Array.from({ length: 12 }, () => 0);
    events.forEach((event) => {
      const date = new Date(event.created_at || Date.now());
      const index = Math.min(11, Math.max(0, Math.floor(date.getHours() / 2)));
      buckets[index] += 1;
    });
    const max = Math.max(1, ...buckets);
    ctx.strokeStyle = "#ff6b00";
    ctx.lineWidth = 4;
    ctx.beginPath();
    buckets.forEach((value, index) => {
      const x = 42 + index * ((width - 80) / 11);
      const y = height - 34 - (value / max) * (height - 70);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.fillStyle = "#102a43";
    ctx.font = "700 18px sans-serif";
    ctx.fillText("Visitas e eventos por horario", 42, 28);
  }

  function fillForms() {
    const s = state.settings || {};
    if (forms.bannerForm) {
      forms.bannerForm.elements.bannerUrl.value = s.bannerUrl || "./assets/banner-principal-kairos.jpg";
      forms.bannerForm.elements.bannerMobileUrl.value = s.bannerMobileUrl || "";
      forms.bannerForm.elements.heroTitle.value = s.heroTitle || "";
      forms.bannerForm.elements.heroSubtitle.value = s.heroSubtitle || "";
      forms.bannerForm.elements.heroButtonText.value = s.heroButtonText || "Ver produtos";
      forms.bannerForm.elements.heroButtonLink.value = s.heroButtonLink || "#produtos";
      forms.bannerForm.elements.promoText.value = s.promoBar?.text || "Frete gratis para todo o Brasil";
      forms.bannerForm.elements.promoColor.value = s.promoBar?.backgroundColor || "#ff6b00";
      forms.bannerForm.elements.promoEnabled.checked = s.promoBar?.enabled !== false;
    }

    fillObjectForm(forms.contentForm, s.content || {});
    fillObjectForm(forms.marketingForm, s.trackingPixels || {});
    fillObjectForm(forms.settingsForm, {
      storeName: s.storeName,
      storeEmail: s.storeEmail,
      trackingUrl: s.trackingUrl,
      whatsapp: s.social?.whatsapp,
      instagram: s.social?.instagram,
      facebook: s.social?.facebook,
      tiktok: s.social?.tiktok,
      youtube: s.social?.youtube,
      metaTitle: s.seo?.metaTitle,
      metaDescription: s.seo?.metaDescription,
      keywords: s.seo?.keywords
    });

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

  function fillReviewForm(review) {
    fillObjectForm(forms.reviewForm, review || {});
    forms.reviewForm.elements.featured.checked = review?.featured !== false;
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
    const subs = unique(state.products.map((product) => product.subcategory).filter(Boolean));
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

  function productStats(events) {
    const map = new Map();
    const names = Object.fromEntries(state.products.map((product) => [product.id, product.title]));
    events.forEach((event) => {
      const id = event.payload?.product_id || event.product_id;
      if (!id) return;
      const row = map.get(id) || { id, name: names[id] || id, views: 0, checkouts: 0, favorites: 0, rate: 0 };
      if (event.type === "product_view") row.views += 1;
      if (event.type === "checkout_click") row.checkouts += 1;
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
    const image = clean(value);
    if (!image) return "";
    if (isBlockedImageUrl(image)) return "";
    if (/^https:\/\//i.test(image)) return image;
    if (/^(?:\.\/|\/)?(?:assets|images)\//i.test(image) && location.protocol === "https:") {
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
