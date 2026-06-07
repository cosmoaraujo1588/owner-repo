/* Kairos Shopping - descricao completa no modal de produto */
(function () {
  "use strict";

  var products = [];
  var ready = false;

  function start() {
    loadCatalog();
    var modal = document.getElementById("productModal");
    if (!modal) return;

    new MutationObserver(function () {
      setTimeout(enhanceModal, 150);
      setTimeout(enhanceModal, 500);
    }).observe(modal, { childList: true, subtree: true, attributes: true });

    document.addEventListener("click", function (event