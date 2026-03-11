// ============================================
// 💳 Gateways API — Microsserviço de Gateways de Pagamento do Lojista
// Strangler Fig — Extraído de api/loja-extras.js (Fase 4)
// ============================================

const mongoose = require('mongoose');
const connectDB = require('../lib/mongodb.js');
const jwt = require('jsonwebtoken');

// Models
const Loja = require('../models/Loja.js');
const Lojista = require('../models/Lojista.js');
const Setting = require('../models/Setting.js');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('[GATEWAYS] FATAL: JWT_SECRET não configurado nas variáveis de ambiente.');

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

// Desabilitar bodyParser da Vercel para receber raw body (necessário para webhooks)
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

  const { scope, loja_id } = req.query;
  const method = req.method;

  // Ler raw body uma única vez (bodyParser desabilitado)
  const rawBody = method !== 'GET' && method !== 'DELETE' && method !== 'OPTIONS'
    ? await getRawBody(req)
    : null;

  if (rawBody) {
    try {
      req.body = JSON.parse(rawBody);
    } catch {
      req.body = {};
    }
  }

  // ==========================================
  // PUBLIC: Gateways disponíveis na plataforma
  // ==========================================
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

  // ==========================================
  // PUBLIC: Gateway ativo de uma loja (checkout)
  // ==========================================
  if (scope === 'gateway-loja' && method === 'GET' && loja_id) {
    const lojaDoc = await Loja.findById(loja_id).lean();
    if (!lojaDoc) return res.status(404).json({ error: 'Loja não encontrada' });
    const dono = await Lojista.findById(lojaDoc.lojista_id).lean();
    const gwAtivo = dono?.gateway_ativo || null;
    let installment_config = null;
    if (gwAtivo === 'appmax' && dono?.gateways_config?.appmax) {
      const ac = dono.gateways_config.appmax;
      installment_config = {
        max_installments: ac.max_installments || 12,
        free_installments: ac.free_installments || 1,
        interest_rate_pp: ac.interest_rate_pp || 0,
      };
    }
    return res.json({ gateway_ativo: gwAtivo, installment_config });
  }

  // ==========================================
  // PUBLIC: Appmax Install Webhook (URL de Validação)
  // ==========================================
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

  // ==========================================
  // PUBLIC: Appmax Payment Webhook
  // ==========================================
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

  // ==========================================
  // AUTH REQUIRED — Escopos autenticados
  // ==========================================
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
        lojista.gateways_config[id_gateway] = { ...(lojista.gateways_config[id_gateway] || {}), ...config };
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

    return res.status(400).json({ error: `Scope "${scope}" inválido ou método não suportado` });
  } catch (err) {
    console.error('[GATEWAYS]', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
