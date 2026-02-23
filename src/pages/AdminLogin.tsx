import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { SaaSLogo, useSaaSBrand, useFaviconUpdater } from '@/components/SaaSBrand';

const AdminLogin = () => {
  const { signIn, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { authSubtitle, brandName } = useSaaSBrand();
  useFaviconUpdater();

  useEffect(() => {
    document.title = `Acesso Admin · ${brandName}`;
  }, [brandName]);

  if (!loading && isAdmin) {
    navigate('/admin');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Login realizado!');
      setTimeout(() => navigate('/admin'), 500);
    }
    setIsLoading(false);
  };

  return (
    <div className="dark">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4 justify-center">
              <SaaSLogo context="login" theme="dark" nameClassName="text-foreground text-2xl" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Acesso Administrativo</h1>
            <p className="text-muted-foreground mt-1">{authSubtitle}</p>
          </div>

          <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">E-mail</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pandora.com"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block text-foreground">Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>
            <div className="text-center text-sm space-y-2">
              <Link to="/admin/recuperar-senha" className="text-primary hover:underline block">Esqueceu a senha?</Link>
              <p className="text-muted-foreground">
                Primeiro acesso?{' '}
                <Link to="/admin/setup" className="text-primary hover:underline">Criar conta admin</Link>
              </p>
            </div>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Área restrita a administradores do sistema
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
