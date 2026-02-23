import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClienteAuth } from '@/hooks/useClienteAuth';
import { useLoja } from '@/contexts/LojaContext';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export default function ContaLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { login } = useClienteAuth();
  const { nomeExibicao, slogan } = useLoja();

  // Dynamic title: Login · {nomeLoja} · {slogan}
  useEffect(() => {
    const parts = ['Login', nomeExibicao];
    if (slogan) parts.push(slogan);
    document.title = parts.join(' · ');
  }, [nomeExibicao, slogan]);

  const [form, setForm] = useState({ email: '', senha: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
      setErrors(fe);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await login(form.email, form.senha);
      toast.success('Login realizado com sucesso!');
      navigate(redirect);
    } catch (err: any) {
      if (err.email_nao_verificado) {
        toast.error('Email não verificado. Redirecionando...');
        navigate(`/conta/verificar?pending=1&email=${encodeURIComponent(err.email || form.email)}`);
        return;
      }
      toast.error(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar à loja
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Entrar na minha conta</h1>
          <p className="text-sm text-muted-foreground">Acesse sua conta para acompanhar seus pedidos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>E-mail</Label>
            <Input name="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="seu@email.com" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label>Senha</Label>
            <Input name="senha" type="password" value={form.senha} onChange={e => setForm(p => ({ ...p, senha: e.target.value }))} placeholder="••••••" />
            {errors.senha && <p className="text-xs text-destructive mt-1">{errors.senha}</p>}
          </div>

          <Button type="submit" className="w-full rounded-full font-bold" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Entrar
          </Button>
        </form>

        <div className="text-center space-y-2">
          <Link to="/conta/recuperar" className="text-sm text-primary hover:underline">Esqueci minha senha</Link>
          <p className="text-sm text-muted-foreground">
            Não tem conta? <Link to={`/conta/registro?redirect=${encodeURIComponent(redirect)}`} className="text-primary hover:underline font-medium">Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
