import { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Package, Tag, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import PedidoClienteCard from './PedidoClienteCard';
import PedidoEnderecoCard from './PedidoEnderecoCard';
import PedidoItensCard from './PedidoItensCard';
import PedidoResumoCard from './PedidoResumoCard';

import { usePedido, useAddRastreio, useAddObservacao, useAlterarStatus, useGerarEtiqueta, useCancelarEtiqueta } from '@/hooks/usePedidos';
import { lojaPublicaApi } from '@/services/saas-api';
import type { Pedido, Loja } from '@/services/saas-api';

// === STATUS ===
const STATUS_MAP: Record<string, { label: string; classes: string }> = {
  pendente:   { label: 'Aguardando Pagamento', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  em_analise: { label: 'Em Análise',           classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  pago:       { label: 'Pago',                 classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  recusado:   { label: 'Cancelado / Recusado',  classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  estornado:  { label: 'Reembolsado',           classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400' },
  chargeback: { label: 'Chargeback',            classes: 'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300' },
};

function getStatusBadge(status: string) {
  return STATUS_MAP[status] || { label: status, classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

interface Props {
  pedidoId: string | null;
  loja: Loja | undefined;
  onClose: () => void;
}

// Carrier selection dialog
import { Dialog as CarrierDialog, DialogContent as CarrierDialogContent, DialogHeader as CarrierDialogHeader, DialogTitle as CarrierDialogTitle, DialogFooter as CarrierDialogFooter } from '@/components/ui/dialog';

export default function PedidoDetailModal({ pedidoId, loja, onClose }: Props) {
  const { data: pedido } = usePedido(pedidoId || undefined);

  const addRastreio = useAddRastreio();
  const addObservacao = useAddObservacao();
  const alterarStatus = useAlterarStatus();
  const gerarEtiqueta = useGerarEtiqueta();
  const cancelarEtiqueta = useCancelarEtiqueta();

  const [rastreioInput, setRastreioInput] = useState('');
  const [obsInput, setObsInput] = useState('');
  const obsDebounceRef = useRef<NodeJS.Timeout>();

  // Carrier dialog state
  const [carrierDialogOpen, setCarrierDialogOpen] = useState(false);
  const [carrierOptions, setCarrierOptions] = useState<any[]>([]);
  const [carrierLoading, setCarrierLoading] = useState(false);
  const [selectedCarrierId, setSelectedCarrierId] = useState<string | null>(null);

  useEffect(() => {
    if (pedido) {
      setRastreioInput(pedido.rastreio || '');
      setObsInput(pedido.observacoes_internas || '');
    }
  }, [pedido?._id]);

  const handleObsChange = useCallback((text: string) => {
    setObsInput(text);
    if (obsDebounceRef.current) clearTimeout(obsDebounceRef.current);
    obsDebounceRef.current = setTimeout(() => {
      if (pedidoId) addObservacao.mutate({ id: pedidoId, texto: text });
    }, 1500);
  }, [pedidoId, addObservacao]);

  const handleSaveRastreio = () => {
    if (!pedidoId || !rastreioInput.trim()) return;
    addRastreio.mutate({ id: pedidoId, codigo: rastreioInput.trim() }, {
      onSuccess: () => toast.success('Rastreio salvo e cliente notificado!'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleStatusChange = (newStatus: string) => {
    if (!pedidoId) return;
    alterarStatus.mutate({ id: pedidoId, status: newStatus }, {
      onSuccess: () => toast.success('Status atualizado!'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const isMEActive = !!(loja as any)?.configuracoes?.integracoes?.melhor_envio?.ativo;

  const handleGerarEtiqueta = async () => {
    if (!pedido || !pedidoId) return;
    const freteId = pedido.frete_id;
    if (freteId && !isNaN(Number(freteId))) {
      gerarEtiqueta.mutate({ pedidoId }, {
        onSuccess: (data) => {
          if (data.etiqueta_url) window.open(data.etiqueta_url, '_blank');
          toast.success('Etiqueta gerada!');
        },
        onError: (e: any) => toast.error(e.message),
      });
    } else {
      if (!pedido.endereco?.cep) return toast.error('Pedido sem CEP');
      setCarrierLoading(true);
      setCarrierDialogOpen(true);
      try {
        const cepOrigem = (loja as any)?.configuracoes?.endereco?.cep;
        if (!cepOrigem) { toast.error('CEP de origem não configurado'); setCarrierDialogOpen(false); return; }
        const items = pedido.itens.map(i => ({ id: i.product_id, quantity: i.quantity, price: i.price, weight: 0.3, dimensions: { width: 11, height: 2, length: 16 } }));
        const result = await lojaPublicaApi.calcularFrete({ loja_id: pedido.loja_id, to_postal_code: pedido.endereco.cep, items });
        setCarrierOptions((result?.fretes || []).filter((f: any) => f.id && !isNaN(Number(f.id))));
      } catch (e: any) {
        toast.error(e.message || 'Erro ao buscar transportadoras');
        setCarrierDialogOpen(false);
      } finally {
        setCarrierLoading(false);
      }
    }
  };

  const handleConfirmCarrier = () => {
    if (!pedidoId || !selectedCarrierId) return;
    setCarrierDialogOpen(false);
    gerarEtiqueta.mutate({ pedidoId, overrideServiceId: selectedCarrierId }, {
      onSuccess: (data) => {
        if (data.etiqueta_url) window.open(data.etiqueta_url, '_blank');
        toast.success('Etiqueta gerada!');
        setSelectedCarrierId(null);
        setCarrierOptions([]);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const handleCancelarEtiqueta = () => {
    if (!pedidoId) return;
    cancelarEtiqueta.mutate({ pedidoId }, {
      onSuccess: () => toast.success('Etiqueta cancelada!'),
      onError: (e: any) => toast.error(e.message),
    });
  };

  if (!pedido) return null;

  const statusBadge = getStatusBadge(pedido.status);

  return (
    <>
      <Dialog open={!!pedidoId} onOpenChange={open => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
          {/* Fixed Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/50 flex flex-wrap items-center gap-3">
            <DialogHeader className="flex-1 min-w-0">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" />
                Pedido #{pedido.numero}
              </DialogTitle>
            </DialogHeader>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.classes}`}>
              {statusBadge.label}
            </span>
            <Select value={pedido.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Aguardando Pagamento</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="recusado">Cancelado / Recusado</SelectItem>
                <SelectItem value="estornado">Reembolsado</SelectItem>
                <SelectItem value="chargeback">Chargeback</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{formatDate(pedido.criado_em)}</span>
          </div>

          {/* Scrollable Body */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-3 space-y-6">
                  <PedidoItensCard
                    pedido={pedido}
                    isMEActive={isMEActive}
                    onGerarEtiqueta={handleGerarEtiqueta}
                    onCancelarEtiqueta={handleCancelarEtiqueta}
                    gerarLoading={gerarEtiqueta.isPending}
                    cancelarLoading={cancelarEtiqueta.isPending}
                  />

                  {/* Observações */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Observações Internas</label>
                    <Textarea
                      value={obsInput}
                      onChange={e => handleObsChange(e.target.value)}
                      placeholder="Notas internas sobre este pedido..."
                      rows={3}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Salvo automaticamente</p>
                  </div>

                  {/* UTMs */}
                  {pedido.utms && Object.keys(pedido.utms).length > 0 && (
                    <div className="bg-secondary/50 border border-border/50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Tag className="h-4 w-4" /> UTMs</h4>
                      <div className="text-xs space-y-1 font-mono">
                        {Object.entries(pedido.utms).map(([k, v]) => (
                          <p key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Side Column */}
                <div className="lg:col-span-2 space-y-4">
                  <PedidoClienteCard
                    pedidoId={pedido._id}
                    cliente={pedido.cliente}
                    hasClienteId={!!pedido.cliente_id}
                  />
                  <PedidoEnderecoCard
                    pedidoId={pedido._id}
                    endereco={pedido.endereco}
                    hasClienteId={!!pedido.cliente_id}
                  />
                  <PedidoResumoCard pedido={pedido} />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Fixed Footer */}
          <div className="px-6 py-4 border-t border-border/50 flex flex-wrap items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={rastreioInput}
                onChange={e => setRastreioInput(e.target.value)}
                placeholder="Código de rastreio (BR123456789XX)"
                className="h-9 text-sm max-w-xs"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" onClick={handleSaveRastreio} disabled={addRastreio.isPending || !rastreioInput.trim()} className="gap-1">
                      {addRastreio.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Salvar e Notificar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Salvar rastreio e enviar email ao cliente</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Carrier Selection Dialog */}
      <CarrierDialog open={carrierDialogOpen} onOpenChange={setCarrierDialogOpen}>
        <CarrierDialogContent>
          <CarrierDialogHeader>
            <CarrierDialogTitle>Escolha a Transportadora</CarrierDialogTitle>
          </CarrierDialogHeader>
          {carrierLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : carrierOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhuma transportadora disponível para este CEP.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {carrierOptions.map((opt: any) => (
                <div
                  key={opt.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedCarrierId === String(opt.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                  onClick={() => setSelectedCarrierId(String(opt.id))}
                >
                  <div className="flex items-center gap-3">
                    {opt.picture && <img src={opt.picture} alt={opt.name} className="h-8 w-8 object-contain" />}
                    <div>
                      <p className="text-sm font-medium">{opt.name}</p>
                      <p className="text-xs text-muted-foreground">{opt.delivery_time} dias úteis</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">{formatPrice(opt.price)}</p>
                </div>
              ))}
            </div>
          )}
          <CarrierDialogFooter>
            <Button variant="outline" onClick={() => setCarrierDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmCarrier} disabled={!selectedCarrierId || gerarEtiqueta.isPending}>
              {gerarEtiqueta.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Comprar Etiqueta
            </Button>
          </CarrierDialogFooter>
        </CarrierDialogContent>
      </CarrierDialog>
    </>
  );
}
