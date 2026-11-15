# Padrão de UTMs — Kairos Shopping

Use sempre minúsculas, sem espaços/acentos. Formato: `https://www.kairosshopping.com.br/?utm_source=...&utm_medium=...&utm_campaign=...`

| Origem | utm_source | utm_medium | utm_campaign (exemplos) |
|---|---|---|---|
| Instagram (orgânico) | instagram | social | organico |
| Instagram (bio) | instagram | social | bio |
| TikTok | tiktok | social | organico |
| Facebook (grupos) | facebook | social | grupos_brasil |
| WhatsApp (grupos) | whatsapp | referral | grupos_brasil |
| E-mail | email | email | newsletter_AAAA_MM |
| Anúncios pagos | facebook / google | cpc | nome_da_campanha |

O botão "Compartilhar" da loja já acrescenta `utm_campaign=compartilhamento_produto` com a rede usada como `utm_source`.

## Conferir no GA4
- Relatórios > Aquisição > Aquisição de tráfego: filtrar por Origem/mídia.
- Relatórios > Dados demográficos > Detalhes demográficos: país/cidade (comparar engajamento e duração por país).
- Admin > Fluxos de dados > Configurar > Mais configurações de tag > Definir tráfego interno / Excluir referências indesejadas.
- Para tráfego de bots: Admin > Configurações de dados > Filtros de dados (criar em modo "Teste" antes de ativar). GA4 já exclui bots conhecidos da IAB automaticamente.

## Atualizar cache de pré-visualização
- Facebook/Instagram/WhatsApp: https://developers.facebook.com/tools/debug/ → colar a URL do produto → "Coletar novamente".
- WhatsApp reaproveita o cache do Facebook; em celular, pode ser necessário apagar o link e reenviar.
