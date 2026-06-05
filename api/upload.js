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

export default async function handler(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  if (!isAdmin(req)) return sendJson(res, 401, { error: "Unauthorized" });
  const supabase = getSupabase();
  if (!supabase) return sendJson(res, 503, { error: "Supabase not configured" });

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

  const mime = String(parsed.mime || "").toLowerCase();
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
