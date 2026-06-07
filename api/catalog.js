import { getSupabase, isAdmin, sendJson, cleanText, number, slugify } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method === "GET") return getCatalog(req, res);
  if (req.method === "PUT") return putCatalog(req, res);
  return sendJson(res, 405, { error: "Method not allowed" });
}

async function getCatalog(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
  const supabase = get