-- Seed Kairos Shopping: produtos limpos, sem imagens antigas quebradas.
insert into public.settings (key, value) values ('store', '{"storeName":"Kairos Shopping","storeEmail":"kairossshopping@gmail.com","logoUrl":"./assets/logo-kairos-oficial.png","bannerUrl":"./assets/banner-principal-kairos.jpg","trackingUrl":"https://app.kaiross.com.br/rastreio"}'::jsonb) on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.categories (id, name, active, display_order) values ('eletronicos', 'Eletrônicos', true, 0) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('roupas', 'Roupas', true, 1) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('utilidades', 'Utilidades', true, 2) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('brinquedos', 'Brinquedos', true, 3) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('automotivo', 'Automotivo', true, 4) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('promocoes', 'Promoções', true, 5) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('infantil-e-brinquedos', 'Infantil e Brinquedos', true, 6) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('ofertas', 'Ofertas', true, 7) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('beleza-e-cuidados', 'Beleza e Cuidados', true, 8) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('casa-e-cozinha', 'Casa e Cozinha', true, 9) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();
insert into public.categories (id, name, active, display_order) values ('moda-e-acessorios', 'Moda e Acessórios', true, 10) on conflict (id) do update set name = excluded.name, active = true, display_order = excluded.display_order, updated_at = now();

insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'baba-eletronica-digital-com-camera-vb601-visao-noturna-m-mpvx7ml9', 'Babá Eletrônica Digital com Câmera VB601 – Visão Noturna, Monitoramento de Temperatura e Áudio Bidirecional', 'Infantil e Brinquedos', 'Segurança para Casa', 'SAD13999',
  349.9, 402.38, 'Oferta relampago', 'Babá Eletrônica Digital com Câmera VB601 – Visão Noturna, Monitoramento de Temperatura e Áudio Bidirecional

Descrição
Mantenha a tranquilidade e a segurança do seu bebê ', 'Babá Eletrônica Digital com Câmera VB601 – Visão Noturna, Monitoramento de Temperatura e Áudio Bidirecional

Descrição
Mantenha a tranquilidade e a segurança do seu bebê com a Babá Eletrônica Digital VB601. Este sistema inteligente de monitoramento permite que você acompanhe cada movimento e som do seu pequeno em tempo real, sem precisar entrar no quarto e interromper o sono dele. Com uma tela LCD nítida e tecnologia de transmissão estável, você terá olhos e ouvidos no berço enquanto realiza outras tarefas pela casa. É a aliada perfeita para uma rotina mais leve e segura para toda a família.

Características do produto
- Áudio Bidirecional: Permite que você ouça o bebê e também fale com ele através do monitor para acalmá-lo à distância.- Visão Noturna Automática: LEDs infravermelhos integrados que permitem ver o bebê claramente mesmo no escuro total.- Monitoramento de Temperatura: Sensor inteligente que exibe no monitor a temperatura ambiente do quarto do bebê.- Canções de Ninar: Inclui melodias suaves pré-programadas para ajudar o bebê a adormecer tranquilamente.- Bateria Recarregável no Monitor: Oferece portabilidade para levar o monitor para qualquer cômodo da casa.- Alcance Estendido: Conexão digital de longo alcance com sinal livre de interferências.

Por que escolher este produto
?- Segurança 24 horas: Tenha a paz de espírito de saber que seu bebê está bem, tanto de dia quanto durante a noite profunda.- Multifuncionalidade: Muito mais que uma câmera, é um termômetro e um player de canções de ninar em um só aparelho.- Independência para os Pais: Monitore o sono do seu filho enquanto cozinha, estuda ou descansa, sem perder o contato visual e sonoro.- Fácil Instalação: Sistema "Plug and Play", basta ligar e usar, sem necessidade de configurações complexas ou Wi-Fi.

Medidas
- Monitor (Tela): 12,5 cm x 6,3 cm x 2,7 cm- Câmera (Unidade do Bebê): 10,2 cm x 6 cm x 6 cm- Tamanho da Tela LCD: 2.0 Polegadas- Peso Total da Embalagem: Aproximadamente 450g',
  './assets/produto-urso.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/nFq7LFJ4J8iy',
  false, true, true, true,
  5, 2847, 0, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'amarelo-copo-termico-brasil-cbf-aco-inox-473ml-futebol-mpvwlek4', 'Amarelo - Copo Térmico Brasil CBF Aço Inox (473ml) Futebol', 'Ofertas', 'Acessórios Copa do Mundo', 'SAD14098',
  99.9, 114.88, 'Oferta relampago', 'Mostre seu amor pelo Brasil com o Copo Térmico CBF! Perfeito para torcer e vibrar, ele mantém suas bebidas na temperatura ideal por horas. Seja para aquele café quentinho', 'Mostre seu amor pelo Brasil com o Copo Térmico CBF! Perfeito para torcer e vibrar, ele mantém suas bebidas na temperatura ideal por horas. Seja para aquele café quentinho pela manhã ou uma bebida gelada durante o jogo, este copo é seu companheiro perfeito. Com design exclusivo e o brasão da CBF, é um item indispensável para qualquer torcedor brasileiro. Leve sua paixão por onde for!CARACTERÍSTICAS:Material: Aço Inoxidável de Parede Dupla com Isolamento a Vácuo; Capacidade: 473ml; Cor: Amarelo vibrante; Estampa: Brasão da CBF e texto ''BRASIL''; Tampa: Plástica com vedação, bico para beber; Conservação: Mantém a temperatura de bebidas quentes ou frias por horas; PQ DEVO COMPRAR: Porque você é um verdadeiro torcedor brasileiro e merece demonstrar sua paixão em grande estilo! Este copo não só celebra a sua conexão com a seleção, mas também oferece a praticidade de ter sua bebida favorita sempre na temperatura perfeita. Durável, estiloso e com a identidade do nosso futebol, é o presente ideal para si mesmo ou para outro fanático pela seleção. Conecte-se com a energia do Brasil em cada gole!

Medidas
:- Altura: 7 cm;- Largura: 15cm;- Profundidade: 8 cm;- Diâmetro: 9 cm;- Peso: 220 gramas',
  './assets/produto-urso.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/xlG8jOgB5KbU',
  true, true, true, true,
  4.5, 3247, 1, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'varal-de-20-bandeirinhas-brasil-6-metros-copa-do-mundo-mpvvcf0r', 'Varal de 20 Bandeirinhas Brasil 6 Metros – Copa do Mundo', 'Ofertas', 'Acessórios Copa do Mundo', 'SAD13996',
  79.9, 91.89, 'Oferta relampago', 'Varal de Bandeirinhas Brasil 6 Metros – Copa do Mundo 

Descrição
Transforme sua casa, rua, escritório ou comércio em um verdadeiro reduto da Seleção! O Varal de Bandeiri', 'Varal de Bandeirinhas Brasil 6 Metros – Copa do Mundo 

Descrição
Transforme sua casa, rua, escritório ou comércio em um verdadeiro reduto da Seleção! O Varal de Bandeirinhas do Brasil de 6 metros é o item de decoração mais clássico e eficaz para criar o clima de Copa do Mundo. Com cores vivas e um comprimento generoso, ele preenche grandes espaços com facilidade, trazendo a alegria e o patriotismo que só o torcedor brasileiro tem. Fabricado em material leve que balança suavemente com o vento, ele garante um visual dinâmico e festivo para receber os amigos e a família nos dias de jogo.

Características do produto
- Extensão: 6 metros de comprimento total (ideal para fachadas e salões).- Quantidade: 20 bandeiras distribuídas ao longo do cordão.- Pronto para Instalar: Já vem montado no cordão, basta amarrar as pontas.- Resistência: Pode ser utilizado tanto em ambientes internos quanto externos (resistente a garoas leves).- Estampa: Impressão de alta qualidade da Bandeira Nacional em ambos os lados.

Por que escolher este produto
?- Impacto Visual Imediato: É a forma mais rápida e barata de decorar grandes áreas e mudar completamente o "clima" do ambiente para o mundial.- Versatilidade: Pode ser usado em muros, tetos, vitrines, varandas ou até em churrascos de condomínio.- Durabilidade: Diferente de decorações de papel, este varal suporta melhor a exposição ao sol e ao vento durante todo o período da competição.- Tradição: Não existe Copa do Mundo no Brasil sem as famosas bandeirinhas penduradas; é o acessório que une a vizinhança na torcida.

Medidas
- Comprimento do Cordão: 6 metros- Tamanho de cada Bandeira: 20 cm x 10 cm (tamanho padrão visível à distância).- Espaçamento: Distribuídas uniformemente para garantir um preenchimento harmônico.',
  './assets/produto-urso.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/jFN4mJtySMD9',
  false, true, true, true,
  4.5, 1284, 2, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'par-de-joelheiras-de-compressao-ortopedica-mwks-6906-mpvur9bm', 'PAR de Joelheiras de Compressão Ortopédica - MWKS 6906', 'Beleza e Cuidados', 'Ortopedia', 'll00026',
  79.9, 91.89, 'Oferta relampago', 'Kit 2 Joelheiras de Compressão Ortopédica Alivia Dor Firme - Knee Support MWKS 6906 As Joelheiras de Compressão oferecem modelagem anatômica e ajuste preciso, auxiliando ', 'Kit 2 Joelheiras de Compressão Ortopédica Alivia Dor Firme - Knee Support MWKS 6906 As Joelheiras de Compressão oferecem modelagem anatômica e ajuste preciso, auxiliando na prevenção do desgaste muscular. Durante atividades físicas como a corrida, o ponto de fadiga tende a ser postergado, resultando em melhor desempenho atlético e menor impacto muscular. Este produto de alta elasticidade proporciona aquecimento constante e compressão na área aplicada, contribuindo para a redução da dor e uma recuperação mais eficiente. BENEFÍCIOS: - Otimizam o fornecimento de oxigênio aos músculos; - Reduzem o acúmulo de lactato; - Minimizam a ocorrência de câimbras; - Atenuam a fadiga muscular. IDEAL PARA PRÁTICA: - Futebol, Vôlei, Basquete, Tênis, Corrida, Ciclismo, Skate, entre outros esportes. TAMANHO ÚNICO: -Altura: 27 cm; -Largura: 17 cm; -Circunferência de perna recomendada: 45 a 55 cm; -Peso recomendado: 60 a 85 kg; -Cor: Verde com Preto; ITENS INCLUSOS: - 2 Joelheiras.',
  './images/placeholder.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/m8qrWlnrBzJF',
  false, true, true, true,
  4.5, 687, 3, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'mini-camera-de-seguranca-fixa-espia-a9-wi-fi-fullhd-90-c-mpvtr5c1', 'Mini Câmera de Segurança Fixa Espiã A9 Wi-Fi FullHD 90° com Suporte de Parede - AJH09H', 'Casa e Cozinha', 'Segurança para Casa', 'SAD005626',
  89.9, 103.39, 'Oferta relampago', 'Mini Câmera de Segurança Fixa Espiã A9 Wi-Fi FullHD 90° com Suporte de Parede 

Descrição
: A "Mini Câmera Espiã Discreta Wifi Full HD com Microfone de Áudio" oferece uma', 'Mini Câmera de Segurança Fixa Espiã A9 Wi-Fi FullHD 90° com Suporte de Parede 

Descrição
: A "Mini Câmera Espiã Discreta Wifi Full HD com Microfone de Áudio" oferece uma solução de vigilância incrivelmente compacta e imperceptível, ideal para quem busca monitoramento discreto e eficaz. Sua capacidade de gravar em Full HD com áudio, aliada à conectividade Wi-fi para acesso remoto via smartphone, a torna uma ferramenta poderosa para diversas necessidades do dia a dia. A facilidade de instalação, juntamente com recursos como detecção de movimento e visão noturna, ampliam ainda mais sua utilidade. O grande atrativo desta mini câmera é em seu tamanho mini e design discreto, permitindo que seja facilmente escondida. Seja para aumentar a segurança da sua casa, acompanhar o bem-estar de seus pets, crianças ou vigiar ambientes internos, esta mini câmera espiã oferece uma maneira prática e discreta de manter tudo sob controle, diretamente do seu dispositivo móvel. APLICATIVO - Encontra-se no manual dentro da caixa com QR Code. FICHA TÉCNICA: - APP Câmera: HDwificamPro - Material: Plástico ABS - Resolução de vídeo: 1900 x 1080P; - Suporte ao Cartão de Memória (máximo 64GB. Cartão não incluído); - Suporte de Sistemas: Android/IOS; - Carregamento: A fio, não inclui bateria interna; - Inclui sistema de detecção de movimento infravermelho - Conectividade: Wi-Fi - ngulo da câmera: 90 graus - Diâmetro maior: 57mm - Diâmetro mínimo (lente) : 44mm - Altura: 35mm - Lente: 14mm - Visão Noturna: Captura numa distância de 10m ITENS INCLUSOS NA EMBALAGEM: 01 - Mini câmera; 01 - Mini cabo USB; 01 - Manual de instruções; 01 - Pacote de parafusos e esponjas;',
  './images/placeholder.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/dw0bsMXWvWwy',
  true, true, true, true,
  5, 1124, 4, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'lixa-de-pe-eletrica-recarregavel-a-prova-dagua-bivolt-mq-mpvti19j', 'Lixa de Pé Elétrica Recarregável À Prova Dágua Bivolt | MQ-7312', 'Beleza e Cuidados', 'Manicue e Pedicure', 'SAD004876',
  69.9, 80.39, 'Oferta relampago', 'Lixa de Pé Elétrica Recarregável À Prova D''água – Pedicure Elétrica Prática e Eficiente Mantenha seus pés suaves e sem calos com a Lixa Elétrica Recarregável à Prova D''Ág', 'Lixa de Pé Elétrica Recarregável À Prova D''água – Pedicure Elétrica Prática e Eficiente Mantenha seus pés suaves e sem calos com a Lixa Elétrica Recarregável à Prova D''Água. Ideal para quem busca uma pedicure rápida, eficaz e confortável em casa, esse dispositivo permite remover pele morta e calos de maneira prática e segura, proporcionando pés macios e renovados. Características Principais: Remoção Eficiente de Calos e Pele Morta: A pedicure elétrica possui cabeças de moagem grossas e finas para remover calos e pele seca, deixando seus pés suaves e bem-cuidados. Cabeças de Moagem Intercambiáveis: Com diferentes opções de cabeças de moagem, você pode escolher a mais adequada para suas necessidades, garantindo resultados personalizados. Design Ergonômico e Confortável: Com cabo longo e ergonômico, o design facilita o manuseio e garante que você possa usá-lo por longos períodos sem desconforto ou sujeira nas mãos. Material de Alta Qualidade: Feita em ABS resistente e durável, esta lixa esfoliadora é construída para durar, oferecendo alto desempenho e estabilidade durante o uso. Cabeça de Lixamento de Quartzo: Proporciona um lixamento suave e eficaz, removendo a pele morta sem causar desconforto ou irritação, ideal para uma experiência de pedicure relaxante. Como Usar: Ligue a Lixa: Pressione o botão de ligar para ativar a pedicure elétrica. Esfoliação: Posicione a cabeça de moagem próxima ao pé e mova suavemente para remover calos e cutículas. Hidratação: Após o uso, mergulhe os pés em água morna por cerca de 10 minutos. Em seguida, seque os pés e aplique um hidratante para uma sensação de suavidade prolongada. Especificações do Produto: Material: ABS (plástico de alta qualidade) Função: Remoção de calos e pele morta Potência: 2W Fonte de Energia: Carregamento USB Bivolt Bateria: 500mAh, bateria de lítio (inclusa) Tipo de Cabeça: Lixamento de quartzo (suave e eficaz) Modo de Uso: Sem fio, à prova d''água Conteúdo da Embalagem: 1 x Lixa de Pé Elétrica 1 x Cabeça de Substituição 1 x Cabo USB para carregamento Benefícios Exclusivos: Pedicure em Casa: Oferece a praticidade de um salão de beleza no conforto do lar, economizando tempo e dinheiro. À Prova D''Água: Ideal para uso em ambiente úmido, proporcionando maior versatilidade. Compacta e Portátil: Perfeita para viagens, cabe facilmente na sua bolsa ou mala. Transforme seus cuidados com os pés com a Lixa Esfoliadora de Pés Portátil à Prova D''Água, e experimente um tratamento profissional para seus pés, sempre que precisar',
  './assets/produto-moletom.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/8wWj7uzjzYij',
  true, true, true, true,
  4.5, 693, 5, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'massageador-eletrico-cabeca-e-corpo-recarregavel-3-veloc-mpvt5ys1', 'Massageador Elétrico Cabeça e Corpo Recarregável 3 Velocidades com 4 cabeças de massagem bivolt cores sortidas A-JF24', 'Beleza e Cuidados', 'Massagem', '',
  119.9, 137.89, 'Oferta relampago', 'Massageador Elétrico Cabeça e Corpo Recarregável Bivolt (Cores Sortidas)ATENÇÃO: O envio é de apenas um Massageador e as cores são sortidas. 

Descrição
:Desfrute de uma ', 'Massageador Elétrico Cabeça e Corpo Recarregável Bivolt (Cores Sortidas)ATENÇÃO: O envio é de apenas um Massageador e as cores são sortidas. 

Descrição
:Desfrute de uma massagem capilar revigorante com este massageador de couro cabeludo! Equipado com 4 cabeças de silicone e um total de 96 nós de massagem, ele oferece uma experiência relaxante que estimula o crescimento capilar, alivia o estresse e melhora a circulação sanguínea no couro cabeludo. Escolha entre 3 velocidades de massagem para personalizar sua experiência.CARACTERÍSTICAS- O massageador de couro cabeludo vem com 4 cabeças de amassamento e um total de 96 pontos de massagem de silicone em formato de cone, que são distribuídos uniformemente. Você pode usá-lo para aliviar a tensão do couro cabeludo, aliviar dores nos ombros ou relaxar os músculos do pescoço para uma experiência de massagem de corpo inteiro.- O massageador possui 3 níveis de intensidade, permitindo personalizar a pressão da massagem de acordo com suas preferências. Quer prefira uma massagem suave ou um amassamento mais intenso, você pode ajustar facilmente as configurações.- As cabeças de massagem simulam a massagem com pressão dos dedos, o que ajuda a promover a circulação sanguínea, liberar o estresse, aliviar a fadiga e melhorar o sono e o crescimento do cabelo. Pode ser usado para massagem de corpo inteiro para reduzir a dor e rigidez, e também como massageador para animais de estimação.- Operação com um botão, fácil de usar. Design ergonômico, confortável de segurar. O corpo principal e a cabeça de massagem são laváveis. As cabeças de massagem removíveis são fáceis de limpar, garantindo a higiene e manutenção adequadas do aparelho.- Este mini massageador elétrico de cabeça com bateria embutida é compacto e leve, facilitando o transporte para onde quer que você vá. Quer esteja em casa, no escritório ou em viagem, pode desfrutar de uma massagem relaxante a qualquer momento.FICHA TÉCNICA- Material: Plástico ABS + Silicone- Capacidade da bateria: 3,7V 450mAh;- Portas de carregamento: micro USB;- Largura: 11 cm;- Altura: 9cm;- Profundidade: 8cm;- Peso do item: 320 gramas;- Tamanho do pacote: cerca de 12,5 x 12,15 polegadas 5 x 11 cm/4,92 x 4,92 x 4,33 polegadas.ITENS INCLUSOS- 1x Massageador;- 1x Cabo de micro USB- 1x Manual do usuário.',
  './assets/produto-ferramentas.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/oOoO8Rx4xKsO',
  true, true, false, true,
  4.5, 36, 6, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'calca-legging-academia-suplex-lisa-premium-nao-transpare-mpufvrcv', 'Calça Legging Academia Suplex Lisa Premium não Transparece - Rosa (G)', 'Moda e Acessórios', 'Feminina', 'll00020-G',
  89.9, 103.39, 'Oferta relampago', 'Calça Legging Academia Suplex Lisa Premium não Transparece - Rosa (G) | Conforto e flexibilidade unidos em tecidos! Transforme seu treino em uma experiência única com a C', 'Calça Legging Academia Suplex Lisa Premium não Transparece - Rosa (G) | Conforto e flexibilidade unidos em tecidos! Transforme seu treino em uma experiência única com a Calça Legging Premium! Criada para garantir máximo conforto e desempenho, essa legging é ideal para quem busca flexibilidade, estilo e praticidade em suas atividades físicas e momentos de lazer. Fabricada com o exclusivo tecido Suplex Premium, ela combina alta qualidade e durabilidade, oferecendo um toque macio e delicado à pele. Com excelente elasticidade, a peça se adapta perfeitamente ao seu corpo, proporcionando liberdade total de movimento, seja para musculação, yoga, corrida ou até mesmo para aquela caminhada relaxante. POR QUE ESCOLHER ESSA LEGGING? - Não Transparece: Treine com confiança em qualquer intensidade! - Conforto incomparável: Tecido respirável que mantém você sempre fresco e confortável. - Elasticidade de ponta: Perfeita para os movimentos mais desafiadores, sem restrições. - Versatilidade: Ideal para o dia a dia, desde treinos intensos até momentos de descontração. - Colorida: Escolha as cores que mais combinam com você sem prejudicar seu conforto!',
  './images/placeholder.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/xVPF4Ru0hwOA',
  true, true, false, true,
  5, 824, 7, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'removedor-de-pelos-e-papa-bolinha-eletrico-recarregavel--mpube3c2', 'Removedor de Pelos e Papa Bolinha Elétrico Recarregável – Alta Performanc', 'Casa e Cozinha', 'Acessórios Moda', 'SAD14013',
  89.9, 103.39, 'Oferta relampago', 'Removedor de Pelos e Papa Bolinha Elétrico Recarregável – Alta Performance para Roupas e Estofados

Descrição
Devolva a aparência de nova às suas peças favoritas com o Re', 'Removedor de Pelos e Papa Bolinha Elétrico Recarregável – Alta Performance para Roupas e Estofados

Descrição
Devolva a aparência de nova às suas peças favoritas com o Removedor de Pelos Papa Bolinha Recarregável. Este dispositivo é a solução definitiva para eliminar bolinhas, pelos e fiapos que se acumulam com o tempo em casacos de lã, blusas de tricô, mantas e até sofás. Com um motor potente e design ergonômico, ele remove as imperfeições de forma rápida e segura, sem danificar as fibras dos tecidos. Por ser recarregável e portátil, oferece total liberdade de uso em qualquer lugar da casa, garantindo que suas roupas estejam sempre com um aspecto impecável e bem cuidado.

Características do produto
- Sistema de Corte Eficiente: Lâminas internas rotativas que cortam as bolinhas com precisão milimétrica.- Grade de Proteção Metálica: Tela de aço que protege o tecido enquanto permite a passagem apenas das bolinhas e pelos.- Bateria Recarregável: Dispensa o uso de pilhas, facilitando o carregamento via cabo em qualquer fonte de energia.- Compartimento de Resíduos: Recipiente integrado que armazena os fiapos removidos, sendo fácil de destacar e limpar.- Acionamento Simples: Botão único de liga/desliga localizado estrategicamente para um manuseio confortável.

Por que escolher este produto
- Renovação de Guarda-Roupa: Recupere peças que pareciam velhas e gastas, estendendo a vida útil das suas roupas favoritas.- Economia e Praticidade: O sistema recarregável elimina gastos contínuos com pilhas e garante que o aparelho esteja sempre pronto para o uso.- Versatilidade Total: Eficiente em diversos tipos de materiais, desde os mais delicados até tecidos pesados de decoração.- Design Ergonômico: Formato de "alça" que facilita o movimento circular sobre o tecido, tornando o processo rápido e sem esforço.

Medidas
- Altura: Aproximadamente 14 cm- Largura (Cabeça de corte): 8 cm- Peso: Aproximadamente 170g (leve para uso contínuo)',
  './assets/produto-moletom.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/MM08IJBmETzF',
  true, true, false, true,
  4.5, 1218, 8, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'kit-10-envelopes-oficiais-panini-copa-do-mundo-fifa-2026-mpu7zavz', 'Kit 10 Envelopes Oficiais Panini Copa do Mundo FIFA 2026 – 70 Figurinhas', 'Ofertas', 'Acessórios Copa do Mundo', '',
  132.99, 152.94, 'Oferta relampago', '10 Unidades de Envelopes de Figurinhas Copa do Mundo FIFA 2026 

Descrição
: Prepare-se para a emoção da Copa do Mundo FIFA 2026 com este incrível 10 Unidades de Envelope', '10 Unidades de Envelopes de Figurinhas Copa do Mundo FIFA 2026 

Descrição
: Prepare-se para a emoção da Copa do Mundo FIFA 2026 com este incrível 10 Unidades de Envelopes de Figurinhas! Cada pacote contém 7 cromos exclusivos para você começar ou expandir sua coleção. Viva a paixão do futebol, troque figurinhas com amigos e complete seu álbum para o maior evento esportivo do planeta. Garanta já seus pacotes e comece a colecionar os craques e momentos inesquecíveis da próxima Copa!CARACTERÍSTICAS:Evento: Copa do Mundo FIFA 2026; Conteúdo por envelope: 7 cromos (figurinhas); Tipo de produto: Figurinhas colecionáveis; Material: Papel adesivo de alta qualidade; Idade recomendada: A partir de 3 anos.10 ENVELOPESPQ DEVO COMPRAR: Reviva a nostalgia da infância e a paixão pelo futebol colecionando as figurinhas da Copa do Mundo FIFA 2026. É a chance perfeita de se conectar com o evento global, se divertir com amigos e familiares trocando figurinhas, e sentir a emoção de completar o álbum. Ideal para colecionadores, fãs de futebol e um presente incrível para todas as idades!

Medidas
: envelope: Aproximadamente 10 cm (altura) x 8 cm (largura) x 0.2 cm (profundidade). Dimensões do kit podem variar conforme embalagem.',
  './assets/produto-urso.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/4KT52853gcW1',
  true, true, false, true,
  4.5, 1476, 9, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'album-copa-do-mundo-fifa-2026-livro-ilustrado-colecionav-mpu7cads', 'Álbum Copa do Mundo FIFA 2026 - Livro Ilustrado Colecionável', 'Ofertas', 'Acessórios Copa do Mundo', 'SAD14103',
  89.9, 103.39, 'Oferta relampago', 'Álbum Copa do Mundo FIFA 2026 - Livro Ilustrado Colecionável

Descrição
: Prepare-se para a emoção da Copa do Mundo FIFA 2026 com o Álbum Colecionavel! Este livro ilustra', 'Álbum Copa do Mundo FIFA 2026 - Livro Ilustrado Colecionável

Descrição
: Prepare-se para a emoção da Copa do Mundo FIFA 2026 com o Álbum Colecionavel! Este livro ilustrado é o item perfeito para colecionadores e fãs de futebol de todas as idades. Comece a sua coleção agora e reviva a paixão pelo esporte mais amado do mundo. O álbum conta com espaços dedicados para colar todas as figurinhas dos craques, times e momentos inesquecíveis do próximo mundial. Um item indispensável para acompanhar, celebrar e eternizar a história da Copa de 2026, levando você a uma jornada de antecipação e memória futebolística. Perfeito para preencher com as figurinhas e completar sua coleção antes do grande evento!CARACTERÍSTICAS:Produto: Álbum de Figurinhas; Edição: Copa do Mundo FIFA 2026; Tipo: Livro Ilustrado; Idioma: Português; Conteúdo: Páginas para figurinhas colecionáveis (Figurinhas não inclusas).PQ DEVO COMPRAR: Reviva a paixão pelo futebol e o espírito da Copa do Mundo FIFA 2026. Ideal para colecionadores, fãs de todas as idades e para presentear. Crie memórias duradouras, compartilhe a experiência de colecionar com amigos e familiares, e sinta a emoção de montar o seu próprio histórico da Copa. Um item essencial para quem ama futebol e quer se conectar com a magia do maior evento esportivo do planeta, mantendo a tradição de uma das maiores paixões nacionais.

Medidas
:Álbum brochura formato fechado: 232 x 270 mm, 112 páginas + capa / Miolo e capa: 4 cores',
  './assets/produto-urso.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/HSsTfAWVeihR',
  true, true, false, true,
  4.5, 1867, 10, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  '1-envelope-panini-de-figurinhas-com-7-cromos-copa-do-mun-mpu5pher', '1 Envelope Panini de Figurinhas com 7 CROMOS Copa do Mundo FIFA 2026', 'Ofertas', 'Acessórios Copa do Mundo', 'SAD14104',
  59.9, 68.88, 'Oferta relampago', '1 Unidade de Envelope de Figurinhas Copa do Mundo FIFA 2026 

Descrição
: Prepare-se para a emoção da Copa do Mundo FIFA 2026 com este incrível 1 Unidade de Envelope de F', '1 Unidade de Envelope de Figurinhas Copa do Mundo FIFA 2026 

Descrição
: Prepare-se para a emoção da Copa do Mundo FIFA 2026 com este incrível 1 Unidade de Envelope de Figurinhas! Cada pacote contém 7 cromos exclusivos para você começar ou expandir sua coleção. Viva a paixão do futebol, troque figurinhas com amigos e complete seu álbum para o maior evento esportivo do planeta. Garanta já seus pacotes e comece a colecionar os craques e momentos inesquecíveis da próxima Copa!CARACTERÍSTICAS:Evento: Copa do Mundo FIFA 2026; Conteúdo por envelope: 7 cromos (figurinhas); Tipo de produto: Figurinhas colecionáveis; Material: Papel adesivo de alta qualidade; Idade recomendada: A partir de 3 anos.1 ENVELOPEPQ DEVO COMPRAR: Reviva a nostalgia da infância e a paixão pelo futebol colecionando as figurinhas da Copa do Mundo FIFA 2026. É a chance perfeita de se conectar com o evento global, se divertir com amigos e familiares trocando figurinhas, e sentir a emoção de completar o álbum. Ideal para colecionadores, fãs de futebol e um presente incrível para todas as idades!

Medidas
: envelope: Aproximadamente 10 cm (altura) x 8 cm (largura) x 0.2 cm (profundidade). Dimensões do kit podem variar conforme embalagem.',
  './assets/produto-urso.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/TwLKWNKXr5wA',
  true, true, false, true,
  5, 1942, 11, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'mini-aspirador-automotivo-portatil-recarregavel-premium--mpvxxfgf', 'Mini Aspirador Automotivo Portátil Recarregável Premium – Potência e Praticidade ao Seu Alcance', 'Casa e Cozinha', 'Acessórios', 'SAD009076',
  89.9, 103.39, 'Oferta relampago', 'Mini Aspirador Automotivo Portátil Recarregável Premium – Potência e Praticidade ao Seu Alcance O Aspirador Automotivo Portátil Premium é a solução perfeita para manter s', 'Mini Aspirador Automotivo Portátil Recarregável Premium – Potência e Praticidade ao Seu Alcance O Aspirador Automotivo Portátil Premium é a solução perfeita para manter seu veículo sempre limpo e organizado. Com design compacto, alta potência e materiais de qualidade, ele combina eficiência e conveniência em um único produto, proporcionando uma experiência de limpeza prática e impecável. Principais Benefícios Portátil e versátil : Leve e fácil de transportar, permitindo limpeza em qualquer lugar, a qualquer momento. Ideal para aspirar sujeiras em locais de difícil acesso, como cantos e frestas do interior do veículo. Material Durável e Resistente : Construído com materiais premium que garantem longa durabilidade. Resistente ao uso frequente, mantendo a eficiência mesmo após várias limpezas. Alto Desempenho : Potência elevada que remove sujeiras, poeiras e detritos de forma rápida e eficaz. Perfeito para limpar estofados, tapetes, painéis e outros detalhes do interior do carro. Liberdade com Bateria Recarregável : Funcionamento sem fio, proporcionando total liberdade durante a limpeza. Fácil recarga, sempre pronto para o próximo uso. Tensão de entrada: DC 5V 1-2A Bivolt Por que escolher o Aspirador Automotivo Premium? Compacto e Ergonômico : Projetado para conforto durante o uso e fácil armazenamento. Eficiência e Agilidade : Ideal para o dia a dia ou emergências, garantindo resultados rápidos. Solução Completa : Perfeito para motoristas que valorizam a limpeza e o cuidado com seus veículos. Diga adeus à sujeira e mantenha o interior do seu carro impecável com o Aspirador Automotivo Portátil Recarregável Premium . Limpeza prática e poderosa sempre ao seu alcance! Foto meramente ilustrativa para referência do produto',
  './assets/produto-ferramentas.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/MtovpUcDW6sN',
  false, true, false, true,
  4.5, 3426, 12, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'conjunto-de-12-pecas-torcedor-copa-do-mundo-2026-mptvni11', 'Conjunto de 12 Peças Torcedor Copa do Mundo 2026', 'Ofertas', 'Acessórios Copa do Mundo', 'SAD14097',
  129.9, 149.39, 'Oferta relampago', 'Prepare-se para torcer pela Seleção Brasileira com o Conjunto Torcedor Completo de 12 peças! Perfeito para a Copa do Mundo 2026, jogos, festas temáticas ou qualquer event', 'Prepare-se para torcer pela Seleção Brasileira com o Conjunto Torcedor Completo de 12 peças! Perfeito para a Copa do Mundo 2026, jogos, festas temáticas ou qualquer evento que celebre o Brasil. Este conjunto exclusivo garante que você tenha todos os acessórios essenciais para mostrar seu amor pela camisa e contagiar a todos com a energia verde e amarela. Ideal para fãs de todas as idades, fácil de usar e um presente fantástico para qualquer apaixonado por futebol. Não perca nenhum lance sem o seu kit!CARACTERÍSTICAS:O kit contém 12 itens:- x1 Lenço brasileiro - x1 Óculos brasileiros - x1 Pulseira brasileira- x1 Pistola de fogos de artifício brasileira- x1 Pintura facial brasileira - x2 Bastão inflável brasileiro - x1 Embalagem brasileira - x1 Banner brasileiro - x1 Adesivo brasileiro - x1 Trompete brasileiro- x1 Tabela de previsões dos jogos do Brasil (Copa Mundial 2026)- x1 Bandeira do Brasil tamanho 90×150cm PQ DEVO COMPRAR: Compre este kit para garantir a diversão e a paixão pela seleção em qualquer evento! É o pacote completo para você e seus amigos mergulharem na atmosfera de torcida, seja na Copa do Mundo 2026, festas temáticas ou jogos da seleção. Mostre seu patriotismo com estilo e praticidade, sem precisar procurar item por item. Aumente a empolgação, crie memórias inesquecíveis e vibre a cada gol com os acessórios perfeitos que farão de você o torcedor número um!',
  './assets/produto-urso.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/Tp4uwvaH3jyu',
  true, true, false, true,
  5, 1538, 13, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'jarra-garrafa-termica-1l-preto-com-termometro-digital-mptdb7mv', 'Jarra Garrafa Térmica 1L - Preto ( COM Termômetro Digital )', 'Casa e Cozinha', 'Cozinha', 'SAD005026',
  109.9, 126.38, 'Oferta relampago', 'Elegância e Funcionalidade em Uma Garrafa Térmica Moderna Apresentamos a Garrafa Térmica que combina perfeitamente o design moderno e minimalista com a funcionalidade exc', 'Elegância e Funcionalidade em Uma Garrafa Térmica Moderna Apresentamos a Garrafa Térmica que combina perfeitamente o design moderno e minimalista com a funcionalidade excepcional. Cada detalhe desta garrafa foi cuidadosamente projetado para elevar a sua experiência de uso a um novo patamar. Design Harmonioso: Combinando plástico resistente e um cabo de madeira, esta garrafa oferece um equilíbrio perfeito entre durabilidade e estilo. Seu design moderno adiciona um toque de sofisticação a qualquer ambiente. Controle de Temperatura Simplificado: A tampa da garrafa possui um termômetro embutido, permitindo que você monitore facilmente a temperatura do líquido armazenado. Nunca mais se surpreenda com bebidas muito quentes ou frias - tenha o controle total em suas mãos. Características Destacadas: Durabilidade e Estilo: O plástico resistente garante que esta garrafa seja durável o suficiente para o uso diário, enquanto o cabo de madeira adiciona um toque de elegância ao design. Monitoramento de Temperatura: O termômetro embutido na tampa facilita o acompanhamento da temperatura do líquido, proporcionando a temperatura ideal sempre que você precisar. Capacidade Adequada: Disponível em diferentes tamanhos, você pode escolher a capacidade que melhor atende às suas necessidades, seja para manter sua bebida quente ou fria. Fácil Manuseio: O design ergonômico da garrafa torna o manuseio confortável e prático. Abra, despeje e feche com facilidade, sem preocupações. Versatilidade: Esta garrafa térmica é adequada para uma variedade de bebidas, desde café quente até água gelada, mantendo a temperatura desejada por horas. Segurança Garantida: Construída com materiais de alta qualidade, esta garrafa é livre de vazamentos, garantindo que você possa transportá-la sem preocupações. Eleve a sua experiência de armazenamento de líquidos com a Garrafa Térmica Moderna. A combinação de design elegante e funcionalidade excepcional torna esta garrafa um item essencial para qualquer pessoa que valoriza o estilo e o controle na hora de manter suas bebidas na temperatura perfeita.',
  './assets/produto-liquidificador.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/KiGL5zRmlXNw',
  true, true, false, true,
  5, 918, 14, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'p9-fone-de-ouvido-bluetooth-air-s-fio-wireless-headphone-mptcgalh', 'P9- Fone De Ouvido Bluetooth Air - S/ Fio Wireless Headphone | AJ-D24- PRETO', 'Eletrônicos', 'Fones de ouvido', 'SAD012776',
  89.9, 103.39, 'Oferta relampago', 'Benefícios do Fone de Ouvido P9 AIRO Fone de Ouvido Bluetooth Headphone Sem Fio Over-ear Air Top é a escolha ideal para quem busca liberdade e conveniência, com uma conex', 'Benefícios do Fone de Ouvido P9 AIRO Fone de Ouvido Bluetooth Headphone Sem Fio Over-ear Air Top é a escolha ideal para quem busca liberdade e conveniência, com uma conexão sem fio Bluetooth que garante total mobilidade.Com controles integrados para ajuste de volume, reprodução de música e gerenciamento de chamadas, ele oferece uma experiência de áudio prática e versátil para o dia a dia, seja em atividades diárias ou esportivas.Os usuários destacam a excelente qualidade sonora, o conforto e o eficaz cancelamento de ruído, tornando o P9 AIR uma opção de grande custo-benefício. Além disso, o alcance de 15 metros e a compatibilidade com cartão de memória expandem ainda mais suas funcionalidades.Características:- Distância de transmissão: até 10 m- Capacidade da bateria: 400 mAh- Sensibilidade: 105 ± 3 dB- Diâmetro do alto-falante: 40 mm- Tempo de reprodução: aproximadamente 10 horas- Tempo em modo de espera: cerca de 120 horas- Tempo de carregamento: cerca de 2 horas- Microfone embutido: Sim- Compatível com cartão TF- Porta de carregamento: USB- Controle de faixas de música: suportado (pressione brevemente a tecla de função)- Ajuste de volume: suportado (pressione longamente a tecla de função)- Atendimento e encerramento de chamadas: suportado (pressione brevemente a tecla de função)- Interface de áudio I/O: suportada',
  './assets/produto-fone.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/MuP7BUH4HrQt',
  true, true, false, true,
  5, 120, 15, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'controle-sem-fio-para-playstation-4-com-iluminacao-led-e-mptbshkd', 'Controle Sem Fio para PlayStation 4 - Com Iluminação LED e Conexão Wireless', 'Eletrônicos', 'Games e Acessorios', 'M000000525',
  119.9, 137.39, 'Oferta relampago', 'Controle Sem Fio para PlayStation 4 - Com Iluminação LED e Conexão WirelessTransforme sua jogabilidade com o Controle Sem Fio para PlayStation 4, projetado para oferecer ', 'Controle Sem Fio para PlayStation 4 - Com Iluminação LED e Conexão WirelessTransforme sua jogabilidade com o Controle Sem Fio para PlayStation 4, projetado para oferecer máxima liberdade, conforto e estilo durante suas sessões de jogo. Com uma conexão estável e recursos modernos, ele é o parceiro perfeito para gamers que buscam desempenho e praticidade.Destaques do Produto:Entrada P2 pra fone na parte inferior do controleConexão Wireless Estável: Jogue sem restrições com tecnologia sem fio confiável, garantindo liberdade de movimento e desempenho consistente.Iluminação LED Personalizada: Adicione estilo ao seu setup com o sistema de iluminação LED, ideal para sessões de jogo em ambientes com pouca luz.Design Ergonômico: Desenvolvido para se ajustar perfeitamente às suas mãos, oferecendo conforto mesmo em maratonas de jogos.Função Responsiva: Proporciona comandos precisos e rápida resposta, garantindo vantagem competitiva em todos os jogos.Bateria Recarregável: Longa duração para horas de diversão sem interrupções, com carregamento fácil via cabo USB (não incluso).Compatibilidade Exclusiva: Ideal para PlayStation 4, assegurando uma experiência imersiva e compatibilidade total com todos os jogos da plataforma.Especificações Técnicas:Compatibilidade: PlayStation 4Conexão: Sem fio (Wireless)Bateria: Recarregável de longa duraçãoIluminação: LEDs integrados com estilo modernoAlcance: Até 8 metros de distânciaBotões: Sensíveis ao toque, projetados para precisão máximaMaterial: Plástico ABS de alta qualidadePor Que Escolher Este Controle?Liberdade de Movimento: Jogue sem se preocupar com cabos.Estilo Moderno: Iluminação LED que se destaca no seu setup.Conforto Duradouro: Design ergonômico que permite horas de jogabilidade sem desconforto.Desempenho Superior: Comandos precisos e resposta rápida para dominar seus jogos favoritos.Leve seu entretenimento a outro nível com o Controle Sem Fio para PlayStation 4. Desempenho incrível, conforto absoluto e um toque de estilo em cada jogada!',
  './assets/produto-fone.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/lOb5zwQZK6Yw',
  true, true, false, true,
  4.5, 842, 16, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'mini-pistola-de-massagem-eletrica-com-acessorios-e-6-mod-mptbaad7', 'Mini Pistola de Massagem Elétrica com Acessórios e 6 Modos de Velocidade ( Cores Sortidas )', 'Beleza e Cuidados', 'Massagem', 'SAD012601',
  109.9, 126.38, 'Oferta relampago', 'Mini Pistola de Massagem Elétrica com Acessórios e 6 Modos de Velocidade - (Cores Sortidas) 

Descrição
: Transforme o cuidado com o seu corpo em uma experiência única co', 'Mini Pistola de Massagem Elétrica com Acessórios e 6 Modos de Velocidade - (Cores Sortidas) 

Descrição
: Transforme o cuidado com o seu corpo em uma experiência única com o Massageador Elétrico Profissional. Ideal para quem busca alívio profundo e eficaz para dores musculares, este aparelho é perfeito para profissionais como enfermeiros, atletas, praticantes de CrossFit, trabalhadores da construção civil ou qualquer pessoa que realize atividades físicas intensas. Se as massagens tradicionais não alcançam a profundidade necessária para relaxar seus músculos, esta pistola de massagem é a solução perfeita para você. POR QUE ESCOLHER ESSE MASSAGEADOR? - Silencioso e Personalizável: Com funcionamento extremamente silencioso, oferece três níveis de intensidade ajustáveis, permitindo que você escolha entre massagem profunda, aumento da circulação ou melhora da mobilidade; - Versatilidade com 4 Cabeças de Massagem: Ideal para diferentes formatos e tamanhos musculares, promove ativação muscular, estimula o fluxo sanguíneo, acelera a recuperação, alivia dores e proporciona relaxamento completo da cabeça aos pés; - Bateria de Longa Duração: Equipado com bateria de lítio de 1800 mAh, oferece até 3-4 horas de uso contínuo com uma única carga. - Design Ergonômico e Ajustável: Inclui cabeça substituível com ajuste de ângulo, possibilitando massagens multiangulares para liberar tensões e aliviar músculos doloridos de forma prática e eficiente. FICHA TÉCNICA: Massageador Tradicional; Velocidade: Até 3200 RPM; Peso: 1,5 kg; Dimensão: 25 x 23 cm; Níveis de Ajuste: 6; Alimentação: Bivolt; Peso: 550 g; Velocidade: 6 níveis ajustáveis; Bateria: 1800 mAh; Potência: 30 W; DICAS DE USO: Realize a primeira carga por 3 horas antes do uso. Inclui cabo USB para recarga (não acompanha fonte).',
  './assets/produto-ferramentas.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/bD1nTAvivB2J',
  true, true, false, true,
  4.5, 958, 17, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'relogio-digital-skmei-mptac1cx', 'Relógio Digital SKMEI', 'Eletrônicos', 'Smartwatchs e Acessórios', 'll00018-1',
  59.9, 68.88, 'Oferta relampago', 'Relógio Digital SKMEI Resistente à Água – Praticidade, Estilo e Durabilidade para o Dia a Dia

Descrição
:O relógio digital SKMEI é referência quando se busca um modelo r', 'Relógio Digital SKMEI Resistente à Água – Praticidade, Estilo e Durabilidade para o Dia a Dia

Descrição
:O relógio digital SKMEI é referência quando se busca um modelo robusto, funcional e confiável para uso diário, esportivo ou casual. Com alta resistência à água e múltiplas funções inteligentes, ele se adapta a diversas rotinas – desde atividades físicas até situações do cotidiano.

Características do produto
- Design Esportivo e Versátil:Modelo unissex, indicado para adultos, adolescentes e até crianças, com visual moderno.- Visor Digital de Fácil LeituraDisplay LCD LED negativo, protegido por vidro acrílico, para ótima visualização em ambientes claros ou escuros (graças à luz de fundo).FUNÇÕES MULTIFUNCIONAIS:- Hora (formatos 12/24h)- Calendário (dia, mês e ano)- Alarme- Cronômetro- Contador regressivo- Fuso horário duplo ou múltiplo- Luz de fundo (iluminação para enxergar à noite)- Fecho Prático:BENEFÍCIOS:- Versatilidade:Combina com atividades esportivas, lazer, trabalho e uso casual.- Fácil de Usar:Interface simples, botões acessíveis e ajuste rápido das funções.- Estilo Moderno:Design esportivo que agrada vários públicos, disponível em versões preto, azul, verde e outras.ESPECIFICAÇÕES TÉCNICAS:- Marca: SKMEI- Material da caixa: Policarbonato- Material da pulseira : Polímero ou silicone- Vidro: Acrílico- Funções: Hora, data, alarme, luz, cronômetro, fuso horário, contagem regressivaCONTEÚDO DA EMBALAGEM:- 1x Relógio Digital SKMEI Resistente à Água',
  './assets/produto-fone.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/f0WcmWGG9yo1',
  true, true, false, true,
  4.5, 1376, 18, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
insert into public.products (
  id, title, category, subcategory, sku, price, old_price, tag, short_description, description,
  image_url, gallery, video_url, video_thumb, checkout_url, featured, active, best_seller,
  flash_offer, review_rating, review_count, display_order, updated_at
) values (
  'escova-alisadora-eletrica-bivolt-profissional-mpt94zpw', 'Escova Alisadora Elétrica Bivolt Profissional', 'Beleza e Cuidados', 'Acessorio Cabelos', 'SAD022320',
  99, 113.85, 'Oferta relampago', 'Transforme seu cabelo com praticidade e eficiência usando a Escova Alisadora de Cabelos Multifuncional. Projetada com um sistema de temperatura inteligente, essa escova o', 'Transforme seu cabelo com praticidade e eficiência usando a Escova Alisadora de Cabelos Multifuncional. Projetada com um sistema de temperatura inteligente, essa escova oferece uma experiência personalizada, adaptando-se perfeitamente a cada tipo de cabelo. Com cinco níveis de ajuste de temperatura, ela garante proteção e resultados incríveis, desde cabelos finos e sensíveis até fios mais grossos e resistentes. Além de alisar, essa escova multifuncional proporciona um acabamento sedoso e saudável, evitando danos e ressecamento. Seu design ergonômico facilita o manuseio, tornando o processo de modelagem rápido e confortável. Com potência de 45W e tecnologia bivolt automática, é perfeita para uso diário e viagens. Se você busca um cabelo impecável com praticidade, essa escova é a escolha ideal. FICHA TÉCNICA - Tensão: 110V/220V, compatível com diferentes redes elétricas. - Corrente elétrica: 50-60Hz, perfeita para uso em diversas regiões. - Potência: 45W, oferece desempenho potente e eficiente. - Temperatura ajustável: Entre 130°C e 200°C, permitindo o ajuste ideal para diferentes tipos de cabelo, desde os mais finos até os mais grossos. - Peso do produto: 378g ITENS INCLUSOS - 1X Escova 5 in 1',
  './assets/produto-moletom.svg', '[]'::jsonb, '', '', 'https://pay.kaiross.com.br/9a6X8d4pLzcP',
  true, true, false, true,
  4.5, 1093, 19, now()
) on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  subcategory = excluded.subcategory,
  sku = excluded.sku,
  price = excluded.price,
  old_price = excluded.old_price,
  tag = excluded.tag,
  short_description = excluded.short_description,
  description = excluded.description,
  image_url = excluded.image_url,
  checkout_url = excluded.checkout_url,
  featured = excluded.featured,
  active = excluded.active,
  best_seller = excluded.best_seller,
  flash_offer = excluded.flash_offer,
  review_rating = excluded.review_rating,
  review_count = excluded.review_count,
  display_order = excluded.display_order,
  updated_at = now();
