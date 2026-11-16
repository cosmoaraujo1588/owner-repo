import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabase, cleanText, slugify } from "./_supabase.js";
import { buildCodes } from "./_shortcode.js";

const PUBLIC_SITE_URL = "https://www.kairosshopping.com.br";

export default async function handler(req, res) {
  const code = cleanText(req.query?.code || "", 80).toLowerCase();
  let slug = cleanText(req.query?.slug || "", 180);
  let product = code ? await findProductByCode(code) : await findProduct(slug);
  if (product && await isHiddenProduct(product.id)) product = null; // rascunho/arquivado nao pode aparecer
  if (product && code) slug = slugify(product.title || product.id);
  const html = await readFile(path.join(process.cwd(), "public", "index.html"), "utf8");
  const siteUrl = requestOrigin(req);
  let finalHtml = product ? injectProductShell(injectProductMeta(html, product, slug, siteUrl), product) : injectBase(html);
  if (product && code) finalHtml = finalHtml.replace("<head>", `<head>${shortLinkHead(slug)}`);
  res.statusCode = product ? 200 : 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  res.end(finalHtml);
}

async function findProduct(slug) {
  const supabase = getSupabase();
  if (!supabase || !slug) return null;
  const { data, error } = await supabase
    .from("products")
    .select("id,title,category,subcategory,price,old_price,short_description,description,image_url,checkout_url,active")
    .eq("active", true)
    .limit(500);
  if (error) return null;
  return (data || []).find((product) => slugify(product.title || product.id) === slug || product.id === slug) || null;
}

export // Link curto: marca o produto para o JS da loja e converte ?s=<canal> em UTMs
// antes do gtag rodar, para o GA4 identificar o canal sem poluir o link compartilhado.
function shortLinkHead(slug) {
  const channels = { wa: ["whatsapp", "referral"], fb: ["facebook", "social"], x: ["x", "social"], tg: ["telegram", "social"], pin: ["pinterest", "social"] };
  return `<meta name="kairos-product" content="${escapeHtml(slug)}"><script>(function(){try{var m=${JSON.stringify(channels)};var q=new URLSearchParams(location.search);var c=m[q.get("s")];if(c&&!q.get("utm_source")){history.replaceState(null,"",location.pathname+"?utm_source="+c[0]+"&utm_medium="+c[1]+"&utm_campaign=compartilhamento_produto")}}catch(e){}})()</script>`;
}

async function findProductByCode(code) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const [products, settings] = await Promise.all([
    supabase.from("products").select("id,title,category,subcategory,price,old_price,short_description,description,image_url,checkout_url,active").eq("active", true).limit(500),
    supabase.from("settings").select("value").eq("key", "store").maybeSingle()
  ]);
  if (products.error) return null;
  const list = products.data || [];
  const { byCode } = buildCodes(list, settings.data?.value?.shortLinks || {});
  const id = byCode[code];
  return list.find((item) => item.id === id) || list.find((item) => slugify(item.title || item.id) === code || item.id === code) || null;
}

export function injectProductMeta(html, product, slug, siteUrl) {
  const title = cleanText(product.title, 180);
  const description = shortText(product.short_description || product.description || "Produto Kairos Shopping", 160);
  const image = absoluteUrl(product.image_url || "/assets/banner-kairos-claro-1.png", siteUrl);
  const url = `${siteUrl}/produto/${encodeURIComponent(slug)}`;
  const category = cleanText(product.category || "Produtos", 100);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: title,
        image,
        description,
        category,
        brand: { "@type": "Brand", name: "Kairos Shopping" },
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: Number(product.price || 0).toFixed(2),
          availability: "https://schema.org/InStock",
          url
        }
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${siteUrl}/` },
          { "@type": "ListItem", position: 2, name: category, item: `${siteUrl}/#categorias` },
          { "@type": "ListItem", position: 3, name: title, item: url }
        ]
      }
    ]
  };
  return injectBase(html)
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} | Kairos Shopping</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(description)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escapeHtml(image)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeHtml(url)}">`)
    .replace(/<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="product">`)
    .replace(/<meta property="og:image:width" content="[^"]*">\s*<meta property="og:image:height" content="[^"]*">\s*<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${escapeHtml(title)}">\n    <meta property="product:price:amount" content="${Number(product.price || 0).toFixed(2)}">\n    <meta property="product:price:currency" content="BRL">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtml(title)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtml(description)}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${escapeHtml(image)}">`)
    .replace(/<meta name="twitter:url" content="[^"]*">/, `<meta name="twitter:url" content="${escapeHtml(url)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeHtml(url)}">`)
    .replace(/<link rel="alternate" hreflang="pt-BR" href="[^"]*">/, `<link rel="alternate" hreflang="pt-BR" href="${escapeHtml(url)}">`)
    .replace(/<link rel="alternate" hreflang="x-default" href="[^"]*">/, `<link rel="alternate" hreflang="x-default" href="${escapeHtml(url)}">`)
    .replace(/<script type="application\/ld\+json" id="structuredData">[\s\S]*?<\/script>/, `<script type="application/ld+json" id="structuredData">${JSON.stringify(jsonLd)}</script>`);
}

function shortText(value, max) {
  const text = cleanText(value, 2000).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 60)).replace(/[\s,;:.\-–]+$/, "")}…`;
}

function injectBase(html) {
  return html.includes("<base href=") ? html : html.replace("<head>", '<head><base href="/">');
}

function requestOrigin(req) {
  const configured = process.env.PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL || process.env.BASE_URL || PUBLIC_SITE_URL;
  return String(configured).replace(/\/+$/, "");
}

function absoluteUrl(value, siteUrl) {
  try {
    return new URL(value || "/", siteUrl).href;
  } catch {
    return `${siteUrl}/assets/banner-kairos-claro-1.png`;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


async function isHiddenProduct(id) {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { data } = await supabase.from("settings").select("value").eq("key", "store").maybeSingle();
    const v = data?.value || {};
    return Boolean(v.drafts?.[id] || v.archived?.[id]);
  } catch { return false; }
}

// Primeira pintura no servidor: titulo, foto, preco e botao de compra ja chegam no HTML.
// O JavaScript da loja substitui este bloco pelo modal completo assim que o catalogo carrega.
export function injectProductShell(html, product) {
  const price = Number(product.price || 0);
  const old = Number(product.old_price || 0);
  const brl = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const image = cleanText(product.image_url || "", 800);
  const checkout = /^https:\/\//i.test(product.checkout_url || "") ? product.checkout_url : "";
  const text = cleanText(product.description || product.short_description || "", 3000);
  const title = escapeHtml(cleanText(product.title, 180));
  const shell = `<div class="pp-topbar"><a class="pp-back" href="/"><span>Voltar à loja</span></a><a class="brand" href="/"><img src="/assets/logo-kairos-oficial.png" alt="" width="40" height="40"><span class="brand-text"><strong>KAIRÓS</strong><small>SHOPPING</small></span></a><a class="pp-cart" href="/carrinho"><span>Sacolinha</span></a></div>
<article class="pp"><div class="pp-grid"><div class="pp-gallery"><div class="gstage">${image ? `<img src="${escapeHtml(image)}" alt="${title}" fetchpriority="high" width="640" height="640">` : ""}</div></div>
<div class="pp-buy"><span class="pc-cat">${escapeHtml(cleanText(product.category || "", 100))}</span><h1>${title}</h1><div class="pp-box"><div class="pp-price"><div class="price-row large"><strong>${price > 0 ? brl(price) : ""}</strong>${old > price && price > 0 ? `<del>${brl(old)}</del>` : ""}</div></div>
<ul class="pp-perks"><li><span><strong>Frete grátis</strong> para todo o Brasil</span></li><li><span><strong>Compra segura</strong> no checkout oficial</span></li></ul>
<div class="pp-actions">${checkout ? `<a class="btn btn-primary btn-lg" href="${escapeHtml(checkout)}" rel="noopener">Comprar agora</a>` : ""}</div></div></div></div>
${text ? `<div class="pp-details"><section><h2>Sobre o produto</h2><div class="pp-text">${escapeHtml(text)}</div></section></div>` : ""}</article>`;
  const preload = image ? `<link rel="preload" as="image" href="${escapeHtml(image)}">` : "";
  return html
    .replace('<div class="product-modal" id="productModal" hidden></div>', `<div class="product-modal" id="productModal">${shell}</div>`)
    .replace(/<body>/, '<body class="product-open">')
    .replace("</head>", `${preload}</head>`);
}
