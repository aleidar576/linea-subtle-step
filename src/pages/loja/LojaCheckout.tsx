import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Copy, Check, Gift, ChevronRight, Truck, MapPin, CreditCard, ShoppingBag, LogIn, UserPlus, ShoppingCart, User, Package, Minus, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { useLoja } from '@/contexts/LojaContext';
import { firePixelEvent } from '@/components/LojaLayout';
import { pedidosApi, carrinhosApi, cuponsApi } from '@/services/saas-api';
import { useLojaPublicaFretes, useLojaPublicaProducts } from '@/hooks/useLojaPublica';
import { useClienteAuth } from '@/hooks/useClienteAuth';
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

const LojaCheckout = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, discountPercent, discountAmount, finalPrice: cartFinalPrice, updateQuantity, removeFromCart } = useCart();
  const { lojaId, exigirCadastro, nomeExibicao, slogan } = useLoja();

  // Dynamic title: Checkout · {nomeLoja} · {slogan}
  useEffect(() => {
    const parts = ['Checkout', nomeExibicao];
    if (slogan) parts.push(slogan);
    document.title = parts.join(' · ');
  }, [nomeExibicao, slogan]);
  const { cliente, isLoggedIn, isLoading: authLoading, enderecoPadrao } = useClienteAuth();
  const { data: lojaFretes = [] } = useLojaPublicaFretes(lojaId);
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
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Freight selection
  const [selectedFrete, setSelectedFrete] = useState<{ nome: string; valor: number; prazo: string } | null>(null);
  const activeFretes = lojaFretes.filter((f: any) => f.is_active);

  // Compute freights based on cart items' fretes_vinculados (majoritarian rule: most expensive)
  const computedFretes = useMemo(() => {
    const cartProductIds = items.map(item => (item.product as any)?.product_id || (item.product as any)?._id).filter(Boolean);
    const cartProducts = allCheckoutProducts.filter((p: any) => cartProductIds.includes(p.product_id) || cartProductIds.includes(p._id));

    // Check if any product has fretes_vinculados
    const hasVinculados = cartProducts.some((p: any) => p.fretes_vinculados && p.fretes_vinculados.length > 0);

    if (!hasVinculados) {
      // Fallback: use global active freights
      return activeFretes.map((f: any) => ({
        nome: f.nome,
        valor: f.valor || 0,
        prazo_dias_min: f.prazo_dias_min || 3,
        prazo_dias_max: f.prazo_dias_max || 7,
      }));
    }

    // Group by frete_id: for each active frete, find the most expensive value across cart products
    const freteMap = new Map<string, { nome: string; valor: number; prazo_dias_min: number; prazo_dias_max: number }>();

    for (const frete of activeFretes) {
      const freteId = frete._id;
      let maxValor = -1;

      for (const product of cartProducts) {
        const vinculados = (product as any).fretes_vinculados || [];
        const vinculo = vinculados.find((v: any) => v.frete_id === freteId);
        if (vinculo) {
          const valor = vinculo.valor_personalizado != null ? vinculo.valor_personalizado : (frete.valor || 0);
          if (valor > maxValor) maxValor = valor;
        }
      }

      if (maxValor >= 0) {
        freteMap.set(freteId, {
          nome: frete.nome,
          valor: maxValor,
          prazo_dias_min: frete.prazo_dias_min || 3,
          prazo_dias_max: frete.prazo_dias_max || 7,
        });
      }
    }

    return Array.from(freteMap.values());
  }, [items, allCheckoutProducts, activeFretes]);

  const shippingCost = selectedFrete?.valor || 0;
  const finalTotal = cartFinalPrice + shippingCost;

  const addressFilled = shippingData.street.length >= 3 && shippingData.neighborhood.length >= 2 && shippingData.city.length >= 2 && shippingData.state.length === 2;

  // No auto-selection - user must choose

  // Inline login state
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const { login } = useClienteAuth();

  // Cupom state
  const [cupomCode, setCupomCode] = useState('');
  const [cupomApplied, setCupomApplied] = useState<{ tipo: string; valor: number; codigo: string } | null>(null);

  const totalWithCupom = cupomApplied
    ? (cupomApplied.tipo === 'percentual'
      ? finalTotal - Math.round(finalTotal * cupomApplied.valor / 100)
      : Math.max(0, finalTotal - cupomApplied.valor))
    : finalTotal;

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
      if (currentStep === 'identification') {
        setCurrentStep('customer');
      }
    }
  }, [isLoggedIn, cliente, enderecoPadrao]);

  useEffect(() => {
    if (!authLoading) {
      if (!exigirCadastro && currentStep === 'identification') {
        setCurrentStep('customer');
      }
    }
  }, [exigirCadastro, authLoading]);

  useEffect(() => {
    if (items.length > 0) {
      firePixelEvent('InitiateCheckout', { value: cartFinalPrice / 100, currency: 'BRL', num_items: items.reduce((s, i) => s + i.quantity, 0) });
    }
  }, []);

  // Social proof
  const names = ['Maria S.', 'João P.', 'Ana L.', 'Carlos M.', 'Juliana R.', 'Pedro A.'];
  useEffect(() => {
    const show = () => { toast(`🎉 ${names[Math.floor(Math.random() * names.length)]} acabou de garantir o seu!`, { icon: <ShoppingBag className="h-5 w-5 text-primary" />, duration: 4000 }); };
    const t = setTimeout(() => { show(); const i = setInterval(show, 15000); return () => clearInterval(i); }, 7000);
    return () => clearTimeout(t);
  }, []);

  // Monitor payment
  useEffect(() => {
    if (!pixData?.txid) return;
    intervalRef.current = setInterval(async () => {
      try {
        const r = await fetch(`https://abacate-5eo1.onrender.com/api/payment-status/${pixData.txid}`);
        const d = await r.json();
        if (['paid','approved','confirmed','completed'].includes(d.status?.toLowerCase())) {
          clearInterval(intervalRef.current!);
          setPaymentConfirmed(true);
          toast.success('✅ Pagamento confirmado!');
          const start = Date.now();
          const pi = setInterval(() => {
            const p = Math.min(((Date.now() - start) / 10000) * 100, 100);
            setTransitionProgress(p);
            if (Date.now() - start >= 10000) { clearInterval(pi); clearCart(); navigate('/sucesso'); }
          }, 100);
        }
      } catch {}
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [pixData?.txid]);

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
    total: totalWithCupom,
    cliente: { nome: customerData.name, email: customerData.email, telefone: customerData.cellphone, cpf: customerData.taxId },
    endereco: etapa !== 'customer' ? { cep: shippingData.zipCode, rua: shippingData.street, numero: shippingData.number, complemento: shippingData.complement, bairro: shippingData.neighborhood, cidade: shippingData.city, estado: shippingData.state } : null,
    utms: {},
  });

  const goNext = () => {
    if (currentStep === 'customer' && validate('customer')) {
      carrinhosApi.save(buildCartData('customer')).catch(() => {});
      setCurrentStep('shipping');
    } else if (currentStep === 'shipping') {
      if (!validate('shipping')) return;
      if (activeFretes.length > 0 && !selectedFrete) {
        toast.error('Selecione uma opção de frete para continuar');
        return;
      }
      carrinhosApi.save(buildCartData('shipping')).catch(() => {});
      setCurrentStep('payment');
    }
  };

  const applyCupom = async () => {
    if (!cupomCode.trim()) return;
    try {
      const r = await cuponsApi.validar(lojaId, cupomCode.trim());
      setCupomApplied({ tipo: r.tipo, valor: r.valor, codigo: r.codigo });
      toast.success(`Cupom ${r.codigo} aplicado!`);
    } catch (e: any) { toast.error(e.message || 'Cupom inválido'); }
  };

  const handleGeneratePix = async () => {
    setIsLoading(true);
    firePixelEvent('AddPaymentInfo', { value: totalWithCupom / 100, currency: 'BRL', num_items: items.reduce((s, i) => s + i.quantity, 0) });
    try {
      const desc = items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
      const r = await fetch('/api/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalWithCupom,
          description: desc,
          customer: { name: customerData.name, email: customerData.email, cellphone: customerData.cellphone, taxId: customerData.taxId },
          loja_id: lojaId,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setPixData(data);
      toast.success('QR Code Pix gerado!');

      pedidosApi.create({
        loja_id: lojaId,
        itens: items.map(i => ({ product_id: i.product.id, name: i.product.name, image: i.product.image, slug: i.product.slug || '', quantity: i.quantity, price: i.product.price, variacao: i.selectedColor || i.selectedSize || null })),
        subtotal: totalPrice,
        desconto: discountAmount + (cupomApplied ? (cupomApplied.tipo === 'percentual' ? Math.round(finalTotal * cupomApplied.valor / 100) : cupomApplied.valor) : 0),
        frete: selectedFrete?.valor || 0,
        frete_nome: selectedFrete?.nome || null,
        total: totalWithCupom,
        cupom: cupomApplied ? { codigo: cupomApplied.codigo, tipo: cupomApplied.tipo, valor: cupomApplied.valor } : null,
        pagamento: { metodo: 'pix', txid: data.txid, pix_code: data.pix_code, pago_em: null },
        cliente: { nome: customerData.name, email: customerData.email, telefone: customerData.cellphone, cpf: customerData.taxId },
        endereco: { cep: shippingData.zipCode, rua: shippingData.street, numero: shippingData.number, complemento: shippingData.complement, bairro: shippingData.neighborhood, cidade: shippingData.city, estado: shippingData.state },
        utms: {},
      }).catch(e => console.warn('[PEDIDO]', e));

      carrinhosApi.save({ ...buildCartData('payment'), pix_code: data.pix_code, txid: data.txid }).catch(() => {});
    } catch (e: any) { toast.error(e.message || 'Erro ao gerar pagamento'); }
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
    } finally {
      setLoginLoading(false);
    }
  };

  const visibleSteps = currentStep === 'identification'
    ? [{ id: 'identification', label: 'Identificação', icon: LogIn }, { id: 'customer', label: 'Dados', icon: User }, { id: 'shipping', label: 'Entrega', icon: Truck }, { id: 'payment', label: 'Pagamento', icon: CreditCard }]
    : [{ id: 'customer', label: 'Dados', icon: User }, { id: 'shipping', label: 'Entrega', icon: Truck }, { id: 'payment', label: 'Pagamento', icon: CreditCard }];

  const stepIdx = visibleSteps.findIndex(s => s.id === currentStep);

  // ── Inline Order Summary JSX ──
  const displayShippingCost = selectedFrete?.valor ?? null;
  const displayTotal = totalWithCupom;

  const orderSummaryJSX = (
    <div className="bg-secondary/80 rounded-3xl p-5 border border-border">
      <h3 className="font-bold text-foreground mb-3">Resumo do Pedido</h3>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <img src={item.product.image} alt={item.product.name} className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground line-clamp-2">{item.product.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                    className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                    className="h-6 w-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.product.id, item.selectedSize, item.selectedColor)}
                  className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
            <span className="text-sm font-semibold text-foreground shrink-0">{formatPrice(item.product.price * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-3 pt-3 space-y-1.5">
        <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>{formatPrice(totalPrice)}</span></div>
        {discountPercent > 0 && <div className="flex justify-between text-sm text-primary"><span>Desconto ({discountPercent}%)</span><span>-{formatPrice(discountAmount)}</span></div>}
        {cupomApplied && <div className="flex justify-between text-sm text-primary"><span>Cupom {cupomApplied.codigo}</span><span>-{cupomApplied.tipo === 'percentual' ? formatPrice(Math.round(finalTotal * cupomApplied.valor / 100)) : formatPrice(cupomApplied.valor)}</span></div>}
        {selectedFrete !== null && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Frete ({selectedFrete.nome})</span>
            <span className={selectedFrete.valor === 0 ? 'text-primary font-semibold' : ''}>
              {selectedFrete.valor === 0 ? 'Grátis' : formatPrice(selectedFrete.valor)}
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

  if (items.length === 0 && !pixData) {
    return <div className="container py-20 text-center"><h1 className="text-2xl font-bold">Seu carrinho está vazio</h1><Button asChild className="mt-6"><Link to="/">Ver Produtos</Link></Button></div>;
  }

  // ── Step Progress Bar (inline) ──
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

      {/* Desktop: 2-column layout (form left, summary right) - responsive widths */}
      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 lg:items-start">
        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 lg:p-8">
          {/* INLINE FORM CONTENT */}
          <div className="space-y-4">
            {/* Payment confirmed transition */}
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
                <button onClick={() => setCurrentStep('customer')} className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
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
                {/* Mobile: show summary inline */}
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
                {addressFilled && computedFretes.length > 0 && (
                  <div className="space-y-3">
                    <Label className="flex items-center gap-1.5 font-semibold"><Truck className="h-4 w-4" /> Opções de Entrega</Label>
                    {computedFretes.map((f: any, i: number) => {
                      const freteName = f.nome || `Frete ${i + 1}`;
                      const isSelected = selectedFrete?.nome === freteName;
                      const deliveryText = getDeliveryDateRange(f.prazo_dias_min || 3, f.prazo_dias_max || 7);
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedFrete({ nome: freteName, valor: f.valor || 0, prazo: `${f.prazo_dias_min || 3}-${f.prazo_dias_max || 7} dias` })}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-background hover:border-primary/50'}`}
                        >
                          <div className="flex items-center gap-3">
                            {isSelected
                              ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                              : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                            }
                            <div className="text-left">
                              <p className="text-sm font-medium text-foreground">{freteName}</p>
                              <p className="text-xs text-muted-foreground">{deliveryText}</p>
                            </div>
                          </div>
                          <span className={`text-sm ${f.valor === 0 ? 'text-primary font-bold' : 'text-foreground font-semibold'}`}>
                            {f.valor === 0 ? 'Grátis' : formatPrice(f.valor)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Mobile: show summary inline */}
                <div className="lg:hidden">{orderSummaryJSX}</div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep('customer')} className="flex-1 rounded-full">Voltar</Button>
                  <Button onClick={goNext} className="flex-1 rounded-full font-bold bg-primary hover:bg-primary/90">Continuar <ChevronRight className="h-4 w-4 ml-1" /></Button>
                </div>
              </div>
            )}

            {/* ── PAYMENT ── */}
            {!paymentConfirmed && currentStep === 'payment' && !pixData && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Pagamento via PIX</h2>

                <div className="flex gap-2">
                  <Input placeholder="Cupom de desconto" value={cupomCode} onChange={e => setCupomCode(e.target.value)} />
                  <Button variant="outline" onClick={applyCupom} disabled={!!cupomApplied}>Aplicar</Button>
                </div>
                {cupomApplied && <p className="text-xs text-primary font-semibold">✅ Cupom {cupomApplied.codigo} aplicado ({cupomApplied.tipo === 'percentual' ? `${cupomApplied.valor}%` : formatPrice(cupomApplied.valor)} de desconto)</p>}

                {/* Mobile: show summary inline */}
                <div className="lg:hidden">{orderSummaryJSX}</div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep('shipping')} className="flex-1 rounded-full">Voltar</Button>
                  <Button onClick={handleGeneratePix} disabled={isLoading} className="flex-1 gap-2 rounded-full font-bold">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Gerar PIX
                  </Button>
                </div>
              </div>
            )}

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
