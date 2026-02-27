// ============================================
// 🧩 Loja Extras API (Fretes + Cupons + Mídias + Temas + Pixels + Páginas)
// Serverless Function 12/12 — Vercel Hobby Limit
// ============================================

const mongoose = require('mongoose');
const connectDB = require('../lib/mongodb.js');
const jwt = require('jsonwebtoken');

// Models
const Frete = require('../models/Frete.js');
const Cupom = require('../models/Cupom.js');
const Loja = require('../models/Loja.js');
const Product = require('../models/Product.js');
const TrackingPixel = require('../models/TrackingPixel.js');
const Pagina = require('../models/Pagina.js');
const Setting = require('../models/Setting.js');
const Lead = require('../models/Lead.js');
const Lojista = require('../models/Lojista.js');
const Plano = require('../models/Plano.js');

// Services (Strategy Pattern)
const { getSubscriptionService } = require('../lib/services/assinaturas');
const { getShippingService } = require('../lib/services/fretes');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('[LOJA-EXTRAS] FATAL: JWT_SECRET não configurado nas variáveis de ambiente.');

function verifyLojista(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role !== 'lojista') return null;
    return decoded;
  } catch { return null; }
}

async function verifyOwnership(user, lojaId) {
  const loja = await Loja.findById(lojaId).lean();
  if (!loja) return false;
  return loja.lojista_id.toString() === user.lojista_id;
}

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { scope, id, loja_id, codigo } = req.query;
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
      console.error('[PAGAR-TAXAS-MANUAL] ❌ Falha:', err.message);
      return res.status(400).json({ error: 'Cartão recusado. Atualize seu método de pagamento no portal Stripe e tente novamente.' });
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

  // === STRIPE CHECKOUT (público-auth: lojista autenticado) ===
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

  // === PUBLIC: Validar cupom (checkout) ===
  if (scope === 'cupom-publico' && method === 'GET') {
    if (!loja_id || !codigo) return res.status(400).json({ error: 'loja_id e codigo são obrigatórios' });
    const cupom = await Cupom.findOne({ loja_id, codigo: codigo.toUpperCase(), is_active: true }).lean();
    if (!cupom) return res.status(404).json({ error: 'Cupom não encontrado ou inativo' });
    if (cupom.validade && new Date(cupom.validade) < new Date()) return res.status(410).json({ error: 'Cupom expirado' });
    if (cupom.limite_usos !== null && cupom.usos >= cupom.limite_usos) return res.status(410).json({ error: 'Cupom esgotado' });
    return res.json({ tipo: cupom.tipo, valor: cupom.valor, valor_minimo_pedido: cupom.valor_minimo_pedido, codigo: cupom.codigo, produtos_ids: cupom.produtos_ids || [] });
  }

  // === PUBLIC: Gateways disponíveis na plataforma ===
  if (scope === 'gateways-disponiveis' && method === 'GET') {
    const setting = await Setting.findOne({ key: 'gateways_ativos', loja_id: null }).lean();
    let config = {};
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) {
          parsed.forEach(id => { config[id] = { ativo: true }; });
        } else {
          config = parsed;
        }
      } catch {}
    }
    return res.json(config);
  }

  // === PUBLIC: Gateway ativo de uma loja (para checkout) ===
  if (scope === 'gateway-loja' && method === 'GET' && loja_id) {
    const lojaDoc = await Loja.findById(loja_id).lean();
    if (!lojaDoc) return res.status(404).json({ error: 'Loja não encontrada' });
    const dono = await Lojista.findById(lojaDoc.lojista_id).lean();
    return res.json({ gateway_ativo: dono?.gateway_ativo || null });
  }

  // === PUBLIC: Fretes de uma loja (sem auth) ===
  if (scope === 'fretes-publico' && method === 'GET' && loja_id) {
    const fretes = await Frete.find({ loja_id, is_active: true }).sort({ ordem_exibicao: 1 }).lean();
    return res.json(fretes);
  }

  // === PUBLIC: Calcular Frete Híbrido (Manuais + Melhor Envio) ===
  if (scope === 'calcular-frete' && method === 'POST') {
    try {
      const { loja_id: bodyLojaId, to_postal_code, items } = req.body || {};
      if (!bodyLojaId || !to_postal_code) {
        return res.status(400).json({ error: 'loja_id e to_postal_code são obrigatórios' });
      }

      const lojaDoc = await Loja.findById(bodyLojaId).lean();
      if (!lojaDoc) return res.status(404).json({ error: 'Loja não encontrada' });

      // 1. Fretes manuais ativos (com soma por produto via fretes_vinculados)
      const fretesDb = await Frete.find({ loja_id: bodyLojaId, is_active: true }).sort({ ordem_exibicao: 1 }).lean();

      const productIds = (items || []).map(i => i.id).filter(Boolean);
      const productsDb = productIds.length ? await Product.find({
        $or: [
          { product_id: { $in: productIds } },
          { _id: { $in: productIds.filter(id => /^[a-f0-9]{24}$/i.test(id)) } },
        ],
        loja_id: bodyLojaId,
      }).lean() : [];

      const manuais = [];
      for (const f of fretesDb) {
        const freteIdStr = f._id.toString();
        let totalPrice = 0;
        let isValid = true;

        for (const item of (items || [])) {
          const qty = Number(item.quantity) || 1;
          const prod = productsDb.find(p =>
            p.product_id === item.id || p._id.toString() === item.id
          );

          if (prod && Array.isArray(prod.fretes_vinculados)) {
            const vinculo = prod.fretes_vinculados.find(v =>
              v.frete_id && v.frete_id.toString() === freteIdStr
            );
            if (vinculo) {
              if (vinculo.exibir_no_produto === false) {
                isValid = false;
                break;
              }
              const val = (vinculo.valor_personalizado !== null && vinculo.valor_personalizado !== undefined)
                ? vinculo.valor_personalizado
                : Number(f.valor) || 0;
              totalPrice += val * qty;
            } else {
              totalPrice += (Number(f.valor) || 0) * qty;
            }
          } else {
            totalPrice += (Number(f.valor) || 0) * qty;
          }
        }

        if (isValid) {
          manuais.push({
            id: freteIdStr,
            name: f.nome,
            price: totalPrice,
            delivery_time: f.prazo_dias_max || f.prazo_dias_min || 0,
            picture: '',
          });
        }
      }

      // 2. Melhor Envio (via Shipping Service)
      const meConfig = lojaDoc.configuracoes?.integracoes?.melhor_envio;
      const cepOrigem = lojaDoc.configuracoes?.endereco?.cep;
      const shippingService = getShippingService(lojaDoc.configuracoes?.integracoes);
      const melhorEnvioOpcoes = await shippingService.calcularFrete({ meConfig, cepOrigem, to_postal_code, items });

      return res.status(200).json({ success: true, fretes: [...manuais, ...melhorEnvioOpcoes] });
    } catch (err) {
      console.error('[CALCULAR-FRETE] Erro geral:', err);
      return res.status(500).json({ error: 'Erro ao calcular frete' });
    }
  }

  // === PUBLIC: Categorias de uma loja (sem auth) ===
  if (scope === 'categorias-publico' && method === 'GET' && loja_id) {
    const Category = require('../models/Category.js');
    const cats = await Category.find({ loja_id, is_active: true }).sort({ ordem: 1 }).lean();
    return res.json(cats);
  }

  // === PUBLIC: Global domain ===
  if (scope === 'global-domain' && method === 'GET') {
    const s = await Setting.findOne({ key: 'global_domain', loja_id: null });
    return res.json({ domain: s?.value || process.env.PLATFORM_DOMAIN || 'dusking.com.br' });
  }

  // === PUBLIC: Category products ===
  if (scope === 'category-products' && method === 'GET') {
    const categoryId = req.query.category_id;
    if (!loja_id) return res.status(400).json({ error: 'loja_id é obrigatório' });
    const filter = categoryId && categoryId !== 'null'
      ? { loja_id, category_id: categoryId }
      : { loja_id, category_id: null };
    const products = await Product.find(filter).sort({ sort_order: 1 }).select('_id name image price sort_order category_id is_active').lean();
    return res.json(products);
  }

  // === PUBLIC: Página pública por slug ===
  if (scope === 'pagina-publica' && method === 'GET') {
    const { slug: pageSlug } = req.query;
    if (!loja_id || !pageSlug) return res.status(400).json({ error: 'loja_id e slug obrigatórios' });
    const pagina = await Pagina.findOne({ loja_id, slug: pageSlug, is_active: true }).lean();
    if (!pagina) return res.status(404).json({ error: 'Página não encontrada' });
    return res.json(pagina);
  }

  // === PUBLIC: Newsletter subscribe (lead) ===
  if (scope === 'lead-newsletter' && method === 'POST') {
    const { loja_id: bodyLojaId, email, origem } = req.body;
    const lid = bodyLojaId || loja_id;
    if (!lid || !email) return res.status(400).json({ error: 'loja_id e email são obrigatórios' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'E-mail inválido' });
    await Lead.findOneAndUpdate(
      { loja_id: lid, email: email.toLowerCase().trim() },
      { $setOnInsert: { loja_id: lid, email: email.toLowerCase().trim(), origem: origem || 'POPUP' } },
      { upsert: true, new: true }
    );
    return res.json({ success: true });
  }

  // === PUBLIC: Bulk cupons for popup ===
  if (scope === 'cupons-popup' && method === 'GET') {
    const ids = req.query.ids;
    if (!loja_id || !ids) return res.status(400).json({ error: 'loja_id e ids são obrigatórios' });
    const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
    const cupons = await Cupom.find({ _id: { $in: idList }, loja_id, is_active: true }).lean();
    return res.json(cupons.map(c => ({ _id: c._id, codigo: c.codigo, tipo: c.tipo, valor: c.valor })));
  }

  // === PUBLIC: Appmax Install Webhook (URL de Validação) ===
  if (scope === 'appmax-install' && method === 'POST') {
    const crypto = require('crypto');
    const { app_id, client_id, client_secret, external_key } = req.body;

    if (!external_key || !client_id || !client_secret) {
      return res.status(400).json({ error: 'Campos obrigatórios: external_key, client_id, client_secret' });
    }

    try {
      const lojista = await Lojista.findById(external_key);
      if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });

      const external_id = crypto.randomUUID();

      if (!lojista.gateways_config) lojista.gateways_config = {};
      lojista.gateways_config.appmax = { client_id, client_secret, external_id };
      lojista.markModified('gateways_config');
      lojista.gateway_ativo = 'appmax';
      await lojista.save();

      console.log(`[APPMAX-INSTALL] ✅ Lojista ${lojista.email} conectado à Appmax (external_id: ${external_id})`);
      return res.status(200).json({ external_id });
    } catch (err) {
      console.error('[APPMAX-INSTALL] ❌ Erro:', err.message);
      return res.status(500).json({ error: 'Erro interno ao processar instalação' });
    }
  }

  // === PUBLIC: Appmax Payment Webhook ===
  if (scope === 'appmax-webhook' && method === 'POST') {
    try {
      const { getPaymentService } = require('../lib/services/pagamentos');
      const appmaxService = getPaymentService('appmax');
      const result = await appmaxService.handleWebhook({ body: req.body, req });
      return res.status(200).json(result);
    } catch (err) {
      console.error('[APPMAX-WEBHOOK] Erro CRÍTICO:', err.message, err.stack);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // === AUTH REQUIRED ===
  const user = verifyLojista(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const resolvedLojaId = loja_id || req.body?.loja_id;

  if (resolvedLojaId) {
    const owns = await verifyOwnership(user, resolvedLojaId);
    if (!owns) return res.status(403).json({ error: 'Sem permissão para esta loja' });
  }

  try {
    // ==========================================
    // APPMAX CONNECT (OAuth redirect)
    // ==========================================
    if (scope === 'appmax-connect' && method === 'GET') {
      const APPMAX_APP_ID = process.env.APPMAX_APP_ID;
      const APPMAX_CLIENT_ID = process.env.APPMAX_CLIENT_ID;
      const APPMAX_CLIENT_SECRET = process.env.APPMAX_CLIENT_SECRET;

      if (!APPMAX_APP_ID || !APPMAX_CLIENT_ID || !APPMAX_CLIENT_SECRET) {
        return res.status(500).json({ error: 'Variáveis de ambiente da Appmax não configuradas (APPMAX_APP_ID, APPMAX_CLIENT_ID, APPMAX_CLIENT_SECRET).' });
      }

      try {
        const lojista = await Lojista.findById(user.lojista_id);
        if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });

        const Setting = require('../models/Setting');
        const gwSetting = await Setting.findOne({ key: 'gateways_ativos' });
        let appmaxConfig = {};
        if (gwSetting) {
          try {
            const parsed = typeof gwSetting.value === 'string' ? JSON.parse(gwSetting.value) : gwSetting.value;
            appmaxConfig = parsed?.appmax || {};
          } catch (_) {}
        }

        const isSandbox = !!appmaxConfig.sandbox;
        const authUrl = isSandbox ? appmaxConfig.auth_url_sandbox : appmaxConfig.auth_url_prod;
        const apiUrl = isSandbox ? appmaxConfig.api_url_sandbox : appmaxConfig.api_url_prod;
        const redirectBase = isSandbox ? appmaxConfig.redirect_url_sandbox : appmaxConfig.redirect_url_prod;

        if (!authUrl || !apiUrl || !redirectBase) {
          return res.status(500).json({ error: `URLs de ${isSandbox ? 'Sandbox' : 'Produção'} da Appmax não configuradas no painel Admin.` });
        }

        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'client_credentials');
        tokenParams.append('client_id', APPMAX_CLIENT_ID);
        tokenParams.append('client_secret', APPMAX_CLIENT_SECRET);

        const tokenRes = await fetch(`${authUrl}/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: tokenParams,
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          console.error('[APPMAX-CONNECT] ❌ Falha ao obter token:', errBody);
          return res.status(502).json({ error: 'Falha ao autenticar com a Appmax' });
        }

        const tokenData = await tokenRes.json();
        const bearerToken = tokenData.access_token;

        const host = req.headers.host || req.headers['x-forwarded-host'] || 'localhost';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const callbackUrl = `${protocol}://${host}/painel/loja/${lojista._id}/gateways`;

        const authRes = await fetch(`${apiUrl}/app/authorize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bearerToken}`,
          },
          body: JSON.stringify({
            app_id: APPMAX_APP_ID,
            external_key: lojista._id.toString(),
            url_callback: callbackUrl,
          }),
        });

        if (!authRes.ok) {
          const errBody = await authRes.text();
          console.error('[APPMAX-CONNECT] ❌ Falha ao autorizar app:', errBody);
          return res.status(502).json({ error: 'Falha ao solicitar autorização na Appmax' });
        }

        const authData = await authRes.json();
        const hash = authData.data?.token || authData.token || authData.hash || authData.data?.hash;

        if (!hash) {
          console.error('[APPMAX-CONNECT] ❌ Hash não retornado pela Appmax:', JSON.stringify(authData));
          return res.status(502).json({ error: 'Resposta inesperada da Appmax (hash ausente)' });
        }

        return res.json({ redirect_url: `${redirectBase}/appstore/integration/${hash}` });
      } catch (err) {
        console.error('[APPMAX-CONNECT] ❌ Erro:', err.message);
        return res.status(500).json({ error: 'Erro interno ao conectar com a Appmax' });
      }
    }

    // ==========================================
    // SALVAR GATEWAY (lojista)
    // ==========================================
    if (scope === 'salvar-gateway' && method === 'POST') {
      const { id_gateway, config, ativar } = req.body;
      if (!id_gateway) return res.status(400).json({ error: 'id_gateway é obrigatório' });

      const lojista = await Lojista.findById(user.lojista_id);
      if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });

      if (!lojista.gateways_config) lojista.gateways_config = {};
      if (config) {
        lojista.gateways_config[id_gateway] = config;
        lojista.markModified('gateways_config');
      }

      if (ativar === true) {
        lojista.gateway_ativo = id_gateway;
      } else if (ativar === false && lojista.gateway_ativo === id_gateway) {
        lojista.gateway_ativo = null;
      }

      await lojista.save();

      if (id_gateway === 'sealpay' && config?.api_key && resolvedLojaId) {
        await Loja.findByIdAndUpdate(resolvedLojaId, {
          $set: { 'configuracoes.sealpay_api_key': config.api_key },
        });
      }

      return res.json({ success: true, gateway_ativo: lojista.gateway_ativo, gateways_config: lojista.gateways_config });
    }

    // ==========================================
    // DESCONECTAR GATEWAY (lojista)
    // ==========================================
    if (scope === 'desconectar-gateway' && method === 'POST') {
      const { id_gateway } = req.body;
      if (!id_gateway) return res.status(400).json({ error: 'id_gateway é obrigatório' });

      const lojista = await Lojista.findById(user.lojista_id);
      if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });

      if (lojista.gateways_config && lojista.gateways_config[id_gateway]) {
        delete lojista.gateways_config[id_gateway];
        lojista.markModified('gateways_config');
      }
      if (lojista.gateway_ativo === id_gateway) {
        lojista.gateway_ativo = null;
      }
      await lojista.save();

      if (id_gateway === 'sealpay' && resolvedLojaId) {
        await Loja.findByIdAndUpdate(resolvedLojaId, {
          $set: { 'configuracoes.sealpay_api_key': null },
        });
      }

      return res.json({ success: true, gateway_ativo: lojista.gateway_ativo });
    }

    // ==========================================
    // FRETES
    // ==========================================
    if (scope === 'fretes' && method === 'GET') {
      const fretes = await Frete.find({ loja_id: resolvedLojaId }).sort({ ordem_exibicao: 1 }).lean();
      return res.json(fretes);
    }

    if (scope === 'frete') {
      if (method === 'POST') {
        const data = req.body;
        if (!data.nome || !data.loja_id) return res.status(400).json({ error: 'nome e loja_id obrigatórios' });
        const count = await Frete.countDocuments({ loja_id: data.loja_id });
        const frete = await Frete.create({ ...data, ordem_exibicao: data.ordem_exibicao ?? count });
        return res.status(201).json(frete);
      }

      if (method === 'PUT' && id) {
        const frete = await Frete.findById(id);
        if (!frete) return res.status(404).json({ error: 'Frete não encontrado' });
        const owns = await verifyOwnership(user, frete.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const updated = await Frete.findByIdAndUpdate(id, req.body, { new: true });
        return res.json(updated);
      }

      if (method === 'DELETE' && id) {
        const frete = await Frete.findById(id);
        if (!frete) return res.status(404).json({ error: 'Frete não encontrado' });
        const owns = await verifyOwnership(user, frete.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await Product.updateMany({ frete_regra_id: frete._id }, { $set: { frete_regra_id: null } });
        await Frete.findByIdAndDelete(id);
        return res.json({ success: true });
      }
    }

    // ==========================================
    // CUPONS
    // ==========================================
    if (scope === 'cupons' && method === 'GET') {
      const cupons = await Cupom.find({ loja_id: resolvedLojaId }).sort({ criado_em: -1 }).lean();
      return res.json(cupons);
    }

    if (scope === 'cupom') {
      if (method === 'POST') {
        const data = req.body;
        if (!data.codigo || !data.tipo || data.valor == null || !data.loja_id) {
          return res.status(400).json({ error: 'codigo, tipo, valor e loja_id obrigatórios' });
        }
        const exists = await Cupom.findOne({ loja_id: data.loja_id, codigo: data.codigo.toUpperCase() });
        if (exists) return res.status(409).json({ error: 'Já existe um cupom com este código nesta loja' });
        const cupom = await Cupom.create(data);
        return res.status(201).json(cupom);
      }

      if (method === 'PUT' && id) {
        const cupom = await Cupom.findById(id);
        if (!cupom) return res.status(404).json({ error: 'Cupom não encontrado' });
        const owns = await verifyOwnership(user, cupom.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const updated = await Cupom.findByIdAndUpdate(id, req.body, { new: true });
        return res.json(updated);
      }

      if (method === 'DELETE' && id) {
        const cupom = await Cupom.findById(id);
        if (!cupom) return res.status(404).json({ error: 'Cupom não encontrado' });
        const owns = await verifyOwnership(user, cupom.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await Cupom.findByIdAndDelete(id);
        return res.json({ success: true });
      }

      if (method === 'PATCH' && id) {
        const cupom = await Cupom.findById(id);
        if (!cupom) return res.status(404).json({ error: 'Cupom não encontrado' });
        const owns = await verifyOwnership(user, cupom.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const updated = await Cupom.findByIdAndUpdate(id, { is_active: !cupom.is_active }, { new: true });
        return res.json(updated);
      }
    }

    // ==========================================
    // MÍDIAS (Agregação de produtos)
    // ==========================================
    if (scope === 'midias' && method === 'GET') {
      const products = await Product.find({ loja_id: resolvedLojaId }).select('product_id name image images variacoes').lean();
      const urlMap = {};
      for (const p of products) {
        const allUrls = [p.image, ...(p.images || [])];
        for (const v of (p.variacoes || [])) {
          if (v.imagem) allUrls.push(v.imagem);
        }
        for (const url of allUrls) {
          if (!url) continue;
          if (!urlMap[url]) urlMap[url] = { url, usado_em: [] };
          urlMap[url].usado_em.push({ product_id: p.product_id, name: p.name });
        }
      }
      const midias = Object.values(urlMap).sort((a, b) => b.usado_em.length - a.usado_em.length);
      return res.json(midias);
    }

    if (scope === 'midia' && method === 'DELETE') {
      const { url } = req.body;
      if (!url || !resolvedLojaId) return res.status(400).json({ error: 'url e loja_id obrigatórios' });
      const products = await Product.find({ loja_id: resolvedLojaId, $or: [{ image: url }, { images: url }, { 'variacoes.imagem': url }] });
      let count = 0;
      for (const p of products) {
        if (p.image === url) p.image = (p.images || []).find(i => i !== url) || '';
        p.images = (p.images || []).filter(i => i !== url);
        for (const v of (p.variacoes || [])) {
          if (v.imagem === url) v.imagem = null;
        }
        await p.save();
        count++;
      }
      return res.json({ success: true, removido_de: count });
    }

    // ==========================================
    // TEMAS
    // ==========================================
    if (scope === 'tema') {
      if (method === 'GET') {
        const loja = await Loja.findById(resolvedLojaId).lean();
        if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });
        return res.json({
          tema: loja.configuracoes?.tema || 'market-tok',
          categoria_home_id: loja.configuracoes?.categoria_home_id || null,
          footer: loja.configuracoes?.footer || null,
          whatsapp_numero: loja.configuracoes?.whatsapp_numero || '',
          cores_globais: loja.configuracoes?.cores_globais || null,
          homepage_config: loja.configuracoes?.homepage_config || null,
          produto_config: loja.configuracoes?.produto_config || null,
        });
      }

      if (method === 'PUT') {
        const { tema, categoria_home_id, footer, whatsapp_numero, cores_globais, homepage_config, produto_config } = req.body;
        const update = {};
        if (tema) update['configuracoes.tema'] = tema;
        if (categoria_home_id !== undefined) update['configuracoes.categoria_home_id'] = categoria_home_id || null;
        if (footer !== undefined) update['configuracoes.footer'] = footer;
        if (whatsapp_numero !== undefined) update['configuracoes.whatsapp_numero'] = whatsapp_numero;
        if (cores_globais !== undefined) update['configuracoes.cores_globais'] = cores_globais;
        if (homepage_config !== undefined) update['configuracoes.homepage_config'] = homepage_config;
        if (produto_config !== undefined) update['configuracoes.produto_config'] = produto_config;
        const loja = await Loja.findByIdAndUpdate(resolvedLojaId, { $set: update }, { new: true });
        return res.json({
          tema: loja.configuracoes?.tema,
          categoria_home_id: loja.configuracoes?.categoria_home_id,
          footer: loja.configuracoes?.footer,
          whatsapp_numero: loja.configuracoes?.whatsapp_numero,
          cores_globais: loja.configuracoes?.cores_globais,
          homepage_config: loja.configuracoes?.homepage_config,
          produto_config: loja.configuracoes?.produto_config,
        });
      }
    }

    // ==========================================
    // PIXELS
    // ==========================================
    if (scope === 'pixels' && method === 'GET') {
      const pixels = await TrackingPixel.find({ loja_id: resolvedLojaId }).sort({ createdAt: -1 }).lean();
      return res.json(pixels);
    }

    if (scope === 'pixel') {
      if (method === 'POST') {
        const data = req.body;
        if (!data.pixel_id || !data.platform || !data.loja_id) return res.status(400).json({ error: 'pixel_id, platform e loja_id obrigatórios' });
        const pixel = await TrackingPixel.create(data);
        return res.status(201).json(pixel);
      }

      if (method === 'PUT' && id) {
        const pixel = await TrackingPixel.findById(id);
        if (!pixel) return res.status(404).json({ error: 'Pixel não encontrado' });
        const owns = await verifyOwnership(user, pixel.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const updated = await TrackingPixel.findByIdAndUpdate(id, req.body, { new: true });
        return res.json(updated);
      }

      if (method === 'DELETE' && id) {
        const pixel = await TrackingPixel.findById(id);
        if (!pixel) return res.status(404).json({ error: 'Pixel não encontrado' });
        const owns = await verifyOwnership(user, pixel.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await TrackingPixel.findByIdAndDelete(id);
        return res.json({ success: true });
      }
    }

    // ==========================================
    // PÁGINAS
    // ==========================================
    if (scope === 'paginas' && method === 'GET') {
      const paginas = await Pagina.find({ loja_id: resolvedLojaId }).sort({ criado_em: -1 }).lean();
      return res.json(paginas);
    }

    if (scope === 'pagina') {
      if (method === 'POST') {
        const data = req.body;
        if (!data.titulo || !data.loja_id) return res.status(400).json({ error: 'titulo e loja_id obrigatórios' });
        let slug = slugify(data.titulo);
        if (slug.length < 2) slug = slug + '-pagina';
        const existing = await Pagina.findOne({ loja_id: data.loja_id, slug });
        if (existing) slug = slug + '-' + Date.now().toString(36);
        const pagina = await Pagina.create({ ...data, slug });
        return res.status(201).json(pagina);
      }

      if (method === 'PUT' && id) {
        const pagina = await Pagina.findById(id);
        if (!pagina) return res.status(404).json({ error: 'Página não encontrada' });
        const owns = await verifyOwnership(user, pagina.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const { titulo, conteudo, is_active } = req.body;
        const update = {};
        if (titulo !== undefined) update.titulo = titulo;
        if (conteudo !== undefined) update.conteudo = conteudo;
        if (is_active !== undefined) update.is_active = is_active;
        const updated = await Pagina.findByIdAndUpdate(id, update, { new: true });
        return res.json(updated);
      }

      if (method === 'DELETE' && id) {
        const pagina = await Pagina.findById(id);
        if (!pagina) return res.status(404).json({ error: 'Página não encontrada' });
        const owns = await verifyOwnership(user, pagina.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await Pagina.findByIdAndDelete(id);
        return res.json({ success: true });
      }
    }

    // ==========================================
    // UPLOAD BUNNY.NET
    // ==========================================
    if (scope === 'upload' && method === 'POST') {
      const { image_base64 } = req.body;
      if (!image_base64) return res.status(400).json({ error: 'image_base64 é obrigatório' });

      const apiKey = process.env.BUNNY_API_KEY;
      const storageZone = process.env.BUNNY_STORAGE_ZONE;
      const pullZone = process.env.BUNNY_PULL_ZONE;
      if (!apiKey || !storageZone || !pullZone) {
        return res.status(400).json({ error: 'Variáveis Bunny.net não configuradas.' });
      }

      try {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

        const uploadRes = await fetch(`https://br.storage.bunnycdn.com/${storageZone}/${fileName}`, {
          method: 'PUT',
          headers: {
            'AccessKey': apiKey,
            'Content-Type': 'application/octet-stream',
          },
          body: buffer,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => '');
          console.error('[BUNNY]', errText);
          return res.status(500).json({ error: 'Falha no upload para Bunny.net', details: errText });
        }

        const url = `https://${pullZone}/${fileName}`;
        return res.json({ url });
      } catch (err) {
        console.error('[BUNNY]', err);
        return res.status(500).json({ error: 'Erro no upload', details: err.message });
      }
    }

    // ==========================================
    // LEADS (Newsletter)
    // ==========================================
    if (scope === 'leads' && method === 'GET') {
      const leads = await Lead.find({ loja_id: resolvedLojaId }).sort({ criado_em: -1 }).lean();
      const Cliente = require('../models/Cliente.js');
      const emails = leads.map(l => l.email);
      const clientes = await Cliente.find({ loja_id: resolvedLojaId, email: { $in: emails } }).select('email').lean();
      const clienteEmails = new Set(clientes.map(c => c.email.toLowerCase()));
      const result = leads.map(l => ({
        ...l,
        vinculo: clienteEmails.has(l.email) ? 'Cliente Cadastrado' : 'Visitante',
      }));
      return res.json(result);
    }

    if (scope === 'leads-export' && method === 'GET') {
      const leads = await Lead.find({ loja_id: resolvedLojaId }).sort({ criado_em: -1 }).lean();
      const Cliente = require('../models/Cliente.js');
      const emails = leads.map(l => l.email);
      const clientes = await Cliente.find({ loja_id: resolvedLojaId, email: { $in: emails } }).select('email').lean();
      const clienteEmails = new Set(clientes.map(c => c.email.toLowerCase()));
      return res.json(leads.map(l => ({
        ...l,
        vinculo: clienteEmails.has(l.email) ? 'Cliente Cadastrado' : 'Visitante',
      })));
    }

    if (scope === 'lead') {
      if (method === 'PUT' && id) {
        const lead = await Lead.findById(id);
        if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
        const owns = await verifyOwnership(user, lead.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const { email } = req.body;
        if (email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
          if (!emailRegex.test(email)) return res.status(400).json({ error: 'E-mail inválido' });
          lead.email = email.toLowerCase().trim();
          await lead.save();
        }
        return res.json(lead);
      }

      if (method === 'DELETE' && id) {
        const lead = await Lead.findById(id);
        if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
        const owns = await verifyOwnership(user, lead.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await Lead.findByIdAndDelete(id);
        return res.json({ success: true });
      }
    }

    if (scope === 'leads-import' && method === 'POST') {
      const { emails, origem } = req.body;
      if (!resolvedLojaId || !Array.isArray(emails)) return res.status(400).json({ error: 'loja_id e emails[] obrigatórios' });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const validEmails = emails.filter(e => typeof e === 'string' && emailRegex.test(e.trim())).map(e => ({
        loja_id: resolvedLojaId,
        email: e.toLowerCase().trim(),
        origem: origem || 'POPUP',
      }));
      if (!validEmails.length) return res.status(400).json({ error: 'Nenhum e-mail válido' });
      try {
        const result = await Lead.insertMany(validEmails, { ordered: false });
        return res.json({ success: true, inseridos: result.length });
      } catch (err) {
        const inserted = err.insertedDocs?.length || 0;
        return res.json({ success: true, inseridos: inserted });
      }
    }

    return res.status(400).json({ error: `Scope "${scope}" inválido ou método não suportado` });
  } catch (err) {
    console.error('[LOJA-EXTRAS]', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
