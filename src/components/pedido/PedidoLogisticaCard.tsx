import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Truck, Send, Printer, XCircle, Copy, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import type { Pedido } from '@/services/saas-api';

const TRANSPORTADORAS = ['Correios', 'Jadlog', 'Loggi', 'Total Express', 'Azul Cargo', 'Outra'] as const;

function getTrackingUrl(transportadora: string, codigo: string, customUrl?: string): string | null {
  const map: Record<string, string> = {
    'Correios': `https://rastreamento.correios.com.br/app/index.php?codigo=${codigo}`,
    'Jadlog': `https://www.jadlog.com.br/tracking?cte=${codigo}`,
    'Loggi': `https://www.loggi.com/rastreador/?tracking=${codigo}`,
    'Total Express': `https://tracking.totalexpress.com.br/tracking/0?documento=${codigo}`,
    'Azul Cargo': `https://www.azulcargoexpress.com.br/Rastreio/Rastreio?awb=${codigo}`,
  };
  if (transportadora === 'Outra') return customUrl || null;
  return map[transportadora] || map['Correios'];
}

interface Props {
  pedido: Pedido;
  rastreioInput: string;
  onRastreioChange: (v: string) => void;
  transportadoraInput: string;
  onTransportadoraChange: (v: string) => void;
  rastreioUrlInput: string;
  onRastreioUrlChange: (v: string) => void;
  onSaveRastreio: () => void;
  rastreioLoading: boolean;
  isMEActive: boolean;
  onGerarEtiqueta: () => void;
  onCancelarEtiqueta: () => void;
  gerarLoading: boolean;
  cancelarLoading: boolean;
  onSyncAppmax?: () => void;
  syncAppmaxLoading?: boolean;
}

export default function PedidoLogisticaCard({
  pedido,
  rastreioInput,
  onRastreioChange,
  transportadoraInput,
  onTransportadoraChange,
  rastreioUrlInput,
  onRastreioUrlChange,
  onSaveRastreio,
  rastreioLoading,
  isMEActive,
  onGerarEtiqueta,
  onCancelarEtiqueta,
  gerarLoading,
  cancelarLoading,
  onSyncAppmax,
  syncAppmaxLoading,
}: Props) {
  const trackingUrl = rastreioInput.trim()
    ? getTrackingUrl(transportadoraInput, rastreioInput.trim(), rastreioUrlInput.trim() || undefined)
    : null;

  return (
    <Card className="border border-border rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" /> Logística e Rastreio
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Transportadora */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Transportadora</label>
          <Select value={transportadoraInput} onValueChange={onTransportadoraChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione a transportadora" />
            </SelectTrigger>
            <SelectContent>
              {TRANSPORTADORAS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tracking Code */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Código de Rastreio</label>
          <div className="flex gap-2">
            <Input
              value={rastreioInput}
              onChange={e => onRastreioChange(e.target.value)}
              placeholder="BR123456789XX"
              className="h-9 text-sm font-mono"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    onClick={onSaveRastreio}
                    disabled={rastreioLoading || !rastreioInput.trim()}
                    className="gap-1.5 whitespace-nowrap"
                  >
                    {rastreioLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Salvar e Notificar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Salvar rastreio e enviar email ao cliente</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Custom URL when "Outra" */}
        {transportadoraInput === 'Outra' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">URL de Rastreamento (Opcional)</label>
            <Input
              value={rastreioUrlInput}
              onChange={e => onRastreioUrlChange(e.target.value)}
              placeholder="https://transportadora.com.br/rastreio/..."
              className="h-9 text-sm"
            />
          </div>
        )}

        {/* Tracking link */}
        {trackingUrl && (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Rastrear encomenda
          </a>
        )}

        {/* Melhor Envio Section */}
        {isMEActive && (
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Melhor Envio
            </h5>
            {pedido.melhor_envio_order_id ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => pedido.etiqueta_url && window.open(pedido.etiqueta_url, '_blank')}>
                          <Printer className="h-4 w-4" /> Imprimir
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Abrir PDF da etiqueta</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="gap-1" disabled={cancelarLoading}>
                        <XCircle className="h-4 w-4" /> Cancelar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar etiqueta?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação cancelará a etiqueta no Melhor Envio. O valor pode ser estornado para sua carteira.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={onCancelarEtiqueta}>Confirmar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                {pedido.codigo_rastreio && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground text-xs">Rastreio ME:</span>
                    <code className="bg-background px-2 py-0.5 rounded text-xs font-mono border border-border">{pedido.codigo_rastreio}</code>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(pedido.codigo_rastreio!); toast.success('Código copiado!'); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copiar código</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            ) : (
              <Button size="sm" className="gap-1" onClick={onGerarEtiqueta} disabled={gerarLoading}>
                {gerarLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                Gerar Etiqueta
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
