import { getSupabase, isAdmin, sendJson, cleanText } from "./_supabase.js";

const CLICK_EVENT_TYPES = new Set([
  "checkout_click",
  "buy_click",
  "product_click",
  "whatsapp_click",
  "whatsapp_group_click",
  "share_product",
  "tracking_open",
  "category_filter",
  "search"
]);
const CART_EVENT_TYPES = new Set(["cart_add", "cart_remove"]);
const VIEW_EVENT_TYPES = new Set(["page_view", "product_view"]);
const BRAZIL_TZ = "America/Sao_Paulo";

export default async function handler(req, res) {
  if (req.method === "POST") return recordEvent(req, res);
  if (req.method === "GET") return listEvents(req, res);
  return sendJson(res, 405, { error: "Method not allowed" });
}

async function recordEvent(req, res) {
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 202, { ok: true, local: true });
  const body = await readBody(req);
  const type = cleanText(body.type, 80);
  const payload = safePayload(body.payload);
  const productId = cleanText(body.product_id || payload.product_id || payload.productId, 160);
  const createdAt = body.created_at || new Date().toISOString();
  const sessionId = cleanText(body.session_id || payload.session_id, 160);
  const page = cleanText(body.page || payload.page, 400);
  const device = cleanText(body.device || payload.device, 80);
  const payloadWithContext = {
    ...payload,
    ...(productId ? { product_id: productId } : {}),
    ...(page && !payload.page ? { page } : {}),
    ...(device && !payload.device ? { device } : {})
  };

  let result;
  if (type === "presence") {
    result = await supabase.from("online_visitors").upsert({
      session_id: sessionId,
      page,
      product_id: productId || null,
      device,
      origin: cleanText(body.origin || body.referrer || payload.origin, 800),
      last_activity: createdAt
    }, { onConflict: "session_id" });
  } else if (CLICK_EVENT_TYPES.has(type)) {
    result = await supabase.from("click_events").insert({
      product_id: productId || null,
      session_id: sessionId,
      click_type: type,
      payload: payloadWithContext,
      created_at: createdAt
    });
  } else if (CART_EVENT_TYPES.has(type)) {
    result = await supabase.from("cart_events").insert({
      product_id: productId || null,
      session_id: sessionId,
      event_type: type,
      payload: payloadWithContext,
      created_at: createdAt
    });
  } else {
    result = await supabase.from("view_events").insert({
      event_type: VIEW_EVENT_TYPES.has(type) ? type : type || "event",
      session_id: sessionId,
      page,
      referrer: cleanText(body.referrer, 800),
      device,
      payload: payloadWithContext,
      created_at: createdAt
    });
  }

  if (result.error) return sendJson(res, 500, { error: result.error.message });
  sendJson(res, 200, { ok: true });
}

async function listEvents(req, res) {
  if (!isAdmin(req)) return sendJson(res, 401, { error: "Unauthorized" });
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 503, { error: "Supabase not configured" });
  const since = rangeToDate(req.query?.range || "today");
  const sinceIso = since.toISOString();
  const onlineSinceIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const todayStartIso = brazilRangeStart("today").toISOString();
  const [views, clicks, carts, online, todayCount, totalCount] = await Promise.all([
    supabase.from("view_events").select("*").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(2000),
    supabase.from("click_events").select("*").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(2000),
    supabase.from("cart_events").select("*").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(2000),
    supabase.from("online_visitors").select("*").gte("last_activity", onlineSinceIso).order("last_activity", { ascending: false }).limit(2000),
    supabase.from("view_events").select("id", { count: "exact", head: true }).in("event_type", ["page_view", "product_view"]).gte("created_at", todayStartIso),
    supabase.from("view_events").select("id", { count: "exact", head: true }).in("event_type", ["page_view", "product_view"])
  ]);

  const error = views.error || clicks.error || carts.error || online.error || todayCount.error || totalCount.error;
  if (error) return sendJson(res, 500, { error: error.message });

  const events = [
    ...(views.data || []).map(fromViewEvent),
    ...(clicks.data || []).map(fromClickEvent),
    ...(carts.data || []).map(fromCartEvent),
    ...(online.data || []).map(fromPresenceEvent)
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 2000);

  sendJson(res, 200, {
    events,
    summary: {
      timezone: BRAZIL_TZ,
      onlineNow: uniqueCount((online.data || []).map((item) => item.session_id)),
      visitsToday: todayCount.count || 0,
      visitsTotal: totalCount.count || 0,
      todayStart: todayStartIso
    }
  });
}

function rangeToDate(range) {
  if (String(range) === "all") return new Date(0);
  return brazilRangeStart(range);
}

function brazilRangeStart(range) {
  const now = new Date();
  const value = String(range);
  const parts = brazilDateParts(now);
  if (value === "7d") return new Date(zonedLocalToUtc(parts.year, parts.month, parts.day).getTime() - 6 * 24 * 60 * 60 * 1000);
  if (value === "month") return zonedLocalToUtc(parts.year, parts.month, 1);
  if (value === "year") return zonedLocalToUtc(parts.year, 1, 1);
  return zonedLocalToUtc(parts.year, parts.month, parts.day);
}

function brazilDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

function zonedLocalToUtc(year, month, day) {
  const guess = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const offset = timezoneOffsetMs(guess);
  return new Date(guess.getTime() - offset);
}

function timezoneOffsetMs(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour), Number(map.minute), Number(map.second));
  return asUtc - date.getTime();
}

function uniqueCount(values) {
  return new Set(values.filter(Boolean)).size;
}

function safePayload(payload) {
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

function payloadWithProduct(payload, productId) {
  return {
    ...safePayload(payload),
    ...(productId ? { product_id: productId } : {})
  };
}

function fromViewEvent(event) {
  return {
    id: event.id,
    type: event.event_type,
    session_id: event.session_id,
    page: event.page,
    device: event.device,
    payload: safePayload(event.payload),
    created_at: event.created_at
  };
}

function fromClickEvent(event) {
  return {
    id: event.id,
    type: event.click_type,
    session_id: event.session_id,
    product_id: event.product_id,
    page: event.payload?.page || "",
    device: event.payload?.device || "",
    payload: payloadWithProduct(event.payload, event.product_id),
    created_at: event.created_at
  };
}

function fromCartEvent(event) {
  return {
    id: event.id,
    type: event.event_type,
    session_id: event.session_id,
    product_id: event.product_id,
    page: event.payload?.page || "",
    device: event.payload?.device || "",
    payload: payloadWithProduct(event.payload, event.product_id),
    created_at: event.created_at
  };
}

function fromPresenceEvent(event) {
  return {
    id: event.session_id,
    type: "presence",
    session_id: event.session_id,
    product_id: event.product_id,
    page: event.page,
    device: event.device,
    payload: payloadWithProduct({ origin: event.origin }, event.product_id),
    created_at: event.last_activity || event.created_at
  };
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
