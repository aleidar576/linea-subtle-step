import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Package, Truck, Printer, XCircle, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Pedido } from '@/services/saas-api';

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

interface Props {
  pedido: Pedido;
  isMEActive: boolean;
  onGerarEtiqueta: () => void;
  onCancelarEtiqueta: () => void;
  gerarLoading: boolean;
  cancelarLoading: boolean;
}

export default function PedidoItensCard({ pedido, isMEActive, onGerarEtiqueta, onCancelarEtiqueta, gerarLoading, cancelarLoading }: Props) {
  return (
    <Card className="bg-secondary/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4" /> Itens do Pedido
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="space-y-2">
          {pedido.itens.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-background/50 rounded-lg p-2.5">
              {item.image && (
                <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                {item.variacao && <p className="text-xs text-muted-foreground mt-0.5">{item.variacao}</p>}
                <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold whitespace-nowrap">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>

        {/* Melhor Envio Section */}
        {isMEActive && (
          <>
            <Separator className="my-2" />
            <div className="bg-background/40 border border-border/50 rounded-lg p-4">
              <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Truck className="h-4 w-4" /> Logística — Melhor Envio
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
                        <TooltipContent>Abrir PDF da etiqueta para impressão</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="destructive" className="gap-1" disabled={cancelarLoading}>
                                <XCircle className="h-4 w-4" /> Cancelar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancelar etiqueta e estornar valor</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
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
                      <span className="text-muted-foreground">Rastreio ME:</span>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{pedido.codigo_rastreio}</code>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(pedido.codigo_rastreio!); toast.success('Código copiado!'); }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copiar código de rastreio</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" className="gap-1" onClick={onGerarEtiqueta} disabled={gerarLoading}>
                        {gerarLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                        Gerar Etiqueta
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Gerar etiqueta de envio via Melhor Envio</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
