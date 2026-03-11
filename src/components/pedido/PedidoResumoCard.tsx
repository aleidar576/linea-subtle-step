import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import type { Pedido } from '@/services/saas-api';

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

interface Props {
  pedido: Pedido;
}

export default function PedidoResumoCard({ pedido }: Props) {
  return (
    <Card className="border border-border rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" /> Resumo Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
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
          <div className="flex justify-between font-bold text-base border-t border-border pt-2 mt-2">
            <span>Total</span>
            <span>{formatPrice(pedido.total)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
