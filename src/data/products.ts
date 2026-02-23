// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                        🛒 CATÁLOGO DE PRODUTOS                           ║
// ║                                                                          ║
// ║  Para ADICIONAR um produto: copie um produto existente e cole abaixo    ║
// ║  Para REMOVER um produto: delete o bloco inteiro do produto             ║
// ╚══════════════════════════════════════════════════════════════════════════╝

export interface ColorVariant {
  name: string; // Nome da cor (ex: "Preto", "Marrom")
  hex: string; // Código hex para mostrar a bolinha de cor
  images: string[]; // Fotos específicas dessa cor
}

export interface ProductReview {
  name: string; // Nome do avaliador
  avatar?: string; // URL da foto do avaliador (opcional, usa emoji se não tiver)
  avatarEmoji?: string; // Emoji do avatar (ex: "👩", "👨") - usado se não tiver foto
  text: string; // Texto da avaliação
  rating: number; // Nota de 1 a 5
  date: string; // Data relativa (ex: "há 2 horas")
  productImage?: string; // (OBSOLETO) Use productImages no lugar
  productImages?: string[]; // Até 3 fotos do produto na avaliação (opcional)
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  descriptionImage?: string;
  price: number;
  originalPrice?: number;
  image: string;
  images: string[];
  features: string[];
  promotion?: string;
  sizes?: string[];
  colors?: ColorVariant[];
  reviews?: ProductReview[];
  socialProofGender?: "male" | "female" | "unisex";
  rating?: number;
  ratingCount?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📦 LISTA DE PRODUTOS - Adicione ou remova produtos aqui!
// ═══════════════════════════════════════════════════════════════════════════

export const products: Product[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 📖 PRODUTO 1: Café com Deus Pai
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "cafe-com-deus-pai", // ID único (sem espaços, usar hífen)
    name: "Café com Deus Pai", // Nome do produto
    slug: "cafe-com-deus-pai", // URL do produto (igual ao id)
    shortDescription: "Devocional diário para transformar suas manhãs",
    description:
      "Um devocional diário que transforma suas manhãs em momentos especiais com Deus. Cada página traz reflexões profundas, versículos inspiradores e orações que aquecem o coração.",
    price: 2798, // Preço em CENTAVOS (R$ 34,98 = 3498)
    originalPrice: 7990, // Preço original em CENTAVOS (opcional)
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_619525-MLA93494605423_092025-F.webp", // Imagem principal
    images: [
      // Todas as imagens do produto
      "https://http2.mlstatic.com/D_NQ_NP_2X_619525-MLA93494605423_092025-F.webp",
      "https://http2.mlstatic.com/D_NQ_NP_2X_997543-MLA93078667256_092025-F.webp",
      "https://livrariascuritiba.vteximg.com.br/arquivos/ids/2234283-1000-1000/lv538895_2.jpg?v=638999328356200000",
    ],
    features: [
      // Características do produto
      "365 devocionais diários",
      "Reflexões inspiradoras",
      "Versículos selecionados",
      "Orações guiadas",
      "Capa dura premium",
      "Filtro de café + Bonus",
    ],
    promotion: "PAGUE 1 e LEVE 2", // Promoção (opcional, deixe vazio se não tiver)
    // descriptionImage: "https://exemplo.com/imagem.jpg",  // Imagem na descrição (opcional)
    reviews: [
      // Avaliações do produto (opcional)
      {
        name: "Maria S.",
        avatarEmoji: "👩",
        // avatar: "https://exemplo.com/foto.jpg",  // Use URL de foto real aqui
        text: "Esse livro mudou minhas manhãs! Super recomendo.",
        rating: 5,
        date: "há 2 horas",
        // productImage: "https://exemplo.com/foto-produto.jpg"  // Foto do produto na avaliação
      },
      {
        name: "João P.",
        avatarEmoji: "👨",
        text: "Entrega rápida e produto de qualidade. Amei!",
        rating: 5,
        date: "há 1 dia",
      },
      {
        name: "Matheus O.",
        avatarEmoji: "👨",
        text: "Chegou no dia seguinte, obrigado pela atenção no suporte",
        rating: 5,
        date: "há 1 dia",
      },
      {
        name: "Joana C.",
        avatarEmoji: "👩",
        text: "Gostei muito do produto, obrigada, chegou muito rapido",
        rating: 5,
        date: "há 1 dia",
      },
      {
        name: "Pastora D.",
        avatarEmoji: "👩",
        text: "Graças a Deus, conseguimos abençoar os jovens da igreja com essas promoções",
        rating: 5,
        date: "há 2 dias",
      },
      {
        name: "Marcos M.",
        avatarEmoji: "👨",
        text: "Amei a qualidade, logo vou comprar mais",
        rating: 5,
        date: "há 2 dias",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 📖 PRODUTO 2: 365 com Amor de Deus
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "365-com-amor-de-deus",
    name: "365 dias com Amor de Deus",
    slug: "365-com-amor-de-deus",
    shortDescription: "365 dias mergulhando no amor de Deus",
    description:
      "Uma jornada de 365 dias mergulhando no amor incondicional de Deus. Este livro é um companheiro fiel para cada dia do ano, lembrando você de que é amado, perdoado e escolhido.",
    price: 2798, // R$ 37,90
    originalPrice: 7990, // R$ 75,80
    image: "https://m.media-amazon.com/images/I/71Nkt-QWbtL._AC_UF350,350_QL80_.jpg",
    images: [
      "https://m.media-amazon.com/images/I/71Nkt-QWbtL._AC_UF350,350_QL80_.jpg",
      "https://plenitudedistribuidora.fbitsstatic.net/img/p/365-dias-de-amor-com-deus-devocional-96512/285463-1.jpg?w=400&h=400&v=202601161403",
      "https://m.media-amazon.com/images/I/71m2Dsu1ohL._AC_UF350,350_QL80_.jpg",
    ],
    features: [
      "365 mensagens de amor",
      "Ilustrações exclusivas",
      "Marcador de página",
      "Papel de alta qualidade",
      "Presente perfeito",
    ],
    promotion: "PAGUE 1 e LEVE 2",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 📖 PRODUTO 2: 365 com Amor de Deus
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "365-dcom-amor-de-deus",
    name: "Devocional da Mulher 2026",
    slug: "365-dcom-amor-de-deus",
    shortDescription: "Devocional da Mulher 2026",
    description:
      "Uma jornada de 365 dias mergulhando no amor incondicional de Deus. Este livro é um companheiro fiel para cada dia do ano, lembrando você de que é amado, perdoado e escolhido.",
    price: 2798, // R$ 37,90
    originalPrice: 7580, // R$ 75,80
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_823208-MLA85510550398_062025-F.webp",
    images: [
      "https://http2.mlstatic.com/D_NQ_NP_2X_823208-MLA85510550398_062025-F.webp",
      "https://http2.mlstatic.com/D_NQ_NP_2X_615075-MLA85510550416_062025-F.webp",
      "https://m.media-amazon.com/images/I/61N+iI9j7PL._AC_UF350,350_QL80_.jpg",
    ],
    features: [
      "365 mensagens de amor",
      "Ilustrações exclusivas",
      "Marcador de página",
      "Papel de alta qualidade",
      "Presente perfeito",
    ],
    promotion: "PAGUE 1 e LEVE 2",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 📖 PRODUTO 3: Bíblia Leão de Judá
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "biblia-leao-de-juda",
    name: "Bíblia Leão de Judá",
    slug: "biblia-leao-de-juda",
    shortDescription: "Bíblia com capa premium do Leão de Judá",
    description:
      "Uma Bíblia majestosa com a icônica imagem do Leão de Judá na capa. Perfeita para quem busca força e coragem na Palavra de Deus. Edição completa com letra confortável.",
    price: 1091,
    originalPrice: 2990, // R$ 17,90
    image: "https://http2.mlstatic.com/D_NQ_NP_2X_637649-MLA100117124011_122025-F.webp",
    images: [
      "https://http2.mlstatic.com/D_NQ_NP_2X_637649-MLA100117124011_122025-F.webp",
      "https://http2.mlstatic.com/D_NQ_NP_2X_844479-MLA100117144003_122025-F.webp",
      "https://http2.mlstatic.com/D_NQ_NP_2X_780572-MLA100117353149_122025-F.webp",
    ],
    features: [
      "Capa ilustrada premium",
      "Letra grande e confortável",
      "Índice por livros",
      "Papel resistente",
      "Acabamento de luxo",
    ],
    promotion: "QUEIMA DE ESTOQUE",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 📖 PRODUTO 3: Bíblia Leão de Judá
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "biblia-sagrada-flores-rosas",
    name: "Biblia Sagrada Flores Rosa | NVI | Letra Normal",
    slug: "biblia-sagrada-flores-rosas",
    shortDescription: "Biblia Sagrada Flores Rosa | NVI | Letra Normal",
    description:
      "Biblia Sagrada Jesus te Ama, capa soft-touch e bordas coloridas, a versão NVI (Nova Versão Internacional) com antigo e novo testamento e Palavras de Jesus em Vermelho. Bíblia Sagrada, com a linguagem na versão NVI (Nova Versão Internacional). Dentre as versões bíblia ela se torna uma das mais modernas e prezervando a clareza do texto, permanecendo fiel aos Escritos originais. Incluindo panorama bíblico e mapas.",
    price: 1091,
    originalPrice: 2990, // R$ 17,90
    image: "https://www.quadrorama.com.br/imagens/quadro-decorativo/?quadro=2026/01/Design-sem-nome-42-4.png",
    images: ["https://publicacoespaodiario.com.br/wp-content/uploads/2025/07/7052_1.png"],
    features: [
      "Capa ilustrada premium",
      "Letra grande e confortável",
      "Índice por livros",
      "Papel resistente",
      "Acabamento de luxo",
    ],
    promotion: "QUEIMA DE ESTOQUE",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 📖 PRODUTO 3: Bíblia Leão de Judá
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "quadro-ejesus-gesso",
    name: "Quadro Jesus Cristo em Gesso 3D 60x90",
    slug: "quadro-ejesus-gesso",
    shortDescription: "Quadro Jesus Cristo em Gesso 3D 60x90",
    description: "Quadro Jesus Cristo em Gesso 3D 60x90",
    price: 1871,
    originalPrice: 8990, // R$ 17,90
    image: "https://publicacoespaodiario.com.br/wp-content/uploads/2025/07/7052_1.png",
    images: [
      "https://www.quadrorama.com.br/imagens/quadro-decorativo/?quadro=2026/01/Design-sem-nome-42-4.png",
      "https://plenitudedistribuidora.fbitsstatic.net/img/p/biblia-sagrada-flores-rosa-nvi-letra-normal-capa-dura-soft-touch-87525/274407.jpg?w=400&h=400&v=no-value",
      "https://http2.mlstatic.com/D_NQ_NP_2X_780572-MLA100117353149_122025-F.webp",
    ],
    features: ["Gesso de alta qualidade", "Feito a mão", "Acabamento de luxo"],
    promotion: "QUEIMA DE ESTOQUE",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 👟 PRODUTO 7: Sapato Social Masculino
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "sapato-social-masculino", // ID único (sem espaços, usar hífen)
    name: "Sapato Social Masculino Couro Legítimo", // Nome do produto
    slug: "sapato-social-masculino", // URL do produto (igual ao id)
    shortDescription: "Sapato social em couro legítimo com design elegante", // Descrição curta (card)
    description:
      "Sapato social masculino confeccionado em couro legítimo de alta qualidade. Design clássico e elegante, perfeito para ocasiões formais e uso diário. Solado antiderrapante e palmilha anatômica para máximo conforto.", // Descrição completa
    price: 8990, // Preço em CENTAVOS (R$ 89,90 = 8990)
    originalPrice: 19990, // Preço original em CENTAVOS (riscado) - opcional
    image: "https://m.media-amazon.com/images/I/61utX1IOfYL._AC_UY695_.jpg", // Imagem principal (card)
    images: [
      // Todas as imagens do produto (galeria)
      "https://m.media-amazon.com/images/I/61utX1IOfYL._AC_UY695_.jpg",
      "https://m.media-amazon.com/images/I/71cSuPGkJkL._AC_UY695_.jpg",
      "https://m.media-amazon.com/images/I/61zMxpGpBXL._AC_UY695_.jpg",
    ],
    features: [
      // Características (lista de bullets)
      "Couro legítimo",
      "Solado antiderrapante",
      "Palmilha anatômica",
      "Design clássico",
      "Acabamento premium",
    ],
    promotion: "QUEIMA DE ESTOQUE", // Tag de promoção (opcional, ex: "PAGUE 1 e LEVE 2")
    // descriptionImage: "https://exemplo.com/imagem-extra.jpg",  // Imagem extra na descrição (opcional)
    socialProofGender: "female", // Gênero dos nomes nos popups: 'male', 'female' ou 'unisex'
    sizes: ["37", "38", "39", "40", "41", "42", "43", "44"], // Tamanhos disponíveis (opcional)
    colors: [
      // Variantes de cor (opcional) - cada cor tem suas próprias fotos
      {
        name: "Preto", // Nome da cor
        hex: "#1a1a1a", // Código hex (bolinha de cor)
        images: [
          // Fotos específicas dessa cor
          "https://m.media-amazon.com/images/I/61utX1IOfYL._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/71cSuPGkJkL._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/61zMxpGpBXL._AC_UY695_.jpg",
        ],
      },
      {
        name: "Marrom",
        hex: "#8B4513",
        images: [
          "https://m.media-amazon.com/images/I/71QhGnMtx+L._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/71bQ3KsrURL._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/71FGLqRuURL._AC_UY695_.jpg",
        ],
      },
      {
        name: "Café",
        hex: "#6F4E37",
        images: [
          "https://m.media-amazon.com/images/I/61OGS+LPMzL._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/71TlJAkEPnL._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/61d3qR0TWHL._AC_UY695_.jpg",
        ],
      },
    ],
    reviews: [
      // Avaliações do produto (opcional)
      {
        name: "Ricardo B.", // Nome do avaliador
        avatarEmoji: "👨", // Emoji do avatar (usado se não tiver foto)
        // avatar: "https://exemplo.com/foto.jpg", // URL da foto real do avaliador (opcional)
        text: "Sapato muito confortável, couro de qualidade!", // Texto da avaliação
        rating: 5, // Nota de 1 a 5
        date: "há 3 horas", // Data relativa
        productImages: [
          // Até 3 fotos do produto na avaliação (opcional)
          "https://m.media-amazon.com/images/I/61utX1IOfYL._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/71cSuPGkJkL._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/61zMxpGpBXL._AC_UY695_.jpg",
        ],
      },
      {
        name: "Carlos A.",
        avatarEmoji: "👨",
        text: "Excelente acabamento, recomendo demais!",
        rating: 5,
        date: "há 1 dia",
        productImages: [
          // 2 fotos de exemplo
          "https://m.media-amazon.com/images/I/71QhGnMtx+L._AC_UY695_.jpg",
          "https://m.media-amazon.com/images/I/71bQ3KsrURL._AC_UY695_.jpg",
        ],
      },
      {
        name: "Felipe M.",
        avatarEmoji: "👨",
        text: "Chegou rápido e serve perfeitamente. Muito elegante!",
        rating: 5,
        date: "há 2 dias",
        // Sem productImages - não exibe fotos neste review
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ✨ ADICIONE NOVOS PRODUTOS AQUI (copie o modelo acima)
  // ─────────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────────
  // 👟 PRODUTO 8: Babuche Feminino luxo
  // ─────────────────────────────────────────────────────────────────────────

  {
    id: "babuche-feminino-luxo",
    name: "Babuche Feminino Super Macio com Pingentes de Luxo",
    slug: "babuche-feminino-luxo",
    shortDescription: "Babuche estilo casual super macio com Jibbitz de luxo",
    description:
      "ATENÇÃO: Os sapatos são grandes! Se você tem pés pequenos e finos, por favor, escolha um número menor. Babuche feminino confeccionado em EVA de alta qualidade, super macio, leve e respirável. Acompanha pingentes de luxo para personalizar seu estilo. Possui tira no tornozelo para maior segurança, solado antiderrapante e design arredondado garantindo conforto máximo.",
    price: 2900,
    originalPrice: 7900,
    image:
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/61b1bc9bd307496ea7995e1b6de951fb~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
    images: [
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/61b1bc9bd307496ea7995e1b6de951fb~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/f3267d94c0e241f0b3282db7f5f01a67~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/1f0349d8b09245cb95ba498a2d210a03~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/4cba687e7cb3493392884c2dea4cb78c~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/5ef87bffb3934365927fb90abc1b7c74~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/562c21ac413e441f83f461027973d71d~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/46b42ef22a7a4e17a4a3f1e022e8e2f8~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/a1306387874c4796930ac889a90b2132~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/568d13cacfbb40bf80e8083ca7007378~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
    ],
    features: [
      "Material EVA Premium",
      "Solado Antiderrapante",
      "Acompanha Jibbitz (Pingentes)",
      "Tira ajustável no calcanhar",
      "Leve e Respirável",
    ],
    promotion: "PROMOÇÃO RELÂMPAGO",
    descriptionImage:
      "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/96d2bffdc1484b2097622f78187aa743~tplv-aphluv4xwc-resize-webp:800:800.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
    socialProofGender: "female",
    sizes: ["33/34", "35/36", "37/38", "39/40"],
    colors: [
      {
        name: "M3-Preto",
        hex: "#000000",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/f2956deb082b40b7ac5973e4ed0d5be9~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "M4-Rosa",
        hex: "#FFC0CB",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/837ac26971aa43cc98433ec3cb2c218d~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "M5-Bege",
        hex: "#F5F5DC",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/744ffdbd3a744e2c8881b1674de8fcbd~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AM-Branco",
        hex: "#FFFFFF",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/00ff84420b5a486887368a03ce3cf609~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AM-Preto",
        hex: "#000000",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/a9d46c483f364abaaee4e55b12c20dde~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AM-Rosa",
        hex: "#FFC0CB",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/96937f5cbd2b4ce182b3edecc43f8276~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AM-Bege",
        hex: "#F5F5DC",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/b6d9bfeaf67e4f4e86bf0b763fa588bd~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AD-Branco",
        hex: "#FFFFFF",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/041d4baf593c4321832b7880b2693b7b~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AD-Preto",
        hex: "#000000",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/3e308bf944cd41ef800dfbd48b8ad780~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AD-Rosa",
        hex: "#FFC0CB",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/a5748bb91f4e4d5fb69725e35f82b5a2~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AD-Bege",
        hex: "#F5F5DC",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/274663f9fc3a4b6fac5caeb72e6b99d3~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AJ-Branco",
        hex: "#FFFFFF",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/02ee4b30f35f44bcb4f0aa77dddfb6c4~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AJ-Preto",
        hex: "#000000",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/e3041fc39a4b45e899e95c1a07cac6f9~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AJ-Rosa",
        hex: "#FFC0CB",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/57a5e4d5c2544a659f0577fa70e06d20~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AJ-Bege",
        hex: "#F5F5DC",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/eb5c0cac3d0a4bda87fe2d073699898c~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AP-Branco",
        hex: "#FFFFFF",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/6a2f16ee08d34fcb9b9b98a4089d6883~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AP-Preto",
        hex: "#000000",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/46b96d4ba62a4acb8cea9a9d1fec113a~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AP-Rosa",
        hex: "#FFC0CB",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/70713733c14548aeb0d15e8cb8aa5439~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "AP-Bege",
        hex: "#F5F5DC",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/b32adb5732324c95b395bd54b0eedb6c~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "R2-Branco",
        hex: "#FFFFFF",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/6545cb7554c441b0bba81642eada2bc1~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "R3-Preto",
        hex: "#000000",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/06640b6f017c4ccb86ece7cce3420028~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "R4-Rosa",
        hex: "#FFC0CB",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/69a04ab89aab4f5fb8d4ba7669a40101~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "R5-Bege",
        hex: "#F5F5DC",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/231b2757fd5745669557fddc8555f36b~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "i-Branco",
        hex: "#FFFFFF",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/c4feec81e04f432a85031cf75f03a01d~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "i-Preto",
        hex: "#000000",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/a2fb9928ae2248258e681cdf1784d564~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "i-Rosa",
        hex: "#FFC0CB",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/f402e75951d242178a93efe58083c987~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
      {
        name: "i-Bege",
        hex: "#F5F5DC",
        images: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/579831401525437589ec5b3ca6d756ec~tplv-aphluv4xwc-resize-webp:200:200.webp?dr=15584&t=555f072d&ps=933b5bde&shp=6ce186a1&shcp=e1be8f53&idc=my&from=1826719393",
        ],
      },
    ],
    reviews: [
      {
        name: "Sandra M.",
        avatarEmoji: "👩",
        avatar:
          "https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/768fb455825e21a8b42a1b11bd1fb39c~tplv-tiktokx-cropcenter:100:100.jpg?dr=14579&refresh_token=dce587fb&x-expires=1771520400&x-signature=cefmUmB0RaJcP0R2YYYdqyMhKP8%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=5f8d3399&idc=my",
        text: "Forma e tamanho: Uma sandália estilo tamanco, com forma arredondada e anatômica. A base é larga e plana, garantindo conforto e estabilidade. Possui aberturas para ventilação e uma tira ajustável no calcanhar. Decorada com charms, combina conforto e estilo, ideal para uso casual.Compre agora e apaixone-se!",
        rating: 5,
        date: "2026-01-25",
        productImages: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/c1cc5d89e71c4fd4be91d6b64b4199dc~tplv-aphluv4xwc-crop-webp:300:300.webp?dr=15592&t=555f072d&ps=933b5bde&shp=8dbd94bf&shcp=e1be8f53&idc=my&from=2378011839",
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/0519c575ccc14757ad54f3ffcf373fbe~tplv-aphluv4xwc-crop-webp:300:300.webp?dr=15592&t=555f072d&ps=933b5bde&shp=8dbd94bf&shcp=e1be8f53&idc=my&from=2378011839",
        ],
      },
      {
        name: "Mariana S.",
        avatarEmoji: "👩",
        avatar:
          "https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/0eaf74bcbccc9dc6065713779f9356da~tplv-tiktokx-cropcenter:100:100.jpg?dr=14579&refresh_token=13f8bea2&x-expires=1771520400&x-signature=lym3HHEiU2jBL0zDxEobd7cuVyY%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=5f8d3399&idc=my",
        text: "Forma e tamanho: Amei, otima qualidade. 🥰",
        rating: 5,
        date: "2026-01-16",
        productImages: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/a429e0e64df44e61b44bc920145b9009~tplv-aphluv4xwc-crop-webp:300:300.webp?dr=15592&t=555f072d&ps=933b5bde&shp=8dbd94bf&shcp=e1be8f53&idc=my&from=2378011839",
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/49bed7664de145c59d37fee7b876a1bf~tplv-aphluv4xwc-crop-webp:300:300.webp?dr=15592&t=555f072d&ps=933b5bde&shp=8dbd94bf&shcp=e1be8f53&idc=my&from=2378011839",
        ],
      },
      {
        name: "Júlia A.",
        avatarEmoji: "👩",
        avatar:
          "https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/8a9f05354f375081e9e4c2ac88ff414e~tplv-tiktokx-cropcenter:100:100.jpg?dr=14579&refresh_token=ffcf839f&x-expires=1771520400&x-signature=D1cx8NIgb4dOhgijzvQSrHxx7J4%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=5f8d3399&idc=my",
        text: "Ótimo vem tudo certinho, e chega rapidinho é bem confortável e vale super apena comprar!♡ Forma e tamanho: 33/34 Cor: Branco",
        rating: 5,
        date: "2025-10-19",
        productImages: [
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/f850895962d4488cb417f5c0a9e5a507~tplv-aphluv4xwc-crop-webp:300:300.webp?dr=15592&t=555f072d&ps=933b5bde&shp=8dbd94bf&shcp=e1be8f53&idc=my&from=2378011839",
          "https://p16-oec-sg.ibyteimg.com/tos-alisg-i-aphluv4xwc-sg/c274c438f490402a91e77d0fe69f9a32~tplv-aphluv4xwc-crop-webp:300:300.webp?dr=15592&t=555f072d&ps=933b5bde&shp=8dbd94bf&shcp=e1be8f53&idc=my&from=2378011839",
        ],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// ⚙️ FUNÇÕES AUXILIARES (não mexer)
// ═══════════════════════════════════════════════════════════════════════════

export const getProductBySlug = (slug: string): Product | undefined => {
  return products.find((p) => p.slug === slug);
};

export const formatPrice = (priceInCents: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceInCents / 100);
};
