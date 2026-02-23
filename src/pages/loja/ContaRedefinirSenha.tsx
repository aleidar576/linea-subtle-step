import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClienteAuth } from '@/hooks/useClienteAuth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Check } from 'lucide-react';

export default function ContaRedefinirSenha() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { redefinirSenha } = useClienteAuth();

  const [form, setForm] = useState({ nova_senha: '', confirmar: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.nova_senha.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }
    if (form.nova_senha !== form.confirmar) { toast.error('Senhas não conferem'); return; }

    setLoading(true);
    try {
      await redefinirSenha(token, form.nova_senha);
      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Token inválido ou expirado');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container py-10 text-center">
        <p className="text-muted-foreground">Link inválido.</p>
        <Link to="/conta/recuperar" className="text-primary hover:underline text-sm mt-2 inline-block">Solicitar novo link</Link>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md space-y-6">
        <Link to="/conta/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>

        {success ? (
          <div className="rounded-xl border border-border p-6 text-center space-y-3">
            <Check className="mx-auto h-10 w-10 text-primary" />
            <p className="text-foreground font-bold">Senha redefinida!</p>
            <Link to="/conta/login" className="text-sm text-primary hover:underline">Ir para login</Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Nova senha</h1>
              <p className="text-sm text-muted-foreground">Defina sua nova senha</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nova senha</Label>
                <Input type="password" value={form.nova_senha} onChange={e => setForm(p => ({ ...p, nova_senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={form.confirmar} onChange={e => setForm(p => ({ ...p, confirmar: e.target.value }))} placeholder="••••••" />
              </div>
              <Button type="submit" className="w-full rounded-full font-bold" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Redefinir senha
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
