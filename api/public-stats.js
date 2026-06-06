import { getSupabase, sendJson } from "./_supabase.js";

const ADMIN_PAGE_PATTERNS = ["/admin", "/admin.html", "/painel", "/dashboard"];

export default async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 200, { onlineNow: 0, visitsTotal: 0 });

  const onlineSinceIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const [online, total] = await Promise.all([
    excludeAdminPages(supabase.from("online_visitors").select("session_id,page").gte("last_activity", onlineSinceIso).limit(1000)),
    excludeAdminPages(supabase.from("view_events").select("id", { count: "exact", head: true }).in("event_type", ["page_view", "product_view"]))
  ]);

  if (online.error || total.error) {
    return sendJson(res, 200, { onlineNow: 0, visitsTotal: 0 });
  }

  sendJson(res, 200, {
    onlineNow: uniqueCount((online.data || []).filter((item) => !isAdminPage(item.page)).map((item) => item.session_id)),
    visitsTotal: total.count || 0,
    updatedAt: new Date().toISOString()
  });
}

function isAdminPage(value) {
  const page = String(value || "").toLowerCase();
  return ADMIN_PAGE_PATTERNS.some((pattern) => page.includes(pattern));
}

function excludeAdminPages(query) {
  return query
    .not("page", "ilike", "%/admin%")
    .not("page", "ilike", "%/admin.html%")
    .not("page", "ilike", "%/painel%")
    .not("page", "ilike", "%/dashboard%");
}

function uniqueCount(values) {
  return new Set(values.filter(Boolean)).size;
}
