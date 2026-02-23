import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lojistaAuthApi } from '@/services/saas-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SaaSLogo, useSaaSBrand, useFaviconUpdater } from '@/components/SaaSBrand';

const LojistaRegistro = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termos, setTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authSubtitle, brandName } = useSaaSBrand();
  useFaviconUpdater();

  useEffect(() => {
    document.title = `Criar Conta · ${brandName}`;
  }, [brandName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    if (!termos) {
      toast({ title: 'Erro', description: 'Aceite os termos de uso', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await lojistaAuthApi.registro({ nome, email, password, termos_aceitos: true });
      toast({ title: 'Conta criada!', description: res.message });
      navigate('/verificar-email?pending=true');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark">
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 justify-center">
            <SaaSLogo context="home" theme="dark" nameClassName="text-foreground text-2xl" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Criar conta</h1>
          <p className="text-muted-foreground mt-1">{authSubtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block text-foreground">Nome</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-foreground">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-foreground">Senha</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block text-foreground">Confirmar Senha</label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" required />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="termos" checked={termos} onCheckedChange={(v) => setTermos(v === true)} />
            <label htmlFor="termos" className="text-sm text-muted-foreground">
              Aceito os <span className="text-primary cursor-pointer hover:underline">termos de uso</span>
            </label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar Conta
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
    </div>
  );
};

export default LojistaRegistro;
