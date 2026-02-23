import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { lojistaAuthApi } from '@/services/saas-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SaaSLogo } from '@/components/SaaSBrand';

const RedefinirSenha = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [reset, setReset] = useState(false);
  const { toast } = useToast();

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await lojistaAuthApi.redefinirSenha(email);
      setSent(true);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRedefinir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha !== confirmSenha) {
      toast({ title: 'Erro', description: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await lojistaAuthApi.novaSenha(token!, novaSenha);
      setReset(true);
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
            <SaaSLogo size={40} iconClassName="bg-primary" nameClassName="text-slate-100 text-2xl" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-100">{token ? 'Nova Senha' : 'Redefinir Senha'}</h1>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {reset ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
              <p className="font-semibold text-slate-100">Senha redefinida com sucesso!</p>
              <Button asChild><Link to="/login">Fazer Login</Link></Button>
            </div>
          ) : sent ? (
            <div className="text-center space-y-4">
              <p className="text-slate-400">Se o email existir, enviaremos um link de redefinição.</p>
              <Button variant="outline" asChild><Link to="/login">Voltar ao Login</Link></Button>
            </div>
          ) : token ? (
            <form onSubmit={handleRedefinir} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-slate-200">Nova Senha</label>
                <Input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-slate-200">Confirmar Senha</label>
                <Input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} placeholder="Repita a senha" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Redefinir Senha
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSolicitar} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-slate-200">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Enviar Link
              </Button>
              <p className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">Voltar ao Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default RedefinirSenha;
