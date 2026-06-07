import { getSupabase, sendJson } from "./_supabase.js";

const ADMIN_PAGE_PATTERNS = ["/admin", "/admin.html", "/painel", "/dashboard", "/analytics-panel"];

export default async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });

  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 200, emptyPayload("Supabase not configured"));

  const since = rangeToDate(req.query?.range || "today").toISOString();
  const onlineSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const [views, clicks, online] = await Promise.all([
    supabase.from("view_events").select("event_type,session_id,page,referrer,device,payload,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
    supabase.from("click