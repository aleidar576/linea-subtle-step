import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import type { Pedido } from '@/services/saas-api';

function formatPrice(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

interface Props {
  pedido: Pedido;
}

export default function PedidoItensCard({ pedido }: Props) {
  return (
    <Card className="border border-border rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" /> Itens do Pedido ({pedido.itens.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {pedido.itens.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-muted/50 rounded-lg p-2.5">
              {item.image && (
                <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover flex-shrink-0 border border-border" />
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
      </CardContent>
    </Card>
  );
}
