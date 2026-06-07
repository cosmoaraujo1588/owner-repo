/* Kairos Shopping - descricao completa no modal de produto */
(function () {
  "use strict";
  var products = [];
  var ready = false;

  function init() {
    loadCatalog();
    var modal = document.getElementById("productModal");
    if (!modal) return;
    new MutationObserver(function () {
      setTimeout(enhanceModal, 120);
      setTimeout(enhanceModal, 500);
    }).observe(modal, { childList: true, subtree: true, attributes: true });
    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-action='details']")) {
        setTimeout(enhanceModal, 220);
        setTimeout(enhanceModal, 700);
      }
    });
  }

  async function loadCatalog() {
    try {
      var response = await fetch("/api/catalog?t=" + Date.now(), { cache: "no-store" });
      var data = await response.json();
      products = Array.isArray(data.products) ? data.products : [];
    } catch (e) {
      products = [];
    }
    ready = true;
  }

  async function enhanceModal() {
    var modal = document.getElementById("productModal");
    if (!modal || modal.hidden || modal.dataset.kairosDescFixed === "1") return;
    if (!ready) await loadCatalog();

    var buy = modal.querySelector("[data-modal-action='buy']");
    var share = modal.querySelector("[data-modal-action='share']");
    var id = buy?.dataset.productId || share?.dataset.productId || "";
    if (!id) return;

    var product = products.find(function (p) {
      return String(p.id) === String(id) || String(p.slug) === String(id);
    });
    if (!product) return;

    var content = modal.querySelector(".modal-content");
    if (!content) return;

    content.querySelectorAll("details").forEach(function (d) {
      var s = (d.querySelector("summary")?.textContent || "").toLowerCase();
      if (s.includes("descricao") || s.includes("descrição")) d.remove();
    });

    var details = document.createElement("details");
    details.className = "accordion-item product-complete-description";
    details.open = true;
    details.innerHTML