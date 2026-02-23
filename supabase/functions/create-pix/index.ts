import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePixRequest {
  amount: number;
  description?: string;
  customer: {
    name: string;
    email: string;
    cellphone?: string;
    taxId?: string;
  };
  tracking?: {
    utm?: Record<string, string>;
    src?: string;
  };
  fbp?: string;
  fbc?: string;
  user_agent?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: CreatePixRequest = await req.json();
    
    // Validate required fields
    if (!body.amount || body.amount < 100) {
      return new Response(
        JSON.stringify({ error: 'amount deve ser em centavos e no mínimo 100 (R$1,00)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.customer?.name || body.customer.name.length < 2) {
      return new Response(
        JSON.stringify({ error: 'customer.name é obrigatório e deve ter pelo menos 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.customer?.email || !body.customer.email.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'customer.email é obrigatório e deve ser um e-mail válido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read settings from DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceClient = createClient(supabaseUrl, serviceKey);
    
    const { data: settingsData } = await serviceClient
      .from('settings')
      .select('key, value')
      .in('key', ['sealpay_api_url', 'sealpay_api_key']);
    
    const settingsMap = Object.fromEntries((settingsData || []).map((s: any) => [s.key, s.value]));
    const SEALPAY_API_URL = settingsMap['sealpay_api_url'] || 'https://abacate-5eo1.onrender.com/create-pix';
    const SEALPAY_API_KEY = settingsMap['sealpay_api_key'] || Deno.env.get('SEALPAY_API_KEY');
    
    if (!SEALPAY_API_KEY) {
      console.error('SEALPAY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Erro de configuração do servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean phone number - only digits
    const cleanPhone = (body.customer.cellphone || '').replace(/\D/g, '');
    
    // Build the payload for SealPay
    const payload = {
      amount: body.amount,
      description: body.description || 'Pagamento Livraria Fé & Amor',
      customer: {
        name: body.customer.name,
        email: body.customer.email,
        cellphone: cleanPhone,
        taxId: (body.customer.taxId || '').replace(/\D/g, ''),
      },
      tracking: {
        utm: body.tracking?.utm || {},
        src: body.tracking?.src || '',
      },
      api_key: SEALPAY_API_KEY,
      fbp: body.fbp || '',
      fbc: body.fbc || '',
      user_agent: body.user_agent || '',
    };

    console.log('Creating Pix payment with payload:', { ...payload, api_key: '[REDACTED]' });

    // Call SealPay API
    const response = await fetch(SEALPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('SealPay API error:', response.status, data);
      return new Response(
        JSON.stringify({ error: data.message || 'Erro ao criar pagamento Pix' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure QR code has proper base64 prefix
    if (data.pix_qr_code && !data.pix_qr_code.startsWith('data:image')) {
      data.pix_qr_code = `data:image/png;base64,${data.pix_qr_code}`;
    }

    console.log('Pix payment created successfully:', { txid: data.txid });

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Pix payment:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
