import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Copy, Check, Gift, ChevronRight, Truck, MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { z } from 'zod';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
import { paymentsApi } from '@/services/api';
import { pedidosApi, carrinhosApi } from '@/services/saas-api';
import { useHomepageSettings } from '@/hooks/useHomepageSettings';
import { useTracking } from '@/hooks/useTracking';
import { toast } from 'sonner';
import { UtmLink } from '@/components/UtmLink';
import { useTrackingData } from '@/hooks/useUtmParams';

// Social proof name lists by gender
const maleNames = [
  'João P.', 'Carlos A.', 'Lucas G.', 'Rafael D.', 'Gustavo H.', 'Pedro M.',
  'Rodrigo T.', 'Bruno S.', 'Thiago R.', 'Felipe A.', 'Diego F.', 'Ricardo B.'
];
const femaleNames = [
  'Maria S.', 'Ana L.', 'Juliana R.', 'Fernanda B.', 'Camila F.', 'Beatriz C.',
  'Patricia N.', 'Amanda V.', 'Larissa M.', 'Mariana L.', 'Carolina P.', 'Vanessa C.'
];
const unisexNames = [...femaleNames, ...maleNames];

// Helper: calculate delivery date range (same logic as ProductPage)
function getDeliveryDateRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() + 3);
  const end = new Date(now);
  end.setDate(end.getDate() + 5);
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = months[start.getMonth()];
  const endMonth = months[end.getMonth()];
  if (startMonth === endMonth) {
    return `Receba até ${startDay} - ${endDay} de ${endMonth}`;
  }
  return `Receba até ${startDay} de ${startMonth} - ${endDay} de ${endMonth}`;
}

// Validation schemas for each step
const customerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().trim().email('E-mail inválido'),
  cellphone: z.string().min(10, 'Celular inválido'),
  taxId: z.string().min(11, 'CPF inválido'),
});

const shippingSchema = z.object({
  zipCode: z.string().min(8, 'CEP inválido'),
  street: z.string().min(3, 'Endereço obrigatório'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'Estado inválido'),
});

interface PixResponse {
  pix_qr_code: string;
  pix_code: string;
  txid: string;
  error?: string;
}

type CheckoutStep = 'customer' | 'shipping' | 'payment';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart, addToCart, discountPercent, discountAmount, finalPrice: cartFinalPrice } = useCart();
  const { getTrackingPayload } = useTrackingData();
  const { trackInitiateCheckout, trackAddPaymentInfo } = useTracking();
  const { data: allProducts = [] } = useProducts();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('customer');
  
  // Customer data
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    cellphone: '',
    taxId: '',
  });

  // Shipping data
  const [shippingData, setShippingData] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });

  // CEP loading state
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepFound, setCepFound] = useState(false);

  // Shipping option
  const [selectedShipping, setSelectedShipping] = useState<'free' | 'express'>('free');
  const shippingCost = selectedShipping === 'express' ? 1490 : 0; // R$ 14,90 for express

  // Upsell
  const { data: homepageSettings } = useHomepageSettings();
  const upsellCfg = homepageSettings?.upsell;
  const [acceptedUpsell, setAcceptedUpsell] = useState(false);
  const currentProductIds = items.map(i => i.product.id);
  const upsellProduct = upsellCfg?.enabled !== false
    ? (upsellCfg?.product_slug
        ? allProducts.find(p => p.slug === upsellCfg.product_slug && !currentProductIds.includes(p.id))
        : allProducts.find(p => !currentProductIds.includes(p.id)))
    : null;
  const upsellDiscountPct = upsellCfg?.discount_percent || 50;
  const upsellPrice = upsellProduct ? Math.round(upsellProduct.price * (1 - upsellDiscountPct / 100)) : 0;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total with upsell and shipping
  const upsellTotal = acceptedUpsell && upsellProduct ? upsellPrice : 0;
  const finalTotal = cartFinalPrice + upsellTotal + shippingCost;

  // Social proof notifications - names based on product gender config
  const socialProofNames = (() => {
    const gender = items[0]?.product?.socialProofGender || 'unisex';
    if (gender === 'male') return maleNames;
    if (gender === 'female') return femaleNames;
    return unisexNames;
  })();

  const showSocialProofNotification = useCallback(() => {
    const randomName = socialProofNames[Math.floor(Math.random() * socialProofNames.length)];
    toast(`🎉 ${randomName} acabou de garantir o seu!`, {
      icon: <ShoppingBag className="h-5 w-5 text-primary" />,
      duration: 4000,
    });
  }, [socialProofNames]);

  useEffect(() => {
    // Show first notification after 5-10 seconds
    const initialDelay = Math.floor(Math.random() * 5000) + 5000;
    
    const showAndScheduleNext = () => {
      showSocialProofNotification();
      // Schedule next notification with random delay 10-25 seconds
      const nextDelay = Math.floor(Math.random() * 15000) + 10000;
      setTimeout(showAndScheduleNext, nextDelay);
    };

    const initialTimeout = setTimeout(showAndScheduleNext, initialDelay);

    return () => clearTimeout(initialTimeout);
  }, [showSocialProofNotification]);

  // Fire InitiateCheckout on mount
  useEffect(() => {
    if (items.length > 0) {
      trackInitiateCheckout({
        value: cartFinalPrice / 100,
        currency: 'BRL',
        num_items: items.reduce((sum, i) => sum + i.quantity, 0),
        contents: items.map(i => ({ id: i.product.id, quantity: i.quantity, price: i.product.price / 100 })),
      });
    }
  }, []); // only on mount

  // Monitor payment status when pixData is available
  useEffect(() => {
    if (pixData?.txid) {
      setCheckingStatus(true);
      
      intervalRef.current = setInterval(async () => {
        try {
          const apiBase = window.location.hostname.includes('lovable.app')
            ? 'https://pandora-five-amber.vercel.app/api'
            : '/api';
          const resStatus = await fetch(
            `${apiBase}/create-pix?scope=status&txid=${pixData.txid}`
          );
          const statusData = await resStatus.json();
          console.log("🔁 Status recebido:", statusData);

          const status = statusData.status?.toLowerCase();

          if (["paid", "approved", "confirmed", "completed"].includes(status)) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            setCheckingStatus(false);
            setPaymentConfirmed(true);
            toast.success("✅ Pagamento confirmado!");

            // Marcar carrinho como convertido e pedido como pago
            if (pixData.txid) {
              // Find and update pedido status to pago (fire-and-forget)
              carrinhosApi.save({ loja_id: 'demo', etapa: 'payment', cliente: { email: customerData.email }, convertido: true, txid: pixData.txid }).catch(() => {});
            }

            // Tela de transição de 10 segundos com barra de progresso
            const startTime = Date.now();
            const duration = 10000;
            const progressInterval = setInterval(() => {
              const elapsed = Date.now() - startTime;
              const progress = Math.min((elapsed / duration) * 100, 100);
              setTransitionProgress(progress);
              if (elapsed >= duration) {
                clearInterval(progressInterval);
                clearCart();
                navigate('/sucesso');
              }
            }, 100);
          }
        } catch (err) {
          console.warn("Erro ao checar status:", err);
        }
      }, 5000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [pixData?.txid, customerData.email, customerData.cellphone, finalTotal, clearCart, navigate]);

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleShippingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-fetch address when CEP has 8 digits
    if (name === 'zipCode') {
      const cleanCep = value.replace(/\D/g, '');
      if (cleanCep.length === 8) {
        fetchAddressByCep(cleanCep);
      }
    }
  };

  const fetchAddressByCep = async (cep: string) => {
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setShippingData(prev => ({
        ...prev,
        street: data.logradouro || prev.street,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));

      // Clear errors for auto-filled fields
      setErrors(prev => ({
        ...prev,
        street: '',
        neighborhood: '',
        city: '',
        state: '',
      }));

      setCepFound(true);
      toast.success('Endereço encontrado! Escolha a opção de frete.');
    } catch (err) {
      console.warn('Erro ao buscar CEP:', err);
      toast.error('Erro ao buscar endereço');
    } finally {
      setLoadingCep(false);
    }
  };

  const validateCustomerStep = () => {
    const result = customerSchema.safeParse(customerData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const validateShippingStep = () => {
    const result = shippingSchema.safeParse(shippingData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  // Helper: build cart data for saving
  const buildCartData = (etapa: string) => ({
    loja_id: 'demo', // placeholder for demo store
    etapa,
    itens: items.map(i => ({ product_id: i.product.id, name: i.product.name, quantity: i.quantity, price: i.product.price })),
    total: finalTotal,
    cliente: { nome: customerData.name, email: customerData.email, telefone: customerData.cellphone, cpf: customerData.taxId },
    endereco: etapa !== 'customer' ? { cep: shippingData.zipCode, rua: shippingData.street, numero: shippingData.number, complemento: shippingData.complement, bairro: shippingData.neighborhood, cidade: shippingData.city, estado: shippingData.state } : null,
    utms: getTrackingPayload().utm || {},
  });

  const goToNextStep = () => {
    if (currentStep === 'customer') {
      if (validateCustomerStep()) {
        // Save cart on step transition (NOT per keystroke)
        carrinhosApi.save(buildCartData('customer')).catch(() => {});
        setCurrentStep('shipping');
      }
    } else if (currentStep === 'shipping') {
      if (validateShippingStep()) {
        // Save cart on step transition
        carrinhosApi.save(buildCartData('shipping')).catch(() => {});
        setCurrentStep('payment');
      }
    }
  };

  const goToPrevStep = () => {
    if (currentStep === 'shipping') {
      setCurrentStep('customer');
    } else if (currentStep === 'payment') {
      setCurrentStep('shipping');
    }
  };

  const handleGeneratePix = async () => {
    setIsLoading(true);

    // 📊 AddPaymentInfo
    trackAddPaymentInfo({
      value: finalTotal / 100,
      currency: 'BRL',
      num_items: items.reduce((sum, i) => sum + i.quantity, 0),
      contents: items.map(i => ({ id: i.product.id, quantity: i.quantity, price: i.product.price / 100 })),
    });
    
    try {
      let allItems = [...items];
      if (acceptedUpsell && upsellProduct) {
        allItems.push({ product: { ...upsellProduct, price: upsellPrice }, quantity: 1 } as any);
      }
      const description = allItems.map(i => {
        const colorLabel = i.selectedColor ? ` ${i.selectedColor}` : '';
        const sizeLabel = i.selectedSize ? ` Tam:${i.selectedSize}` : '';
        return `${i.product.name}${colorLabel}${sizeLabel} x${i.quantity}`;
      }).join(', ');
      
      const trackingData = getTrackingPayload();

      const data = await paymentsApi.createPix({
        amount: finalTotal,
        description,
        customer: {
          name: customerData.name,
          email: customerData.email,
          cellphone: customerData.cellphone || '',
          taxId: customerData.taxId || '',
        },
        tracking: { utm: trackingData.utm, src: trackingData.src },
        fbp: trackingData.fbp,
        fbc: trackingData.fbc,
        user_agent: trackingData.user_agent,
      });

      if (data?.error) throw new Error(data.error);

      if (data) {
        setPixData(data);
        toast.success('QR Code Pix gerado com sucesso!');

        // REGRA CRÍTICA: Criar pedido IMEDIATAMENTE com status pendente
        const pedidoData = {
          loja_id: 'demo',
          itens: allItems.map(i => ({
            product_id: i.product.id,
            name: i.product.name,
            image: i.product.image,
            slug: i.product.slug || '',
            quantity: i.quantity,
            price: i.product.price,
            variacao: i.selectedColor || i.selectedSize || null,
          })),
          subtotal: totalPrice,
          desconto: discountAmount,
          frete: shippingCost,
          total: finalTotal,
          pagamento: { metodo: 'pix', txid: data.txid, pix_code: data.pix_code, pago_em: null },
          cliente: { nome: customerData.name, email: customerData.email, telefone: customerData.cellphone, cpf: customerData.taxId },
          endereco: { cep: shippingData.zipCode, rua: shippingData.street, numero: shippingData.number, complemento: shippingData.complement, bairro: shippingData.neighborhood, cidade: shippingData.city, estado: shippingData.state },
          utms: trackingData.utm || {},
        };
        pedidosApi.create(pedidoData).catch(e => console.warn('[PEDIDO] Erro ao criar:', e));

        // Atualizar carrinho com pix_code
        carrinhosApi.save({
          ...buildCartData('payment'),
          pix_code: data.pix_code,
          txid: data.txid,
        }).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar pagamento';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (pixData?.pix_code) {
      await navigator.clipboard.writeText(pixData.pix_code);
      setCopied(true);
      toast.success('Código Pix copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const steps = [
    { id: 'customer', label: 'Dados', icon: CreditCard },
    { id: 'shipping', label: 'Entrega', icon: Truck },
    { id: 'payment', label: 'Pagamento', icon: MapPin },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  if (items.length === 0 && !pixData) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Seu carrinho está vazio
          </h1>
          <Button asChild className="mt-6">
            <UtmLink to="/">Ver Produtos</UtmLink>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 lg:py-10">
        <UtmLink
          to="/cart"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao carrinho
        </UtmLink>

        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div 
                    className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                      index <= currentStepIndex 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className={`mt-2 text-xs font-semibold ${
                    index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div 
                    className={`mx-2 h-1 flex-1 rounded-full transition-colors ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-secondary'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Customer Data */}
              {currentStep === 'customer' && (
                <motion.div
                  key="customer"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6"
                >
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">
                    Seus Dados
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Preencha seus dados para continuar
                  </p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={customerData.name}
                        onChange={handleCustomerChange}
                        placeholder="Seu nome completo"
                        className={`rounded-xl ${errors.name ? 'border-destructive' : ''}`}
                      />
                      {errors.name && (
                        <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={customerData.email}
                        onChange={handleCustomerChange}
                        placeholder="seu@email.com"
                        className={`rounded-xl ${errors.email ? 'border-destructive' : ''}`}
                      />
                      {errors.email && (
                        <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="cellphone">Celular *</Label>
                      <Input
                        id="cellphone"
                        name="cellphone"
                        value={customerData.cellphone}
                        onChange={handleCustomerChange}
                        placeholder="(11) 99999-9999"
                        className={`rounded-xl ${errors.cellphone ? 'border-destructive' : ''}`}
                      />
                      {errors.cellphone && (
                        <p className="mt-1 text-xs text-destructive">{errors.cellphone}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="taxId">CPF *</Label>
                      <Input
                        id="taxId"
                        name="taxId"
                        value={customerData.taxId}
                        onChange={handleCustomerChange}
                        placeholder="000.000.000-00"
                        className={`rounded-xl ${errors.taxId ? 'border-destructive' : ''}`}
                      />
                      {errors.taxId && (
                        <p className="mt-1 text-xs text-destructive">{errors.taxId}</p>
                      )}
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="mt-6 w-full gap-2 rounded-full font-bold"
                    onClick={goToNextStep}
                  >
                    Continuar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Shipping */}
              {currentStep === 'shipping' && (
                <motion.div
                  key="shipping"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="rounded-2xl border border-border bg-card p-5 sm:p-6"
                >
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">
                    Endereço de Entrega
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Onde devemos entregar seu pedido?
                  </p>

                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="zipCode">CEP *</Label>
                        <div className="relative">
                          <Input
                            id="zipCode"
                            name="zipCode"
                            value={shippingData.zipCode}
                            onChange={handleShippingChange}
                            placeholder="00000-000"
                            maxLength={9}
                            className={`rounded-xl ${errors.zipCode ? 'border-destructive' : ''}`}
                          />
                          {loadingCep && (
                            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        {errors.zipCode && (
                          <p className="mt-1 text-xs text-destructive">{errors.zipCode}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="street">Endereço *</Label>
                      <Input
                        id="street"
                        name="street"
                        value={shippingData.street}
                        onChange={handleShippingChange}
                        placeholder="Rua, Avenida..."
                        className={`rounded-xl ${errors.street ? 'border-destructive' : ''}`}
                      />
                      {errors.street && (
                        <p className="mt-1 text-xs text-destructive">{errors.street}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="number">Número *</Label>
                        <Input
                          id="number"
                          name="number"
                          value={shippingData.number}
                          onChange={handleShippingChange}
                          placeholder="123"
                          className={`rounded-xl ${errors.number ? 'border-destructive' : ''}`}
                        />
                        {errors.number && (
                          <p className="mt-1 text-xs text-destructive">{errors.number}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                          id="complement"
                          name="complement"
                          value={shippingData.complement}
                          onChange={handleShippingChange}
                          placeholder="Apto, Bloco..."
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        name="neighborhood"
                        value={shippingData.neighborhood}
                        onChange={handleShippingChange}
                        placeholder="Seu bairro"
                        className={`rounded-xl ${errors.neighborhood ? 'border-destructive' : ''}`}
                      />
                      {errors.neighborhood && (
                        <p className="mt-1 text-xs text-destructive">{errors.neighborhood}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="city">Cidade *</Label>
                        <Input
                          id="city"
                          name="city"
                          value={shippingData.city}
                          onChange={handleShippingChange}
                          placeholder="Sua cidade"
                          className={`rounded-xl ${errors.city ? 'border-destructive' : ''}`}
                        />
                        {errors.city && (
                          <p className="mt-1 text-xs text-destructive">{errors.city}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="state">UF *</Label>
                        <Input
                          id="state"
                          name="state"
                          value={shippingData.state}
                          onChange={handleShippingChange}
                          placeholder="SP"
                          maxLength={2}
                          className={`rounded-xl ${errors.state ? 'border-destructive' : ''}`}
                        />
                        {errors.state && (
                          <p className="mt-1 text-xs text-destructive">{errors.state}</p>
                        )}
                      </div>
                    </div>

                    {/* Shipping Options */}
                    {cepFound && (
                      <div className="mt-4 rounded-2xl border border-border bg-secondary/50 p-4">
                        <h3 className="flex items-center gap-2 font-semibold text-foreground">
                          <Truck className="h-4 w-4 text-primary" />
                          Opções de Frete
                        </h3>
                        <div className="mt-3 space-y-2">
                          {/* Free Shipping */}
                          <label 
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                              selectedShipping === 'free' 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="shipping"
                              value="free"
                              checked={selectedShipping === 'free'}
                              onChange={() => setSelectedShipping('free')}
                              className="h-4 w-4 text-primary accent-primary"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-foreground">Frete Grátis</p>
                              <p className="text-xs text-muted-foreground">{getDeliveryDateRange()}</p>
                            </div>
                            <span className="font-bold text-primary">Grátis</span>
                          </label>

                          {/* Express Shipping */}
                          <label 
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                              selectedShipping === 'express' 
                                ? 'border-primary bg-primary/5' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="shipping"
                              value="express"
                              checked={selectedShipping === 'express'}
                              onChange={() => setSelectedShipping('express')}
                              className="h-4 w-4 text-primary accent-primary"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-foreground">Frete ⚡️ FULL</p>
                              <p className="text-xs text-muted-foreground">Chegará amanhã</p>
                            </div>
                            <span className="font-semibold text-foreground">{formatPrice(1287)}</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button 
                      size="lg" 
                      variant="outline"
                      className="flex-1 rounded-full"
                      onClick={goToPrevStep}
                    >
                      Voltar
                    </Button>
                    <Button 
                      size="lg" 
                      className="flex-1 gap-2 rounded-full font-bold"
                      onClick={goToNextStep}
                    >
                      Continuar
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Payment */}
              {currentStep === 'payment' && !pixData && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-full max-w-full overflow-hidden space-y-4 sm:space-y-6"
                >
                  {/* Upsell Offer */}
                  {upsellProduct && (
                    <div className="w-full rounded-2xl border-2 border-primary bg-primary/5 p-4 sm:p-5 overflow-hidden">
                      <div className="flex flex-col gap-3">
                         <div className="flex items-center gap-2">
                          <Gift className="h-5 w-5 flex-shrink-0 text-primary" />
                          <h3 className="font-bold text-sm sm:text-base text-foreground">
                            {upsellCfg?.title || `🔥 Oferta Exclusiva - ${upsellDiscountPct}% OFF!`}
                          </h3>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <img 
                            src={upsellProduct.image} 
                            alt={upsellProduct.name}
                            className="h-16 w-12 rounded-xl object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground line-clamp-2">{upsellProduct.name}</p>
                            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(upsellProduct.price)}
                              </span>
                              <span className="text-base font-bold text-primary">
                                {formatPrice(upsellPrice)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 pt-1">
                          <Checkbox 
                            id="upsell" 
                            checked={acceptedUpsell}
                            onCheckedChange={(checked) => setAcceptedUpsell(checked === true)}
                            className="rounded-md"
                          />
                          <Label htmlFor="upsell" className="text-xs sm:text-sm cursor-pointer leading-tight font-medium">
                            {upsellCfg?.cta_text || `Sim, quero adicionar com ${upsellDiscountPct}% OFF!`}
                          </Label>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-6 overflow-hidden">
                    <h2 className="text-lg font-bold text-foreground sm:text-xl">
                      Pagamento via Pix
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                      Clique para gerar o QR Code
                    </p>

                    <div className="mt-4 rounded-2xl bg-secondary p-4 text-center">
                      <p className="text-xs text-muted-foreground">Total a pagar</p>
                      <p className="mt-1 text-3xl font-bold text-primary sm:text-4xl">
                        {formatPrice(finalTotal)}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <Button 
                        size="lg" 
                        variant="outline"
                        className="w-full rounded-full sm:flex-1"
                        onClick={goToPrevStep}
                      >
                        Voltar
                      </Button>
                      <Button 
                        size="lg" 
                        className="w-full rounded-full font-bold sm:flex-1"
                        onClick={handleGeneratePix}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          'Gerar QR Code Pix'
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Pix QR Code Display */}
              {pixData && !paymentConfirmed && (
                <motion.div
                  key="pix-display"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-full rounded-2xl border border-border bg-card p-4 sm:p-6 text-center overflow-hidden"
                >
                  <h2 className="text-lg font-bold text-foreground sm:text-xl">
                    Escaneie o QR Code
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                    Use o app do seu banco para pagar
                  </p>

                  <div className="mt-5 flex justify-center">
                    <div className="rounded-2xl bg-white p-3">
                      <img
                        src={pixData.pix_qr_code.startsWith('data:') 
                          ? pixData.pix_qr_code 
                          : `data:image/png;base64,${pixData.pix_qr_code}`}
                        alt="QR Code Pix"
                        className="h-48 w-48 sm:h-56 sm:w-56"
                      />
                    </div>
                  </div>

                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold text-foreground sm:text-sm">
                      Ou copie o código Pix
                    </p>
                    <div className="flex gap-2 w-full">
                      <Input
                        readOnly
                        value={pixData.pix_code}
                        className="font-mono text-[10px] flex-1 min-w-0 truncate rounded-xl sm:text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 flex-shrink-0 rounded-xl"
                        onClick={handleCopyCode}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {checkingStatus && (
                    <div className="mt-5 flex items-center justify-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs text-muted-foreground sm:text-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Aguardando confirmação...</span>
                    </div>
                  )}

                  <p className="mt-4 text-[10px] text-muted-foreground sm:text-xs">
                    Após o pagamento, você será redirecionado automaticamente.
                  </p>
                </motion.div>
              )}

              {/* Tela de transição pós-pagamento */}
              {paymentConfirmed && (
                <motion.div
                  key="payment-confirmed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-full max-w-full rounded-2xl border border-border bg-card p-6 sm:p-8 text-center overflow-hidden"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500"
                  >
                    <Check className="h-10 w-10 text-white" />
                  </motion.div>

                  <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                    Pagamento confirmado!
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Processando seu pedido...
                  </p>

                  <div className="mx-auto mt-6 w-full max-w-xs">
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                      <motion.div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${transitionProgress}%` }}
                        transition={{ duration: 0.1 }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {Math.round(transitionProgress)}%
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-muted-foreground">
                    Aguarde, você será redirecionado em instantes...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-2xl border border-border bg-card p-5">
              <h3 className="text-lg font-bold text-foreground">
                Resumo do Pedido
              </h3>
              <div className="mt-4 space-y-3">
                {items.map(item => (
                  <div key={item.product.id} className="flex gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="h-14 w-11 rounded-xl object-cover"
                    />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-foreground">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}

                {acceptedUpsell && upsellProduct && (
                  <div className="flex gap-3 rounded-xl bg-primary/5 p-2">
                    <img
                      src={upsellProduct.image}
                      alt={upsellProduct.name}
                      className="h-14 w-11 rounded-xl object-cover"
                    />
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-foreground">{upsellProduct.name}</p>
                      <p className="text-xs font-medium text-primary">{upsellDiscountPct}% OFF</p>
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {formatPrice(upsellPrice)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">{formatPrice(totalPrice)}</span>
                </div>
                {acceptedUpsell && upsellProduct && (
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Oferta ({upsellDiscountPct}% off)</span>
                    <span className="font-medium text-primary">{formatPrice(upsellPrice)}</span>
                  </div>
                )}
                <div className="mt-1 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Frete {selectedShipping === 'express' ? '(Expresso)' : ''}
                  </span>
                  <span className={`font-medium ${shippingCost === 0 ? 'text-primary' : 'text-foreground'}`}>
                    {shippingCost === 0 ? 'Grátis' : formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CheckoutPage;
