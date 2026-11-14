import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import WebSocket from "ws";


export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket }
  });
}

export function publicConfig() {
  return {
    enabled: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    adminProtected: true
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

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

// Valores de ambiente: remove espacos/quebras de linha acidentais ao colar na Vercel.
// Somente as variaveis sao normalizadas; o que a pessoa digita nunca e alterado.
function envText(name) {
  return String(process.env[name] ?? "").trim();
}

export function adminConfigured() {
  return Boolean(envText("ADMIN_PASSWORD") && envText("ADMIN_SECRET"));
}

export function adminUsername() {
  return envText("ADMIN_USER") || "admin";
}

function safeEqual(a, b) {
  const left = crypto.createHash("sha256").update(String(a)).digest();
  const right = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(left, right);
}

export function checkAdminCredentials(user, password) {
  if (!adminConfigured()) return false;
  // Ambas as comparacoes sempre executam (sem curto-circuito) e em tempo constante.
  const userOk = safeEqual(user ?? "", adminUsername());
  const passwordOk = safeEqual(password ?? "", envText("ADMIN_PASSWORD"));
  return userOk && passwordOk;
}

export function isAdmin(req) {
  // Falha segura: sem ADMIN_PASSWORD e ADMIN_SECRET o acesso admin fica fechado.
  if (!adminConfigured()) return false;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return verifyToken(token);
}

export function createToken(ttlMs = TOKEN_TTL_MS) {
  const payload = {
    role: "admin",
    exp: Date.now() + ttlMs
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

function verifyToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return false;
  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.role === "admin" && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

function sign(body) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !secret.trim()) throw new Error("ADMIN_SECRET nao configurado");
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}
