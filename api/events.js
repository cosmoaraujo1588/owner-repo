import { getSupabase, isAdmin, sendJson, cleanText } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method === "POST") return recordEvent(req, res);
  if (req.method === "GET") return listEvents(req, res);
  return sendJson(res, 405, { error: "Method not allowed" });
}

async function recordEvent(req, res) {
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 202, { ok: true, local: true });
  const body = await readBody(req);
  const result = await supabase.from("view_events").insert({
    event_type: cleanText(body.type, 80),
    session_id: cleanText(body.session_id, 160),
    page: cleanText(body.page, 400),
    referrer: cleanText(body.referrer, 800),
    device: cleanText(body.device, 80),
    payload: body.payload || {},
    created_at: body.created_at || new Date().toISOString()
  });
  if (result.error) return sendJson(res, 500, { error: result.error.message });
  sendJson(res, 200, { ok: true });
}

async function listEvents(req, res) {
  if (!isAdmin(req)) return sendJson(res, 401, { error: "Unauthorized" });
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 503, { error: "Supabase not configured" });
  const since = rangeToDate(req.query?.range || "today");
  const result = await supabase
    .from("view_events")
    .select("*")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(2000);

  if (result.error) return sendJson(res, 500, { error: result.error.message });
  sendJson(res, 200, {
    events: (result.data || []).map((event) => ({
      id: event.id,
      type: event.event_type,
      session_id: event.session_id,
      page: event.page,
      device: event.device,
      payload: event.payload || {},
      created_at: event.created_at
    }))
  });
}

function rangeToDate(range) {
  const now = new Date();
  const value = String(range);
  if (value === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (value === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (value === "year") return new Date(now.getFullYear(), 0, 1);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
