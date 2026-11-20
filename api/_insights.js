// Relatorios administrativos: visitantes ao vivo e desempenho por periodo. Somente leitura, uso exclusivo de rotas admin.
import { cleanText } from "./_supabase.js";

const TZ = "America/Sao_Paulo";
const ADMIN_RE = /\/(admin|painel|dashboard)/i;
export const CHECKOUT_TYPES = new Set(["checkout_click", "buy_click"]);

export function geoFromHeaders(headers = {}) {
  const country = cleanText(headers["x-vercel-ip-country"], 8).toUpperCase();
  const region = cleanText(headers["x-vercel-ip-country-region"], 12).toUpperCase();
  let city = String(headers["x-vercel-ip-city"] || "");
  try { city = decodeURIComponent(city); } catch { /* mantem bruto */ }
  return { country: country || null, region: country ? region || null : null, city: country ? cleanText(city, 80) || null : null };
}

export function originLabel(origin) {
  const value = String(origin || "").trim();
  if (!value) return "Direto";
  try {
    const host = new URL(value).hostname.replace(/^www\./, "");
    if (/kairosshopping\.com\.br$/.test(host) || /vercel\.app$/.test(host)) return "Navegação interna";
    return host;
  } catch { return value.slice(0, 60); }
}

const isAdminPage = (page) => ADMIN_RE.test(String(page || ""));
// Classificacao grosseira pelo User-Agent declarado (sem armazenar o UA). Apenas robos que SE DECLARAM como tal ou navegadores headless.
export function uaClass(ua = "") {
  const v = String(ua || "");
  if (!v) return "unknown";
  if (/facebookexternalhit|meta-externalagent|meta-externalfetcher|facebot|googlebot|google-inspectiontool|bingbot|bingpreview|slurp|duckduckbot|baiduspider|yandex|applebot|twitterbot|linkedinbot|pinterest|whatsapp|telegrambot|slackbot|discordbot|ahrefsbot|semrushbot|mj12bot|petalbot|bytespider|gptbot|claudebot|oai-searchbot|chatgpt-user|perplexitybot|headlesschrome|lighthouse|pagespeed|phantomjs|puppeteer|playwright|python-requests|curl\/|wget\/|go-http-client|node-fetch|axios\/|\bbot\b|crawler|spider/i.test(v)) return "bot";
  return "browser";
}
export const isBotRow = (row) => row?.ua_class === "bot";
const isSynthetic = (row) => String(row.session_id || "").startsWith("test-") || row.payload?.test === true;
const inc = (map, key, by = 1) => { map[key] = (map[key] || 0) + by; };
const top = (map, n = 10) => Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);

async function fetchAll(build, max = 20000) {
  const rows = [];
  for (let from = 0; from < max; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

export async function liveReport(supabase, windowMinutes) {
  const minutes = Math.max(1, Math.min(60, Number(windowMinutes) || 5));
  const since = new Date(Date.now() - minutes * 60000).toISOString();
  const [{ data: online, error }, productsResult] = await Promise.all([
    supabase.from("online_visitors").select("*").gte("last_activity", since).order("last_activity", { ascending: false }).limit(1000),
    supabase.from("products").select("id,title,category")
  ]);
  if (error) throw new Error(error.message);
  const products = new Map((productsResult.data || []).map((p) => [p.id, p]));
  const now = Date.now();
  const considered = (online || []).filter((row) => !isAdminPage(row.page) && !isSynthetic(row));
  const botsDeclared = considered.filter(isBotRow).length;
  const rows = considered.filter((row) => !isBotRow(row));
  const visitors = rows.map((row) => {
    const product = row.product_id ? products.get(row.product_id) : null;
    return {
      id: String(row.session_id || "").slice(-6),
      page: row.page || "/",
      product: product ? { id: product.id, title: product.title } : null,
      origin: originLabel(row.origin),
      device: row.device || "desconhecido",
      country: row.country || null,
      region: row.region || null,
      city: row.city || null,
      lastActivity: row.last_activity,
      secondsAgo: Math.max(0, Math.round((now - new Date(row.last_activity).getTime()) / 1000)),
      firstSeen: row.created_at
    };
  });
  const byState = {}, byCountry = {}, byDevice = {}, byPage = {}, byProduct = {}, byOrigin = {}, byCity = {};
  let unknown = 0;
  visitors.forEach((v) => {
    if (!v.country) unknown += 1;
    else {
      inc(byCountry, v.country);
      if (v.country === "BR" && v.region) inc(byState, v.region);
      if (v.city) inc(byCity, `${v.city}${v.region ? " - " + v.region : ""}`);
    }
    inc(byDevice, v.device); inc(byPage, v.page); inc(byOrigin, v.origin);
    if (v.product) inc(byProduct, v.product.title);
  });
  return {
    windowMinutes: minutes, serverTime: new Date().toISOString(),
    active: visitors.length, // 1 linha por sessao (session_id e chave primaria): atualizar a pagina nao gera novo visitante
    unknownLocation: unknown,
    brazil: visitors.filter((v) => v.country === "BR").length,
    international: visitors.filter((v) => v.country && v.country !== "BR").length,
    botsDeclared, // robos declarados por User-Agent (excluidos de "ativos"); fonte: online_visitors.ua_class
    byState, byCountry: Object.fromEntries(top(byCountry, 20)), byCity: top(byCity, 15), byDevice: top(byDevice, 6), byPage: top(byPage, 10), byProduct: top(byProduct, 10), byOrigin: top(byOrigin, 10),
    visitors: visitors.slice(0, 200)
  };
}

function brDay(date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function dayStartUtc(day) { // 'YYYY-MM-DD' (Brasilia, UTC-3 sem horario de verao) -> instante UTC
  return new Date(`${day}T03:00:00.000Z`);
}

export function periodBounds(from, to) {
  const ok = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
  const today = brDay(new Date());
  const end = ok(to) ? to : today;
  const start = ok(from) ? from : brDay(new Date(dayStartUtc(end).getTime() - 6 * 86400000));
  const a = dayStartUtc(start), b = new Date(dayStartUtc(end).getTime() + 86400000);
  const days = Math.max(1, Math.min(366, Math.round((b - a) / 86400000)));
  return { start, end, fromIso: a.toISOString(), toIso: b.toISOString(), days };
}

export async function periodReport(supabase, { from, to, compare }) {
  const bounds = periodBounds(from, to);
  const main = await aggregate(supabase, bounds.fromIso, bounds.toIso, bounds.days);
  let previous = null;
  if (compare) {
    const prevEnd = new Date(new Date(bounds.fromIso).getTime());
    const prevStart = new Date(prevEnd.getTime() - bounds.days * 86400000);
    previous = (await aggregate(supabase, prevStart.toISOString(), prevEnd.toISOString(), bounds.days)).totals;
  }
  const catalog = await catalogKpis(supabase);
  return { period: { from: bounds.start, to: bounds.end, days: bounds.days }, ...main, previous, catalog,
    purchases: { confirmed: null, note: "Compras confirmadas dependem de confirmacao do fornecedor/integracao oficial. Cliques no checkout NAO sao vendas." } };
}

async function aggregate(supabase, fromIso, toIso, days) {
  const [views, clicks, carts, productsResult] = await Promise.all([
    fetchAll(() => supabase.from("view_events").select("event_type,session_id,product_id,page,payload,created_at").in("event_type", ["page_view", "product_view"]).gte("created_at", fromIso).lt("created_at", toIso).order("created_at")),
    fetchAll(() => supabase.from("click_events").select("click_type,session_id,product_id,payload,created_at").gte("created_at", fromIso).lt("created_at", toIso).order("created_at")),
    fetchAll(() => supabase.from("cart_events").select("event_type,session_id,product_id,payload,created_at").eq("event_type", "cart_add").gte("created_at", fromIso).lt("created_at", toIso).order("created_at")),
    supabase.from("products").select("id,title,category")
  ]);
  const prod = new Map((productsResult.data || []).map((p) => [p.id, p]));
  const per = {}, cat = {}, daily = {};
  const sessions = new Set(), intentSessions = new Set();
  const ensure = (id) => (per[id] ||= { id, title: prod.get(id)?.title || id, category: prod.get(id)?.category || "Sem categoria", views: 0, cartAdds: 0, checkoutClicks: 0, shares: 0, productClicks: 0 });
  const ensureCat = (name) => (cat[name] ||= { category: name, views: 0, cartAdds: 0, checkoutClicks: 0 });
  const day = (iso) => (daily[brDay(new Date(iso))] ||= { views: 0, cartAdds: 0, checkoutClicks: 0 });
  const totals = { pageViews: 0, productViews: 0, uniqueVisitors: 0, productClicks: 0, shares: 0, cartAdds: 0, checkoutClicks: 0, intentSessions: 0 };
  const pid = (r) => r.product_id || r.payload?.product_id || null;
  views.filter((r) => !isAdminPage(r.page) && !isAdminPage(r.payload?.page) && !isSynthetic(r)).forEach((r) => {
    sessions.add(r.session_id); day(r.created_at).views += 1;
    if (r.event_type === "page_view") totals.pageViews += 1;
    else { totals.productViews += 1; const id = pid(r); if (id) { ensure(id).views += 1; ensureCat(ensure(id).category).views += 1; } }
  });
  clicks.filter((r) => !isAdminPage(r.payload?.page) && !isSynthetic(r)).forEach((r) => {
    const id = pid(r);
    if (CHECKOUT_TYPES.has(r.click_type)) { totals.checkoutClicks += 1; intentSessions.add(r.session_id); day(r.created_at).checkoutClicks += 1; if (id) { ensure(id).checkoutClicks += 1; ensureCat(ensure(id).category).checkoutClicks += 1; } }
    else if (r.click_type === "share_product") { totals.shares += 1; if (id) ensure(id).shares += 1; }
    else if (r.click_type === "product_click") { totals.productClicks += 1; if (id) ensure(id).productClicks += 1; }
  });
  carts.filter((r) => !isSynthetic(r)).forEach((r) => {
    const id = pid(r); totals.cartAdds += 1; intentSessions.add(r.session_id); day(r.created_at).cartAdds += 1;
    if (id) { ensure(id).cartAdds += 1; ensureCat(ensure(id).category).cartAdds += 1; }
  });
  totals.uniqueVisitors = sessions.size;
  totals.intentSessions = intentSessions.size;
  const series = [];
  const startMs = new Date(fromIso).getTime();
  for (let i = 0; i < days; i += 1) { const d = brDay(new Date(startMs + i * 86400000 + 4 * 3600000)); series.push({ day: d, ...(daily[d] || { views: 0, cartAdds: 0, checkoutClicks: 0 }) }); }
  return { totals, products: Object.values(per).sort((a, b) => b.views - a.views || b.checkoutClicks - a.checkoutClicks), categories: Object.values(cat).sort((a, b) => b.views - a.views), series };
}

async function catalogKpis(supabase) {
  const [{ data: products }, { data: setting }] = await Promise.all([
    supabase.from("products").select("id,active,checkout_url,image_url"),
    supabase.from("settings").select("value").eq("key", "store").maybeSingle()
  ]);
  const s = setting?.value || {};
  const archived = s.archived || {}, drafts = s.drafts || {};
  const list = (products || []).filter((p) => !archived[p.id]);
  const nowMs = Date.now();
  const inRange = (o) => (!o.startAt || new Date(o.startAt).getTime() <= nowMs) && (!o.endAt || new Date(o.endAt).getTime() > nowMs);
  const campaignActive = s.campaign?.enabled && inRange(s.campaign) ? 1 : 0;
  const bannersActive = (s.banners || []).filter((b) => b.active !== false && inRange(b)).length;
  return {
    total: list.length,
    published: list.filter((p) => p.active).length,
    drafts: list.filter((p) => !p.active && drafts[p.id]).length,
    inactive: list.filter((p) => !p.active && !drafts[p.id]).length,
    noCheckout: list.filter((p) => !p.checkout_url).length,
    noImage: list.filter((p) => !p.image_url).length,
    activeCampaigns: campaignActive + bannersActive,
    campaignDetail: { countdownCampaign: campaignActive, banners: bannersActive }
  };
}
