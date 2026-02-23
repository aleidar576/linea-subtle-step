import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { lojistaAuthApi } from '@/services/saas-api';
import { CheckCircle2, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { SaaSLogo } from '@/components/SaaSBrand';

const VerificarEmail = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const pending = params.get('pending');
  const emailParam = params.get('email') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (pending) {
      setStatus('pending');
      return;
    }
    if (!token) {
      setStatus('error');
      setMessage('Token não fornecido');
      return;
    }

    lojistaAuthApi.verificarEmail(token)
      .then(res => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.message);
      });
  }, [token, pending]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResending(true);
    try {
      await lojistaAuthApi.reenviarVerificacao(resendEmail.trim());
      setResent(true);
      toast({ title: 'Enviado!', description: 'Verifique a sua caixa de entrada e spam.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="dark">
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 justify-center">
          <SaaSLogo size={40} iconClassName="bg-primary" nameClassName="text-slate-100 text-2xl" />
        </Link>

        <div className="bg-card border border-border rounded-xl p-8">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-slate-400">A verificar o seu email...</p>
            </div>
          )}
          {status === 'pending' && (
            <div className="flex flex-col items-center gap-4">
              <Mail className="h-12 w-12 text-primary" />
              <h2 className="text-xl font-bold text-slate-100">Verifique o seu email</h2>
              <p className="text-slate-400">
                Enviámos um link de verificação para o seu email. Clique no link para ativar a sua conta.
              </p>
              <p className="text-sm text-slate-400">
                Não recebeu? Verifique a pasta de spam ou reenvie abaixo.
              </p>

              {resent ? (
                <p className="text-sm text-primary font-medium">✓ Email reenviado com sucesso!</p>
              ) : (
                <form onSubmit={handleResend} className="w-full space-y-3 mt-2">
                  <Input
                    type="email"
                    placeholder="Digite o seu email"
                    value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="outline" className="w-full" disabled={resending}>
                    {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Reenviar Email de Verificação
                  </Button>
                </form>
              )}
            </div>
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h2 className="text-xl font-bold text-slate-100">Email verificado!</h2>
              <p className="text-slate-400">{message}</p>
              <Button asChild className="mt-4">
                <Link to="/login">Fazer Login</Link>
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="h-12 w-12 text-destructive" />
              <h2 className="text-xl font-bold text-slate-100">Erro na verificação</h2>
              <p className="text-slate-400">{message}</p>
              <Button variant="outline" asChild className="mt-4">
                <Link to="/registro">Tentar novamente</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
};

export default VerificarEmail;
