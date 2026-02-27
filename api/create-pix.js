// ============================================
// 💰 /api/create-pix - Proxy para Pagamentos + Webhook
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
  const paymentService = getPaymentService('sealpay');

  // ── scope=status: Consulta de status de pagamento ──
  if (scope === 'status' && req.method === 'GET') {
    const { txid } = req.query;
    if (!txid) return res.status(400).json({ error: 'txid é obrigatório' });

    try {
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

  // ── Webhook scope ──
  if (scope === 'webhook') {
    const { txid, status } = req.body || {};
    if (!txid) return res.status(400).json({ error: 'txid é obrigatório' });

    try {
      const result = await paymentService.handleWebhook({ txid, status, req });
      return res.status(200).json(result);
    } catch (err) {
      console.error('[WEBHOOK] Erro:', err.message);
      return res.status(200).json({ ok: true });
    }
  }

  // ── Create PIX flow ──
  try {
    const body = req.body;
    const result = await paymentService.createPayment({
      amount: body.amount,
      description: body.description,
      customer: body.customer,
      tracking: body.tracking,
      fbp: body.fbp,
      fbc: body.fbc,
      user_agent: body.user_agent,
      loja_id: body.loja_id,
    });

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
