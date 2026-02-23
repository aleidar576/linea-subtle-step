import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLoja } from '@/contexts/LojaContext';
import { useClienteAuth } from '@/hooks/useClienteAuth';
import { toast } from 'sonner';
import { Loader2, Mail, RefreshCw, ArrowLeft, MessageCircle, CheckCircle2, XCircle } from 'lucide-react';

const API_BASE = window.location.hostname.includes('lovable.app')
  ? 'https://pandora-five-amber.vercel.app/api'
  : '/api';

export default function ContaVerificarEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email') || '';
  const pending = searchParams.get('pending');
  const { nomeExibicao, slogan } = useLoja();
  const { verificarEmailCliente, reenviarVerificacaoCliente } = useClienteAuth();

  const [status, setStatus] = useState<'pending' | 'verifying' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [sending, setSending] = useState(false);
  const [whatsappSuporte, setWhatsappSuporte] = useState('');
  const autoSentRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Fetch global support WhatsApp
  useEffect(() => {
    fetch(`${API_BASE}/settings?keys=whatsapp_suporte`)
      .then(r => r.json())
      .then((settings: any[]) => {
        const ws = settings.find((s: any) => s.key === 'whatsapp_suporte');
        if (ws?.value) setWhatsappSuporte(ws.value);
      })
      .catch(() => {});
  }, []);

  // Dynamic title
  useEffect(() => {
    const parts = ['Verificar Email', nomeExibicao];
    if (slogan) parts.push(slogan);
    document.title = parts.join(' · ');
  }, [nomeExibicao, slogan]);

  // If token present, verify immediately
  useEffect(() => {
    if (!token) return;
    setStatus('verifying');
    verificarEmailCliente(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verificado com sucesso! Você já pode fazer login.');
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.message || 'Erro ao verificar email');
      });
  }, [token, verificarEmailCliente]);

  // Auto-send on mount for pending (only once)
  useEffect(() => {
    if (pending && emailParam && !autoSentRef.current) {
      autoSentRef.current = true;
      // Small delay so UI renders first
      setTimeout(() => handleResend(), 500);
    }
  }, [pending, emailParam]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!emailParam || sending || cooldown > 0) return;
    setSending(true);
    try {
      await reenviarVerificacaoCliente(emailParam);
      const newCount = resendCount + 1;
      setResendCount(newCount);
      // 1st click: 60s, 2nd+: 360s
      setCooldown(newCount >= 2 ? 360 : 60);
      toast.success('Email de verificação enviado! Verifique sua caixa de entrada e spam.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reenviar email');
    } finally {
      setSending(false);
    }
  }, [emailParam, sending, cooldown, resendCount, reenviarVerificacaoCliente]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
  };

  // WhatsApp support - use loja's whatsapp or global support whatsapp
  const { whatsappNumero } = useLoja();
  const whatsappNumber = whatsappSuporte || whatsappNumero || '';

  if (token) {
    // Verification by token
    return (
      <div className="container py-10">
        <div className="mx-auto max-w-md space-y-6 text-center">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando seu email...</p>
            </div>
          )}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <CheckCircle2 className="h-12 w-12 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Email verificado!</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button className="mt-4 rounded-full" onClick={() => navigate('/conta/login')}>
                Fazer Login
              </Button>
            </div>
          )}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-2xl font-bold text-foreground">Erro na verificação</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate('/conta/registro')}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Pending verification screen
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-md space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar à loja
        </Link>

        <div className="flex flex-col items-center gap-4 text-center">
          <Mail className="h-14 w-14 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Verifique seu email</h1>
          <p className="text-muted-foreground">
            Enviamos um link de verificação para <strong className="text-foreground">{emailParam}</strong>.
            Clique no link para ativar sua conta.
          </p>
          <p className="text-sm text-muted-foreground">
            Não recebeu? Verifique a pasta de spam ou clique abaixo para reenviar.
          </p>

          <div className="w-full space-y-3 mt-4">
            {cooldown > 0 && (
              <p className="text-sm text-muted-foreground font-medium">
                Aguarde <span className="text-primary font-bold">{formatTime(cooldown)}</span> para reenviar
              </p>
            )}

            <Button
              onClick={handleResend}
              disabled={sending || cooldown > 0}
              variant="outline"
              className="w-full gap-2 rounded-full"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {sending ? 'Enviando...' : 'Reenviar Email de Verificação'}
            </Button>

            {resendCount >= 2 && whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá! Preciso de ajuda para verificar meu email na loja.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Pedir suporte via WhatsApp
              </a>
            )}
          </div>

          <div className="border-t border-border pt-4 mt-2 w-full">
            <p className="text-sm text-muted-foreground">
              Já verificou? <Link to="/conta/login" className="text-primary hover:underline font-medium">Fazer login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
