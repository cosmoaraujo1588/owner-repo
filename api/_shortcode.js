// Links curtos /p/<codigo>. Mantenha identico a public/shortcode.js (ha teste de paridade).
const STOP = new Set(["de", "da", "do", "das", "dos", "para", "com", "e", "a", "o", "em", "por", "na", "no", "kit", "par", "un", "1", "2", "3"]);

function slug(value) {
  return String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function baseCode(title) {
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

export function cleanOverride(value) {
  return slug(value).slice(0, 40);
}

// products: [{id,title}], overrides: {id: codigo}. Retorna { byId, byCode }.
export function buildCodes(products, overrides = {}) {
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
