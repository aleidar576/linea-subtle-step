// ============================================
// 🔗 API Service Layer - SaaS Extensions
// ============================================

import { productsApi, settingsApi, trackingPixelsApi, authApi, paymentsApi, webhookApi } from './api';
export { productsApi, settingsApi, trackingPixelsApi, authApi, paymentsApi, webhookApi };
export type { APIProduct, APISetting, APITrackingPixel, AuthResponse, CreatePixRequest, PixResponse } from './api';

const API_BASE = window.location.hostname.includes('lovable.app')
  ? 'https://pandora-five-amber.vercel.app/api'
  : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('lojista_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));

    // Global 401 interceptor: clean logout + redirect
    if (res.status === 401) {
      localStorage.removeItem('lojista_token');
      window.location.href = '/login';
      return new Promise<T>(() => {}); // Never resolves — page will redirect
    }

    const err: any = new Error(body.error || `Request failed: ${res.status}`);
    if (body.email_nao_verificado) {
      err.email_nao_verificado = true;
      err.email = body.email;
    }
    throw err;
  }

  return res.json();
}

// === Interfaces ===

export interface LojistaUser {
  id: string;
  email: string;
  nome: string;
  role: 'lojista';
  lojista_id: string;
  plano: string;
  modo_amigo?: boolean;
  liberar_visualizacao_subdominio?: boolean;
  bloqueado?: boolean;
  email_verificado?: boolean;
  avatar_url?: string | null;
}

export interface LojistaAuthResponse {
  token: string;
  user: LojistaUser;
}

export interface TwoFARequiredResponse {
  require2FA: true;
  tempToken: string;
}

export type LoginResponse = LojistaAuthResponse | TwoFARequiredResponse;

export interface Loja {
  _id: string;
  lojista_id: string;
  nome: string;
  nome_exibicao: string;
  slug: string;
  favicon: string;
  icone: string;
  dominio_customizado: string | null;
  dominio_verificado: boolean;
  configuracoes: {
    exigir_cadastro_cliente: boolean;
    tema: string;
    categoria_home_id?: string | null;
    sealpay_api_key?: string | null;
    custom_css?: string;
    footer?: FooterConfig | null;
    whatsapp_numero?: string;
    cores_globais?: CoresGlobais | null;
    homepage_config?: HomepageConfig | null;
    produto_config?: ProdutoConfig | null;
    scripts_customizados?: ScriptCustomizado[];
    logo?: LogoConfig | null;
    cart_config?: CartConfig | null;
    checkout_config?: CheckoutConfig | null;
  };
  is_active: boolean;
  criado_em: string;
  atualizado_em: string;
  pixels?: Array<{ _id: string; platform: 'facebook' | 'tiktok'; pixel_id: string; access_token: string; is_active: boolean }>;
}

export interface FooterLink {
  nome: string;
  url: string;
  // Legacy compat
  label?: string;
  pagina_slug?: string;
}

export interface FooterColuna {
  titulo: string;
  links: FooterLink[];
}

export interface FooterConfig {
  colunas: FooterColuna[];
  newsletter: boolean;
  redes_sociais: {
    instagram?: { ativo: boolean; url: string };
    tiktok?: { ativo: boolean; url: string };
    facebook?: { ativo: boolean; url: string };
    youtube?: { ativo: boolean; url: string };
  };
  selos: { ativo: boolean; url: string };
  texto_copyright: string;
  texto_endereco: string;
  texto_cnpj: string;
  cores?: {
    fundo?: string;
    texto?: string;
  };
}

export interface CoresGlobais {
  brand_primary?: string;
  brand_secondary?: string;
  bg_base?: string;
  bg_surface?: string;
  text_primary?: string;
  whatsapp_button?: string;
  // Legacy fields (backward compat)
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_fundo?: string;
  cor_texto?: string;
}

export interface LogoConfig {
  tipo: 'upload' | 'url' | 'texto';
  imagem_url: string;
  texto: string;
  fonte: string;
  tamanho?: number; // max-height in px (default 48)
  posicao?: 'esquerda' | 'centro'; // default esquerda
}

export interface HomepageConfig {
  blocos?: Array<{ tipo: string; ordem: number; ativo: boolean }>;
  carrossel_botao_texto?: string;
  carrossel_botao_cor?: string;
  faixa_aviso?: { texto: string; cor_fundo: string; ativo: boolean };
  tarja_topo?: {
    ativo: boolean;
    texto: string;
    cor_fundo: string;
    cor_texto: string;
    negrito: boolean;
    fonte: string;
    icone: string;
    icone_ativo: boolean;
  };
  banners?: Array<{
    imagem: string;
    imagem_mobile_ativo: boolean;
    imagem_mobile: string;
    titulo: string;
    titulo_cor: string;
    titulo_tamanho: string;
    subtitulo: string;
    subtitulo_cor: string;
    subtitulo_tamanho: string;
    badge_texto: string;
    badge_cor_texto: string;
    badge_cor_fundo: string;
    badge_icone: string;
    badge_transparencia: number;
    botao_ativo: boolean;
    botao_texto: string;
    botao_link: string;
    botao_cor_texto: string;
    botao_cor_fundo: string;
    blur_ativo?: boolean;
    blur_intensidade?: number;
  }>;
  setas_cor_fundo?: string;
  setas_cor_seta?: string;
  setas_fundo_invisivel?: boolean;
  titulo_secao_produtos?: string;
  secao_secundaria?: {
    ativo: boolean;
    titulo: string;
    categoria_id: string | null;
  };
  destaques?: {
    ativo: boolean;
    cor_fundo: string;
    cor_texto: string;
    itens: Array<{ texto: string; icone: string }>;
  };
  social_proof?: {
    ativo: boolean;
    titulo: string;
    nota_media: number;
    subtexto: string;
    imagem_url?: string;
    comentarios: Array<{ nome: string; texto: string; nota: number; foto: boolean; foto_url?: string }>;
  };
  tarja?: { cor_fundo: string; titulo: string; subtitulo: string; botao_ativo: boolean; botao_texto: string; botao_link: string };
  trust_badges?: Array<{ texto: string; icone: string }>;
  popup?: {
    ativo: boolean;
    tipo: 'CUPONS' | 'NEWSLETTER' | 'BANNER';
    titulo: string;
    subtitulo: string;
    texto_botao: string;
    imagem_url: string;
    cupons_ids: string[];
    cores?: { fundo?: string; texto?: string; botao_fundo?: string; botao_texto?: string };
    botao_link?: string;
    // Legacy compat
    botao_texto?: string;
    cupom_codigo?: string;
  };
  cookie_consent?: {
    ativo: boolean;
    texto: string;
  };
}

export interface CartConfig {
  trust_badges?: Array<{ texto: string; icone: string }>;
  tarja_vermelha?: {
    ativo: boolean;
    icone: string;
    texto: string;
  };
  nota_inferior?: {
    texto: string;
    cor: string;
    tamanho: string;
  };
}

export interface CheckoutConfig {
  // placeholder for future checkout configs
}

export interface FreteEspecifico {
  _id?: string;
  nome: string;
  prazo_dias_min: number;
  prazo_dias_max: number;
  valor: number;
  is_active: boolean;
  exibir_no_produto?: boolean;
}

export interface ProdutoConfig {
  barra_pesquisa?: { ativo: boolean };
  chatbot?: { ativo: boolean };
}

export interface CarrinhoCheckoutConfig {
  cart?: CartConfig;
  checkout?: CheckoutConfig;
}

export interface LojistaProfile {
  _id: string;
  email: string;
  nome: string;
  telefone: string;
  plano: string;
  bloqueado: boolean;
  email_verificado: boolean;
  liberar_visualizacao_subdominio: boolean;
  two_factor_enabled: boolean;
  avatar_url?: string | null;
  modo_amigo?: boolean;
  criado_em: string;
}

// === Product types (lojista) ===

export interface Variacao {
  _id?: string;
  tipo: string;
  nome: string;
  estoque: number;
  preco: number | null;
  imagem: string | null;
  color_hex?: string | null;
}

export interface AvaliacaoManual {
  _id?: string;
  nome: string;
  texto: string;
  nota: number;
  data: string;
  imagens?: string[];
  foto_avaliador?: string;
}

export interface AvaliacoesConfig {
  nota: number;
  nota_exibicao: string;
  ver_mais_modo: 'ocultar' | 'funcional' | 'estetico';
  qtd_antes_ver_mais: number;
  usar_comentarios_padrao: boolean;
  avaliacoes_manuais: AvaliacaoManual[];
  pacote_comentarios?: string;
}

export interface FreteConfig {
  tipo: 'entregue_ate' | 'receba_ate';
  data_1: string | null;
  data_2: string | null;
  ocultar_frete_produto?: boolean;
}

export interface OfertaRelampago {
  ativo: boolean;
  icone: string;
  titulo: string;
  data_termino: string | null;
  estoque_campanha: number;
  evergreen_minutos?: number;
  evergreen_segundos?: number;
}

export interface LojaProduct {
  _id?: string;
  product_id: string;
  loja_id: string;
  category_id: string | null;
  category_ids?: string[];
  name: string;
  slug: string;
  short_description: string;
  description: string;
  description_image?: string | null;
  price: number;
  original_price?: number | null;
  image: string;
  images: string[];
  features: string[];
  promotion?: string | null;
  sizes?: string[] | null;
  colors?: any;
  reviews?: any;
  social_proof_gender?: string | null;
  badge_imagem?: string | null;
  sort_order: number;
  is_active: boolean;
  rating: number;
  rating_count: string;
  variacoes: Variacao[];
  vender_sem_estoque: boolean;
  estoque: number;
  avaliacoes_config: AvaliacoesConfig;
  frete_config: FreteConfig;
  usar_frete_global?: boolean;
  fretes_especificos?: FreteEspecifico[];
  fretes_vinculados?: Array<{ frete_id: string; valor_personalizado: number | null; exibir_no_produto?: boolean }>;
  parcelas_fake: string | null;
  vendas_fake: number;
  oferta_relampago: OfertaRelampago;
  vantagens?: { ativo: boolean; itens: string[] };
  vantagens_titulo?: string | null;
  protecao_cliente?: { ativo: boolean; itens: { icone: string; texto: string }[] };
  pessoas_vendo?: { ativo: boolean; min: number; max: number };
  cross_sell?: { modo: string; categoria_manual_id: string | null };
}

export interface LojaCategory {
  _id: string;
  loja_id: string;
  nome: string;
  slug: string;
  parent_id: string | null;
  ordem: number;
  is_active: boolean;
  qtd_produtos?: number;
}

export interface CategoriesResponse {
  categories: LojaCategory[];
  uncategorized_count: number;
}

// === Pixel types ===

export interface TrackingPixelData {
  _id: string;
  platform: 'facebook' | 'tiktok' | 'google_ads' | 'gtm';
  pixel_id: string; // For google_ads = AW-XXXXX, for gtm = GTM-XXXXX
  access_token: string;
  loja_id: string;
  events: string[];
  trigger_pages: string[];
  trigger_product_ids: string[];
  conversion_label?: string;
  is_active: boolean;
}

export interface ScriptCustomizado {
  nome: string;
  local: 'head' | 'body_start' | 'body_end';
  codigo: string;
}

// === Pagina types ===

export interface PaginaData {
  _id: string;
  loja_id: string;
  titulo: string;
  slug: string;
  conteudo: string;
  is_active: boolean;
  criado_em: string;
  atualizado_em: string;
}

// === APIs ===

export const lojistaAuthApi = {
  registro: (data: { nome: string; email: string; password: string; telefone?: string; termos_aceitos: boolean }) =>
    request<{ success: boolean; message: string; verify_url?: string; token_verificacao?: string }>('/auth-action?action=registro', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    request<LoginResponse>('/auth-action?action=login-lojista', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  verifyLogin2FA: (tempToken: string, code: string) =>
    request<LojistaAuthResponse>('/auth-action?action=verify-login-2fa', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
    }),

  verificarEmail: (token: string) =>
    request<{ success: boolean; message: string }>(`/auth-action?action=verificar-email&token=${token}`),

  reenviarVerificacao: (email: string) =>
    request<{ success: boolean; message: string }>('/auth-action?action=reenviar-verificacao', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  redefinirSenha: (email: string) =>
    request<{ success: boolean; message: string }>('/auth-action?action=redefinir-senha', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  novaSenha: (token: string, nova_senha: string) =>
    request<{ success: boolean; message: string }>('/auth-action?action=nova-senha', {
      method: 'POST',
      body: JSON.stringify({ token, nova_senha }),
    }),

  me: () =>
    request<{ user: LojistaUser | null }>('/auth-action?action=me'),
};

export const lojasApi = {
  list: async () => {
    const res = await request<any>('/lojas');
    return Array.isArray(res) ? res : (res?.lojas || res?.data || []);
  },
  getById: (id: string) => request<Loja>(`/lojas?id=${id}`),
  create: (data: { nome: string }) =>
    request<Loja>('/lojas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Loja>) =>
    request<Loja>(`/lojas?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/lojas?id=${id}`, { method: 'DELETE' }),
  addDomain: (lojaId: string, domain: string) =>
    request<{ success: boolean; vercel: any }>('/lojas?scope=add-domain', {
      method: 'POST', body: JSON.stringify({ loja_id: lojaId, domain }),
    }),
  checkDomain: (domain: string) =>
    request<any>(`/lojas?scope=check-domain&domain=${encodeURIComponent(domain)}`),
};

export const lojistaApi = {
  perfil: () => request<LojistaProfile>('/lojista'),
  atualizar: (data: { nome?: string; telefone?: string; avatar_url?: string }) =>
    request<LojistaProfile>('/lojista', { method: 'PUT', body: JSON.stringify(data) }),
  alterarSenha: (data: { senha_atual: string; nova_senha: string }) =>
    request<{ success: boolean }>('/lojista?action=senha', { method: 'PUT', body: JSON.stringify(data) }),
  generate2FA: () =>
    request<{ qrCode: string; secret: string }>('/lojista?action=generate-2fa', { method: 'POST' }),
  enable2FA: (token: string) =>
    request<{ success: boolean }>('/lojista?action=enable-2fa', { method: 'POST', body: JSON.stringify({ token }) }),
  disable2FA: (senha_atual: string) =>
    request<{ success: boolean }>('/lojista?action=disable-2fa', { method: 'POST', body: JSON.stringify({ senha_atual }) }),
};

export const lojaProductsApi = {
  list: (lojaId: string) => request<LojaProduct[]>(`/products?loja_id=${lojaId}`),
  getById: (id: string) => request<LojaProduct>(`/products?id=${id}`),
  create: (data: Partial<LojaProduct>) => request<LojaProduct>('/products', {
    method: 'POST', body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<LojaProduct>) => request<LojaProduct>(`/products?id=${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }),
  delete: (id: string) => request<{ success: boolean }>(`/products?id=${id}`, { method: 'DELETE' }),
  toggleActive: (id: string, is_active: boolean) => request<{ success: boolean }>(`/products?id=${id}`, {
    method: 'PATCH', body: JSON.stringify({ is_active }),
  }),
};

export const lojaCategoriesApi = {
  list: (lojaId: string) => request<CategoriesResponse>(`/categorias?loja_id=${lojaId}`),
  create: (data: { nome: string; loja_id: string; parent_id?: string }) =>
    request<LojaCategory>('/categorias', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nome?: string; slug?: string; ordem?: number }) =>
    request<LojaCategory>(`/categorias?id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean; produtos_movidos: number }>(`/categorias?id=${id}`, { method: 'DELETE' }),
  reorder: (items: Array<{ id: string; ordem: number }>) =>
    request<{ success: boolean }>('/categorias?action=reorder', { method: 'PATCH', body: JSON.stringify({ items }) }),
  bulkUpdateProducts: (products: Array<{ id: string; category_id: string | null; sort_order: number }>) =>
    request<{ success: boolean }>('/categorias?action=bulk-update-products', { method: 'PATCH', body: JSON.stringify({ products }) }),
  getCategoryProducts: (lojaId: string, categoryId: string | null) =>
    request<Array<{ _id: string; name: string; image: string; price: number; sort_order: number; category_id: string | null; is_active: boolean }>>(
      `/loja-extras?scope=category-products&loja_id=${lojaId}&category_id=${categoryId || 'null'}`
    ),
};

// === Pedido types ===

export interface PedidoItem {
  product_id: string;
  name: string;
  image: string;
  slug: string;
  quantity: number;
  price: number;
  variacao?: string | null;
  cupom_aplicado?: boolean;
}

export interface Pedido {
  _id: string;
  numero: number;
  loja_id: string;
  cliente_id: string | null;
  itens: PedidoItem[];
  subtotal: number;
  desconto: number;
  frete: number;
  total: number;
  cupom: { codigo: string; tipo: string; valor: number } | null;
  status: 'pendente' | 'pago' | 'enviado' | 'entregue' | 'cancelado';
  pagamento: { metodo: string; txid: string | null; pix_code: string | null; pago_em: string | null };
  cliente: { nome: string; email: string; telefone: string; cpf: string };
  endereco: { cep: string; rua: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string } | null;
  rastreio: string | null;
  observacoes_internas: string;
  utms: Record<string, string>;
  criado_em: string;
  atualizado_em: string;
}

export interface PedidosListResponse {
  pedidos: Pedido[];
  total: number;
  page: number;
  per_page: number;
}

export interface CarrinhoAbandonado {
  _id: string;
  loja_id: string;
  etapa: 'customer' | 'shipping' | 'payment';
  itens: { product_id: string; name: string; quantity: number; price: number }[];
  total: number;
  cliente: { nome: string; email: string; telefone: string; cpf: string };
  endereco: any;
  pix_code: string | null;
  txid: string | null;
  utms: Record<string, string>;
  convertido: boolean;
  criado_em: string;
}

export interface ClienteData {
  _id: string;
  loja_id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  censurado: boolean;
  total_pedidos: number;
  total_gasto: number;
  criado_em: string;
}

// === Pedidos API ===

export const pedidosApi = {
  list: (lojaId: string, filters?: { status?: string; search?: string; page?: number; per_page?: number }) => {
    const params = new URLSearchParams({ loja_id: lojaId, scope: 'pedidos' });
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.per_page) params.set('per_page', String(filters.per_page));
    return request<PedidosListResponse>(`/pedidos?${params.toString()}`);
  },
  getById: (id: string) => request<Pedido>(`/pedidos?scope=pedido&id=${id}`),
  create: (data: any) => request<Pedido>('/pedidos?scope=pedido', { method: 'POST', body: JSON.stringify(data) }),
  addRastreio: (id: string, codigo: string) =>
    request<Pedido>(`/pedidos?scope=pedido&id=${id}&action=rastreio`, { method: 'PATCH', body: JSON.stringify({ codigo }) }),
  addObservacao: (id: string, texto: string) =>
    request<Pedido>(`/pedidos?scope=pedido&id=${id}&action=observacao`, { method: 'PATCH', body: JSON.stringify({ texto }) }),
  alterarStatus: (id: string, status: string) =>
    request<Pedido>(`/pedidos?scope=pedido&id=${id}&action=status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};

// === Carrinhos API ===

export const carrinhosApi = {
  list: (lojaId: string) => request<CarrinhoAbandonado[]>(`/pedidos?loja_id=${lojaId}&scope=carrinhos`),
  save: (data: any) => request<CarrinhoAbandonado>('/pedidos?scope=carrinho', { method: 'POST', body: JSON.stringify(data) }),
  marcarConvertido: (id: string) => request<CarrinhoAbandonado>(`/pedidos?scope=carrinho&id=${id}`, { method: 'PATCH' }),
};

// === Clientes API ===

export const clientesApi = {
  list: (lojaId: string, search?: string) => {
    const params = new URLSearchParams({ loja_id: lojaId, scope: 'clientes' });
    if (search) params.set('search', search);
    return request<ClienteData[]>(`/pedidos?${params.toString()}`);
  },
  getById: (id: string) => request<ClienteData>(`/pedidos?scope=cliente&id=${id}`),
  update: (id: string, data: { nome?: string; telefone?: string }) =>
    request<ClienteData>(`/pedidos?scope=cliente&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  enviarRedefinicaoSenha: (id: string) =>
    request<{ success: boolean }>(`/pedidos?scope=redefinir-senha-cliente&id=${id}`, { method: 'POST' }),
  create: (data: { loja_id: string; nome: string; email: string; telefone?: string; cpf?: string }) =>
    request<ClienteData>(`/pedidos?scope=criar-cliente&loja_id=${data.loja_id}`, {
      method: 'POST', body: JSON.stringify(data),
    }),
};

// === Frete types ===

export interface RegraFrete {
  _id: string;
  loja_id: string;
  nome: string;
  tipo: 'entregue_ate' | 'receba_ate';
  prazo_dias_min: number;
  prazo_dias_max: number;
  valor: number;
  valor_minimo_gratis: number | null;
  ocultar_preco: boolean;
  exibir_no_produto: boolean;
  pre_selecionado: boolean;
  ordem_exibicao: number;
  is_active: boolean;
  criado_em: string;
}

export interface Cupom {
  _id: string;
  loja_id: string;
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  valor_minimo_pedido: number | null;
  limite_usos: number | null;
  usos: number;
  validade: string | null;
  is_active: boolean;
  criado_em: string;
  produtos_ids?: string[];
}

export interface MidiaItem {
  url: string;
  usado_em: { product_id: string; name: string }[];
}

export interface TemaConfig {
  tema: string;
  categoria_home_id: string | null;
  footer?: FooterConfig | null;
  whatsapp_numero?: string;
  cores_globais?: CoresGlobais | null;
  homepage_config?: HomepageConfig | null;
  produto_config?: ProdutoConfig | null;
}

// === Fretes API ===

export const fretesApi = {
  list: (lojaId: string) => request<RegraFrete[]>(`/loja-extras?scope=fretes&loja_id=${lojaId}`),
  create: (data: Partial<RegraFrete> & { loja_id: string }) =>
    request<RegraFrete>('/loja-extras?scope=frete', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<RegraFrete>) =>
    request<RegraFrete>(`/loja-extras?scope=frete&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/loja-extras?scope=frete&id=${id}`, { method: 'DELETE' }),
};

// === Cupons API ===

export const cuponsApi = {
  list: (lojaId: string) => request<Cupom[]>(`/loja-extras?scope=cupons&loja_id=${lojaId}`),
  validar: (lojaId: string, codigo: string) =>
    request<{ tipo: string; valor: number; valor_minimo_pedido: number | null; codigo: string }>(`/loja-extras?scope=cupom-publico&loja_id=${lojaId}&codigo=${codigo}`),
  create: (data: Partial<Cupom> & { loja_id: string }) =>
    request<Cupom>('/loja-extras?scope=cupom', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Cupom>) =>
    request<Cupom>(`/loja-extras?scope=cupom&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/loja-extras?scope=cupom&id=${id}`, { method: 'DELETE' }),
  toggle: (id: string) =>
    request<Cupom>(`/loja-extras?scope=cupom&id=${id}`, { method: 'PATCH' }),
};

// === Mídias API ===

export const midiasApi = {
  list: (lojaId: string) => request<MidiaItem[]>(`/loja-extras?scope=midias&loja_id=${lojaId}`),
  remove: (lojaId: string, url: string) =>
    request<{ success: boolean; removido_de: number }>(`/loja-extras?scope=midia&loja_id=${lojaId}`, {
      method: 'DELETE', body: JSON.stringify({ url }),
    }),
  upload: (lojaId: string, imageBase64: string) =>
    request<{ url: string }>(`/loja-extras?scope=upload&loja_id=${lojaId}`, {
      method: 'POST', body: JSON.stringify({ image_base64: imageBase64 }),
    }),
};

// === Temas API ===

export const temasApi = {
  get: (lojaId: string) => request<TemaConfig>(`/loja-extras?scope=tema&loja_id=${lojaId}`),
  update: (lojaId: string, data: Partial<TemaConfig>) =>
    request<TemaConfig>(`/loja-extras?scope=tema&loja_id=${lojaId}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// === Pixels API ===

export const pixelsApi = {
  list: (lojaId: string) => request<TrackingPixelData[]>(`/loja-extras?scope=pixels&loja_id=${lojaId}`),
  create: (data: Partial<TrackingPixelData> & { loja_id: string }) =>
    request<TrackingPixelData>('/loja-extras?scope=pixel', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<TrackingPixelData>) =>
    request<TrackingPixelData>(`/loja-extras?scope=pixel&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/loja-extras?scope=pixel&id=${id}`, { method: 'DELETE' }),
};

// === Páginas API ===

export const paginasApi = {
  list: (lojaId: string) => request<PaginaData[]>(`/loja-extras?scope=paginas&loja_id=${lojaId}`),
  create: (data: { loja_id: string; titulo: string; conteudo?: string }) =>
    request<PaginaData>('/loja-extras?scope=pagina', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { titulo?: string; conteudo?: string; is_active?: boolean }) =>
    request<PaginaData>(`/loja-extras?scope=pagina&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/loja-extras?scope=pagina&id=${id}`, { method: 'DELETE' }),
  getPublic: (lojaId: string, slug: string) =>
    request<PaginaData>(`/loja-extras?scope=pagina-publica&loja_id=${lojaId}&slug=${slug}`),
};

// === Leads API (Newsletter) ===

export interface LeadData {
  _id: string;
  loja_id: string;
  email: string;
  origem: 'POPUP' | 'FOOTER';
  criado_em: string;
  vinculo?: string;
}

export const leadsApi = {
  subscribe: async (lojaId: string, email: string, origem: 'POPUP' | 'FOOTER') => {
    const res = await fetch(`${API_BASE_PUB}/loja-extras?scope=lead-newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loja_id: lojaId, email, origem }),
    });
    if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || 'Erro'); }
    return res.json() as Promise<{ success: boolean }>;
  },
  list: (lojaId: string) =>
    request<LeadData[]>(`/loja-extras?scope=leads&loja_id=${lojaId}`),
  update: (id: string, data: { email: string }) =>
    request<LeadData>(`/loja-extras?scope=lead&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/loja-extras?scope=lead&id=${id}`, { method: 'DELETE' }),
  import: (lojaId: string, emails: string[], origem: 'POPUP' | 'FOOTER') =>
    request<{ success: boolean; inseridos: number }>('/loja-extras?scope=leads-import', {
      method: 'POST', body: JSON.stringify({ loja_id: lojaId, emails, origem }),
    }),
};

// === Cupons Popup API (público) ===

export const cuponsPopupApi = {
  getBulk: (lojaId: string, ids: string[]) =>
    publicRequest<Array<{ _id: string; codigo: string; tipo: string; valor: number }>>(
      `/loja-extras?scope=cupons-popup&loja_id=${lojaId}&ids=${ids.join(',')}`
    ),
};

// ============================================
// 🌐 API Pública (sem autenticação)
// ============================================

const API_BASE_PUB = window.location.hostname.includes('lovable.app')
  ? 'https://pandora-five-amber.vercel.app/api'
  : '/api';

async function publicRequest<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_PUB}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const lojaPublicaApi = {
  getByDomain: (hostname: string) =>
    publicRequest<Loja>(`/lojas?scope=public&domain=${encodeURIComponent(hostname)}`),
  getProducts: (lojaId: string) =>
    publicRequest<LojaProduct[]>(`/products?scope=loja-publica&loja_id=${lojaId}`),
  getProduct: (lojaId: string, productSlug: string) =>
    publicRequest<LojaProduct>(`/products?scope=produto-publico&loja_id=${lojaId}&slug=${productSlug}`),
  getFretes: (lojaId: string) =>
    publicRequest<RegraFrete[]>(`/loja-extras?scope=fretes-publico&loja_id=${lojaId}`),
  getCategorias: (lojaId: string) =>
    publicRequest<LojaCategory[]>(`/loja-extras?scope=categorias-publico&loja_id=${lojaId}`),
  getPagina: (lojaId: string, slug: string) =>
    publicRequest<PaginaData>(`/loja-extras?scope=pagina-publica&loja_id=${lojaId}&slug=${slug}`),
};

// === Platform API (público) ===
export const platformApi = {
  getDomain: () => publicRequest<{ domain: string }>('/loja-extras?scope=global-domain'),
};

// === Relatórios API ===

export interface RelatorioData {
  status?: 'async_report';
  docCount?: number;
  intervalDays?: number;
  vendas_por_dia: Array<{ _id: string; count: number; total: number }>;
  vendas_por_produto: Array<{ nome: string; quantidade: number; receita: number }>;
  totais: { pedidos: number; receita: number };
}

export const relatoriosApi = {
  get: (lojaId: string, dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams({ scope: 'relatorios', loja_id: lojaId });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    return request<RelatorioData>(`/pedidos?${params.toString()}`);
  },
};

// === Notificações API ===

export interface NotificacaoData {
  _id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  tipo: 'sistema' | 'aviso' | 'seguranca';
  criado_em: string;
}

export const notificacoesApi = {
  list: async () => {
    const res = await request<any>('/lojista?action=notificacoes');
    return Array.isArray(res) ? res : (res?.notificacoes || res?.data || []);
  },
  marcarLida: (id: string) => request<{ success: boolean }>(`/lojista?action=notificacao-lida&id=${id}`, { method: 'PATCH' }),
  marcarTodasLidas: () => request<{ success: boolean }>('/lojista?action=notificacoes-todas-lidas', { method: 'PATCH' }),
};

// === Admin API (autenticado como admin) ===

function adminRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };
  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async res => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  });
}

export const adminApi = {
  broadcast: (titulo: string, mensagem: string) =>
    adminRequest<{ success: boolean; count: number }>('/admins?scope=broadcast', {
      method: 'POST', body: JSON.stringify({ titulo, mensagem }),
    }),
  listBroadcasts: () =>
    adminRequest<NotificacaoData[]>('/admins?scope=broadcasts'),
  listTickets: () =>
    adminRequest<any[]>('/admins?scope=tickets'),
  resolveTicket: (id: string) =>
    adminRequest<{ success: boolean }>(`/admins?scope=ticket&id=${id}`, { method: 'PATCH' }),
};
