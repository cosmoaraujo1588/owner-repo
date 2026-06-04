const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const code = fs.readFileSync(path.join(root, "data", "seed-products.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(code, context);
const products = context.window.KAIROS_SEED_PRODUCTS || [];

function sql(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "0";
}

const baseCategories = ["Eletrônicos", "Roupas", "Utilidades", "Brinquedos", "Automotivo", "Promoções"];
const categories = Array.from(new Set([...baseCategories, ...products.map((item) => item.category).filter(Boolean)]));

const lines = [
  "-- Seed Kairos Shopping: produtos limpos, sem imagens antigas quebradas.",
  "insert into public.settings (key, value) values ('store', '{\"storeName\":\"Kairos Shopping\",\"storeEmail\":\"kairossshopping@gmail.com\",\"logoUrl\":\"./assets/logo-kairos-oficial.png\",\"bannerUrl\":\"./assets/banner-principal-kairos.jpg\",\"trackingUrl\":\"https://app.kaiross.com.br/rastreio\"}'::jsonb) on conflict (key) do update set value = excluded.value, updated_at = now();",
  ""
];

categories.forEach((category, index) => {
  const id = category.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  lines.push(`insert into public.categories (id, name, active, display_order) values (${sql(id)}, ${sql(category)}, true, ${index}) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();`);
});

lines.push("");

products.forEach((product, index) => {
  lines.push(`insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  ${sql(product.id)}, ${sql(product.title)}, ${sql(product.category)}, ${sql(product.subcategory)}, ${sql(product.sku)},
  ${num(product.price)}, ${product.oldPrice ? num(product.oldPrice) : "null"}, ${sql(product.tag)}, ${sql(product.shortDescription)}, ${sql(product.description)},
  ${sql(product.image)}, '[]'::jsonb, ${sql(product.videoUrl)}, ${sql(product.videoThumb)}, ${sql(product.checkoutUrl)},
  ${product.featured !== false}, ${product.visible !== false}, ${Boolean(product.bestSeller)}, ${Boolean(product.flashOffer)},
  ${num(product.reviewRating || 5)}, ${Math.round(Number(product.reviewCount || 0))}, ${index}, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();`);
});

fs.writeFileSync(path.join(root, "supabase", "seed.sql"), `${lines.join("\n")}\n`, "utf8");
console.log(`Generated seed.sql with ${products.length} products.`);
