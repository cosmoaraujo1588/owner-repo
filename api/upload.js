import { getSupabase, isAdmin, sendJson, slugify } from "./_supabase.js";

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_VIDEO_SIZE = 25 * 1024 * 1024;
const MAX_SIZE = MAX_VIDEO_SIZE;
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);
const ALLOWED_VIDEO_TYPES = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["video/x-m4v", "m4v"]
]);

export const config = {
  api: {
    bodyParser: false
  }
};

// ---------- Upload direto ao Storage (URL assinada) ----------
// O arquivo NAO passa pela funcao serverless (limite de ~4,5 MB da Vercel): o navegador envia direto ao Supabase Storage com
// um token de uso unico gerado aqui, apos validar permissao de admin, formato e tamanho. Nenhuma chave administrativa vai ao navegador.
const BUCKET = () => process.env.SUPABASE_STORAGE_BUCKET || "kairos-public";
const DIRECT_IMAGE_TYPES = new Map([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const DIRECT_VIDEO_TYPES = new Map([["video/mp4", "mp4"], ["video/webm", "webm"]]);
const DIRECT_MAX_IMAGE = 8 * 1024 * 1024;
export const FOLDERS = {
  "banner-desktop": "banners/desktop", "banner-mobile": "banners/mobile", "banner-image": "banners/desktop",
  "banner-video": "banners/videos", "banner-thumb": "banners/thumbnails", "banner-original": "banners/originals", "product-image": "products"
};

export function buildUploadPath({ purpose, name, extension, now = Date.now() }) {
  const folder = FOLDERS[String(purpose || "")] || "products";
  return `${folder}/${slugify(name || "arquivo") || "arquivo"}-${now}.${extension}`;
}

async function readJson(req, limit = 20000) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Error("payload"); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { return {}; }
}

async function videoLimitBytes(supabase) {
  try {
    const { data } = await supabase.from("settings").select("value").eq("key", "store").maybeSingle();
    const mb = Number(data?.value?.carousel?.videoMaxMb);
    return Math.round((Number.isFinite(mb) ? Math.min(100, Math.max(5, mb)) : 30) * 1024 * 1024);
  } catch { return 30 * 1024 * 1024; }
}

async function directUpload(req, res, supabase, action) {
  let body;
  try { body = await readJson(req); } catch { return sendJson(res, 413, { error: "Requisicao muito grande." }); }
  const bucket = BUCKET();
  if (action === "sign") {
    const contentType = String(body.contentType || "").toLowerCase();
    const isVideo = contentType.startsWith("video/");
    const extension = (isVideo ? DIRECT_VIDEO_TYPES : DIRECT_IMAGE_TYPES).get(contentType);
    if (!extension) return sendJson(res, 415, { error: isVideo ? "Formato de video nao aceito. Use MP4 (H.264) ou WebM." : "Formato de imagem nao aceito. Use JPG, PNG ou WebP." });
    const size = Number(body.size) || 0;
    if (!(size > 0)) return sendJson(res, 400, { error: "Arquivo vazio." });
    const limit = isVideo ? await videoLimitBytes(supabase) : DIRECT_MAX_IMAGE;
    if (size > limit) return sendJson(res, 413, { error: `Arquivo muito grande (${(size / 1048576).toFixed(1)} MB). Limite: ${Math.round(limit / 1048576)} MB.${isVideo ? " Comprima o video antes de enviar." : ""}` });
    const path = buildUploadPath({ purpose: body.purpose, name: body.name, extension });
    const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (signed.error || !signed.data?.signedUrl) return sendJson(res, 500, { error: signed.error?.message || "Nao foi possivel autorizar o upload." });
    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    return sendJson(res, 200, { path, signedUrl: signed.data.signedUrl, token: signed.data.token, publicUrl, contentType, maxBytes: limit });
  }
  if (action === "verify") {
    const path = String(body.path || "");
    if (!Object.values(FOLDERS).some((folder) => path.startsWith(`${folder}/`)) || path.includes("..")) return sendJson(res, 400, { error: "Caminho invalido." });
    const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
    try {
      const response = await fetch(publicUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) });
      const contentType = response.headers.get("content-type") || "";
      const length = Number(response.headers.get("content-length")) || 0;
      const expected = Number(body.size) || 0;
      const ok = response.ok && /^(image|video)\//i.test(contentType) && (!expected || !length || Math.abs(length - expected) < 1024);
      return sendJson(res, 200, { ok, status: response.status, contentType, size: length, url: publicUrl });
    } catch (error) {
      return sendJson(res, 200, { ok: false, status: 0, error: "Nao foi possivel acessar a URL publica do arquivo.", url: publicUrl });
    }
  }
  return sendJson(res, 400, { error: "Acao invalida." });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  if (!isAdmin(req)) return sendJson(res, 401, { error: "Unauthorized" });
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 503, { error: "Supabase not configured" });
  const action = String(req.query?.action || "");
  if (action === "sign" || action === "verify") return directUpload(req, res, supabase, action);

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_SIZE) return sendJson(res, 413, { error: "Arquivo muito grande. Use imagem ate 4MB ou video curto ate 25MB." });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks);
  const contentType = req.headers["content-type"] || "";
  const parsed = parseMultipart(raw, contentType);
  if (!parsed) return sendJson(res, 400, { error: "Arquivo invalido" });
  if (!parsed.buffer?.length) return sendJson(res, 400, { error: "Imagem vazia ou invalida" });

  // O formato real vem do conteudo do arquivo (assinatura), nao do tipo informado pelo navegador (ex.: image/pjpeg, vazio).
  const mime = sniffImage(parsed.buffer) || String(parsed.mime || "").toLowerCase();
  const isVideo = mime.startsWith("video/");
  const extension = (isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES).get(mime);
  if (!extension) {
    return sendJson(res, 415, { error: "Formato nao aceito. Use JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV." });
  }
  if (!isVideo && parsed.buffer.length > MAX_IMAGE_SIZE) {
    return sendJson(res, 413, { error: "Imagem muito grande. Use ate 4MB." });
  }
  if (isVideo && parsed.buffer.length > MAX_VIDEO_SIZE) {
    return sendJson(res, 413, { error: "Video muito grande. Use video curto ate 25MB." });
  }

  const nameFromTitle = parsed.fields?.title || "";
  const nameFromFile = String(parsed.filename || "produto").replace(/\.[^.]+$/, "");
  const safeName = slugify(nameFromTitle || nameFromFile || "produto");
  const purpose = String(parsed.fields?.purpose || "").toLowerCase();
  const folder = isVideo ? "banner-videos" : purpose.includes("banner") ? "banners" : "products";
  const fileName = `${folder}/${safeName}-${Date.now()}.${extension}`;
  const result = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || "kairos-public")
    .upload(fileName, parsed.buffer, {
      contentType: mime,
      upsert: false
    });

  if (result.error) return sendJson(res, 500, { error: result.error.message });
  const publicUrl = supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET || "kairos-public")
    .getPublicUrl(fileName).data.publicUrl;
  if (!publicUrl || !/^https:\/\//i.test(publicUrl)) {
    return sendJson(res, 500, { error: "Nao foi possivel gerar URL publica da imagem." });
  }
  sendJson(res, 200, { url: publicUrl, path: fileName });
}

export function sniffImage(buffer) {
  if (!buffer || buffer.length < 12) return "";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer.toString("latin1", 1, 4) === "PNG") return "image/png";
  if (buffer.toString("latin1", 0, 4) === "RIFF" && buffer.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  return "";
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = /boundary=(.+)$/i.exec(contentType);
  if (!boundaryMatch) return null;
  const boundary = Buffer.from(`--${boundaryMatch[1]}`);
  const parts = splitBuffer(buffer, boundary);
  const fields = {};
  let file = null;
  for (const part of parts) {
    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd < 0) continue;
    const header = part.slice(0, headerEnd).toString("utf8");
    const nameMatch = /name="([^"]+)"/i.exec(header);
    const fieldName = nameMatch?.[1] || "";
    const filenameMatch = /filename="([^"]*)"/i.exec(header);
    const mimeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(header);
    let body = part.slice(headerEnd + 4);
    if (body.slice(-2).toString() === "\r\n") body = body.slice(0, -2);
    if (fieldName === "file") {
      file = {
        filename: filenameMatch?.[1] || "produto",
        mime: mimeMatch?.[1] || "application/octet-stream",
        buffer: body,
        fields
      };
    } else if (fieldName) {
      fields[fieldName] = body.toString("utf8").trim().slice(0, 240);
    }
  }
  if (file) file.fields = fields;
  return file;
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = buffer.indexOf(separator) + separator.length + 2;
  while (start > separator.length) {
    const end = buffer.indexOf(separator, start);
    if (end < 0) break;
    parts.push(buffer.slice(start, end - 2));
    start = end + separator.length + 2;
  }
  return parts;
}
