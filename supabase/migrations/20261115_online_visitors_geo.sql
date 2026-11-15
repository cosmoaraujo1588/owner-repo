-- Visitantes ao vivo: localizacao APROXIMADA (pais/estado/cidade) derivada dos cabecalhos de geolocalizacao da Vercel.
-- Nao armazena endereco IP, nem coordenadas. Colunas opcionais: ausentes => "Localizacao indisponivel".
alter table public.online_visitors add column if not exists country text;
alter table public.online_visitors add column if not exists region text;
alter table public.online_visitors add column if not exists city text;
create index if not exists online_visitors_last_activity_idx on public.online_visitors (last_activity desc);
