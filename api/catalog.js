import { getSupabase, isAdmin, sendJson, cleanText, number, slugify } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method === "GET") return getCatalog(req, res);
  if (req.method === "PUT") return putCatalog(req, res);
  return sendJson(res, 405, { error: "Method not allowed" });
}

async function getCatalog(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  const includeInactive = req.query?.includeInactive === "1";
  // Itens inativos (rascunhos) so podem ser lidos pelo painel autenticado.
  if (includeInactive && !isAdmin(req)) return sendJson(res, 401, { error: "Unauthorized" });
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 503, { error: "Supabase not configured" });

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
    supabase.from("reviews").select("*").eq("active", true).order("created_at", { ascending: false }).limit(500)
  ]);

  if (products.error) return sendJson(res, 500, { error: products.error.message });

  const storeSettings = settings.data?.value || {};
  const reviewList = reviews.data?.map(fromReview) || [];
  storeSettings.reviews = reviewList.length ? reviewList : storeSettings.reviews || [];

  sendJson(res, 200, {
    source: "supabase",
    updatedAt: new Date().toISOString(),
    products: (products.data || []).map(fromProduct),
    categories: (categories.data || []).map(fromCategory),
    subcategories: (subcategories.data || []).map(fromSubcategory),
    banners: (banners.data || []).map(fromBanner),
    pages: (pages.data || []).map(fromPage),
    reviews: storeSettings.reviews,
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
  let subcategories = [];
  try {
    products = uniqueById(Array.isArray(body.products) ? body.products.map(toProduct) : []);
    categories = uniqueById(Array.isArray(body.categories) ? body.categories.map(toCategory) : []);
    subcategories = uniqueById(Array.isArray(body.subcategories) ? body.subcategories.map(toSubcategory) : []);
  } catch (error) {
    return sendJson(res, 400, { error: error.message || "Dados invalidos no catalogo" });
  }
  const settings = sanitizeSettings(body.settings || {});
  const deletedIds = Array.isArray(body.deletedIds) ? [...new Set(body.deletedIds.map((id) => cleanText(id, 200)).filter(Boolean))].slice(0, 250) : [];
  const keptIds = new Set(products.map((product) => product.id));
  const idsToDelete = deletedIds.filter((id) => !keptIds.has(id));
  // Exclusao segura: produtos com historico (cliques, carrinho, favoritos, avaliacoes, campanhas, videos) sao ARQUIVADOS
  // (inativos e ocultos da lista) para nao perder analytics nem quebrar chaves estrangeiras; os demais sao removidos de fato.
  let deletedCount = 0;
  const archivedIds = [];
  if (idsToDelete.length) {
    const referenced = new Set();
    const tables = ["cart_events", "click_events", "favorites", "reviews", "campaigns", "videos"];
    const checks = await Promise.all(tables.map((table) => supabase.from(table).select("product_id").in("product_id", idsToDelete).limit(1000)));
    const checkError = checks.find((result) => result.error);
    if (checkError) return sendJson(res, 500, { error: checkError.error.message });
    checks.forEach((result) => (result.data || []).forEach((row) => referenced.add(row.product_id)));
    const removable = idsToDelete.filter((id) => !referenced.has(id));
    archivedIds.push(...idsToDelete.filter((id) => referenced.has(id)));
    if (removable.length) {
      const deleteResult = await supabase.from("products").delete().in("id", removable);
      if (deleteResult.error) return sendJson(res, 500, { error: deleteResult.error.message });
      deletedCount = removable.length;
    }
    if (archivedIds.length) {
      const archiveResult = await supabase.from("products").update({ active: false, updated_at: new Date().toISOString() }).in("id", archivedIds);
      if (archiveResult.error) return sendJson(res, 500, { error: archiveResult.error.message });
      settings.archived = { ...(settings.archived || {}), ...Object.fromEntries(archivedIds.map((id) => [id, true])) };
    }
  }
  const forcedDraft = body.products ? body.products.filter((item) => item && item.visible !== false && item.active !== false && !isPublishable(item)).length : 0;
  const reviews = uniqueById(Array.isArray(settings.reviews) ? settings.reviews.map(toReview) : []);

  const [productResult, categoryResult, subcategoryResult, settingsResult] = await Promise.all([
    products.length ? supabase.from("products").upsert(products, { onConflict: "id" }) : Promise.resolve({ error: null }),
    categories.length ? supabase.from("categories").upsert(categories, { onConflict: "id" }) : Promise.resolve({ error: null }),
    subcategories.length ? supabase.from("subcategories").upsert(subcategories, { onConflict: "id" }) : Promise.resolve({ error: null }),
    supabase.from("settings").upsert({ key: "store", value: settings, updated_at: new Date().toISOString() }, { onConflict: "key" })
  ]);

  if (productResult.error) return sendJson(res, 500, { error: productResult.error.message });
  if (categoryResult.error) return sendJson(res, 500, { error: categoryResult.error.message });
  if (subcategoryResult.error) return sendJson(res, 500, { error: subcategoryResult.error.message });
  if (settingsResult.error) return sendJson(res, 500, { error: settingsResult.error.message });

  if (Array.isArray(settings.reviews)) {
    const existingReviews = await supabase.from("reviews").select("id");
    if (existingReviews.error) return sendJson(res, 500, { error: existingReviews.error.message });
    const activeReviewIds = new Set(reviews.map((review) => review.id));
    const inactiveIds = (existingReviews.data || []).map((review) => review.id).filter((id) => !activeReviewIds.has(id));
    if (inactiveIds.length) {
      const inactiveResult = await supabase.from("reviews").update({ active: false, updated_at: new Date().toISOString() }).in("id", inactiveIds);
      if (inactiveResult.error) return sendJson(res, 500, { error: inactiveResult.error.message });
    }
  }

  if (reviews.length) {
    const reviewResult = await supabase.from("reviews").upsert(reviews, { onConflict: "id" });
    if (reviewResult.error) return sendJson(res, 500, { error: reviewResult.error.message });
  }

  sendJson(res, 200, { ok: true, deleted: deletedCount, archived: archivedIds.length, forcedDraft, products: products.length, categories: categories.length, subcategories: subcategories.length, reviews: reviews.length });
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

export function isPublishable(product) {
  const checkout = cleanText(product.checkoutUrl, 1400);
  const price = number(product.price);
  return Boolean(cleanText(product.title, 240)) && price > 0 && /^https:\/\/[^\s?]+(\?[^?\s]*)?$/i.test(checkout);
}

function toProduct(product, index) {
  const id = cleanText(product.id) || `${slugify(product.title || "produto")}-${Date.now()}-${index}`;
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
    gallery: Array.isArray(product.gallery) ? product.gallery.filter((url) => /^https:\/\//i.test(String(url))).slice(0, 12) : [],
    video_url: cleanText(product.videoUrl, 1200),
    video_thumb: cleanText(product.videoThumb, 1200),
    checkout_url: cleanText(product.checkoutUrl, 1400),
    featured: product.featured !== false,
    // Nunca publica produto sem dados obrigatorios (nome, preco e checkout https validos).
    active: product.visible !== false && product.active !== false && isPublishable(product),
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

function toSubcategory(subcategory, index) {
  return {
    id: cleanText(subcategory.id) || slugify(subcategory.name || `subcategoria-${index}`),
    category_id: cleanText(subcategory.categoryId || subcategory.category_id, 120),
    name: cleanText(subcategory.name, 120),
    image_url: cleanText(subcategory.image || subcategory.imageUrl, 1200),
    active: subcategory.active !== false,
    display_order: Number.isFinite(Number(subcategory.order)) ? Number(subcategory.order) : index,
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
    date: row.created_at || row.updated_at || "",
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

function uniqueById(items) {
  const map = new Map();

  for (const item of items || []) {
    if (!item || !item.id) continue;
    map.set(String(item.id), item);
  }

  return Array.from(map.values());
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
    desktopImage: row.image_url || "",
    mobileImage: row.mobile_image_url || "",
    videoUrl: row.video_url || "",
    mobileVideoUrl: row.mobile_video_url || "",
    buttonText: row.button_text || "Ver produtos",
    buttonLink: row.button_link || "#produtos",
    link: row.button_link || "#produtos",
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

// Validacao no servidor das configuracoes comerciais (associacoes, links curtos, campanha, banners).
export function sanitizeSettings(input) {
  const settings = { ...input };
  const idList = (value) => (Array.isArray(value) ? value.map((id) => String(id).slice(0, 120)).filter(Boolean).slice(0, 12) : []);
  if (settings.orderBump && typeof settings.orderBump === "object") {
    const ob = settings.orderBump;
    const links = {};
    Object.entries(ob.links && typeof ob.links === "object" ? ob.links : {}).slice(0, 1000).forEach(([id, list]) => {
      const ids = idList(list).filter((other) => other !== id);
      if (ids.length) links[String(id).slice(0, 120)] = ids;
    });
    const disabled = {};
    Object.entries(ob.disabled && typeof ob.disabled === "object" ? ob.disabled : {}).forEach(([id, flag]) => { if (flag) disabled[String(id).slice(0, 120)] = true; });
    settings.orderBump = {
      enabled: ob.enabled !== false,
      autoByCategory: ob.autoByCategory !== false,
      title: String(ob.title || "Complete sua compra").slice(0, 80),
      max: Math.min(6, Math.max(1, Number(ob.max) || 3)),
      links,
      disabled
    };
  }
  if (Array.isArray(settings.banners)) {
    const str = (v, n = 600) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
    const media = (v) => { const u = str(v, 1400); return /^(https:\/\/|\/|\.\/)/i.test(u) && !/^\/\//.test(u) ? u : ""; };
    const link = (v) => { const u = str(v, 1000); return !u || /^(#|\/(?!\/)|\.\/|https?:\/\/)/i.test(u) ? u : ""; };
    const date = (v) => { const d = new Date(v); return v && !Number.isNaN(d.getTime()) ? d.toISOString() : ""; };
    const items = settings.banners.filter((item) => item && typeof item === "object").slice(0, 30).map((item, index) => ({
      ...item,
      id: str(item.id, 120) || `banner-${index + 1}`,
      title: str(item.title, 160),
      type: item.type === "video" ? "video" : "image",
      altText: str(item.altText, 200),
      link: link(item.link),
      desktopImage: media(item.desktopImage), mobileImage: media(item.mobileImage),
      videoUrl: media(item.videoUrl), mobileVideoUrl: media(item.mobileVideoUrl),
      poster: media(item.poster), mobilePoster: media(item.mobilePoster),
      active: item.active !== false,
      order: Number.isFinite(Number(item.order)) ? Math.round(Number(item.order)) : index + 1,
      startAt: date(item.startAt), endAt: date(item.endAt)
    }));
    // No maximo 5 itens ativos no carrossel (banners e videos em conjunto): os excedentes, pela ordem, ficam inativos.
    let activeCount = 0;
    items.slice().sort((x, y) => x.order - y.order).forEach((item) => { if (item.active) { activeCount += 1; if (activeCount > 5) item.active = false; } });
    settings.banners = items;
  }
  if (settings.carousel && typeof settings.carousel === "object") {
    const c = settings.carousel;
    const bool = (v, d) => (typeof v === "boolean" ? v : d);
    const clamp = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
    settings.carousel = {
      enabled: bool(c.enabled, true), autoplay: bool(c.autoplay, true), interval: clamp(c.interval, 3, 30, 6),
      arrows: bool(c.arrows, true), dots: bool(c.dots, true), swipe: bool(c.swipe, true),
      pauseOnInteraction: bool(c.pauseOnInteraction, true), pauseHidden: bool(c.pauseHidden, true),
      videoMaxMb: Math.round(clamp(c.videoMaxMb, 5, 100, 30))
    };
  }
  if (settings.archived && typeof settings.archived === "object") {
    const archived = {};
    Object.entries(settings.archived).slice(0, 2000).forEach(([id, flag]) => { if (flag) archived[String(id).slice(0, 120)] = true; });
    settings.archived = archived;
  }
  if (settings.drafts && typeof settings.drafts === "object") {
    const drafts = {};
    Object.entries(settings.drafts).slice(0, 2000).forEach(([id, flag]) => { if (flag) drafts[String(id).slice(0, 120)] = true; });
    settings.drafts = drafts;
  }
  if (settings.shortLinks && typeof settings.shortLinks === "object") {
    const codes = {};
    const used = new Set();
    Object.entries(settings.shortLinks).slice(0, 1000).forEach(([id, code]) => {
      const clean = String(code || "").trim() ? slugify(String(code)).slice(0, 40) : "";
      if (clean && !used.has(clean)) { used.add(clean); codes[String(id).slice(0, 120)] = clean; }
    });
    settings.shortLinks = codes;
  } else if ("shortLinks" in settings) {
    settings.shortLinks = {};
  }
  if (settings.campaign && typeof settings.campaign === "object") {
    const valid = (v) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : "");
    const c = settings.campaign;
    settings.campaign = { enabled: c.enabled === true && Boolean(valid(c.endAt)), title: String(c.title || "").slice(0, 80), text: String(c.text || "").slice(0, 140), category: String(c.category || "").slice(0, 80), link: String(c.link || "").slice(0, 300), startAt: valid(c.startAt), endAt: valid(c.endAt) };
  }
  return settings;
}
