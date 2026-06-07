/* Kairos Shopping - descrição completa no modal de produto.
   Arquivo publicado dentro de /public porque a Vercel usa outputDirectory: public. */
(function () {
  "use strict";

  let products = [];
  let loaded = false;
  let initialized = false;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
  }