// ============================================
// 💰 /api/create-pix - Proxy para SealPay + Webhook
// ============================================

const connectDB = require('../lib/mongodb');
const Setting = require('../models/Setting.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  await connectDB();

  const scope = req.query?.scope || req.body?.scope;

  // ── scope=status: Proxy de consulta de status de pagamento ──
  // Tenta SealPay primeiro, depois verifica nosso banco como fallback
  if (scope === 'status' && req.method === 'GET') {
    const { txid } = req.query;
    if (!txid) return res.status(400).json({ error: 'txid é obrigatório' });

    // 1. Verificar no nosso banco primeiro (mais confiável, webhook já atualiza)
    try {
      const Pedido = require('../models/Pedido.js');
      const pedido = await Pedido.findOne({ 'pagamento.txid': txid }).select('status pagamento.pago_em').lean();
      if (pedido && pedido.status === 'pago') {
        return res.status(200).json({ status: 'paid', source: 'db', pago_em: pedido.pagamento?.pago_em });
      }
    } catch (dbErr) {
      console.error('[STATUS] Erro ao consultar DB:', dbErr.message);
    }

    // 2. Fallback: consultar SealPay
    const settings = await Setting.find({ key: 'sealpay_api_url' }).lean();
    const sealpayUrl = settings[0]?.value || 'https://abacate-5eo1.onrender.com/create-pix';
    const baseUrl = sealpayUrl.replace(/\/create-pix\/?$/, '');

    try {
      const statusRes = await fetch(`${baseUrl}/api/payment-status/${txid}`);
      const statusData = await statusRes.json();
      return res.status(statusRes.status).json(statusData);
    } catch (err) {
      return res.status(500).json({ error: 'Erro ao consultar status', details: err.message });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });


  // ── Webhook scope ──
  if (scope === 'webhook') {
    const { txid, status } = req.body || {};
    if (!txid) return res.status(400).json({ error: 'txid é obrigatório' });

    const paidStatuses = ['paid', 'approved', 'confirmed', 'completed'];
    if (paidStatuses.includes((status || '').toLowerCase())) {
      try {
        const Pedido = require('../models/Pedido.js');
        const result = await Pedido.findOneAndUpdate(
          { 'pagamento.txid': txid },
          { $set: { status: 'pago', 'pagamento.pago_em': new Date() } },
          { new: true }
        );
        if (result) {
          console.log(`[WEBHOOK] Pedido ${result._id} marcado como pago (txid: ${txid})`);

          // Dispatch CAPI Purchase via tracking-webhook
          try {
            const baseUrl = process.env.VERCEL_URL
              ? `https://${process.env.VERCEL_URL}`
              : (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host;
            await fetch(`${baseUrl}/api/tracking-webhook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                evento: 'Purchase',
                txid,
                status: 'paid',
                valor: result.total || 0,
                nome: result.cliente?.nome || '',
                email: result.cliente?.email || '',
                telefone: result.cliente?.telefone || '',
                cpf: result.cliente?.cpf || '',
                loja_id: result.loja_id?.toString() || '',
              }),
            });
            console.log(`[WEBHOOK] CAPI Purchase dispatched for pedido ${result._id}`);
          } catch (capiErr) {
            console.error('[WEBHOOK] Erro ao disparar CAPI Purchase:', capiErr.message);
          }
        } else {
          console.warn(`[WEBHOOK] Pedido não encontrado para txid: ${txid}`);
        }
      } catch (err) {
        console.error('[WEBHOOK] Erro ao atualizar pedido:', err.message);
      }
    }
    return res.status(200).json({ ok: true });
  }

  // ── Create PIX flow ──
  const body = req.body;

  if (!body.amount || body.amount < 100) {
    return res.status(400).json({ error: 'amount deve ser em centavos e no mínimo 100' });
  }
  if (!body.customer?.name || body.customer.name.length < 2) {
    return res.status(400).json({ error: 'customer.name é obrigatório' });
  }
  if (!body.customer?.email || !body.customer.email.includes('@')) {
    return res.status(400).json({ error: 'customer.email é obrigatório' });
  }

  // Se loja_id fornecido, buscar chave específica da loja
  let SEALPAY_API_KEY = null;
  if (body.loja_id) {
    const Loja = require('../models/Loja.js');
    const loja = await Loja.findById(body.loja_id).lean();
    if (loja?.configuracoes?.sealpay_api_key) {
      SEALPAY_API_KEY = loja.configuracoes.sealpay_api_key;
    }
  }

  // Fallback para chave global
  if (!SEALPAY_API_KEY) {
    const settings = await Setting.find({ key: { $in: ['sealpay_api_url', 'sealpay_api_key'] } }).lean();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    SEALPAY_API_KEY = settingsMap['sealpay_api_key'] || process.env.SEALPAY_API_KEY;
  }

  const settings2 = await Setting.find({ key: 'sealpay_api_url' }).lean();
  const SEALPAY_API_URL = settings2[0]?.value || 'https://abacate-5eo1.onrender.com/create-pix';

  if (!SEALPAY_API_KEY) {
    return res.status(500).json({ error: 'API Key não encontrada' });
  }

  const cleanPhone = (body.customer.cellphone || '').replace(/\D/g, '');

  const payload = {
    amount: body.amount,
    description: body.description || 'Pagamento Livraria Fé & Amor',
    customer: {
      name: body.customer.name,
      email: body.customer.email,
      cellphone: cleanPhone,
      taxId: (body.customer.taxId || '').replace(/\D/g, ''),
    },
    tracking: { utm: body.tracking?.utm || {}, src: body.tracking?.src || '' },
    api_key: SEALPAY_API_KEY,
    fbp: body.fbp || '',
    fbc: body.fbc || '',
    user_agent: body.user_agent || '',
  };

  try {
    const response = await fetch(SEALPAY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let data;
    const rawText = await response.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('[CREATE-PIX] SealPay retornou resposta não-JSON:', response.status, rawText.slice(0, 500));
      return res.status(502).json({ error: 'Gateway retornou resposta inválida', status: response.status, body: rawText.slice(0, 300) });
    }
    if (!response.ok) {
      console.error('[CREATE-PIX] SealPay erro:', response.status, JSON.stringify(data));
      return res.status(response.status).json({ error: data.message || data.error || 'Erro no gateway de pagamento', details: data });
    }
    if (data.pix_qr_code && !data.pix_qr_code.startsWith('data:image')) {
      data.pix_qr_code = `data:image/png;base64,${data.pix_qr_code}`;
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
