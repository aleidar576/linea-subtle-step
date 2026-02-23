import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificacoesApi } from '@/services/saas-api';

export interface Notificacao {
  _id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  tipo: 'sistema' | 'aviso' | 'seguranca';
  criado_em: string;
}

export function useNotificacoes() {
  return useQuery<Notificacao[]>({
    queryKey: ['notificacoes'],
    queryFn: notificacoesApi.list,
    refetchInterval: 60000,
    enabled: !!localStorage.getItem('lojista_token'),
    retry: false,
    placeholderData: [],
  });
}

export function useMarcarLida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificacoesApi.marcarLida(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });
}

export function useMarcarTodasLidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificacoesApi.marcarTodasLidas(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });
}
