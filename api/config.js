import { publicConfig, sendJson } from "./_supabase.js";

export default function handler(req, res) {
  sendJson(res, 200, publicConfig());
}
