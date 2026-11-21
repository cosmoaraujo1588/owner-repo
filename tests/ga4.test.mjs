import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";
import { readCredentials, signJwt, gaReport, envKind } from "../api/_ga4.js";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" });

test("readCredentials: sem credenciais lista exatamente o que falta e usa a propriedade 540539657", () => {
  const c = readCredentials({});
  assert.equal(c.propertyId, "540539657");
  assert.equal(c.missing.length, 2);
  assert.ok(readCredentials({ GA4_PROPERTY_ID: "G-ABC123", GA4_CLIENT_EMAIL: "a@b.iam", GA4_PRIVATE_KEY: pem }).missing.length === 0);
  assert.equal(readCredentials({ GA4_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: "x@y", private_key: pem }) }).missing.length, 0);
});

test("signJwt: assinatura RS256 valida e escopo somente leitura", () => {
  const jwt = signJwt({ email: "svc@proj.iam.gserviceaccount.com", key: pem }, 1000);
  const [h, b, s] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(h, "base64url")), { alg: "RS256", typ: "JWT" });
  const body = JSON.parse(Buffer.from(b, "base64url"));
  assert.equal(body.scope, "https://www.googleapis.com/auth/analytics.readonly");
  assert.equal(body.exp - body.iat, 3600);
  assert.ok(createVerify("RSA-SHA256").update(`${h}.${b}`).verify(publicKey, Buffer.from(s, "base64url")));
});

test("envKind separa producao, preview e local", () => {
  assert.equal(envKind("www.kairosshopping.com.br"), "producao");
  assert.equal(envKind("kairos-shopping-m8bj215w1-kairos-shopping-s-projects.vercel.app"), "preview");
  assert.equal(envKind("localhost"), "local");
  assert.equal(envKind("(not set)"), "sem_host");
});

const env = { GA4_CLIENT_EMAIL: "svc@x.iam", GA4_PRIVATE_KEY: pem };
const json = (status, body) => ({ ok: status < 300, status, json: async () => body });

test("gaReport: nao configurado retorna pendencias sem chamar a rede", async () => {
  let calls = 0;
  const r = await gaReport({ env: {}, fetchImpl: async () => { calls++; } });
  assert.equal(r.configured, false); assert.equal(calls, 0); assert.ok(r.missing.length);
});

test("gaReport: monta eventos por host, paises e origens a partir da API", async () => {
  const seen = [];
  const fetchImpl = async (url, opt) => {
    seen.push(url);
    if (url.includes("oauth2")) return json(200, { access_token: "tok" });
    const b = JSON.parse(opt.body);
    assert.equal(opt.headers.Authorization, "Bearer tok");
    if (b.dimensions[0].name === "eventName") return json(200, { rows: [
      { dimensionValues: [{ value: "view_item" }, { value: "www.kairosshopping.com.br" }], metricValues: [{ value: "12" }, { value: "5" }] },
      { dimensionValues: [{ value: "view_item" }, { value: "x-123.vercel.app" }], metricValues: [{ value: "3" }, { value: "1" }] }] });
    if (b.dimensions[0].name === "country") return json(200, { rows: [{ dimensionValues: [{ value: "Brazil" }], metricValues: [{ value: "9" }, { value: "7" }, { value: "4" }] }] });
    return json(200, { rows: [{ dimensionValues: [{ value: "facebook" }, { value: "referral" }], metricValues: [{ value: "6" }, { value: "2" }] }] });
  };
  const r = await gaReport({ days: 7, env, fetchImpl });
  assert.equal(r.configured, true);
  assert.ok(seen.some((u) => u.includes("/properties/540539657:runReport")));
  assert.deepEqual(r.events.map((e) => [e.name, e.env, e.count]), [["view_item", "producao", 12], ["view_item", "preview", 3]]);
  assert.equal(r.countries[0].sessions, 9); assert.equal(r.sources[0].source, "facebook");
});

test("gaReport: mapeia erros de autenticacao, acesso e API desativada", async () => {
  const mk = (tokenRes, reportRes) => async (url) => (url.includes("oauth2") ? tokenRes : reportRes);
  let r = await gaReport({ env, fetchImpl: mk(json(400, { error: "invalid_grant" })) });
  assert.equal(r.error, "auth");
  r = await gaReport({ env, fetchImpl: mk(json(200, { access_token: "t" }), json(403, { error: { message: "User does not have sufficient permissions" } })) });
  assert.equal(r.error, "no_access");
  r = await gaReport({ env, fetchImpl: mk(json(200, { access_token: "t" }), json(403, { error: { message: "Google Analytics Data API has not been used in project 1 before or it is disabled" } })) });
  assert.equal(r.error, "api_disabled");
});

test("erro de autenticacao com objeto de erro vira texto legivel e nao vaza a chave", async () => {
  const { generateKeyPairSync } = await import("node:crypto");
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  const env = { GA4_CLIENT_EMAIL: "sa@x.iam.gserviceaccount.com", GA4_PRIVATE_KEY: pem };
  const fetchImpl = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: "denied" } }) });
  const out = await gaReport({ days: 7, env, fetchImpl });
  assert.equal(out.error, "auth");
  assert.equal(out.message, "denied");
  assert.ok(!JSON.stringify(out).includes("PRIVATE KEY"));
});
