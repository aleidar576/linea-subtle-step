import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Loader2, Eye, EyeOff, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/services/api';
import { SaaSLogo } from '@/components/SaaSBrand';

const AdminSetup = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; is_master: boolean } | null>(null);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await authApi.setup(email, password);
      if (data?.success) {
        setResult(data);
        if (data.is_master) {
          toast.success('Conta Mestre criada!');
          const { error } = await signIn(email, password);
          if (!error) {
            setTimeout(() => navigate('/admin'), 1000);
          }
        } else {
          toast.info(data.message);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar admin');
    }
    setIsLoading(false);
  };

  if (result && !result.is_master) {
    return (
      <div className="dark">
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Aguardando Aprovação</h2>
            <p className="text-sm text-slate-400 text-center max-w-xs">
              Sua conta foi criada com sucesso. O administrador principal precisa aprovar seu acesso antes que você possa fazer login.
            </p>
            <Link to="/admin/login">
              <Button variant="outline" className="mt-2">Voltar ao Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    );
  }

  if (result && result.is_master) {
    return (
      <div className="dark">
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Conta Mestre Criada!</h2>
            <p className="text-sm text-slate-400 text-center">
              Redirecionando para o painel...
            </p>
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
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <SaaSLogo size={0} showName={true} nameClassName="text-2xl text-slate-100 tracking-tight" className="justify-center" iconClassName="hidden" />
          <p className="text-sm text-slate-400">Criar conta de Administrador</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center text-slate-100">Novo Administrador</CardTitle>
            <p className="text-sm text-slate-400 text-center">
              Se for o primeiro acesso, sua conta será ativada automaticamente como Mestre.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar Conta Admin
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/admin/login" className="text-sm text-primary hover:underline">
                Já tenho conta → Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
};

export default AdminSetup;
