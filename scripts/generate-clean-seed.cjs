const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "data", "exported-products.json");
const targetPath = path.join(root, "data", "seed-products.js");
if (!fs.existsSync(sourcePath)) {
  console.log("Raw export not found. Keeping existing clean seed.");
  process.exit(0);
}
const products = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const imageByHint = [
  [/fone|headphone|bluetooth|controle|relogio|relógio|eletron/i, "./assets/produto-fone.svg"],
  [/aspirador|ferramenta|automotivo|pistola|massagem/i, "./assets/produto-ferramentas.svg"],
  [/jarra|garrafa|termica|térmica|cozinha|liquidificador/i, "./assets/produto-liquidificador.svg"],
  [/escova|alisadora|beleza|cuidados|papa bolinha|removedor/i, "./assets/produto-moletom.svg"],
  [/baba|babá|bebe|bebê|urso|brinquedo|infantil|copa|figurinha|panini/i, "./assets/produto-urso.svg"],
  [/smartwatch|celular|telefone/i, "./assets/produto-smartwatch.svg"]
];

function stripBrokenEncoding(value) {
  let text = String(value || "");
  if (/[ÃÂâ][\s\S]?/.test(text)) {
    try {
      const repaired = Buffer.from(text, "latin1").toString("utf8");
      if ((repaired.match(/�/g) || []).length <= (text.match(/�/g) || []).length) {
        text = repaired;
      }
    } catch {
      // Keep original text if the byte repair is not applicable.
    }
  }

  return text
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã£/g, "ã")
    .replace(/Ãµ/g, "õ")
    .replace(/Ã¢/g, "â")
    .replace(/Ãª/g, "ê")
    .replace(/Ã§/g, "ç")
    .replace(/Ã‡/g, "Ç")
    .replace(/Ã‰/g, "É")
    .replace(/Ã/g, "Á")
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/Â·/g, "·")
    .replace(/Â/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDescription(value) {
  return stripBrokenEncoding(value)
    .replace(/DESCRIÇÃO/gi, "\n\nDescrição\n")
    .replace(/CARACTERÍSTICAS DO PRODUTO/gi, "\n\nCaracterísticas do produto\n")
    .replace(/CARACTERÍSTICA DO PRODUTO/gi, "\n\nCaracterísticas do produto\n")
    .replace(/POR QUE DEVO ADQUIRIR ESSE PRODUTO/gi, "\n\nPor que escolher este produto\n")
    .replace(/PQ DEVO ADIQUIRIR ESSE PRODUTO/gi, "\n\nPor que escolher este produto\n")
    .replace(/MEDIDAS/gi, "\n\nMedidas\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapCategory(value) {
  const text = stripBrokenEncoding(value).toLowerCase();
  if (/beleza|cuidados|saúde|saude|bem/.test(text)) return "Beleza e Cuidados";
  if (/casa|cozinha|utilidades/.test(text)) return "Casa e Cozinha";
  if (/eletron|celular|telefone|game/.test(text)) return "Eletrônicos";
  if (/roupa|moda|acess/.test(text)) return "Moda e Acessórios";
  if (/bebe|bebê|bêbe|brinquedo|infantil/.test(text)) return "Infantil e Brinquedos";
  if (/auto|carro/.test(text)) return "Automotivo";
  if (/copa|panini|figurinha/.test(text)) return "Ofertas";
  return stripBrokenEncoding(value) || "Ofertas";
}

function safeImage(product) {
  const text = `${product.title || ""} ${product.category || ""} ${product.subcategory || ""}`;
  for (const [pattern, image] of imageByHint) {
    if (pattern.test(text)) return image;
  }
  return "./images/placeholder.svg";
}

function shortDescription(product) {
  const clean = cleanDescription(product.shortDescription || product.description || "");
  if (clean) return clean.slice(0, 170);
  return "Produto selecionado pela Kairos Shopping com compra prática, envio para todo o Brasil e acompanhamento do pedido.";
}

const cleanProducts = products.map((product, index) => {
  const title = stripBrokenEncoding(product.title) || `Produto Kairos ${index + 1}`;
  return {
    id: stripBrokenEncoding(product.id) || `produto-${index + 1}`,
    title,
    category: mapCategory(product.category),
    subcategory: stripBrokenEncoding(product.subcategory),
    sku: stripBrokenEncoding(product.sku),
    price: Number(product.price || 0),
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    tag: stripBrokenEncoding(product.tag) || (product.flashOffer ? "Oferta" : product.bestSeller ? "Mais vendido" : "Destaque"),
    delivery: "Frete grátis para todo o Brasil",
    shortDescription: shortDescription(product),
    description: cleanDescription(product.description) || shortDescription(product),
    image: safeImage(product),
    gallery: [],
    videoUrl: "",
    videoThumb: "",
    checkoutUrl: stripBrokenEncoding(product.checkoutUrl),
    featured: product.featured !== false,
    visible: product.visible !== false,
    bestSeller: Boolean(product.bestSeller) || index < 6,
    flashOffer: Boolean(product.flashOffer) || Boolean(product.oldPrice),
    reviewRating: Math.min(5, Math.max(1, Number(product.reviewRating || 4.8))),
    reviewCount: Math.max(12, Number(product.reviewCount || 120)),
    reviewText: stripBrokenEncoding(product.reviewText),
    scarcityText: index % 3 === 0 ? "Oferta com alto interesse" : "",
    order: index
  };
});

const content = `window.KAIROS_SEED_PRODUCTS = ${JSON.stringify(cleanProducts, null, 2)};\n`;
fs.writeFileSync(targetPath, content, "utf8");
console.log(`Generated ${cleanProducts.length} clean products at ${targetPath}`);
