import { getSupabase, sendJson } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  const db = getSupabase();
  if (!db) return sendJson(res, 200, empty());

  const since = sinceIso(req.query?.range || "today");
  const onlineSince = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const [views, clicks, online] = await Promise.all([
    db.from("view_events").select("