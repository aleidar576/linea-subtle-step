import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { CreditCard, QrCode, FileText, Copy, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Pedido } from '@/services/saas-api';

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  pedido: Pedido;
}

export default function PedidoPagamentoCard({ pedido }: Props) {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const pd = pedido.payment_details;
  const pg = pedido.pagamento;
  const method = pd?.method || pg?.metodo || 'pix';

  const MethodIcon = method === 'credit_card' ? CreditCard : method === 'boleto' ? FileText : QrCode;
  const methodLabel = method === 'credit_card' ? 'Cartão de Crédito' : method === 'boleto' ? 'Boleto Bancário' : 'PIX';

  return (
    <Card className="border border-border rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MethodIcon className="h-4 w-4 text-muted-foreground" /> Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Credit Card Details */}
        {method === 'credit_card' && (
          <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
            <div className="h-10 w-10 rounded-lg bg-background border border-border flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {pd?.card_brand ? capitalize(pd.card_brand) : 'Cartão'}{' '}
                {pd?.last4 && <span className="text-muted-foreground">final {pd.last4}</span>}
              </p>
              {(pd?.installments || 1) > 1 && pedido.total > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {pd!.installments}x de {formatPrice(Math.round((pd?.total_with_interest || pedido.total) / pd!.installments))}
                  {pd?.total_with_interest && pd.total_with_interest > pedido.total && (
                    <span className="ml-1">(total {formatPrice(pd.total_with_interest)})</span>
                  )}
                </p>
              )}
              {(pd?.installments || 1) === 1 && (
                <p className="text-xs text-muted-foreground mt-0.5">À vista</p>
              )}
            </div>
          </div>
        )}

        {/* PIX Details */}
        {method === 'pix' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <div className="h-10 w-10 rounded-lg bg-background border border-border flex items-center justify-center">
                <QrCode className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{methodLabel}</p>
                {pg?.pago_em && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pago em {new Date(pg.pago_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
            {pg?.txid && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">TXID</label>
                <div className="flex gap-1.5">
                  <Input value={pg.txid} readOnly className="text-xs font-mono h-8" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(pg.txid!, 'TXID')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar TXID</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
            {pg?.pix_code && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Código PIX</label>
                <div className="flex gap-1.5">
                  <Input value={pg.pix_code} readOnly className="text-xs font-mono h-8" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(pg.pix_code!, 'PIX')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar código PIX</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Boleto Details */}
        {method === 'boleto' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
              <div className="h-10 w-10 rounded-lg bg-background border border-border flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{methodLabel}</p>
              </div>
            </div>
            {pg?.digitable_line && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Linha Digitável</label>
                <div className="flex gap-1.5">
                  <Input value={pg.digitable_line} readOnly className="text-xs font-mono h-8" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(pg.digitable_line!, 'Linha digitável')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copiar linha digitável</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
            {pg?.pdf_url && (
              <Button
                variant="outline"
                className="w-full gap-2 h-8 text-xs"
                onClick={() => window.open(pg.pdf_url!, '_blank')}
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
