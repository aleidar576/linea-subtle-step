import { CheckCircle2, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = {
  free: [
    '1 loja ativa',
    'Produtos ilimitados',
    'Gestão de pedidos',
    'Subdomínio bloqueado',
  ],
  plus: [
    'Até 5 lojas ativas',
    'Produtos ilimitados',
    'Gestão de pedidos',
    'Domínio personalizado',
    'Subdomínio ativo',
    'Suporte prioritário',
  ],
};

const LojaAssinatura = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold mb-2">Escolha seu Plano</h1>
        <p className="text-muted-foreground">Desbloqueie recursos avançados e publique sua loja online.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="text-3xl font-bold">R$ 0<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
          <ul className="space-y-2">
            {features.free.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                {f}
              </li>
            ))}
          </ul>
          <Button variant="outline" className="w-full" disabled>Plano Atual</Button>
        </div>

        {/* Plus */}
        <div className="bg-card border-2 border-primary rounded-xl p-6 space-y-4 relative">
          <div className="absolute -top-3 right-4">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Recomendado</span>
          </div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Plus</h2>
          <p className="text-3xl font-bold">Consultar<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
          <ul className="space-y-2">
            {features.plus.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            className="w-full gap-2"
            onClick={() => window.open('https://wa.me/5500000000000?text=Quero%20ser%20Plus!', '_blank')}
          >
            <Crown className="h-4 w-4" /> Quero ser Plus agora
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LojaAssinatura;
