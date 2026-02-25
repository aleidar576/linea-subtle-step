// ============================================
// 🔗 API Service Layer
// ============================================

const API_BASE = window.location.hostname.includes('lovable.app')
  ? 'https://pandora-five-amber.vercel.app/api'
  : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// === INTERFACES ===

export interface APIProduct {
  _id?: string;
  product_id: string;
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
  colors?: Array<{ name: string; hex: string; images: string[] }> | null;
  reviews?: Array<{
    name: string;
    avatar?: string;
    avatarEmoji?: string;
    text: string;
    rating: number;
    date: string;
    productImage?: string;
    productImages?: string[];
  }> | null;
  social_proof_gender?: string | null;
  sort_order: number;
  is_active: boolean;
  rating: number;
  rating_count: string;
}

export interface APISetting {
  key: string;
  value: string;
}

export interface APITrackingPixel {
  _id?: string;
  platform: 'facebook' | 'tiktok';
  pixel_id: string;
  access_token: string;
  is_active: boolean;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string; role: string };
}

export interface AdminUser {
  _id: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
  createdAt: number;
}

export interface AdminLojista {
  _id: string;
  email: string;
  nome: string;
  telefone: string;
  plano: string;
  bloqueado: boolean;
  email_verificado: boolean;
  verificacao_ignorada: boolean;
  modo_amigo: boolean;
  liberar_visualizacao_subdominio: boolean;
  tolerancia_extra_dias: number;
  data_vencimento: string | null;
  criado_em: string;
  qtd_lojas: number;
  acesso_bloqueado: boolean;
  subscription_status?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  plano_id?: string | null;
  cpf_cnpj?: string;
}

export interface AdminStats {
  totalLojistas: number;
  lojistasAtivos: number;
  lojistasBloqueados: number;
  totalLojas: number;
  lojasAtivas: number;
  cadastrosPorMes: Array<{ _id: string; count: number }>;
}

// === APIs ===

export const productsApi = {
  list: () => request<APIProduct[]>('/products'),
  listAll: () => request<APIProduct[]>('/products?scope=all'),
  getBySlug: (slug: string) => request<APIProduct | null>(`/products?slug=${slug}`),
  getById: (id: string) => request<APIProduct>(`/products?id=${id}`),
  create: (data: Omit<APIProduct, '_id'>) => request<APIProduct>('/products', {
    method: 'POST', body: JSON.stringify(data),
  }),
  update: (id: string, data: Partial<APIProduct>) => request<APIProduct>(`/products?id=${id}`, {
    method: 'PUT', body: JSON.stringify(data),
  }),
  delete: (id: string) => request<void>(`/products?id=${id}`, { method: 'DELETE' }),
  toggleActive: (id: string, is_active: boolean) => request<void>(`/products?id=${id}`, {
    method: 'PATCH', body: JSON.stringify({ is_active }),
  }),
};

export const settingsApi = {
  list: () => request<APISetting[]>('/settings'),
  getByKeys: (keys: string[]) => request<APISetting[]>(`/settings?keys=${keys.join(',')}`),
  upsert: (settings: APISetting[]) => request<void>('/settings', {
    method: 'PUT', body: JSON.stringify({ settings }),
  }),
  testMessage: (destinatario: string, mensagem: string) =>
    request<{ success: boolean; message: string }>('/settings?action=test_message', {
      method: 'POST', body: JSON.stringify({ destinatario, mensagem }),
    }),
  adminUpload: (imageBase64: string) =>
    request<{ url: string }>('/settings?action=admin-upload', {
      method: 'POST', body: JSON.stringify({ image_base64: imageBase64 }),
    }),
  testBunny: () => request<{ success: boolean; message: string }>('/settings?action=test_bunny', { method: 'POST' }),
};

export const trackingPixelsApi = {
  list: () => request<APITrackingPixel[]>('/settings?scope=pixels'),
  listActive: () => request<APITrackingPixel[]>('/settings?scope=pixels&active=true'),
  create: (data: Omit<APITrackingPixel, '_id' | 'created_at'>) =>
    request<APITrackingPixel>('/settings?scope=pixels', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<APITrackingPixel>) =>
    request<APITrackingPixel>(`/settings?scope=pixels&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/settings?scope=pixels&id=${id}`, { method: 'DELETE' }),
  toggleActive: (id: string, is_active: boolean) =>
    request<void>(`/settings?scope=pixels&id=${id}`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
};

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth-action?action=login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  setup: (email: string, password: string) =>
    request<{ success: boolean; message: string; is_master: boolean }>('/auth-action?action=setup', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: { id: string; email: string; role: string } | null }>('/auth-action?action=me'),
  logout: () => { localStorage.removeItem('auth_token'); return Promise.resolve(); },
  forgotPasswordAdmin: (email: string) =>
    request<{ success: boolean; message: string; reset_url?: string; reset_token?: string }>('/auth-action?action=forgot-password-admin', {
      method: 'POST', body: JSON.stringify({ email }),
    }),
  resetPasswordAdmin: (token: string, nova_senha: string) =>
    request<{ success: boolean; message: string }>('/auth-action?action=reset-password-admin', {
      method: 'POST', body: JSON.stringify({ token, nova_senha }),
    }),
};

export const adminsApi = {
  list: () => request<AdminUser[]>('/admins'),
  approve: (id: string) => request<{ success: boolean }>(`/admins?id=${id}`, { method: 'PATCH' }),
  remove: (id: string) => request<{ success: boolean }>(`/admins?id=${id}`, { method: 'DELETE' }),
  // Gestão de lojistas
  listLojistas: () => request<AdminLojista[]>('/admins?scope=lojistas'),
  toggleBloqueio: (id: string) => request<{ success: boolean; bloqueado: boolean }>(`/admins?scope=lojistas&id=${id}&action=bloquear`, { method: 'PATCH' }),
  toggleBloqueioAcesso: (id: string) => request<{ success: boolean; acesso_bloqueado: boolean }>(`/admins?scope=lojistas&id=${id}&action=bloquear-acesso`, { method: 'PATCH' }),
  alterarPlano: (id: string, plano: string) => request<{ success: boolean }>(`/admins?scope=lojistas&id=${id}&action=plano&plano=${plano}`, { method: 'PATCH' }),
  // Estatísticas
  getStats: () => request<AdminStats>('/admins?scope=stats'),
  // Tolerância individual
  updateTolerancia: (id: string, data: { modo_amigo?: boolean; tolerancia_extra_dias?: number }) =>
    request<{ success: boolean }>(`/admins?scope=lojistas&id=${id}&action=tolerancia`, {
      method: 'PATCH', body: JSON.stringify(data),
    }),
  // Impersonation
  impersonate: (id: string) =>
    request<{ token: string }>(`/admins?scope=lojistas&id=${id}&action=impersonate`),
  // Métricas do lojista
  getLojistaMetrics: (id: string) =>
    request<{ totalProdutos: number; totalPedidos: number; totalVendas: number; lojas?: Array<{ slug: string; nome: string }> }>(`/admins?scope=lojistas&id=${id}&action=lojista-metrics`),
  toggleVerSubdominio: (id: string) =>
    request<{ success: boolean; liberar_visualizacao_subdominio: boolean }>(
      `/admins?scope=lojistas&id=${id}&action=toggle-ver-subdominio`,
      { method: 'PATCH' }
    ),
  ignorarVerificacao: (id: string) =>
    request<{ success: boolean }>(`/admins?scope=lojistas&id=${id}&action=ignorar-verificacao`, { method: 'PATCH' }),
  syncDomains: () =>
    request<{ total: number; success: number; failed: number; results: Array<{ slug: string; domain: string; ok: boolean; detail: any }> }>(
      '/lojas?scope=sync-domains', { method: 'POST' }
    ),
  // Planos Admin CRUD
  listPlanos: () => request<any[]>('/settings?scope=planos'),
  createPlano: (data: any) => request<any>('/settings?scope=plano', { method: 'POST', body: JSON.stringify(data) }),
  updatePlano: (id: string, data: any) => request<any>(`/settings?scope=plano&id=${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlano: (id: string) => request<{ success: boolean }>(`/settings?scope=plano&id=${id}`, { method: 'DELETE' }),
  seedPlanos: () => request<{ success: boolean; results: any[] }>('/settings?scope=planos-seed', { method: 'POST' }),
};

export interface CreatePixRequest {
  amount: number;
  description?: string;
  customer: { name: string; email: string; cellphone?: string; taxId?: string };
  tracking?: { utm?: Record<string, string>; src?: string };
  fbp?: string;
  fbc?: string;
  user_agent?: string;
}

export interface PixResponse {
  pix_qr_code: string;
  pix_code: string;
  txid: string;
  error?: string;
}

export const paymentsApi = {
  createPix: (data: CreatePixRequest) =>
    request<PixResponse>('/create-pix', { method: 'POST', body: JSON.stringify(data) }),
  updateSealPayKey: (api_key: string) =>
    request<{ success: boolean }>('/settings?action=update-sealpay-key', {
      method: 'POST', body: JSON.stringify({ api_key }),
    }),
};

export const webhookApi = {
  getLogs: () => request<any[]>('/tracking-webhook'),
  sendTest: (body: any) => request<any>('/tracking-webhook', { method: 'POST', body: JSON.stringify(body) }),
};
