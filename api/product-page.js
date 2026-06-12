import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabase, cleanText, slugify } from "./_supabase.js";

const PUBLIC_SITE_URL = "https://www.kairosshopping.com.br";

export default async function handler(req, res) {
  const slug = cleanText(req.query?.slug || "", 180);
  const product = await findProduct(slug);
  const html = await readFile(path.join(process.cwd(), "public", "index.html"), "utf8");
  const siteUrl = requestOrigin(req);
  const finalHtml = product ? injectProductMeta(html, product, slug, siteUrl) : injectBase(html);
  res.statusCode = product ? 200 : 404;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
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

function injectProductMeta(html, product, slug, siteUrl) {
  const title = cleanText(product.title, 180);
  const description = cleanText(product.short_description || product.description || "Produto Kairos Shopping", 180);
  const image = absoluteUrl(product.image_url || "/assets/banner-kairos-claro-1.png", siteUrl);
  const url = `${siteUrl}/produto/${encodeURIComponent(slug)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    image,
    description,
    brand: { "@type": "Brand", name: "Kairos Shopping" },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: Number(product.price || 0).toFixed(2),
      availability: "https://schema.org/InStock",
      url
    }
  };
  return injectBase(html)
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)} | Kairos Shopping</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtml(description)}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtml(title)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtml(description)}">`)
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escapeHtml(image)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeHtml(url)}">`)
    .replace(/<meta name="twitter:url" content="[^"]*">/, `<meta name="twitter:url" content="${escapeHtml(url)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeHtml(url)}">`)
    .replace(/<script type="application\/ld\+json" id="structuredData">[\s\S]*?<\/script>/, `<script type="application/ld+json" id="structuredData">${JSON.stringify(jsonLd)}</script>`);
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
