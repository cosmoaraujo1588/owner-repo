import { getSupabase, sendJson } from "./_supabase.js";

const ADMIN_PAGE_PATTERNS = ["/admin", "/admin.html", "/painel", "/dashboard", "/analytics-panel"];

export default async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });

  const supabase = getSupabase();
  if (!supabase) {
    return sendJson(res, 200, emptyPayload("Supabase not configured"));
  }

  const range = String(req.query?.range || "today");
  const since = rangeToDate(range