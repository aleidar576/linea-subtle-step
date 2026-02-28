import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Check, Ticket, ChevronRight, ChevronDown, Truck, MapPin, CreditCard, ShoppingBag, LogIn, UserPlus, ShoppingCart, User, Package, Minus, Plus, Trash2, CheckCircle2, Tag, X, AlertCircle, QrCode, FileText, Lock } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/contexts/CartContext';
import { useLoja } from '@/contexts/LojaContext';
import { firePixelEvent } from '@/components/LojaLayout';
import { pedidosApi, carrinhosApi, cuponsApi, lojaPublicaApi } from '@/services/saas-api';
import type { CalculatedFreight } from '@/services/saas-api';
import { useLojaPublicaProducts } from '@/hooks/useLojaPublica';
import { useClienteAuth } from '@/hooks/useClienteAuth';
import { getSavedUtmParams } from '@/hooks/useUtmParams';
import { toast } from 'sonner';
function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Masks ──
function maskCPF(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function maskPhone(v: string): string {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}
function maskCEP(v: string): string {
  return v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}
function onlyDigits(v: string): string {
  return v.replace(/\D/g, '');
}

// ── Appmax error translation ──
type CardFieldKey = 'number' | 'name' | 'holderCpf' | 'expiry' | 'cvv';
interface TranslatedCardError { message: string; field: CardFieldKey | null; }

function translateCardError(raw: string): TranslatedCardError {
  const low = (raw || '').toLowerCase();
  // HTTP 422 genérico
  if (low.includes('unprocessable'))
    return { message: 'Os dados informados são inválidos. Verifique o número do cartão, validade e CVV.', field: null };
  // Validade
  if (low.includes('expiration year') || low.includes('year is invalid') || low.includes('ano'))
    return { message: 'O ano de validade do cartão é inválido ou já expirou.', field: 'expiry' };
  if (low.includes('expiration month') || low.includes('month is invalid') || low.includes('mês'))
    return { message: 'O mês de validade do cartão é inválido.', field: 'expiry' };
  if (low.includes('expiration') || low.includes('validade') || low.includes('expired'))
    return { message: 'A data de validade do cartão é inválida ou está expirada.', field: 'expiry' };
  // Número do cartão
  if (low.includes('card number') || low.includes('número do cartão') || low.includes('invalid credit card number'))
    return { message: 'O número do cartão de crédito está incorreto ou incompleto.', field: 'number' };
  // CVV
  if (low.includes('cvv') || low.includes('security code') || low.includes('código de segurança'))
    return { message: 'O código de segurança (CVV) é inválido.', field: 'cvv' };
  // CPF do titular (ANTES do match genérico de holder/document)
  if (low.includes('holder_document') || low.includes('holder document'))
    return { message: 'O CPF do titular do cartão é inválido.', field: 'holderCpf' };
  // Nome do titular
  if (low.includes('holder') || low.includes('titular'))
    return { message: 'Nome do titular do cartão inválido.', field: 'name' };
  // CPF genérico
  if (low.includes('document') || low.includes('cpf'))
    return { message: 'CPF do titular inválido.', field: 'holderCpf' };
  // Recusa banco emissor
  if (low.includes('not authorized') || low.includes('não autorizada') || low.includes('nao autorizada'))
    return { message: 'Pagamento recusado pelo banco emissor. Verifique seu limite ou tente outro cartão.', field: null };
  // Risco / antifraude
  if (low.includes('risk') || low.includes('risco'))
    return { message: 'Pagamento recusado por segurança. Tente outro cartão ou método de pagamento.', field: null };
  // Match genérico "number" (campo número)
  if (low.includes('number'))
    return { message: 'O número do cartão de crédito está incorreto ou incompleto.', field: 'number' };
  // Fallback
  return { message: 'Não foi possível processar o pagamento. Verifique os dados e tente novamente.', field: null };
}

// ── Extract API error from nested responses ──
function extractApiError(data: any): string {
  if (typeof data === 'string') return data;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (data?.errors) {
    if (typeof data.errors === 'string') return data.errors;
    if (typeof data.errors?.message === 'string') return data.errors.message;
    if (Array.isArray(data.errors)) return data.errors.map((e: any) => typeof e === 'string' ? e : e?.message || JSON.stringify(e)).join('. ');
    if (typeof data.errors === 'object') return JSON.stringify(data.errors);
  }
  if (typeof data?.details?.message === 'string') return data.details.message;
  return '';
}

// ── CPF Validation ──
function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  for (let t = 9; t < 11; t++) {
    let d = 0;
    for (let c = 0; c < t; c++) d += parseInt(cpf[c]) * ((t + 1) - c);
    d = ((10 * d) % 11) % 10;
    if (parseInt(cpf[t]) !== d) return false;
  }
  return true;
}

// ── Delivery date helper ──
function getDeliveryDateRange(min: number, max: number): string {
  const addBusinessDays = (days: number) => {
    const d = new Date();
    let count = 0;
    while (count < days) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    }
    return d;
  };
  const d1 = addBusinessDays(min);
  const d2 = addBusinessDays(max);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return min === max ? `Receba até ${fmt(d1)}` : `Receba até ${fmt(d1)} - ${fmt(d2)}`;
}

const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().trim().email('E-mail inválido').regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'E-mail inválido'),
  cellphone: z.string().min(14, 'Celular inválido'),
  taxId: z.string().min(14, 'CPF inválido').refine(v => isValidCPF(v), 'CPF inválido'),
});

const shippingSchema = z.object({
  zipCode: z.string().min(9, 'CEP inválido'),
  street: z.string().min(3, 'Endereço obrigatório'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'Estado inválido'),
});

type Step = 'identification' | 'customer' | 'shipping' | 'payment';

interface AppliedCoupon {
  tipo: string;
  valor: number;
  codigo: string;
}

const LojaCheckout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, discountPercent, discountAmount, finalPrice: cartFinalPrice, updateQuantity, removeFromCart } = useCart();
  const { lojaId, exigirCadastro, nomeExibicao, slogan, gatewayAtivo, gatewayLoading, metodosSuportados } = useLoja();

  // Gateway blocking is rendered at the end, after all hooks

  useEffect(() => {
    const parts = ['Checkout', nomeExibicao];
    if (slogan) parts.push(slogan);
    document.title = parts.join(' · ');
  }, [nomeExibicao, slogan]);
  const { cliente, isLoggedIn, isLoading: authLoading, enderecoPadrao } = useClienteAuth();
  const { data: allCheckoutProducts = [] } = useLojaPublicaProducts(lojaId);

  const [currentStep, setCurrentStep] = useState<Step>(() => {
    if (exigirCadastro) return 'identification';
    return 'customer';
  });

  const [customerData, setCustomerData] = useState({ name: '', email: '', cellphone: '', taxId: '' });
  const [shippingData, setShippingData] = useState({ zipCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' });
  const [loadingCep, setLoadingCep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<{ pix_qr_code: string; pix_code: string; txid: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ pdf_url: string; digitable_line: string; txid: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Multi-method payment states ──
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [cardData, setCardData] = useState({ number: '', name: '', holderCpf: '', expiry: '', cvv: '' });
  const [installments, setInstallments] = useState<number>(1);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardFieldError, setCardFieldError] = useState<CardFieldKey | null>(null);

  // Freight selection — dynamic from API
  const [selectedFrete, setSelectedFrete] = useState<CalculatedFreight | null>(null);
  const [shippingOptions, setShippingOptions] = useState<CalculatedFreight[]>([]);
  const [isCalculatingFreight, setIsCalculatingFreight] = useState(false);
  const [freightError, setFreightError] = useState<string | null>(null);

  const shippingCost = selectedFrete?.price || 0;
  const addressFilled = shippingData.street.length >= 3 && shippingData.neighborhood.length >= 2 && shippingData.city.length >= 2 && shippingData.state.length === 2;

  // ── Dynamic freight calculation ──
  const fetchDynamicFreights = useCallback(async (cep: string) => {
    if (!lojaId || items.length === 0) return;
    setIsCalculatingFreight(true);
    setFreightError(null);
    setShippingOptions([]);
    setSelectedFrete(null);
    try {
      const itemsPayload = items.map(item => {
        const realProduct = allCheckoutProducts.find(
          (p: any) => p._id === item.product.id || p.product_id === item.product.id
        );
        return {
          id: item.product.id,
          price: item.product.price,
          quantity: item.quantity,
          weight: realProduct?.dimensoes?.peso || 0,
          dimensions: {
            height: realProduct?.dimensoes?.altura || 0,
            width: realProduct?.dimensoes?.largura || 0,
            length: realProduct?.dimensoes?.comprimento || 0,
          },
        };
      });
      const result = await lojaPublicaApi.calcularFrete({
        loja_id: lojaId,
        to_postal_code: cep,
        items: itemsPayload,
      });
      if (result.fretes.length === 0) {
        setFreightError('Não foi possível calcular o frete para este CEP.');
      } else {
        setShippingOptions(result.fretes);
      }
    } catch {
      setFreightError('Não foi possível calcular o frete para este CEP no momento.');
    } finally {
      setIsCalculatingFreight(false);
    }
  }, [lojaId, items, allCheckoutProducts]);

  // Auto-trigger freight calc when CEP reaches 8 digits (independent of ViaCEP)
  const lastCalcCepRef = useRef('');
  useEffect(() => {
    const cleanCep = shippingData.zipCode.replace(/\D/g, '');
    if (cleanCep.length >= 8 && cleanCep !== lastCalcCepRef.current) {
      lastCalcCepRef.current = cleanCep;
      fetchDynamicFreights(cleanCep);
    }
  }, [shippingData.zipCode, fetchDynamicFreights]);

  // Auto-trigger freight recalc when cart items change (and CEP is valid)
  const cartFingerprint = useMemo(
    () => items.map(i => `${i.product.id}:${i.quantity}`).join(','),
    [items]
  );
  const lastCartFingerprintRef = useRef(cartFingerprint);
  useEffect(() => {
    const cleanCep = shippingData.zipCode.replace(/\D/g, '');
    if (cleanCep.length >= 8 && cartFingerprint !== lastCartFingerprintRef.current) {
      lastCartFingerprintRef.current = cartFingerprint;
      lastCalcCepRef.current = cleanCep;
      fetchDynamicFreights(cleanCep);
    }
  }, [cartFingerprint, shippingData.zipCode, fetchDynamicFreights]);

  // Inline login state
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const { login } = useClienteAuth();

  // ── Multiple Coupons state ──
  const [cupomCode, setCupomCode] = useState('');
  const [cuponsApplied, setCuponsApplied] = useState<AppliedCoupon[]>([]);
  const [cupomSectionOpen, setCupomSectionOpen] = useState(false);
  const [cupomLoading, setCupomLoading] = useState(false);

  // Auto-load coupons redeemed from popup (localStorage)
  useEffect(() => {
    if (!lojaId) return;
    const redeemed: AppliedCoupon[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cupom_resgatado_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key)!);
          if (data?.codigo) {
            redeemed.push({ tipo: data.tipo || 'percentual', valor: data.valor || 0, codigo: data.codigo });
          }
        } catch {}
      }
    }
    if (redeemed.length === 0) return;

    // Validate each redeemed coupon against the API
    const validateAll = async () => {
      const validated: AppliedCoupon[] = [];
      for (const c of redeemed) {
        try {
          const r = await cuponsApi.validar(lojaId, c.codigo);
          validated.push({ tipo: r.tipo, valor: r.valor, codigo: r.codigo });
        } catch {
          // Coupon invalid/expired — remove from localStorage
          localStorage.removeItem(`cupom_resgatado_${c.codigo}`);
        }
      }
      if (validated.length > 0) {
        setCuponsApplied(prev => {
          const existing = new Set(prev.map(p => p.codigo));
          const newOnes = validated.filter(v => !existing.has(v.codigo));
          return [...prev, ...newOnes];
        });
        setCupomSectionOpen(true);
      }
    };
    validateAll();
  }, [lojaId]);

  // Compute totals with multiple coupons
  const hasFreteGratisCupom = cuponsApplied.some(c => c.tipo === 'frete_gratis');
  const effectiveShippingCost = hasFreteGratisCupom ? 0 : shippingCost;

  const cupomDiscountAmount = useMemo(() => {
    let discount = 0;
    const baseForPercent = cartFinalPrice + effectiveShippingCost;
    for (const c of cuponsApplied) {
      if (c.tipo === 'percentual') {
        discount += Math.round(baseForPercent * c.valor / 100);
      } else if (c.tipo === 'fixo') {
        discount += c.valor;
      }
      // frete_gratis doesn't add to discount amount — handled via effectiveShippingCost
    }
    return discount;
  }, [cuponsApplied, cartFinalPrice, effectiveShippingCost]);

  const finalTotal = Math.max(0, cartFinalPrice + effectiveShippingCost - cupomDiscountAmount);

  useEffect(() => {
    if (isLoggedIn && cliente) {
      setCustomerData({
        name: cliente.nome || '',
        email: cliente.email || '',
        cellphone: cliente.telefone || '',
        taxId: cliente.cpf || '',
      });
      if (enderecoPadrao) {
        setShippingData({
          zipCode: enderecoPadrao.cep || '',
          street: enderecoPadrao.rua || '',
          number: enderecoPadrao.numero || '',
          complement: enderecoPadrao.complemento || '',
          neighborhood: enderecoPadrao.bairro || '',
          city: enderecoPadrao.cidade || '',
          state: enderecoPadrao.estado || '',
        });
      }
      if (currentStep === 'identification') setCurrentStep('customer');
    }
  }, [isLoggedIn, cliente, enderecoPadrao]);

  useEffect(() => {
    if (!authLoading && !exigirCadastro && currentStep === 'identification') setCurrentStep('customer');
  }, [exigirCadastro, authLoading]);

  useEffect(() => {
    if (items.length > 0) firePixelEvent('InitiateCheckout', { value: cartFinalPrice / 100, currency: 'BRL', num_items: items.reduce((s, i) => s + i.quantity, 0) });
  }, []);

  // Social proof
  const names = ['Maria S.', 'João P.', 'Ana L.', 'Carlos M.', 'Juliana R.', 'Pedro A.'];
  useEffect(() => {
    const show = () => { toast(`🎉 ${names[Math.floor(Math.random() * names.length)]} acabou de garantir o seu!`, { icon: <ShoppingBag className="h-5 w-5 text-primary" />, duration: 4000 }); };
    const scheduleNext = () => {
      const delay = 30000 + Math.random() * 30000; // 30s a 1min
      return setTimeout(() => { show(); timerId = scheduleNext(); }, delay);
    };
    const first = setTimeout(() => { show(); timerId = scheduleNext(); }, 30000);
    let timerId: ReturnType<typeof setTimeout>;
    return () => { clearTimeout(first); clearTimeout(timerId); };
  }, []);

  // ── Appmax: integração server-to-server, sem SDK frontend ──

  // ── Set default payment method based on gateway ──
  useEffect(() => {
    if (metodosSuportados.length > 0 && !metodosSuportados.includes(paymentMethod)) {
      setPaymentMethod(metodosSuportados[0] === 'cartao' ? 'credit_card' : metodosSuportados[0]);
    }
  }, [metodosSuportados]);

  // Monitor payment (PIX only — boleto takes 12-24h, no polling needed)
  const activeTxid = pixData?.txid;
  useEffect(() => {
    if (!activeTxid) return;
    intervalRef.current = setInterval(async () => {
      try {
        const apiBase = window.location.hostname.includes('lovable.app')
          ? 'https://pandora-five-amber.vercel.app/api'
          : '/api';
        const r = await fetch(`${apiBase}/process-payment?scope=status&txid=${activeTxid}`);
        const d = await r.json();
        console.log('[POLLING] Status response:', JSON.stringify(d));
        const statusValue = (d.status || d.data?.status || '').toLowerCase();
        if (['paid','approved','confirmed','completed'].includes(statusValue)) {
          clearInterval(intervalRef.current!);
          setPaymentConfirmed(true);
          toast.success('Pagamento confirmado!');
          // Fire Purchase pixel event
          firePixelEvent('Purchase', {
            value: finalTotal / 100,
            currency: 'BRL',
            content_id: pixData.txid,
            num_items: items.reduce((s, i) => s + i.quantity, 0),
            contents: items.map(i => ({ id: i.product.id, quantity: i.quantity, price: i.product.price / 100 })),
          });
          // Save purchase data for LojaSucesso fallback
          try {
            sessionStorage.setItem('last_purchase', JSON.stringify({
              value: finalTotal / 100,
              currency: 'BRL',
              txid: pixData.txid,
              num_items: items.reduce((s, i) => s + i.quantity, 0),
            }));
          } catch {}
          const start = Date.now();
          const pi = setInterval(() => {
            const p = Math.min(((Date.now() - start) / 10000) * 100, 100);
            setTransitionProgress(p);
            if (Date.now() - start >= 10000) { clearInterval(pi); clearCart(); navigate('/sucesso'); }
          }, 100);
        }
      } catch (err) { console.error('[POLLING] Error:', err); }
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeTxid]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'taxId') value = maskCPF(value);
    if (name === 'cellphone') value = maskPhone(value);
    setCustomerData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;
    if (name === 'zipCode') value = maskCEP(value);
    if (name === 'number') value = onlyDigits(value);
    setShippingData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
    if (name === 'zipCode') {
      const c = value.replace(/\D/g, '');
      if (c.length === 8) fetchCep(c);
    }
  };

  const fetchCep = async (cep: string) => {
    setLoadingCep(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setShippingData(p => ({ ...p, street: d.logradouro || p.street, neighborhood: d.bairro || p.neighborhood, city: d.localidade || p.city, state: d.uf || p.state }));
        toast.success('Endereço encontrado!');
      }
    } catch {} finally { setLoadingCep(false); }
  };

  const validate = (step: 'customer' | 'shipping') => {
    const schema = step === 'customer' ? customerSchema : shippingSchema;
    const data = step === 'customer' ? customerData : shippingData;
    const result = schema.safeParse(data);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(e => { if (e.path[0]) fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return false;
    }
    setErrors({});
    return true;
  };

  const buildCartData = (etapa: string) => ({
    loja_id: lojaId,
    etapa,
    itens: items.map(i => ({ product_id: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price })),
    total: finalTotal,
    cliente: { nome: customerData.name, email: customerData.email, telefone: customerData.cellphone, cpf: customerData.taxId },
    endereco: etapa !== 'customer' ? { cep: shippingData.zipCode, rua: shippingData.street, numero: shippingData.number, complemento: shippingData.complement, bairro: shippingData.neighborhood, cidade: shippingData.city, estado: shippingData.state } : null,
    utms: getSavedUtmParams(),
  });

  const goNext = () => {
    if (currentStep === 'customer' && validate('customer')) {
      carrinhosApi.save(buildCartData('customer')).catch(() => {});
      setCurrentStep('shipping');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (currentStep === 'shipping') {
      if (!validate('shipping')) return;
      if (shippingOptions.length > 0 && !selectedFrete) {
        toast.error('Selecione uma opção de frete para continuar');
        return;
      }
      carrinhosApi.save(buildCartData('shipping')).catch(() => {});
      setCurrentStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const applyCupom = async () => {
    const code = cupomCode.trim().toUpperCase();
    if (!code) return;
    if (cuponsApplied.some(c => c.codigo === code)) {
      toast.error('Cupom já aplicado');
      return;
    }
    setCupomLoading(true);
    try {
      const r = await cuponsApi.validar(lojaId, code);
      setCuponsApplied(prev => [...prev, { tipo: r.tipo, valor: r.valor, codigo: r.codigo }]);
      setCupomCode('');
      toast.success(`Cupom ${r.codigo} aplicado!`);
    } catch (e: any) { toast.error(e.message || 'Cupom inválido'); }
    finally { setCupomLoading(false); }
  };

  const removeCupom = (codigo: string) => {
    setCuponsApplied(prev => prev.filter(c => c.codigo !== codigo));
    localStorage.removeItem(`cupom_resgatado_${codigo}`);
  };

  // Pick main coupon for order (first non-frete_gratis, or first one)
  const mainCupom = cuponsApplied.find(c => c.tipo !== 'frete_gratis') || cuponsApplied[0] || null;

  // ── Card masks ──
  const maskCardNumber = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
  const maskExpiry = (v: string) => v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');

  const handlePayment = async (method?: string) => {
    const activeMethod = method || paymentMethod;
    setIsLoading(true);
    firePixelEvent('AddPaymentInfo', { value: finalTotal / 100, currency: 'BRL', num_items: items.reduce((s, i) => s + i.quantity, 0) });
    try {
      const desc = items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
      const utmParams = getSavedUtmParams();
      const getCookie = (name: string): string => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : '';
      };
      const utm: Record<string, string> = {};
      Object.entries(utmParams).forEach(([key, value]) => {
        if (key.startsWith('utm_')) utm[key] = value;
      });

      // Validar dados do cartão antes de enviar ao backend (server-to-server)
      if (activeMethod === 'credit_card') {
        setCardError(null);
        setCardFieldError(null);
        if (!cardData.number || !cardData.name || !cardData.holderCpf || !cardData.expiry || !cardData.cvv) {
          setCardError('Preencha todos os dados do cartão, incluindo o CPF do titular.');
          setIsLoading(false);
          return;
        }
      }

      const apiBase = window.location.hostname.includes('lovable.app')
        ? 'https://pandora-five-amber.vercel.app/api'
        : '/api';
      const r = await fetch(`${apiBase}/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(finalTotal),
          description: desc,
          method: activeMethod,
          card_data: activeMethod === 'credit_card' ? {
            number: cardData.number.replace(/\s/g, ''),
            name: cardData.name,
            holder_document_number: cardData.holderCpf.replace(/\D/g, ''),
            exp_month: cardData.expiry.split('/')[0],
            exp_year: cardData.expiry.split('/')[1]?.length === 2 ? `20${cardData.expiry.split('/')[1]}` : cardData.expiry.split('/')[1],
            cvv: cardData.cvv,
          } : undefined,
          installments: activeMethod === 'credit_card' ? installments : undefined,
          customer: { name: customerData.name, email: customerData.email, cellphone: customerData.cellphone, taxId: customerData.taxId },
          loja_id: lojaId,
          shipping: { cep: shippingData.zipCode, rua: shippingData.street, numero: shippingData.number, complemento: shippingData.complement, bairro: shippingData.neighborhood, cidade: shippingData.city, estado: shippingData.state },
          items: items.map(i => ({ product_id: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price, sku: (i.product as any).sku || '' })),
          tracking: { utm, src: utmParams.src || window.location.href },
          fbp: getCookie('_fbp'),
          fbc: getCookie('_fbc') || utmParams.fbclid || '',
          user_agent: navigator.userAgent,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (activeMethod === 'credit_card') {
          const translated = translateCardError(extractApiError(data));
          setCardError(translated.message);
          setCardFieldError(translated.field);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error);
      }

      // Build pedido payload (common)
      const pedidoPayload = {
        loja_id: lojaId,
        itens: items.map(i => ({ product_id: i.product.id, name: i.product.name, image: i.product.image, slug: i.product.slug || '', quantity: i.quantity, price: i.product.price, variacao: i.selectedColor || i.selectedSize || null })),
        subtotal: totalPrice,
        desconto: discountAmount + cupomDiscountAmount + (hasFreteGratisCupom ? shippingCost : 0),
        frete: effectiveShippingCost,
        frete_nome: selectedFrete?.name || null,
        frete_valor: selectedFrete?.price || 0,
        frete_prazo: selectedFrete?.delivery_time || 0,
        frete_id: selectedFrete?.id || null,
        total: finalTotal,
        cupom: mainCupom ? { codigo: mainCupom.codigo, tipo: mainCupom.tipo, valor: mainCupom.valor } : null,
        pagamento: { metodo: activeMethod, gateway: gatewayAtivo || 'sealpay', txid: data.txid, appmax_order_id: data.appmax_order_id || data.txid || null, pix_code: data.pix_code || null, pago_em: null },
        cliente: { nome: customerData.name, email: customerData.email, telefone: customerData.cellphone, cpf: customerData.taxId },
        endereco: { cep: shippingData.zipCode, rua: shippingData.street, numero: shippingData.number, complemento: shippingData.complement, bairro: shippingData.neighborhood, cidade: shippingData.city, estado: shippingData.state },
        utms: utmParams,
      };

      // Handle method-specific responses
      if (activeMethod === 'pix' || data.pix_qr_code) {
        setPixData(data);
        toast.success('QR Code Pix gerado!');
      } else if (activeMethod === 'boleto') {
        const pdfUrl = data.pdf_url || data.url || data.boleto_url || '';
        const digitableLine = data.digitable_line || data.linha_digitavel || '';
        setBoletoData({ pdf_url: pdfUrl, digitable_line: digitableLine, txid: data.txid });
        if (pdfUrl) {
          window.open(pdfUrl, '_blank');
          toast.success('Boleto gerado! Abrindo em nova aba...');
        } else {
          toast.success('Boleto gerado com sucesso!');
        }
      } else if (activeMethod === 'credit_card') {
        // HTTP 200 do backend = pagamento aceito/em processamento pela Appmax
        const cardStatus = (data.status || '').toLowerCase();
        const isRecusado = ['recusado', 'declined', 'refused', 'cancelado', 'recusado_por_risco'].includes(cardStatus);
        if (isRecusado) {
          const translated = translateCardError(extractApiError(data));
          setCardError(translated.message);
          setCardFieldError(translated.field);
          setIsLoading(false);
          return;
        }
        // Qualquer outro status (pago, aprovado, autorizado, pendente, processing, etc) = sucesso
        pedidoPayload.pagamento.pago_em = new Date().toISOString() as any;
        (pedidoPayload as any).status = 'pago';
        toast.success('Pagamento aprovado.');
        try { await pedidosApi.create(pedidoPayload); } catch {}
        carrinhosApi.save({ ...buildCartData('payment'), txid: data.txid }).catch(() => {});
        cuponsApplied.forEach(c => localStorage.removeItem(`cupom_resgatado_${c.codigo}`));
        firePixelEvent('Purchase', { value: finalTotal / 100, currency: 'BRL', content_id: data.txid, num_items: items.reduce((s, i) => s + i.quantity, 0) });
        try { sessionStorage.setItem('last_purchase', JSON.stringify({ value: finalTotal / 100, currency: 'BRL', txid: data.txid })); } catch {}
        setPaymentConfirmed(true);
        const start = Date.now();
        const pi = setInterval(() => {
          const p = Math.min(((Date.now() - start) / 5000) * 100, 100);
          setTransitionProgress(p);
          if (Date.now() - start >= 5000) { clearInterval(pi); clearCart(); navigate('/sucesso'); }
        }, 100);
        setIsLoading(false);
        return;
      }

      // Create order for PIX/Boleto
      try {
        await pedidosApi.create(pedidoPayload);
        console.log('[PEDIDO] Criado com sucesso');
      } catch (firstErr) {
        console.warn('[PEDIDO] Primeira tentativa falhou, retentando...', firstErr);
        try {
          const retryRes = await fetch(`${apiBase}/pedidos?scope=pedido`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoPayload),
          });
          if (!retryRes.ok) throw new Error('Retry falhou');
          console.log('[PEDIDO] Criado no retry');
        } catch (retryErr) {
          console.error('[PEDIDO] Falha total:', retryErr);
          toast.error('Erro ao registrar pedido. O pagamento foi gerado normalmente.');
        }
      }

      carrinhosApi.save({ ...buildCartData('payment'), pix_code: data.pix_code, txid: data.txid }).catch(e => console.error('[CARRINHO]', e));
      cuponsApplied.forEach(c => localStorage.removeItem(`cupom_resgatado_${c.codigo}`));
    } catch (e: any) {
      if (activeMethod === 'credit_card') {
        const translated = translateCardError(e.message || '');
        setCardError(translated.message);
        setCardFieldError(translated.field);
      } else {
        toast.error(e.message || 'Erro ao gerar pagamento');
      }
    }
    finally { setIsLoading(false); }
  };

  const handleCopy = async () => {
    if (pixData?.pix_code) { await navigator.clipboard.writeText(pixData.pix_code); setCopied(true); toast.success('Código copiado!'); setTimeout(() => setCopied(false), 2000); }
  };

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.senha) return;
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.senha);
      toast.success('Login realizado!');
    } catch (err: any) {
      toast.error(err.message || 'E-mail ou senha inválidos');
    } finally { setLoginLoading(false); }
  };

  const visibleSteps = currentStep === 'identification'
    ? [{ id: 'identification', label: 'Identificação', icon: LogIn }, { id: 'customer', label: 'Dados', icon: User }, { id: 'shipping', label: 'Entrega', icon: Truck }, { id: 'payment', label: 'Pagamento', icon: CreditCard }]
    : [{ id: 'customer', label: 'Dados', icon: User }, { id: 'shipping', label: 'Entrega', icon: Truck }, { id: 'payment', label: 'Pagamento', icon: CreditCard }];

  const stepIdx = visibleSteps.findIndex(s => s.id === currentStep);

  // ── Coupon Section JSX (reusable) ──
  const couponSectionJSX = (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setCupomSectionOpen(prev => !prev)}
        className="w-full flex items-center justify-start gap-2 py-3 px-4 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Ticket className="h-4 w-4 text-muted-foreground" />
        <span>Possui um cupom de desconto?</span>
        <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${cupomSectionOpen ? 'rotate-180' : ''}`} />
      </button>

      {cupomSectionOpen && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/50">
          <div className="flex flex-row gap-2">
            <Input
              placeholder="Código do cupom"
              value={cupomCode}
              onChange={e => setCupomCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && applyCupom()}
              className="flex-1 bg-white text-black border-input focus-visible:ring-primary"
            />
            <Button
              onClick={applyCupom}
              disabled={cupomLoading || !cupomCode.trim()}
              className="shrink-0 px-4 text-xs font-bold"
            >
              {cupomLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'APLICAR'}
            </Button>
          </div>

          {cuponsApplied.length > 0 && (
            <div className="space-y-0">
              {cuponsApplied.map((c, i) => (
                <div key={c.codigo} className={`flex items-center justify-between py-2 ${i < cuponsApplied.length - 1 ? 'border-b border-border/50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold text-foreground">{c.codigo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">
                      {c.tipo === 'frete_gratis' ? 'Frete grátis' : c.tipo === 'percentual' ? `-${c.valor}%` : `-${formatPrice(c.valor)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCupom(c.codigo)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Inline Order Summary JSX ──
  const displayTotal = finalTotal;

  const orderSummaryJSX = (
    <div className="bg-secondary/80 rounded-3xl p-5 border border-border space-y-4">
      {/* Coupon section inside order summary */}
      {couponSectionJSX}

      <h3 className="font-bold text-foreground">Resumo do Pedido</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <img src={item.product.image} alt={item.product.name} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-2">{item.product.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor)} className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"><Minus className="h-3 w-3" /></button>
                  <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)} className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"><Plus className="h-3 w-3" /></button>
                </div>
                <button type="button" onClick={() => removeFromCart(item.product.id, item.selectedSize, item.selectedColor)} className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground shrink-0">{formatPrice(item.product.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-3 space-y-1.5">
        <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>{formatPrice(totalPrice)}</span></div>
        
        {cuponsApplied.filter(c => c.tipo !== 'frete_gratis').map(c => (
          <div key={c.codigo} className="flex justify-between text-sm text-primary">
            <span>Cupom {c.codigo}</span>
            <span>-{c.tipo === 'percentual' ? formatPrice(Math.round((cartFinalPrice + effectiveShippingCost) * c.valor / 100)) : formatPrice(c.valor)}</span>
          </div>
        ))}
        {selectedFrete !== null && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Frete ({selectedFrete.name})</span>
            <span className={effectiveShippingCost === 0 ? 'text-primary font-semibold' : ''}>
              {effectiveShippingCost === 0 ? 'Grátis' : formatPrice(effectiveShippingCost)}
              {hasFreteGratisCupom && selectedFrete.price > 0 && (
                <span className="line-through text-muted-foreground ml-1 text-xs">{formatPrice(selectedFrete.price)}</span>
              )}
            </span>
          </div>
        )}
        <div className="flex justify-between font-bold text-2xl border-t border-border pt-2 mt-2">
          <span className="text-foreground">Total</span>
          <span className="text-primary">{formatPrice(displayTotal)}</span>
        </div>
      </div>
    </div>
  );

  // ── BLOQUEIO DE CHECKOUT: Gateway não configurado ──
  if (gatewayLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando checkout…</p>
        </div>
      </div>
    );
  }

  if (!gatewayAtivo) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6 space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted mx-auto flex items-center justify-center">
            <CreditCard className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Checkout temporariamente indisponível</h1>
          <p className="text-sm text-muted-foreground">
            O lojista precisa configurar um gateway de pagamento para que você possa concluir sua compra.
          </p>
          <Button onClick={() => navigate('/')} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar à loja
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !pixData) {
    return <div className="container py-20 text-center"><h1 className="text-2xl font-bold">Seu carrinho está vazio</h1><Button asChild className="mt-6"><Link to="/">Ver Produtos</Link></Button></div>;
  }

  // ── Step Progress Bar ──
  const stepBarJSX = (
    <div className="mb-8 flex items-center justify-center gap-0">
      {visibleSteps.map((s, i) => {
        const Icon = s.icon;
        const active = i <= stepIdx;
        const completed = i < stepIdx;
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`mt-1 text-xs ${active ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{s.label}</span>
            </div>
            {i < visibleSteps.length - 1 && (
              <div className={`h-1 w-12 sm:w-20 mx-1 rounded-full transition-colors ${completed ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="container py-6 lg:py-10 px-4 md:px-8">
      <Link to="/cart" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Voltar ao carrinho</Link>

      {stepBarJSX}

      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 lg:items-start">
        <div className="bg-card border border-border rounded-2xl p-6 lg:p-8">
          <div className="space-y-4">
            {paymentConfirmed && (
              <div className="rounded-2xl border border-primary bg-primary/5 p-6 text-center space-y-4">
                <Check className="mx-auto h-12 w-12 text-primary" />
                <h2 className="text-xl font-bold text-primary">Pagamento Confirmado!</h2>
                <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${transitionProgress}%` }} /></div>
                <p className="text-sm text-muted-foreground">Redirecionando...</p>
              </div>
            )}

            {/* ── IDENTIFICATION STEP ── */}
            {!paymentConfirmed && currentStep === 'identification' && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">Como deseja continuar?</h2>
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2"><LogIn className="h-4 w-4" /> Fazer Login</h3>
                  <form onSubmit={handleInlineLogin} className="space-y-3">
                    <Input type="email" placeholder="E-mail" value={loginForm.email} onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))} />
                    <Input type="password" placeholder="Senha" value={loginForm.senha} onChange={e => setLoginForm(p => ({ ...p, senha: e.target.value }))} />
                    <div className="flex items-center justify-between">
                      <Link to="/conta/recuperar" className="text-xs text-primary hover:underline">Esqueci minha senha</Link>
                      <Button type="submit" size="sm" disabled={loginLoading} className="rounded-full">
                        {loginLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Entrar
                      </Button>
                    </div>
                  </form>
                </div>
                <Button variant="outline" className="w-full rounded-full font-bold justify-start gap-2" onClick={() => navigate('/conta/registro?redirect=/checkout')}>
                  <UserPlus className="h-4 w-4" /> Criar uma conta
                </Button>
                <button onClick={() => { setCurrentStep('customer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
                  Continuar sem cadastro →
                </button>
              </div>
            )}

            {/* ── CUSTOMER DATA ── */}
            {!paymentConfirmed && currentStep === 'customer' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold">Seus Dados</h2>
                  <p className="text-sm text-muted-foreground">Preencha seus dados para continuar</p>
                </div>
                {isLoggedIn && <p className="text-sm text-primary font-medium">✓ Dados preenchidos da sua conta</p>}
                {[
                  { name: 'name', label: 'Nome completo *', placeholder: 'Seu nome' },
                  { name: 'email', label: 'E-mail *', placeholder: 'email@exemplo.com' },
                  { name: 'cellphone', label: 'Celular *', placeholder: '(11) 99999-9999' },
                  { name: 'taxId', label: 'CPF *', placeholder: '000.000.000-00' },
                ].map(f => (
                  <div key={f.name}>
                    <Label className="text-sm font-medium">{f.label}</Label>
                    <Input
                      name={f.name}
                      value={(customerData as any)[f.name]}
                      onChange={handleCustomerChange}
                      placeholder={f.placeholder}
                      inputMode={f.name === 'cellphone' || f.name === 'taxId' ? 'numeric' : undefined}
                    />
                    {errors[f.name] && <p className="text-xs text-destructive mt-1">{errors[f.name]}</p>}
                  </div>
                ))}
                <div className="lg:hidden">{orderSummaryJSX}</div>
                <Button onClick={goNext} className="w-full rounded-full font-bold">Continuar <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
            )}

            {/* ── SHIPPING ── */}
            {!paymentConfirmed && currentStep === 'shipping' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold">Endereço de Entrega</h2>
                  <p className="text-sm text-muted-foreground">Onde devemos entregar seu pedido?</p>
                </div>
                {isLoggedIn && enderecoPadrao && <p className="text-sm text-primary font-medium">✓ Endereço padrão preenchido</p>}
                <div>
                  <Label className="text-sm font-medium">CEP *</Label>
                  <Input name="zipCode" value={shippingData.zipCode} onChange={handleShippingChange} placeholder="00000-000" inputMode="numeric" />
                  {loadingCep && <p className="text-xs text-muted-foreground mt-1">Buscando endereço...</p>}
                  {errors.zipCode && <p className="text-xs text-destructive mt-1">{errors.zipCode}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium">Endereço *</Label>
                  <Input name="street" value={shippingData.street} onChange={handleShippingChange} placeholder="Rua, Avenida..." />
                  {errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm font-medium">Número *</Label>
                    <Input name="number" value={shippingData.number} onChange={handleShippingChange} placeholder="123" inputMode="numeric" />
                    {errors.number && <p className="text-xs text-destructive mt-1">{errors.number}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Complemento</Label>
                    <Input name="complement" value={shippingData.complement} onChange={handleShippingChange} placeholder="Apto, Bloco..." />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Bairro *</Label>
                  <Input name="neighborhood" value={shippingData.neighborhood} onChange={handleShippingChange} />
                  {errors.neighborhood && <p className="text-xs text-destructive mt-1">{errors.neighborhood}</p>}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Cidade *</Label>
                    <Input name="city" value={shippingData.city} onChange={handleShippingChange} />
                    {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium">UF *</Label>
                    <Input name="state" value={shippingData.state} onChange={handleShippingChange} maxLength={2} />
                    {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
                  </div>
                </div>

                {/* Freight Selection */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-1.5 font-semibold text-lg mb-4"><Truck className="h-4 w-4" /> Opções de Entrega</Label>

                  {/* Loading skeletons */}
                  {isCalculatingFreight && (
                    <div className="grid grid-cols-1 gap-4">
                      <Skeleton className="h-[80px] w-full rounded-xl" />
                      <Skeleton className="h-[80px] w-full rounded-xl" />
                      <Skeleton className="h-[80px] w-full rounded-xl" />
                    </div>
                  )}

                  {/* Error */}
                  {freightError && !isCalculatingFreight && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-sm text-destructive">{freightError}</p>
                    </div>
                  )}

                  {/* Options */}
                  {!isCalculatingFreight && shippingOptions.length > 0 && (
                    <div className="grid grid-cols-1 gap-4">
                      {shippingOptions.map((option) => {
                        const isSelected = selectedFrete?.id === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectedFrete(option)}
                            className={`w-full flex items-center gap-5 p-5 rounded-xl border-2 transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'}`}
                          >
                            <div className="shrink-0">
                              {isSelected ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
                            </div>
                            <div className="flex-shrink-0 w-14 h-14 flex items-center justify-center p-2 border rounded-lg bg-white overflow-hidden">
                              {option.picture ? (
                                <img src={option.picture} alt={option.name} className="max-w-full max-h-full object-contain" />
                              ) : (
                                <Truck className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-base font-semibold text-foreground">{option.name}</p>
                              {option.delivery_time > 0 && (
                                <p className="text-sm text-muted-foreground mt-0.5">Chega em até {option.delivery_time} dias úteis</p>
                              )}
                            </div>
                            <span className={`text-base shrink-0 ${option.price === 0 ? 'text-emerald-600 font-bold' : 'font-bold text-foreground'}`}>
                              {option.price === 0 ? 'Grátis' : formatPrice(option.price)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* No options and no error — CEP not yet entered */}
                  {!isCalculatingFreight && !freightError && shippingOptions.length === 0 && shippingData.zipCode.replace(/\D/g, '').length < 8 && (
                    <p className="text-sm text-muted-foreground">Preencha o CEP para ver as opções de entrega.</p>
                  )}
                </div>

                <div className="lg:hidden">{orderSummaryJSX}</div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setCurrentStep('customer'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 rounded-full">Voltar</Button>
                  <Button onClick={goNext} className="flex-1 rounded-full font-bold bg-primary hover:bg-primary/90">Continuar <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* ── PAYMENT ── */}
            {!paymentConfirmed && currentStep === 'payment' && !pixData && !boletoData && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold">Pagamento</h2>

                {/* Mobile: show summary inline */}
                <div className="lg:hidden">{orderSummaryJSX}</div>

                {/* Payment method selection — only if multiple methods */}
                {metodosSuportados.length > 1 && (
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-1 gap-3">
                    {metodosSuportados.includes('pix') && (
                      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="pix" />
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold text-foreground">PIX</p>
                          <p className="text-xs text-muted-foreground">Pagamento instantâneo via QR Code</p>
                        </div>
                      </label>
                    )}
                    {(metodosSuportados.includes('cartao') || metodosSuportados.includes('credit_card')) && (
                      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="credit_card" />
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold text-foreground">Cartão de Crédito</p>
                          <p className="text-xs text-muted-foreground">Pague em até 12x</p>
                        </div>
                      </label>
                    )}
                    {metodosSuportados.includes('boleto') && (
                      <label className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'boleto' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="boleto" />
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold text-foreground">Boleto Bancário</p>
                          <p className="text-xs text-muted-foreground">Compensação em até 3 dias úteis</p>
                        </div>
                      </label>
                    )}
                  </RadioGroup>
                )}

                {/* Credit Card Form */}
                {paymentMethod === 'credit_card' && (
                  <div className="space-y-4 rounded-xl border border-border p-5 bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Seus dados estão protegidos com criptografia</span>
                    </div>
                    <div>
                      <Label>Número do Cartão *</Label>
                      <Input
                        placeholder="0000 0000 0000 0000"
                        value={cardData.number}
                        onChange={e => { setCardData(p => ({ ...p, number: maskCardNumber(e.target.value) })); setCardError(null); setCardFieldError(null); }}
                        inputMode="numeric"
                        maxLength={19}
                        className={cardFieldError === 'number' ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : ''}
                      />
                    </div>
                    <div>
                      <Label>Nome no Cartão *</Label>
                      <Input
                        placeholder="Como está impresso no cartão"
                        value={cardData.name}
                        onChange={e => { setCardData(p => ({ ...p, name: e.target.value.toUpperCase() })); setCardError(null); setCardFieldError(null); }}
                        className={cardFieldError === 'name' ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : ''}
                      />
                    </div>
                    <div>
                      <Label>CPF do Titular *</Label>
                      <Input
                        placeholder="000.000.000-00"
                        value={cardData.holderCpf}
                        onChange={e => { setCardData(p => ({ ...p, holderCpf: maskCPF(e.target.value) })); setCardError(null); setCardFieldError(null); }}
                        inputMode="numeric"
                        maxLength={14}
                        className={cardFieldError === 'holderCpf' ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : ''}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Validade *</Label>
                        <Input
                          placeholder="MM/AA"
                          value={cardData.expiry}
                          onChange={e => { setCardData(p => ({ ...p, expiry: maskExpiry(e.target.value) })); setCardError(null); setCardFieldError(null); }}
                          inputMode="numeric"
                          maxLength={5}
                          className={cardFieldError === 'expiry' ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : ''}
                        />
                      </div>
                      <div>
                        <Label>CVV *</Label>
                        <Input
                          placeholder="000"
                          value={cardData.cvv}
                          onChange={e => { setCardData(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) })); setCardError(null); setCardFieldError(null); }}
                          inputMode="numeric"
                          maxLength={4}
                          className={cardFieldError === 'cvv' ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : ''}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Parcelas</Label>
                      <Select value={String(installments)} onValueChange={v => setInstallments(Number(v))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                            <SelectItem key={n} value={String(n)}>
                              {n}x de {formatPrice(Math.ceil(finalTotal / n))} {n === 1 ? '(à vista)' : 'sem juros'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Card error alert */}
                    {cardError && (
                      <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Transação não autorizada</p>
                          <p className="mt-1 opacity-90">{cardError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setCurrentStep('shipping'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 rounded-full">Voltar</Button>
                  <Button
                    onClick={() => handlePayment()}
                    disabled={isLoading}
                    className="flex-1 gap-2 rounded-full font-bold"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {paymentMethod === 'pix' ? 'Gerar PIX' : paymentMethod === 'boleto' ? 'Gerar Boleto' : 'Pagar'}
                  </Button>
                </div>
              </div>
            )}

            {/* PIX QR Code display */}
            {!paymentConfirmed && pixData && (
              <div className="space-y-4 text-center">
                <h2 className="text-lg font-bold">Escaneie o QR Code</h2>
                {pixData.pix_qr_code && <img src={pixData.pix_qr_code} alt="QR Code PIX" className="mx-auto h-48 w-48 rounded-xl border" />}
                <p className="text-xs text-muted-foreground">Ou copie o código abaixo:</p>
                <div className="flex gap-2">
                  <Input value={pixData.pix_code} readOnly className="text-xs" />
                  <Button variant="outline" onClick={handleCopy} className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Aguardando pagamento...
                </div>
              </div>
            )}

            {/* Boleto display */}
            {!paymentConfirmed && boletoData && (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold">Pedido Registrado!</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Seu boleto foi gerado com sucesso. Após o pagamento, a compensação leva de <strong>1 a 3 dias úteis</strong>.
                  </p>
                </div>

                {/* Download button — always prominent */}
                {boletoData.pdf_url && (
                  <Button
                    onClick={() => window.open(boletoData.pdf_url, '_blank')}
                    className="gap-2 rounded-full w-full text-base"
                    size="lg"
                  >
                    <FileText className="h-5 w-5" /> Baixar Boleto (PDF)
                  </Button>
                )}

                {/* Digitable line with copy */}
                {boletoData.digitable_line && (
                  <div className="space-y-2 rounded-xl border border-border p-4 bg-card">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Linha Digitável</p>
                    <div className="flex gap-2">
                      <Input value={boletoData.digitable_line} readOnly className="text-xs font-mono bg-muted" />
                      <Button variant="outline" onClick={() => {
                        navigator.clipboard.writeText(boletoData.digitable_line);
                        setCopied(true);
                        toast.success('Linha digitável copiada!');
                        setTimeout(() => setCopied(false), 2000);
                      }} className="gap-2 shrink-0">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {!boletoData.pdf_url && !boletoData.digitable_line && (
                  <p className="text-sm text-muted-foreground text-center">O boleto foi gerado. Verifique seu e-mail para os dados de pagamento.</p>
                )}

                {/* Info box */}
                <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2 text-sm text-muted-foreground">
                  <p>📌 <strong>Dica:</strong> Pague via internet banking, app do banco ou em qualquer lotérica.</p>
                  <p>⏳ Após o pagamento, a confirmação será enviada ao seu e-mail.</p>
                </div>

                <Button variant="outline" onClick={() => navigate('/')} className="w-full rounded-full">
                  Voltar à Loja
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop sidebar summary (sticky) */}
        <div className="hidden lg:block sticky top-6">
          {orderSummaryJSX}
        </div>
      </div>
    </div>
  );
};

export default LojaCheckout;
