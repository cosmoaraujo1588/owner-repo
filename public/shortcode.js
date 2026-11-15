// Links curtos /p/<codigo>. Mantenha identico a api/_shortcode.js (ha teste de paridade).
(function (root) {

  var STOP = new Set(["de", "da", "do", "das", "dos", "para", "com", "e", "a", "o", "em", "por", "na", "no", "kit", "par", "un", "1", "2", "3"]);

  function slug(value) {
    return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  
  function baseCode(title) {
    const words = slug(title).split("-").filter((word) => word && !STOP.has(word));
    let code = "";
    for (const word of words) {
      const next = code ? `${code}-${word}` : word;
      if (code && next.length > 22) break;
      code = next;
      if (code.split("-").length >= 2) break;
    }
    return code.slice(0, 22).replace(/-$/, "") || "produto";
  }
  
  function cleanOverride(value) {
    return slug(value).slice(0, 40);
  }
  
  // products: [{id,title}], overrides: {id: codigo}. Retorna { byId, byCode }.
  function buildCodes(products, overrides = {}) {
    const byId = {};
    const byCode = {};
    const list = [...products].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    for (const product of list) {
      const custom = cleanOverride(overrides[product.id]);
      if (custom && !byCode[custom]) { byId[product.id] = custom; byCode[custom] = product.id; }
    }
    for (const product of list) {
      if (byId[product.id]) continue;
      const base = baseCode(product.title);
      let code = base;
      let n = 2;
      while (byCode[code]) code = `${base}-${n++}`;
      byId[product.id] = code;
      byCode[code] = product.id;
    }
    return { byId, byCode };
  }
  // Recomendacoes "Complete sua compra": associacoes manuais (na ordem do painel) tem prioridade;
  // categoria so e usada para produtos SEM associacao manual e se a opcao automatica estiver ligada.
  function suggest(products, mains, cartIds, cfg) {
    cfg = cfg || {};
    if (cfg.enabled === false) return [];
    var inCart = {}; cartIds.forEach(function (id) { inCart[String(id)] = true; });
    var links = cfg.links || {}, disabled = cfg.disabled || {};
    var out = [], seen = {};
    function ok(p) { return p && p.visible !== false && p.active !== false && !inCart[String(p.id)] && !seen[String(p.id)]; }
    function add(p) { if (ok(p)) { seen[String(p.id)] = true; out.push(p); } }
    mains.forEach(function (main) {
      if (disabled[main.id]) return;
      var manual = Array.isArray(links[main.id]) ? links[main.id] : [];
      if (manual.length) {
        manual.forEach(function (id) { add(products.filter(function (p) { return String(p.id) === String(id); })[0]); });
      } else if (cfg.autoByCategory !== false) {
        products.filter(function (p) { return p.category && p.category === main.category && p.id !== main.id; }).forEach(add);
      }
    });
    return out.slice(0, Math.min(Math.max(Number(cfg.max) || 3, 1), 6));
  }

  root.KairosShort = { suggest: suggest, baseCode: baseCode, cleanOverride: cleanOverride, buildCodes: buildCodes };
})(typeof window !== "undefined" ? window : globalThis);
