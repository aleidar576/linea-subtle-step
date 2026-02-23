import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClienteAuth } from '@/hooks/useClienteAuth';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ContaRecuperarSenha() {
  const { recuperarSenha } = useClienteAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await recuperarSenha(email);
      setSent(true);
      toast.success('Se o e-mail existir, enviaremos um link de recuperação');
    } catch {
      toast.error('Erro ao enviar e-mail');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md space-y-6">
        <Link to="/conta/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao login
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground">Informe seu e-mail para receber o link de recuperação</p>
        </div>

        {sent ? (
          <div className="rounded-xl border border-border p-6 text-center space-y-3">
            <p className="text-foreground font-medium">📧 E-mail enviado!</p>
            <p className="text-sm text-muted-foreground">Verifique sua caixa de entrada e spam.</p>
            <Link to="/conta/login" className="text-sm text-primary hover:underline">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <Button type="submit" className="w-full rounded-full font-bold" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Enviar link
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
