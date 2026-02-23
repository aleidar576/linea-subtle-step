import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SegurancaConfirmacao = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Conta Bloqueada por Segurança</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Sua conta foi bloqueada temporariamente por segurança. O suporte foi acionado e entrará em contato em breve.
          </p>
          <p className="text-sm text-muted-foreground">
            Se você não reconhece esta ação, aguarde o contato da nossa equipe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SegurancaConfirmacao;
