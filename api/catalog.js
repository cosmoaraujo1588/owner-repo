import { getSupabase, isAdmin, sendJson, cleanText, number, slugify } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method === "GET") return getCatalog(req, res);
  if (req.method === "PUT") return putCatalog(req, res);
  return sendJson(res, 405, { error: "Method not allowed" });
}

async function getCatalog(req, res) {
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 503, { error: "Supabase not configured" });
  const includeInactive = req.query?.includeInactive === "1";

  let productsQuery = supabase.from("products").select("*").order("display_order", { ascending: true });
  if (!includeInactive) productsQuery = productsQuery.eq("active", true);

  let categoriesQuery = supabase.from("categories").select("*").order("display_order", { ascending: true });
  if (!includeInactive) categoriesQuery = categoriesQuery.eq("active", true);

  let subcategoriesQuery = supabase.from("subcategories").select("*").order("display_order", { ascending: true });
if (!includeInactive) subcategoriesQuery = subcategoriesQuery.eq("active", true);

let bannersQuery = supabase.from("banners").select("*").order("display_order", { ascending: true });
if (!includeInactive) bannersQuery = bannersQuery.eq("active", true);

let pagesQuery = supabase.from("pages").select("*").order("created_at", { ascending: true });
if (!includeInactive) pagesQuery = pagesQuery.eq("active", true);

const [products, categories, subcategories, banners, pages, settings, reviews] = await Promise.all([
  productsQuery,
  categoriesQuery,
  subcategoriesQuery,
  bannersQuery,
  pagesQuery,
  supabase.from("settings").select("*").eq("key", "store").maybeSingle(),
  supabase.from("reviews").select("*").eq("active", true).order("created_at", { ascending: false }).limit(50)
]);

  if (products.error) return sendJson(res, 500, { error: products.error.message });

  const storeSettings = settings.data?.value || {};
  storeSettings.reviews = reviews.data?.map(fromReview) || storeSettings.reviews || [];

  sendJson(res, 200, {
  source: "supabase",
  updatedAt: new Date().toISOString(),
  products: (products.data || []).map(fromProduct),
  categories: (categories.data || []).map(fromCategory),
  subcategories: (subcategories.data || []).map(fromSubcategory),
  banners: (banners.data || []).map(fromBanner),
  pages: (pages.data || []).map(fromPage),
  settings: storeSettings
});
}
async function putCatalog(req, res) {
  if (!isAdmin(req)) return sendJson(res, 401, { error: "Unauthorized" });
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 503, { error: "Supabase not configured" });

  const body = await readBody(req);
  let products = [];
  let categories = [];
  try {
    products = Array.isArray(body.products) ? body.products.map(toProduct) : [];
    categories = Array.isArray(body.categories) ? body.categories.map(toCategory) : [];
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Dados invalidos no catalogo" });
  }
  const settings = body.settings || {};
  const reviews = Array.isArray(settings.reviews) ? settings.reviews.map(toReview) : [];

  const [productResult, categoryResult, settingsResult] = await Promise.all([
    products.length ? supabase.from("products").upsert(products, { onConflict: "id" }) : Promise.resolve({ error: null }),
    categories.length ? supabase.from("categories").upsert(categories, { onConflict: "id" }) : Promise.resolve({ error: null }),
    supabase.from("settings").upsert({ key: "store", value: settings, updated_at: new Date().toISOString() }, { onConflict: "key" })
  ]);

  if (productResult.error) return sendJson(res, 500, { error: productResult.error.message });
  if (categoryResult.error) return sendJson(res, 500, { error: categoryResult.error.message });
  if (settingsResult.error) return sendJson(res, 500, { error: settingsResult.error.message });

  if (reviews.length) {
    const reviewResult = await supabase.from("reviews").upsert(reviews, { onConflict: "id" });
    if (reviewResult.error) return sendJson(res, 500, { error: reviewResult.error.message });
  }

  sendJson(res, 200, { ok: true, products: products.length, categories: categories.length });
}

function fromProduct(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    subcategory: row.subcategory || "",
    sku: row.sku || "",
    price: Number(row.price || 0),
    oldPrice: row.old_price ? Number(row.old_price) : null,
    tag: row.tag || "",
    shortDescription: row.short_description || "",
    description: row.description || "",
    image: row.image_url || "",
    gallery: row.gallery || [],
    videoUrl: row.video_url || "",
    videoThumb: row.video_thumb || "",
    checkoutUrl: row.checkout_url || "",
    featured: row.featured !== false,
    visible: row.active !== false,
    bestSeller: Boolean(row.best_seller),
    flashOffer: Boolean(row.flash_offer),
    reviewRating: Number(row.review_rating || 5),
    reviewCount: Number(row.review_count || 0),
    order: Number(row.display_order || 0)
  };
}

function toProduct(product, index) {
  const id = cleanText(product.id) || slugify(product.title || `produto-${index}`);
  return {
    id,
    title: cleanText(product.title, 240) || "Produto sem titulo",
    category: cleanText(product.category, 120) || "Ofertas",
    subcategory: cleanText(product.subcategory, 120),
    sku: cleanText(product.sku, 80),
    price: number(product.price),
    old_price: product.oldPrice ? number(product.oldPrice) : null,
    tag: cleanText(product.tag, 80),
    short_description: cleanText(product.shortDescription, 500),
    description: cleanText(product.description, 8000),
    image_url: publicImageUrl(product.image || product.imageUrl, product.title),
    gallery: Array.isArray(product.gallery) ? product.gallery.slice(0, 12) : [],
    video_url: cleanText(product.videoUrl, 1200),
    video_thumb: cleanText(product.videoThumb, 1200),
    checkout_url: cleanText(product.checkoutUrl, 1400),
    featured: product.featured !== false,
    active: product.visible !== false && product.active !== false,
    best_seller: Boolean(product.bestSeller),
    flash_offer: Boolean(product.flashOffer),
    review_rating: number(product.reviewRating || 5),
    review_count: Math.round(number(product.reviewCount)),
    display_order: Number.isFinite(Number(product.order)) ? Number(product.order) : index,
    updated_at: new Date().toISOString()
  };
}

function fromCategory(row) {
  return {
    id: row.id,
    name: row.name,
    image: row.image_url || "",
    active: row.active !== false,
    order: Number(row.display_order || 0)
  };
}

function toCategory(category, index) {
  return {
    id: cleanText(category.id) || slugify(category.name || `categoria-${index}`),
    name: cleanText(category.name, 120),
    image_url: cleanText(category.image || category.imageUrl, 1200),
    active: category.active !== false,
    display_order: Number.isFinite(Number(category.order)) ? Number(category.order) : index,
    updated_at: new Date().toISOString()
  };
}

function fromReview(row) {
  return {
    id: row.id,
    name: row.customer_name,
    city: row.city || "",
    product: row.product_name || "",
    rating: Number(row.rating || 5),
    text: row.comment || "",
    featured: row.active !== false
  };
}

function toReview(review) {
  return {
    id: cleanText(review.id) || slugify(`${review.name}-${Date.now()}`),
    customer_name: cleanText(review.name, 160),
    city: cleanText(review.city, 160),
    product_name: cleanText(review.product, 180),
    rating: number(review.rating || 5),
    comment: cleanText(review.text, 1200),
    active: review.featured !== false,
    updated_at: new Date().toISOString()
  };
}

function publicImageUrl(value, title = "produto") {
  const image = cleanText(value, 1400);
  if (!image) return "";
  if (/^(?:data:image|blob:|file:|[a-zA-Z]:\\|\\\\)/i.test(image)) {
    throw new Error(`Imagem invalida no produto "${cleanText(title, 120) || "sem titulo"}". Envie a imagem para o storage publico antes de salvar.`);
  }
  if (!/^https:\/\//i.test(image)) {
    throw new Error(`Imagem do produto "${cleanText(title, 120) || "sem titulo"}" precisa ser uma URL publica https.`);
  }
  return image;
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => raw += chunk);
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch { resolve({}); }
    });
  });
}

function fromSubcategory(row) {
  return {
    id: row.id,
    categoryId: row.category_id || "",
    name: row.name,
    image: row.image_url || "",
    active: row.active !== false,
    order: Number(row.display_order || 0)
  };
}

function fromBanner(row) {
  return {
    id: row.id,
    title: row.title || "",
    subtitle: row.subtitle || "",
    image: row.image_url || "",
    mobileImage: row.mobile_image_url || "",
    buttonText: row.button_text || "Ver produtos",
    buttonLink: row.button_link || "#produtos",
    placement: row.placement || "main",
    active: row.active !== false,
    order: Number(row.display_order || 0)
  };
}

function fromPage(row) {
  return {
    id: row.id,
    title: row.title || "",
    slug: row.slug || "",
    content: row.content || "",
    seoTitle: row.seo_title || "",
    seoDescription: row.seo_description || "",
    active: row.active !== false
  };
}
