// ============================================
// 💰 /api/process-payment - Endpoint Unificado de Pagamentos
// Suporta: SealPay (PIX), Appmax (PIX, Cartão, Boleto)
// ============================================

const connectDB = require('../lib/mongodb');
const { getPaymentService } = require('../lib/services/pagamentos');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  await connectDB();

  const scope = req.query?.scope || req.body?.scope;

  // ── scope=status: Consulta de status de pagamento ──
  if (scope === 'status' && req.method === 'GET') {
    const { txid, gateway } = req.query;
    if (!txid) return res.status(400).json({ error: 'txid é obrigatório' });

    try {
      // Tentar detectar gateway via pedido no banco
      let gatewayId = gateway || 'sealpay';
      if (!gateway) {
        const Pedido = require('../models/Pedido.js');
        const pedido = await Pedido.findOne({
          $or: [{ 'pagamento.txid': txid }, { 'pagamento.appmax_order_id': txid }],
        }).select('pagamento.gateway loja_id').lean();
        if (pedido?.pagamento?.gateway) {
          gatewayId = pedido.pagamento.gateway;
        } else if (pedido?.loja_id) {
          const Loja = require('../models/Loja.js');
          const Lojista = require('../models/Lojista.js');
          const loja = await Loja.findById(pedido.loja_id).lean();
          if (loja) {
            const lojista = await Lojista.findById(loja.lojista_id).select('gateway_ativo').lean();
            if (lojista?.gateway_ativo) gatewayId = lojista.gateway_ativo;
          }
        }
      }

      const paymentService = getPaymentService(gatewayId);
      const result = await paymentService.getStatus(txid);
      if (result.source === 'db') {
        return res.status(200).json(result);
      }
      return res.status(result.httpStatus || 200).json(result.data);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao consultar status', details: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Webhook scope (para SealPay legacy) ──
  if (scope === 'webhook') {
    const { txid, status, order_id, id, event } = req.body || {};
    const webhookId = txid || order_id || id;
    if (!webhookId) return res.status(400).json({ error: 'txid/order_id é obrigatório' });

    try {
      // Detectar gateway pelo txid ou appmax_order_id
      let gatewayId = 'sealpay';
      const Pedido = require('../models/Pedido.js');
      const pedido = await Pedido.findOne({
        $or: [
          { 'pagamento.txid': String(webhookId) },
          { 'pagamento.appmax_order_id': String(webhookId) },
        ],
      }).select('pagamento.gateway').lean();
      if (pedido?.pagamento?.gateway) gatewayId = pedido.pagamento.gateway;

      const paymentService = getPaymentService(gatewayId);
      const result = await paymentService.handleWebhook({ txid, status, req, body: req.body });
      return res.status(200).json(result);
    } catch (err) {
      console.error('[WEBHOOK] Erro CRÍTICO:', err.message, err.stack);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ── Criar Pagamento (roteamento dinâmico) ──
  try {
    const body = req.body;
    const loja_id = body.loja_id;

    // Determinar gateway ativo da loja
    let gatewayId = 'sealpay';
    if (loja_id) {
      const Loja = require('../models/Loja.js');
      const Lojista = require('../models/Lojista.js');
      const loja = await Loja.findById(loja_id).lean();
      if (loja) {
        const lojista = await Lojista.findById(loja.lojista_id).select('gateway_ativo').lean();
        if (lojista?.gateway_ativo) gatewayId = lojista.gateway_ativo;
      }
    }

    const paymentService = getPaymentService(gatewayId);

    const paymentPayload = {
      amount: body.amount,
      description: body.description,
      customer: body.customer,
      tracking: body.tracking,
      fbp: body.fbp,
      fbc: body.fbc,
      user_agent: body.user_agent,
      loja_id: body.loja_id,
      // Campos extras para Appmax (ignorados pelo SealPay)
      method: body.method || 'pix',
      card_data: body.card_data,
      installments: body.installments,
      shipping: body.shipping,
      items: body.items,
    };

    const result = await paymentService.createPayment(paymentPayload);

    if (result.error) {
      return res.status(result.httpStatus || 500).json({
        error: result.error,
        ...(result.details ? { details: result.details } : {}),
        ...(result.body ? { body: result.body } : {}),
      });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
