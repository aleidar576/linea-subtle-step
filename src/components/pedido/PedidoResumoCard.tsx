import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DollarSign, Copy, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Pedido } from '@/services/saas-api';

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

interface Props {
  pedido: Pedido;
}

export default function PedidoResumoCard({ pedido }: Props) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <Card className="bg-secondary/50 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Resumo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(pedido.subtotal)}</span>
          </div>
          {pedido.desconto > 0 && (
            <div className="flex justify-between text-primary">
              <span>Desconto</span>
              <span>-{formatPrice(pedido.desconto)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frete{pedido.frete_nome ? ` (${pedido.frete_nome})` : ''}</span>
            <span>{pedido.frete === 0 ? 'Grátis' : formatPrice(pedido.frete)}</span>
          </div>
          {pedido.cupom && (
            <div className="flex justify-between text-primary">
              <span>Cupom: {pedido.cupom.codigo}</span>
              <span>-{formatPrice(pedido.cupom.valor)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-border/50 pt-2 mt-2">
            <span>Total</span>
            <span>{formatPrice(pedido.total)}</span>
          </div>
        </div>

        {/* PIX / TXID */}
        {(pedido.pagamento?.pix_code || pedido.pagamento?.txid) && (
          <div className="bg-background/40 border border-border/50 rounded-lg p-3 space-y-3">
            {pedido.pagamento.pix_code && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Código PIX</label>
                <div className="flex gap-1.5">
                  <Input value={pedido.pagamento.pix_code} readOnly className="text-xs font-mono h-8" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(pedido.pagamento.pix_code!, 'PIX')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar código PIX</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
            {pedido.pagamento.txid && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">TXID</label>
                <div className="flex gap-1.5">
                  <Input value={pedido.pagamento.txid} readOnly className="text-xs font-mono h-8" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(pedido.pagamento.txid!, 'TXID')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar TXID</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BOLETO */}
        {pedido.pagamento?.metodo === 'boleto' && (pedido.pagamento?.digitable_line || pedido.pagamento?.pdf_url) && (
          <div className="bg-background/40 border border-border/50 rounded-lg p-3 space-y-3">
            {pedido.pagamento.digitable_line && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Linha Digitável</label>
                <div className="flex gap-1.5">
                  <Input value={pedido.pagamento.digitable_line} readOnly className="text-xs font-mono h-8" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(pedido.pagamento.digitable_line!, 'Linha digitável')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar linha digitável</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
            {pedido.pagamento.pdf_url && (
              <Button
                variant="outline"
                className="w-full gap-2 h-8 text-xs"
                onClick={() => window.open(pedido.pagamento.pdf_url, '_blank')}
              >
                <FileDown className="h-3.5 w-3.5" />
                Baixar Boleto (PDF)
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
