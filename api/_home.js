import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabase, cleanText, slugify } from "./_supabase.js";

const MAX_CARDS = 24;

export async function homeHandler(req, res) {
  let html = await readFile(path.join(process.cwd(), "public", "index.html"), "utf8");
  try {
    html = injectHomeProducts(html, await loadHomeProducts());
  } catch { /* sem banco: entrega a pagina como sempre foi (JS carrega o catalogo) */ }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  res.end(html);
}

async function loadHomeProducts() {
  const supabase = getSupabase();
  if (!supabase) return [];
  const [products, settings] = await Promise.all([
    supabase.from("products").select("id,title,category,subcategory,price,old_price,image_url,active").eq("active", true).limit(300),
    supabase.from("settings").select("value").eq("key", "store").maybeSingle()
  ]);
  if (products.error) return [];
  const v = settings.data?.value || {};
  return (products.data || [])
    .filter((p) => p.title && Number(p.price) > 0 && p.image_url && !v.drafts?.[p.id] && !v.archived?.[p.id])
    .slice(0, MAX_CARDS);
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
const brl = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Grade inicial de produtos no HTML (rastreavel e visivel sem JS). O JS da loja a substitui ao carregar o catalogo.
export function injectHomeProducts(html, products) {
  if (!products.length) return html;
  const cards = products.map((p) => {
    const href = `/produto/${encodeURIComponent(slugify(p.title || p.id))}`;
    const title = esc(cleanText(p.title, 180));
    return `<article class="product-card"><a class="pc-media" href="${href}" aria-label="${title}"><img src="${esc(cleanText(p.image_url, 800))}" alt="${title}" loading="lazy" decoding="async" width="320" height="320"></a><div class="pc-body"><span class="pc-cat">${esc(cleanText(p.subcategory || p.category || "", 100))}</span><h3><a href="${href}">${title}</a></h3><div class="price-row"><strong>${brl(p.price)}</strong></div><span class="pc-ship">Frete grátis</span></div></article>`;
  }).join("");
  return html.replace('<div class="product-grid catalog-grid" id="catalogGrid"></div>', `<div class="product-grid catalog-grid" id="catalogGrid">${cards}</div>`);
}
