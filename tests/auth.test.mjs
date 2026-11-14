// Testes da autenticacao administrativa. Usam credenciais FICTICIAS e nunca acessam o Supabase
// (SUPABASE_* e removido do ambiente, entao os handlers respondem 503 "Supabase not configured"
// logo depois de passar pela autenticacao).
import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import crypto from "node:crypto";

import login from "../api/admin-login.js";
import catalog from "../api/catalog.js";
import upload from "../api/upload.js";
import leads from "../api/leads.js";
import events from "../api/events.js";
import traffic from "../api/traffic-test.js";
import { createToken, isAdmin } from "../api/_supabase.js";

const USER = "admin";
const PASS = "Senha-Ficticia-123";
const SECRET = "segredo-ficticio-de-teste-0123456789abcdef";

// Em `overrides`, o valor `null` significa "variavel ausente" (undefined cairia no valor padrao).
function setEnv(overrides = {}) {
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"]) delete process.env[k];
  const values = { user: undefined, pass: PASS, secret: SECRET, ...overrides };
  const names = { user: "ADMIN_USER", pass: "ADMIN_PASSWORD", secret: "ADMIN_SECRET" };
  for (const [key, name] of Object.entries(names)) {
    if (values[key] === undefined || values[key] === null) delete process.env[name];
    else process.env[name] = values[key];
  }
}

async function call(handler, { method = "POST", body, headers = {}, query = {} } = {}) {
  const req = new EventEmitter();
  req.method = method; req.headers = headers; req.query = query;
  const out = { headers: {} };
  const res = {
    setHeader(k, v) { out.headers[k.toLowerCase()] = v; },
    getHeader(k) { return out.headers[k.toLowerCase()]; },
    set statusCode(v) { out.status = v; },
    end(s) { out.text = s; }
  };
  const done = handler(req, res);
  if (body !== undefined) req.emit("data", typeof body === "string" ? body : JSON.stringify(body));
  req.emit("end");
  await done;
  let json = null; try { json = JSON.parse(out.text); } catch { /* not json */ }
  return { status: out.status, json };
}
const bearer = (t) => ({ authorization: `Bearer ${t}` });
async function token() {
  const r = await call(login, { body: { user: USER, password: PASS } });
  assert.equal(r.status, 200);
  return r.json.token;
}

test("login correto devolve token valido", async () => {
  setEnv();
  const r = await call(login, { body: { user: USER, password: PASS } });
  assert.equal(r.status, 200);
  assert.ok(r.json.token);
  assert.equal(isAdmin({ headers: bearer(r.json.token) }), true);
});

test("senha incorreta -> 401", async () => {
  setEnv();
  const r = await call(login, { body: { user: USER, password: "errada" } });
  assert.equal(r.status, 401);
  assert.equal(r.json.token, undefined);
});

test("usuario incorreto -> 401 (inclui maiuscula, vazio e e-mail)", async () => {
  setEnv();
  for (const user of ["Admin", "", "dono@exemplo.com", PASS]) {
    const r = await call(login, { body: { user, password: PASS } });
    assert.equal(r.status, 401, `usuario ${JSON.stringify(user)}`);
  }
});

test("ADMIN_USER personalizado e respeitado", async () => {
  setEnv({ user: "dono" });
  assert.equal((await call(login, { body: { user: "admin", password: PASS } })).status, 401);
  assert.equal((await call(login, { body: { user: "dono", password: PASS } })).status, 200);
});

test("ausencia de variaveis -> 503 e acesso admin fechado", async () => {
  for (const env of [{ pass: null }, { secret: null }, { pass: null, secret: null }, { pass: "   \n" }, { secret: "  " }]) {
    setEnv(env);
    const r = await call(login, { body: { user: USER, password: PASS } });
    assert.equal(r.status, 503, JSON.stringify(env));
    assert.equal(isAdmin({ headers: {} }), false);
  }
});

test("espacos acidentais na VARIAVEL sao tratados; a senha digitada nao e alterada", async () => {
  setEnv({ user: " admin ", pass: `${PASS} \n` });
  assert.equal((await call(login, { body: { user: USER, password: PASS } })).status, 200, "variavel com espaco/quebra de linha");
  assert.equal((await call(login, { body: { user: USER, password: `${PASS} ` } })).status, 401, "senha digitada com espaco no fim nao e aparada");
  assert.equal((await call(login, { body: { user: ` ${USER}`, password: PASS } })).status, 401, "usuario digitado nao e alterado");
});

test("metodo diferente de POST no login -> 405", async () => {
  setEnv();
  assert.equal((await call(login, { method: "GET" })).status, 405);
});

test("token invalido -> recusado", async () => {
  setEnv();
  const good = await token();
  const [body, sig] = good.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ role: "admin", exp: Date.now() + 1e9 })).toString("base64url");
  const cases = {
    "vazio": "",
    "lixo": "abc",
    "assinatura adulterada": `${body}.${sig.slice(0, -2)}zz`,
    "payload forjado com assinatura antiga": `${forgedPayload}.${sig}`,
    "sem assinatura": `${body}.`,
    "role diferente de admin": (() => { const b = Buffer.from(JSON.stringify({ role: "user", exp: Date.now() + 1e9 })).toString("base64url"); return `${b}.${crypto.createHmac("sha256", SECRET).update(b).digest("base64url")}`; })()
  };
  for (const [name, t] of Object.entries(cases)) assert.equal(isAdmin({ headers: bearer(t) }), false, name);
  assert.equal(isAdmin({ headers: {} }), false, "sem cabecalho");
  assert.equal(isAdmin({ headers: { authorization: good } }), false, "sem prefixo Bearer");
});

test("token assinado com outro segredo -> recusado", async () => {
  setEnv();
  const good = await token();
  process.env.ADMIN_SECRET = "outro-segredo-ficticio-".repeat(2);
  assert.equal(isAdmin({ headers: bearer(good) }), false);
});

test("token expirado -> recusado", async () => {
  setEnv();
  assert.equal(isAdmin({ headers: bearer(createToken(-1000)) }), false);
  assert.equal(isAdmin({ headers: bearer(createToken(60_000)) }), true);
});

test("operacoes administrativas exigem autenticacao (sem token, token invalido e token expirado -> 401)", async () => {
  setEnv();
  const ops = [
    ["PUT /api/catalog", () => catalog, { method: "PUT", body: {} }],
    ["GET /api/catalog?includeInactive=1", () => catalog, { method: "GET", query: { includeInactive: "1" } }],
    ["POST /api/upload", () => upload, { method: "POST" }],
    ["GET /api/leads", () => leads, { method: "GET" }],
    ["GET /api/events (relatorios)", () => events, { method: "GET", query: { range: "today" } }],
    ["GET /api/traffic-test", () => traffic, { method: "GET", query: { v: "1" } }]
  ];
  const tokens = { "sem token": undefined, "token invalido": "lixo.lixo", "token expirado": createToken(-1000) };
  for (const [name, h, opts] of ops) {
    for (const [label, t] of Object.entries(tokens)) {
      const r = await call(h(), { ...opts, headers: t ? bearer(t) : {} });
      assert.equal(r.status, 401, `${name} ${label}`);
    }
  }
});

test("com token valido a autenticacao passa (e para no Supabase ausente, sem tocar em dados)", async () => {
  setEnv();
  const headers = bearer(await token());
  const ops = [
    [catalog, { method: "PUT", body: {} }],
    [catalog, { method: "GET", query: { includeInactive: "1" } }],
    [upload, { method: "POST" }],
    [leads, { method: "GET" }],
    [events, { method: "GET", query: { range: "today" } }],
    [traffic, { method: "GET", query: { v: "1" } }]
  ];
  for (const [h, opts] of ops) {
    const r = await call(h, { ...opts, headers });
    assert.equal(r.status, 503, JSON.stringify(opts));
    assert.match(r.json.error, /Supabase not configured/i);
  }
});

test("rotas publicas continuam publicas (catalogo sem includeInactive)", async () => {
  setEnv();
  const r = await call(catalog, { method: "GET" });
  assert.notEqual(r.status, 401);
});
