import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLojistaAuth } from '@/hooks/useLojistaAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SaaSLogo, useSaaSBrand, useFaviconUpdater } from '@/components/SaaSBrand';

const LojistaLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const { login, verifyLogin2FA } = useLojistaAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authSubtitle, brandName } = useSaaSBrand();
  useFaviconUpdater();

  useEffect(() => {
    document.title = `Entrar · ${brandName}`;
  }, [brandName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.require2FA && result.tempToken) {
        setTwoFARequired(true);
        setTempToken(result.tempToken);
      } else {
        navigate('/painel');
      }
    } catch (err: any) {
      if (err.email_nao_verificado) {
        toast({ title: 'Email não verificado', description: 'Redirecionando para verificação...', variant: 'destructive' });
        navigate(`/verificar-email?pending=1&email=${encodeURIComponent(err.email || email)}`);
        return;
      }
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (otpCode.length !== 6) return;
    setLoading(true);
    try {
      await verifyLogin2FA(tempToken, otpCode);
      navigate('/painel');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      setOtpCode('');
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setTwoFARequired(false);
    setTempToken('');
    setOtpCode('');
  };

  return (
    <div className="dark">
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-4 justify-center">
              <SaaSLogo context="login" theme="dark" nameClassName="text-foreground text-2xl" />
            </Link>
            {twoFARequired ? (
              <>
                <div className="flex justify-center mb-3">
                  <ShieldCheck className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Código de Autenticação</h1>
                <p className="text-muted-foreground mt-1">Digite o código de 6 dígitos do seu app autenticador</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-foreground">Entrar na sua conta</h1>
                <p className="text-muted-foreground mt-1">{authSubtitle}</p>
              </>
            )}
          </div>

          {twoFARequired ? (
            <div className="bg-card border border-border rounded-xl p-6 space-y-6">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleVerify2FA} className="w-full" disabled={loading || otpCode.length !== 6}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verificar
              </Button>
              <button onClick={resetToLogin} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto transition-colors">
                <ArrowLeft className="h-3 w-3" /> Voltar ao login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-foreground">Senha</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Entrar
              </Button>
              <div className="text-center text-sm space-y-2">
                <Link to="/redefinir-senha" className="text-primary hover:underline block">Esqueceu a senha?</Link>
                <p className="text-muted-foreground">
                  Não tem conta?{' '}
                  <Link to="/registro" className="text-primary hover:underline">Criar conta</Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LojistaLogin;
