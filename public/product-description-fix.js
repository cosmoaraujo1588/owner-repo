/* Kairos Shopping - descricao completa no modal */
(function () {
  var products = [];
  var loaded = false;

  function esc(v) {
    return String(v || '').replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  function money(v) {
    return Number(v || 0).toLocaleString('pt-BR',