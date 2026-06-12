/* Kairos Shopping - descrição completa no modal de produto.
   Arquivo publicado dentro de /public porque a Vercel usa outputDirectory: public. */
(function () {
  "use strict";

  let products = [];
  let loaded = false;

  document.addEventListener("DOMContentLoaded", function () {
    fetchCatalog();
    const modal = document.getElementById("productModal");
    if (!modal) return;

    new MutationObserver(function () {
      setTimeout(enhanceModal, 120);
    }).observe(modal, { childList: true, subtree: true, attributes: true });

    document.addEventListener("click", function (event) {
      if (event.target.closest("[data-action='details']")) {
        setTimeout(enhanceModal, 250);
        setTimeout(enhanceModal, 650);
      }
    });
  });

  async function fetchCatalog() {
    try {
      const response = await fetch("/api/catalog?t=" + Date.now(), { cache: "no-store" });
      const data = await response.json();
      products = Array.isArray(data.products) ? data.products : [];
      loaded = true;
    } catch (error) {
      products = [];
      loaded = true;
    }
  }

  async function enhanceModal() {
    const modal = document.getElementById("productModal");
    if (!modal || modal.hidden || modal.dataset.fullDescriptionFixed === "1") return;

    if (!loaded) await fetchCatalog();

    const productId = modal.querySelector("[data-modal-action='buy']")?.dataset.productId
      || modal.querySelector("[data-modal-action='share']")?.dataset.productId
      || modal.querySelector("[data-modal-action='favorite']")?.dataset.productId;

    if (!productId) return;

    const product = products.find(function (item) {
      return String(item.id) === String(productId) || String(item.slug) === String(productId);
    });

    if (!product) return;

    const content = modal.querySelector(".modal-content");
    if (!content) return;

    content.querySelectorAll("details").forEach(function (item) {
      const title = (item.querySelector("summary")?.textContent || "").toLowerCase();
      if (title.includes("descricao") || title.includes("descrição")) item.remove();
    });

    const details = document.createElement("details");
    details.className = "accordion-item product-complete-description";
    details.open = true;
    details.innerHTML = buildDescription(product);

    const actions = content.querySelector(".modal-actions");
    if (actions) actions.insertAdjacentElement("afterend", details);
    else content.appendChild(details);

    modal.dataset.fullDescriptionFixed = "1";
  }

  function buildDescription(product) {
    const title = product.title || product.name || "Produto Kairos Shopping";
    const category = product.category || "Ofertas";
    const subcategory = product.subcategory || "";
    const description = getBetterDescription(product);
    const price = formatCurrency(product.price);
    const oldPrice = Number(product.oldPrice || 0) > Number(product.price || 0) ? formatCurrency(product.oldPrice) : "";
    const rating = product.reviewRating || product.rating || "";
    const reviews = product.reviewCount || product.reviewsCount || 0;

    return `
      <summary>Descrição completa do produto</summary>
      <div class="complete-description-content" style="display:grid;gap:10px;line-height:1.55;">
        <p><strong>${escapeHtml(title)}</strong></p>
        <p>${escapeHtml(description.intro)}</p>
        <ul style="margin:0;padding-left:20px;">
          ${description.points.map(function (point) { return `<li>${escapeHtml(point)}</li>`; }).join("")}
        </ul>
        <p><strong>Categoria:</strong> ${escapeHtml(category)}${subcategory ? " • " + escapeHtml(subcategory) : ""}</p>
        <p><strong>Preço atual:</strong> ${escapeHtml(price)}${oldPrice ? " <span>de " + escapeHtml(oldPrice) + "</span>" : ""}</p>
        ${reviews ? `<p><strong>Avaliação:</strong> ${escapeHtml(String(rating))} de 5 com ${escapeHtml(formatNumber(reviews))} avaliações.</p>` : ""}
        <p><strong>Entrega:</strong> envio para todo o Brasil, com acompanhamento conforme o código de rastreio informado.</p>
        <p><strong>Compra segura:</strong> finalize pelo botão Comprar agora, no checkout externo oficial do produto.</p>
        <p><small>Antes de finalizar, confira disponibilidade, prazo e condições diretamente no checkout.</small></p>
      </div>
    `;
  }

  function getBetterDescription(product) {
    const text = normalize((product.title || "") + " " + (product.category || "") + " " + (product.subcategory || ""));
    const raw = String(product.description || product.shortDescription || "").trim();
    const generic = !raw || normalize(raw).includes("produto selecionado pela kairos shopping") || normalize(raw).includes("checkout externo oficial");

    if (!generic && raw.length > 80) {
      return {
        intro: raw,
        points: ["Produto com informações organizadas para facilitar sua escolha.", "Compra direcionada para checkout externo oficial.", "Envio acompanhado conforme disponibilidade e prazo informados."]
      };
    }

    if (text.includes("camera") || text.includes("seguranca")) return { intro: "Produto indicado para quem busca mais praticidade no monitoramento de ambientes.", points: ["Formato compacto para facilitar a instalação.", "Boa opção para uso residencial ou comercial.", "Ajuda a acompanhar ambientes com mais praticidade."] };
    if (text.includes("massageador") || text.includes("massagem")) return { intro: "Produto selecionado para momentos de relaxamento e autocuidado no dia a dia.", points: ["Indicado para relaxamento corporal.", "Prático para usar em casa.", "Boa opção para rotina de cuidado pessoal."] };
    if (text.includes("legging") || text.includes("moda")) return { intro: "Peça selecionada para quem busca conforto, praticidade e versatilidade.", points: ["Boa opção para academia ou rotina.", "Combina com looks casuais.", "Produto com foco em conforto e custo-benefício."] };
    if (text.includes("fone") || text.includes("bluetooth")) return { intro: "Produto indicado para ouvir músicas, vídeos e chamadas com mais praticidade.", points: ["Conexão sem fio para uso diário.", "Boa opção para estudo, trabalho e lazer.", "Fácil de transportar."] };
    if (text.includes("joelheira")) return { intro: "Produto selecionado para oferecer suporte e conforto aos joelhos durante atividades.", points: ["Indicado para caminhadas e treinos.", "Ajuda na proteção durante o uso.", "Boa opção para rotina e atividades físicas."] };
    if (text.includes("aspirador")) return { intro: "Produto prático para limpeza rápida de pequenos espaços.", points: ["Ideal para carros, mesas e cantos.", "Formato portátil.", "Ajuda a manter o ambiente mais organizado."] };
    if (text.includes("copa") || text.includes("panini") || text.includes("figurinhas") || text.includes("album")) return { intro: "Item selecionado para colecionadores e torcedores aproveitarem o clima da Copa.", points: ["Boa opção para colecionar ou presentear.", "Produto relacionado ao universo da Copa.", "Ideal para fãs e colecionadores."] };
    if (text.includes("jarra") || text.includes("garrafa") || text.includes("termica") || text.includes("copo")) return { intro: "Produto prático para conservar bebidas e facilitar a rotina.", points: ["Indicado para casa, trabalho ou passeio.", "Ajuda na organização do dia a dia.", "Boa opção para quem busca praticidade."] };

    return { intro: "Produto selecionado pela Kairos Shopping para quem busca praticidade, bom custo-benefício e compra simples.", points: ["Produto com envio para todo o Brasil.", "Compra pelo checkout externo oficial.", "Informações organizadas para facilitar sua decisão."] };
  }

  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("pt-BR");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
})();
