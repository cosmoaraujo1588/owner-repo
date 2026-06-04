(function () {
  "use strict";

  let catalog = null;
  let selectedCategory = "Todos";
  let selectedSubcategory = "Todas";

  document.addEventListener("DOMContentLoaded", initDynamicStorefront);

  async function initDynamicStorefront() {
    try {
      const response = await fetch(`/api/catalog?t=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      catalog = await response.json();

      renderDynamicSubcategories();
      bindInstitutionalPages();
    } catch {
      // Mantem a loja funcionando mesmo se a API falhar.
    }
  }

  function renderDynamicSubcategories() {
    const rail = document.getElementById("categoryRail");
    if (!rail || !catalog) return;

    setTimeout(() => {
      const wrapper = document.createElement("div");
      wrapper.className = "dynamic-subcategory-wrap";
      wrapper.innerHTML = `
        <div class="dynamic-subcategory-title">Filtrar por subcategoria</div>
        <div class="dynamic-subcategory-rail" id="dynamicSubcategoryRail"></div>
      `;

      rail.insertAdjacentElement("afterend", wrapper);
      updateSubcategories();

      rail.addEventListener("click", (event) => {
        const button = event.target.closest("[data-category]");
        if (!button) return;
        selectedCategory = button.dataset.category || "Todos";
        selectedSubcategory = "Todas";
        setTimeout(updateSubcategories, 80);
      });
    }, 500);
  }

  function updateSubcategories() {
    const target = document.getElementById("dynamicSubcategoryRail");
    if (!target || !catalog) return;

    const products = Array.isArray(catalog.products) ? catalog.products : [];
    const subcategoriesFromProducts = products
      .filter((product) => product.visible !== false && product.active !== false)
      .filter((product) => selectedCategory === "Todos" || product.category === selectedCategory)
      .map((product) => product.subcategory)
      .filter(Boolean);

    const subcategoriesFromDatabase = Array.isArray(catalog.subcategories)
      ? catalog.subcategories
          .filter((item) => item.active !== false)
          .map((item) => item.name)
          .filter(Boolean)
      : [];

    const subcategories = unique(["Todas", ...subcategoriesFromProducts, ...subcategoriesFromDatabase]);

    target.innerHTML = subcategories.map((name) => `
      <button
        class="dynamic-subcategory-chip ${selectedSubcategory === name ? "active" : ""}"
        type="button"
        data-dynamic-subcategory="${escapeHtml(name)}"
      >
        ${escapeHtml(name)}
      </button>
    `).join("");

    target.querySelectorAll("[data-dynamic-subcategory]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedSubcategory = button.dataset.dynamicSubcategory || "Todas";
        applySubcategoryFilter();
        updateSubcategories();
      });
    });
  }

  function applySubcategoryFilter() {
    const cards = document.querySelectorAll(".product-card");
    if (!cards.length || !catalog) return;

    const products = Array.isArray(catalog.products) ? catalog.products : [];

    cards.forEach((card) => {
      const productId = card.getAttribute("data-product-id");
      const product = products.find((item) => String(item.id) === String(productId));

      if (!product || selectedSubcategory === "Todas") {
        card.hidden = false;
        return;
      }

      card.hidden = product.subcategory !== selectedSubcategory;
    });

    const section = document.getElementById("produtos");
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bindInstitutionalPages() {
    document.querySelectorAll("[data-page-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();

        const key = link.dataset.pageLink;
        const page = findPage(key);
        if (!page) return;

        openPageModal(page);
      });
    });
  }

  function findPage(key) {
    const pages = Array.isArray(catalog?.pages) ? catalog.pages : [];

    const map = {
      about: ["quem-somos", "sobre", "about"],
      privacy: ["politica-de-privacidade", "privacidade", "privacy"],
      terms: ["termos-de-uso", "termos", "terms"],
      returns: ["trocas-e-devolucoes", "trocas", "returns"]
    };

    const slugs = map[key] || [key];

    return pages.find((page) => slugs.includes(page.slug) || slugs.includes(page.id));
  }

  function openPageModal(page) {
    let modal = document.getElementById("dynamicPageModal");

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "dynamicPageModal";
      modal.className = "product-modal";
      document.body.appendChild(modal);
    }

    modal.hidden = false;
    modal.innerHTML = `
      <div class="modal-backdrop" data-close-page></div>
      <article class="modal-card dynamic-page-card">
        <button class="modal-close" type="button" data-close-page>×</button>
        <div class="modal-content">
          <span class="eyebrow">Kairos Shopping</span>
          <h2>${escapeHtml(page.title || "Informação")}</h2>
          <p class="dynamic-page-content">${escapeHtml(page.content || "Conteúdo em atualização.")}</p>
        </div>
      </article>
    `;

    modal.querySelectorAll("[data-close-page]").forEach((button) => {
      button.addEventListener("click", () => {
        modal.hidden = true;
        modal.innerHTML = "";
      });
    });
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}());
