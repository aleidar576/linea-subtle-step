// ============================================
// 💳 Assinaturas & Faturamento API (Stripe)
// Strangler Fig — Extraído de api/loja-extras.js
// ============================================

const connectDB = require('../lib/mongodb.js');
const jwt = require('jsonwebtoken');
const { getSubscriptionService } = require('../lib/services/assinaturas');

const JWT_SECRET = process.env.JWT_SECRET;

function verifyLojista(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role !== 'lojista') return null;
    return decoded;
  } catch { return null; }
}

// Desabilitar bodyParser da Vercel para receber raw body (necessário para webhook Stripe)
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { scope } = req.query;
  const method = req.method;

  const stripeService = getSubscriptionService('stripe');

  // === CRON: Cobrança Semanal de Taxas ===
  if (scope === 'cron-taxas' && method === 'GET') {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.authorization;
    if (cronSecret && (!authHeader || authHeader !== `Bearer ${cronSecret}`)) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    try {
      const result = await stripeService.processarCronTaxas();
      if (result.error) return res.status(result.httpStatus || 500).json({ error: result.error });
      return res.json(result.data);
    } catch (err) {
      console.error('[CRON-TAXAS] Erro geral:', err);
      return res.status(500).json({ error: 'Erro ao processar cron de taxas' });
    }
  }

  // === PAGAMENTO MANUAL DE TAXAS ===
  if (scope === 'pagar-taxas-manual' && method === 'POST') {
    const user = verifyLojista(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    try {
      const result = await stripeService.pagarTaxasManual({ user });
      if (result.error) return res.status(result.httpStatus || 500).json({ error: result.error });
      return res.json(result.data);
    } catch (err) {
      console.error('[PAGAR-TAXAS-MANUAL] ❌ Falha completa:', err);
      const msg = err?.raw?.message || err?.message || 'Erro desconhecido';
      return res.status(400).json({ error: `Falha no pagamento: ${msg}. Atualize seu método de pagamento no portal Stripe e tente novamente.` });
    }
  }

  // Ler raw body uma única vez
  const rawBody = method !== 'GET' && method !== 'DELETE' && method !== 'OPTIONS'
    ? await getRawBody(req)
    : null;

  // Para o webhook, NÃO fazemos parse — usamos o rawBody bruto
  if (scope !== 'stripe-webhook' && rawBody) {
    try {
      req.body = JSON.parse(rawBody);
    } catch {
      req.body = {};
    }
  }

  // === STRIPE CHECKOUT (lojista autenticado) ===
  if (scope === 'stripe-checkout' && method === 'POST') {
    const user = verifyLojista(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    try {
      const result = await stripeService.createCheckoutSession({ user, plano_id: req.body.plano_id });
      if (result.error) return res.status(result.httpStatus || 500).json({ error: result.error });
      return res.json(result.data);
    } catch (error) {
      console.error('[STRIPE-CHECKOUT]', error);
      return res.status(500).json({ error: 'Erro ao criar sessão de checkout', details: error.message });
    }
  }

  // === STRIPE WEBHOOK ===
  if (scope === 'stripe-webhook' && method === 'POST') {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error('[STRIPE-WEBHOOK] FATAL: STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET não configurados.');
      return res.status(500).json({ error: 'Stripe não configurado' });
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY);

    let event;
    try {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
      console.log(`[STRIPE-WEBHOOK] ✅ Evento recebido: ${event.type} (id: ${event.id})`);
    } catch (err) {
      console.error('[STRIPE-WEBHOOK] ❌ Falha na verificação de assinatura:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    const result = await stripeService.handleWebhookEvent({ event, rawBody });
    return res.json(result);
  }

  // === STRIPE PORTAL (lojista autenticado) ===
  if (scope === 'stripe-portal' && method === 'POST') {
    const user = verifyLojista(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });

    try {
      const result = await stripeService.createPortalSession({ user });
      if (result.error) return res.status(result.httpStatus || 500).json({ error: result.error });
      return res.json(result.data);
    } catch (error) {
      console.error('[STRIPE-PORTAL]', error);
      return res.status(500).json({ error: 'Erro ao criar sessão do portal', details: error.message });
    }
  }

  return res.status(400).json({ error: 'Escopo inválido ou método não suportado' });
};
