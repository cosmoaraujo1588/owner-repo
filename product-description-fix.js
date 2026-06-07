/* Kairos Shopping - product details description enhancer.
   Safe front-end layer: enriches the modal description without changing products, prices, checkout, images or Supabase data. */
(function () {
  "use strict";

  const GENERIC_PATTERNS = [
    "Produto selecionado pela Kairos Shopping",
    "Confira informações, preço e prazo",
    "checkout externo oficial"
  ];

  let catalogProducts = [];
  let catalogPromise = null;

  document.addEventListener("DOMContentLoaded", () => {
    loadCatalogOnce();
    const modal = document.getElementById("productModal");
    if (!modal) return;

    const observer = new MutationObserver(() => enhanceOpenModal());
    observer.observe(modal, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-action='details'], [data-modal-action='share'], [data-modal-action='favorite']")) {
        setTimeout(enhanceOpenModal, 180);
        setTimeout(enhanceOpenModal, 500);
      }
    });
  });

  function loadCatalogOnce() {
    if (catalogPromise) return catalogPromise;
    catalogPromise = fetch(`/api/catalog?t=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        catalogProducts = Array.isArray(data?.products) ? data.products : [];
        return catalogProducts;
      })
      .catch(() => []);
    return catalogPromise;
  }

  async function enhanceOpenModal() {
    const modal = document.getElementById("productModal");
    if (!modal || modal.hidden || modal.dataset.descriptionEnhanced === "1") return;

    const productId = modal.querySelector("[data-modal-action='buy']")?.dataset.productId
      || modal.querySelector("[data-modal-action='share']")?.dataset.productId
      || modal.querySelector("[data-modal-action='favorite']")?.dataset.productId;

    if (!productId) return;
    await loadCatalogOnce();
    const product = findProduct(productId);
    if (!product) return;

    const modalContent = modal.querySelector(".modal-content");
    if (!modalContent) return;

    const oldDetails = Array.from(modalContent.querySelectorAll("details.accordion-item"))
      .find((details) => normalizeText(details.querySelector("summary")?.textContent).includes("descricao completa"));

    if (oldDetails) oldDetails.remove();

    const descriptionBlock = document.createElement("details");
    descriptionBlock.className = "accordion-item product-complete-description";
    descriptionBlock.open = true;
    descriptionBlock.innerHTML = `
      <summary>Descrição completa do produto</summary>
      <div class="complete-description-content">
        ${buildCompleteDescription(product)}
      </div>
    `;

    const actions = modalContent.querySelector(".modal-actions");
    if (actions) actions.insertAdjacentElement("afterend", descriptionBlock);
    else modalContent.appendChild(descriptionBlock);

    modal.dataset.descriptionEnhanced = "1";
  }

  function findProduct(id) {
    const value = String(id || "");
    return catalogProducts.find((product) => String(product.id) === value || String(product.slug) === value || slugify(product.title || product.name) === value);
  }

  function buildCompleteDescription(product) {
    const title = product.title || product.name || "Produto Kairos Shopping";
    const category = product.category || "Ofertas";
    const subcategory = product.subcategory || "";
    const price = formatCurrency(product.price);
    const oldPrice = Number(product.oldPrice || 0) > Number(product.price || 0) ? formatCurrency(product.oldPrice) : "";
    const rating = Number(product.reviewRating || product.rating || 0);
    const reviews = Number(product.reviewCount || product.reviewsCount || 0);
    const baseDescription = cleanDescription(product.description || product.shortDescription || "");
    const needsGenerated = isGenericDescription(baseDescription);
    const generated = generateDescription(product);

    return `
      <p><strong>${escapeHtml(title)}</strong></p>
      <p>${escapeHtml(needsGenerated ? generated.intro : baseDescription)}</p>

      <ul>
        ${generated.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}
      </ul>

      <p><strong>Categoria:</strong> ${escapeHtml(category)}${subcategory ? ` • ${escapeHtml(subcategory)}` : ""}</p>
      <p><strong>Preço atual:</strong> ${escapeHtml(price)}${oldPrice ? ` <span class="old-price-info">de ${escapeHtml(oldPrice)}</span>` : ""}</p>
      ${reviews ? `<p><strong>Avaliação:</strong> ${escapeHtml(String(rating || ""))} de 5 com ${escapeHtml(formatNumber(reviews))} avaliações.</p>` : ""}
      <p><strong>Entrega:</strong> produto com envio para todo o Brasil e acompanhamento pelo portal de rastreio da Kairos Shopping.</p>
      <p><strong>Compra:</strong> finalize pelo botão Comprar agora, usando o checkout externo oficial do produto.</p>
      <p class="description-note">Antes de finalizar, confira disponibilidade, prazo e condições diretamente no checkout.</p>
    `;
  }

  function generateDescription(product) {
    const title = String(product.title || product.name || "produto");
    const lower = normalizeText(title + " " + (product.category || "") + " " + (product.subcategory || ""));

    if (lower.includes("camera") || lower.includes("seguranca") || lower.includes("espia")) {
      return {
        intro: "Produto indicado para quem busca mais praticidade no monitoramento de ambientes, com uso simples e foco em segurança no dia a dia.",
        points: ["Ideal para acompanhamento residencial ou comercial.", "Formato compacto para facilitar a instalação.", "Boa opção para quem procura mais controle e praticidade."]
      };
    }

    if (lower.includes("massageador") || lower.includes("massagem")) {
      return {
        intro: "Produto selecionado para auxiliar momentos de relaxamento e cuidado pessoal, com uso prático em diferentes regiões do corpo.",
        points: ["Ajuda a tornar a rotina de autocuidado mais prática.", "Indicado para relaxamento após o dia a dia.", "Design pensado para facilidade de manuseio."]
      };
    }

    if (lower.includes("legging") || lower.includes("moda") || lower.includes("roupa")) {
      return {
        intro: "Peça selecionada para quem busca conforto, versatilidade e praticidade para uso diário, treino ou combinações casuais.",
        points: ["Boa opção para compor looks confortáveis.", "Indicada para academia, caminhada ou rotina.", "Produto com foco em praticidade e custo-benefício."]
      };
    }

    if (lower.includes("fone") || lower.includes("bluetooth") || lower.includes("headphone")) {
      return {
        intro: "Produto indicado para quem procura mais praticidade para ouvir músicas, vídeos e chamadas no dia a dia.",
        points: ["Conexão sem fio para mais liberdade de uso.", "Boa opção para rotina, estudos, trabalho e lazer.", "Design prático para transporte e uso frequente."]
      };
    }

    if (lower.includes("controle") || lower.includes("playstation") || lower.includes("game")) {
      return {
        intro: "Acessório selecionado para melhorar a experiência em jogos, com praticidade de uso e conexão voltada ao entretenimento.",
        points: ["Indicado para quem joga com frequência.", "Boa opção para reposição ou controle extra.", "Produto pensado para conforto durante partidas."]
      };
    }

    if (lower.includes("jarra") || lower.includes("garrafa") || lower.includes("termica") || lower.includes("copo")) {
      return {
        intro: "Produto prático para conservar bebidas e facilitar a rotina em casa, no trabalho, em passeios ou viagens.",
        points: ["Indicado para uso diário.", "Ajuda a manter bebidas organizadas por mais tempo.", "Boa opção para quem valoriza praticidade."]
      };
    }

    if (lower.includes("aspirador")) {
      return {
        intro: "Produto selecionado para facilitar a limpeza rápida de pequenos espaços, especialmente em carros, mesas e cantos de difícil acesso.",
        points: ["Ideal para limpeza prática no dia a dia.", "Formato portátil para facilitar o transporte.", "Boa opção para manter o ambiente mais organizado."]
      };
    }

    if (lower.includes("joelheira") || lower.includes("ortoped")) {
      return {
        intro: "Produto selecionado para oferecer mais suporte e conforto durante atividades físicas, caminhadas ou rotina diária.",
        points: ["Ajuda a proteger a região dos joelhos durante o uso.", "Boa opção para treinos, caminhadas e atividades de rotina.", "Produto com foco em conforto e praticidade."]
      };
    }

    if (lower.includes("lixa") || lower.includes("pe") || lower.includes("pedicure")) {
      return {
        intro: "Produto voltado para cuidados pessoais, ideal para deixar a rotina de beleza mais prática em casa.",
        points: ["Indicado para cuidados com os pés.", "Ajuda na praticidade da rotina de autocuidado.", "Boa opção para quem busca facilidade no dia a dia."]
      };
    }

    if (lower.includes("copa") || lower.includes("panini") || lower.includes("figurinhas") || lower.includes("album")) {
      return {
        intro: "Item selecionado para colecionadores e torcedores que querem aproveitar o clima da Copa do Mundo com praticidade.",
        points: ["Boa opção para colecionar ou presentear.", "Produto relacionado ao universo Copa do Mundo.", "Ideal para fãs, crianças e colecionadores."]
      };
    }

    return {
      intro: "Produto selecionado pela Kairos Shopping para quem busca praticidade, bom custo-benefício e uma experiência de compra mais simples.",
      points: ["Produto com envio para todo o Brasil.", "Compra direcionada para checkout externo oficial.", "Informações organizadas para facilitar sua decisão."]
    };
  }

  function isGenericDescription(text) {
    const normalized = normalizeText(text);
    return !normalized || GENERIC_PATTERNS.some((pattern) => normalized.includes(normalizeText(pattern)));
  }

  function cleanDescription(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function slugify(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
})();
