import { useState, useEffect, useCallback } from 'react';
import { useLoja } from '@/contexts/LojaContext';

const API_BASE = window.location.hostname.includes('lovable.app')
  ? 'https://pandora-five-amber.vercel.app/api'
  : '/api';

interface ClienteEndereco {
  _id: string;
  apelido: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  padrao: boolean;
}

interface ClienteProfile {
  _id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  data_nascimento: string;
  enderecos: ClienteEndereco[];
  total_pedidos: number;
  total_gasto: number;
}

async function clienteRequest<T>(path: string, token: string | null, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || 'Erro na requisição');
  return body;
}

export function useClienteAuth() {
  const { lojaId } = useLoja();
  const storageKey = `cliente_token_${lojaId}`;
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storageKey));
  const [cliente, setCliente] = useState<ClienteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(!!token);

  const isLoggedIn = !!token && !!cliente;
  const enderecoPadrao = cliente?.enderecos?.find(e => e.padrao) || cliente?.enderecos?.[0] || null;

  // Fetch profile on mount if token exists
  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    clienteRequest<{ cliente: ClienteProfile }>('/cliente-auth?scope=perfil', token)
      .then(r => setCliente(r.cliente))
      .catch(() => { localStorage.removeItem(storageKey); setToken(null); })
      .finally(() => setIsLoading(false));
  }, [token, storageKey]);

  const login = useCallback(async (email: string, senha: string) => {
    const res = await fetch(`${API_BASE}/cliente-auth?scope=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loja_id: lojaId, email, senha }),
    });
    const body = await res.json();
    if (!res.ok) {
      const err: any = new Error(body.error || 'Erro ao fazer login');
      if (body.email_nao_verificado) {
        err.email_nao_verificado = true;
        err.email = body.email;
      }
      throw err;
    }
    localStorage.setItem(storageKey, body.token);
    setToken(body.token);
    setCliente(body.cliente);
    return body;
  }, [lojaId, storageKey]);

  const registro = useCallback(async (data: {
    nome: string; email: string; senha: string; telefone: string; cpf: string;
    endereco?: { apelido: string; cep: string; rua: string; numero: string; complemento: string; bairro: string; cidade: string; estado: string };
  }) => {
    const r = await clienteRequest<{ pending_verification?: boolean; email?: string; token?: string; cliente?: ClienteProfile }>(
      '/cliente-auth?scope=registro', null,
      { method: 'POST', body: JSON.stringify({ ...data, loja_id: lojaId }) }
    );
    if (r.pending_verification) {
      return r; // Don't auto-login, caller handles redirect
    }
    if (r.token) {
      localStorage.setItem(storageKey, r.token);
      setToken(r.token);
      setCliente(r.cliente!);
    }
    return r;
  }, [lojaId, storageKey]);

  const logout = useCallback(() => {
    localStorage.removeItem(storageKey);
    setToken(null);
    setCliente(null);
  }, [storageKey]);

  const refreshPerfil = useCallback(async () => {
    if (!token) return;
    const r = await clienteRequest<{ cliente: ClienteProfile }>('/cliente-auth?scope=perfil', token);
    setCliente(r.cliente);
  }, [token]);

  const atualizarPerfil = useCallback(async (data: { nome?: string; telefone?: string; cpf?: string; data_nascimento?: string }) => {
    const r = await clienteRequest<{ cliente: ClienteProfile }>(
      '/cliente-auth?scope=atualizar-perfil', token,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    setCliente(r.cliente);
    return r.cliente;
  }, [token]);

  const alterarSenha = useCallback(async (senha_atual: string, nova_senha: string) => {
    await clienteRequest('/cliente-auth?scope=alterar-senha', token, {
      method: 'PUT', body: JSON.stringify({ senha_atual, nova_senha }),
    });
  }, [token]);

  const recuperarSenha = useCallback(async (email: string) => {
    await clienteRequest('/cliente-auth?scope=recuperar-senha', null, {
      method: 'POST', body: JSON.stringify({ loja_id: lojaId, email }),
    });
  }, [lojaId]);

  const redefinirSenha = useCallback(async (resetToken: string, nova_senha: string) => {
    await clienteRequest('/cliente-auth?scope=redefinir-senha', null, {
      method: 'POST', body: JSON.stringify({ token: resetToken, nova_senha }),
    });
  }, []);

  // Address management
  const adicionarEndereco = useCallback(async (data: Omit<ClienteEndereco, '_id'>) => {
    const r = await clienteRequest<{ enderecos: ClienteEndereco[] }>(
      '/cliente-auth?scope=endereco', token,
      { method: 'POST', body: JSON.stringify(data) }
    );
    setCliente(prev => prev ? { ...prev, enderecos: r.enderecos } : prev);
  }, [token]);

  const editarEndereco = useCallback(async (id: string, data: Partial<ClienteEndereco>) => {
    const r = await clienteRequest<{ enderecos: ClienteEndereco[] }>(
      `/cliente-auth?scope=endereco&id=${id}`, token,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    setCliente(prev => prev ? { ...prev, enderecos: r.enderecos } : prev);
  }, [token]);

  const removerEndereco = useCallback(async (id: string) => {
    const r = await clienteRequest<{ enderecos: ClienteEndereco[] }>(
      `/cliente-auth?scope=endereco&id=${id}`, token,
      { method: 'DELETE' }
    );
    setCliente(prev => prev ? { ...prev, enderecos: r.enderecos } : prev);
  }, [token]);

  const definirPadrao = useCallback(async (id: string) => {
    const r = await clienteRequest<{ enderecos: ClienteEndereco[] }>(
      `/cliente-auth?scope=endereco-padrao&id=${id}`, token,
      { method: 'PATCH' }
    );
    setCliente(prev => prev ? { ...prev, enderecos: r.enderecos } : prev);
  }, [token]);

  const meusPedidos = useCallback(async () => {
    const r = await clienteRequest<{ pedidos: any[] }>('/cliente-auth?scope=meus-pedidos', token);
    return r.pedidos;
  }, [token]);

  const verificarEmailCliente = useCallback(async (verifyToken: string) => {
    await clienteRequest('/cliente-auth?scope=verificar-email', null, {
      method: 'POST', body: JSON.stringify({ token: verifyToken }),
    });
  }, []);

  const reenviarVerificacaoCliente = useCallback(async (email: string) => {
    await clienteRequest('/cliente-auth?scope=reenviar-verificacao', null, {
      method: 'POST', body: JSON.stringify({ loja_id: lojaId, email }),
    });
  }, [lojaId]);

  return {
    cliente, isLoggedIn, isLoading, enderecoPadrao, token,
    login, registro, logout, refreshPerfil,
    atualizarPerfil, alterarSenha, recuperarSenha, redefinirSenha,
    adicionarEndereco, editarEndereco, removerEndereco, definirPadrao,
    meusPedidos, verificarEmailCliente, reenviarVerificacaoCliente,
  };
}

export type { ClienteProfile, ClienteEndereco };
