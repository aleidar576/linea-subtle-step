import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// 🔗 WEBHOOK: Confirmação de Pagamento
// ============================================
// Este endpoint recebe POSTs com dados de transação.
// Futuramente, disparará o evento Purchase via CAPI
// para todos os pixels que possuem access_token.
// O corpo da requisição será definido conforme integração.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    console.log('📊 Webhook received:', JSON.stringify(body));

    // TODO: Quando o formato do body estiver definido:
    // 1. Extrair transaction_id, valor, email, etc.
    // 2. Buscar pixels ativos com access_token no DB
    // 3. Disparar Purchase via Facebook CAPI e TikTok Events API
    // 4. Registrar o evento no banco para auditoria

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received. Purchase event dispatch will be configured in future updates.',
        received_at: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
