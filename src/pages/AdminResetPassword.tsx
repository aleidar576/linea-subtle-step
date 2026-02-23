import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Loader2, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/services/api';
import { SaaSLogo } from '@/components/SaaSBrand';

const AdminResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="dark">
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <h2 className="text-xl font-bold text-destructive">Token inválido</h2>
            <p className="text-sm text-slate-400 text-center">
              O link de redefinição é inválido ou expirou.
            </p>
            <Link to="/admin/recuperar-senha">
              <Button variant="outline">Solicitar novo link</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authApi.resetPasswordAdmin(token, password);
      if (data?.success) {
        setSuccess(true);
        toast.success('Senha redefinida com sucesso!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao redefinir senha');
    }
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="dark">
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Senha Redefinida!</h2>
            <p className="text-sm text-slate-400 text-center">
              Sua senha foi atualizada. Faça login com a nova senha.
            </p>
            <Link to="/admin/login">
              <Button className="mt-2">Ir para Login</Button>
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
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <SaaSLogo size={0} showName={true} nameClassName="text-2xl text-slate-100 tracking-tight" className="justify-center" iconClassName="hidden" />
          <p className="text-sm text-slate-400">Definir nova senha</p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center text-slate-100">Nova Senha</CardTitle>
            <p className="text-sm text-slate-400 text-center">
              Digite e confirme sua nova senha
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Nova Senha</Label>
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
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-slate-200">Confirmar Senha</Label>
                <Input
                  id="confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Redefinir Senha
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

export default AdminResetPassword;
