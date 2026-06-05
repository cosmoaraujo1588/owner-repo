import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function publicConfig() {
  return {
    enabled: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    adminProtected: Boolean(process.env.ADMIN_PASSWORD)
  };
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!res.getHeader("Cache-Control")) res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

export function cleanText(value, limit = 5000) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, limit);
}

export function number(value) {
  const parsed = Number(String(value ?? "0").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function slugify(value) {
  return cleanText(value, 160)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `item-${Date.now()}`;
}

export function isAdmin(req) {
  if (!process.env.ADMIN_PASSWORD) return true;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return verifyToken(token);
}

export function createToken() {
  const payload = {
    role: "admin",
    exp: Date.now() + 1000 * 60 * 60 * 12
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

function verifyToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature || sign(body) !== signature) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.role === "admin" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function sign(body) {
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "kairos-dev";
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}
