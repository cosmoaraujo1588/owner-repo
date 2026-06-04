# Kairos Shopping

Loja online profissional da Kairos Shopping, reconstruida do zero para GitHub + Vercel + Supabase.

## Arquitetura

- Frontend: HTML, CSS e JavaScript estatico.
- Publicacao: Vercel.
- Banco: Supabase Database.
- Imagens: Supabase Storage, bucket `kairos-public`.
- Relatorios: eventos anonimos gravados no Supabase.
- Painel: `admin.html`, com acesso administrativo simples opcional.

## Variaveis de ambiente na Vercel

Configure em Project Settings > Environment Variables:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=sua_chave_publica
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SUPABASE_STORAGE_BUCKET=kairos-public
ADMIN_USER=admin
ADMIN_PASSWORD=defina_uma_senha_forte
ADMIN_SECRET=defina_um_segredo_longo
```

Se `ADMIN_PASSWORD` nao for configurada, o painel fica em modo aberto.

## Supabase

1. Abra o SQL Editor do Supabase.
2. Execute `supabase/schema.sql`.
3. Execute `supabase/seed.sql` para inserir os 20 produtos limpos.
4. Configure as variaveis de ambiente na Vercel.

## Desenvolvimento

```bash
npm install
npm run build
```

## URLs

- Loja: `/index.html`
- Painel: `/admin.html`
- API catalogo: `/api/catalog`
- API eventos: `/api/events`
- API leads: `/api/leads`

## Observacoes

O checkout e externo por produto. O botao Comprar Agora apenas redireciona para o link cadastrado no painel.
