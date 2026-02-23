import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/services/api';
import { SaaSLogo } from '@/components/SaaSBrand';

const AdminForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [debugToken, setDebugToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await authApi.forgotPasswordAdmin(email);
      if (data?.success) {
        setSent(true);
        if (data.reset_token) {
          setDebugToken(data.reset_token);
        }
        toast.success('Solicitação enviada!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao solicitar redefinição');
    }
    setIsLoading(false);
  };

  if (sent) {
    return (
      <div className="dark">
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Verifique seu email</h2>
            <p className="text-sm text-slate-400 text-center max-w-xs">
              Se o email estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>

            {debugToken && (
              <div className="w-full rounded-lg bg-muted p-3 mt-2">
                <p className="text-xs text-slate-400 mb-1">🔧 Token de teste:</p>
                <Link
                  to={`/admin/redefinir-senha?token=${debugToken}`}
                  className="text-xs text-primary hover:underline break-all"
                >
                  Clique aqui para redefinir a senha
                </Link>
              </div>
            )}

            <Link to="/admin/login">
              <Button variant="outline" className="mt-2">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    );
  }

  return (
    <div className="dark">
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <SaaSLogo size={0} showName={true} nameClassName="text-2xl text-slate-100 tracking-tight" className="justify-center" iconClassName="hidden" />
          <p className="text-sm text-slate-400">Recuperar senha de administrador</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center text-slate-100">Recuperar Senha</CardTitle>
            <p className="text-sm text-slate-400 text-center">
              Informe o email da sua conta de administrador
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pandora.com"
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar Link de Redefinição
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/admin/login" className="text-sm text-slate-400 hover:text-primary transition-colors">
                <ArrowLeft className="mr-1 h-3 w-3 inline" />
                Voltar ao Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
};

export default AdminForgotPassword;
