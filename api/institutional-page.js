import { getSupabase, cleanText } from "./_supabase.js";

const SITE_URL = "https://www.kairosshopping.com.br";
const EMAIL = "kairossshopping@gmail.com";
const TRACKING_URL = "https://app.kaiross.com.br/rastreio";

const PAGE_CONFIG = {
  "quem-somos": {
    title: "Quem Somos",
    dbSlugs: ["quem-somos", "sobre"],
    fallback: "A Kairos Shopping e uma loja online criada para oferecer praticidade, variedade e boas oportunidades de compra. Trabalhamos com produtos selecionados, atendimento proximo ao cliente e envio para todo o Brasil."
  },
  privacidade: {
    title: "Politica de Privacidade",
    dbSlugs: ["politica-de-privacidade", "privacidade"],
    fallback: "Respeitamos a privacidade dos clientes. Os dados enviados pelo site sao utilizados para atendimento, comunicacoes solicitadas, seguranca e melhoria da experiencia. Nao vendemos dados pessoais."
  },
  termos: {
    title: "Termos de Uso",
    dbSlugs: ["termos-de-uso", "termos"],
    fallback: "Os produtos podem ser vendidos por plataformas parceiras externas. Cada botao Comprar agora direciona para o checkout oficial configurado no produto. Ao utilizar a loja, o cliente concorda com as regras apresentadas no checkout correspondente."
  },
  "trocas-e-devolucoes": {
    title: "Trocas e Devolucoes",
    dbSlugs: ["trocas-e-devolucoes", "trocas"],
    fallback: "Solicitacoes de troca, devolucao ou suporte devem seguir as regras da plataforma responsavel pelo checkout do produto. A Kairos Shopping auxilia o cliente com orientacoes pelos canais de atendimento."
  },
  contato: {
    title: "Contato",
    dbSlugs: ["contato"],
    fallback: `Fale com a Kairos Shopping pelo e-mail ${EMAIL} ou pelos canais sociais oficiais exibidos na loja.`
  },
  rastreio: {
    title: "Rastreio de Pedido",
    dbSlugs: ["rastreio", "rastreamento"],
    fallback: "Acompanhe o seu pedido usando o codigo de rastreio recebido apos a compra. O processamento do pedido pode levar ate 2 dias uteis, e o envio geralmente varia entre 3 e 15 dias uteis."
  }
};

export default async function handler(req, res) {
  const pageKey = cleanText(req.query?.page || "", 80);
  const config = PAGE_CONFIG[pageKey];
  if (!config) return sendPage(res, 404, "Pagina nao encontrada", "A pagina solicitada nao existe.");

  const page = await loadPage(config.dbSlugs);
  const content = cleanText(page?.content || config.fallback, 12000);
  const title = cleanText(page?.seo_title || page?.title || config.title, 180);
  const description = cleanText(page?.seo_description || content, 180);
  return sendPage(res, 200, title, content, description, pageKey);
}

async function loadPage(slugs) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("pages").select("title,slug,content,seo_title,seo_description,active").in("slug", slugs).eq("active", true).limit(1).maybeSingle();
  return data || null;
}

function sendPage(res, status, title, content, description = content, pageKey = "") {
  const url = `${SITE_URL}/${pageKey}`;
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.end(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | Kairos Shopping</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)} | Kairos Shopping">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${SITE_URL}/assets/banner-kairos-claro-1.png">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(url)}">
  <link rel="canonical" href="${escapeHtml(url)}">
  <link rel="icon" href="/assets/logo-kairos-oficial.png">
  <style>
    *{box-sizing:border-box}body{margin:0;background:#f5f7fb;color:#102a43;font-family:Arial,sans-serif;line-height:1.65}header,footer{background:#101827;color:#fff}header{padding:18px}nav,main,.footer-inner{width:min(960px,calc(100% - 28px));margin:auto}nav{display:flex;align-items:center;gap:18px;flex-wrap:wrap}nav img{width:54px;height:54px;border-radius:50%}nav strong{font-size:1.2rem}nav a{color:#fff;text-decoration:none;font-weight:700}nav a:first-of-type{margin-left:auto}main{min-height:65vh;padding:44px 0}article{background:#fff;border:1px solid #e1e7ef;border-top:5px solid #ff6b00;border-radius:8px;padding:clamp(22px,5vw,52px);box-shadow:0 12px 36px rgba(16,42,67,.08)}h1{font-size:clamp(2rem,7vw,3.4rem);line-height:1.05;margin:0 0 24px}p{white-space:pre-line}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.button{display:inline-block;padding:13px 18px;border-radius:6px;background:#ff6b00;color:#101827;text-decoration:none;font-weight:800}.button.secondary{background:#102a43;color:#fff}footer{padding:28px 0;margin-top:30px}.footer-inner a{color:#ffb36b}@media(max-width:600px){nav a:first-of-type{margin-left:0}nav{gap:12px}article{padding:22px}.actions .button{width:100%;text-align:center}}
  </style>
</head>
<body>
  <header><nav><img src="/assets/logo-kairos-oficial.png" alt="Kairos Shopping"><strong>Kairos Shopping</strong><a href="/">Inicio</a><a href="/#produtos">Produtos</a><a href="/#categorias">Categorias</a><a href="/rastreio">Rastreio</a></nav></header>
  <main><article><h1>${escapeHtml(title)}</h1><p>${escapeHtml(content)}</p><div class="actions">${pageKey === "rastreio" ? `<a class="button" href="${TRACKING_URL}" target="_blank" rel="noopener">Abrir portal de rastreio</a>` : ""}<a class="button secondary" href="/#produtos">Ver produtos</a><a class="button secondary" href="/contato">Contato</a></div></article></main>
  <footer><div class="footer-inner"><strong>Kairos Shopping</strong><p>Envio para todo o Brasil, pedido com rastreamento e atendimento pelos canais oficiais.</p><a href="mailto:${EMAIL}">${EMAIL}</a></div></footer>
</body>
</html>`);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
