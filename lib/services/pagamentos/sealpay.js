// ============================================
// 💰 SealPay Payment Service (Strategy Pattern)
// ============================================

const Setting = require('../../../models/Setting.js');

/**
 * Consulta status de pagamento.
 * Tenta DB primeiro, fallback para SealPay API.
 */
async function getStatus(txid) {
  // 1. Verificar no banco primeiro
  const Pedido = require('../../../models/Pedido.js');
  const pedido = await Pedido.findOne({ 'pagamento.txid': txid }).select('status pagamento.pago_em').lean();
  if (pedido && pedido.status === 'pago') {
    return { status: 'paid', source: 'db', pago_em: pedido.pagamento?.pago_em };
  }

  // 2. Fallback: consultar SealPay
  const settings = await Setting.find({ key: 'sealpay_api_url' }).lean();
  const sealpayUrl = settings[0]?.value || 'https://abacate-5eo1.onrender.com/create-pix';
  const baseUrl = sealpayUrl.replace(/\/create-pix\/?$/, '');

  const statusRes = await fetch(`${baseUrl}/api/payment-status/${txid}`);
  const statusData = await statusRes.json();
  return { data: statusData, httpStatus: statusRes.status };
}

/**
 * Processa webhook de confirmação de pagamento.
 */
async function handleWebhook({ txid, status, req }) {
  const paidStatuses = ['paid', 'approved', 'confirmed', 'completed'];
  if (!paidStatuses.includes((status || '').toLowerCase())) {
    return { ok: true };
  }

  const Pedido = require('../../models/Pedido.js');
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

  return { ok: true };
}

/**
 * Cria pagamento PIX via SealPay.
 */
async function createPayment({ amount, description, customer, tracking, fbp, fbc, user_agent, loja_id }) {
  // Validações
  if (!amount || amount < 100) {
    return { error: 'amount deve ser em centavos e no mínimo 100', httpStatus: 400 };
  }
  if (!customer?.name || customer.name.length < 2) {
    return { error: 'customer.name é obrigatório', httpStatus: 400 };
  }
  if (!customer?.email || !customer.email.includes('@')) {
    return { error: 'customer.email é obrigatório', httpStatus: 400 };
  }

  // Se loja_id fornecido, buscar chave específica da loja
  let SEALPAY_API_KEY = null;
  if (loja_id) {
    const Loja = require('../../../models/Loja.js');
    const loja = await Loja.findById(loja_id).lean();
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
    return { error: 'API Key não encontrada', httpStatus: 500 };
  }

  const cleanPhone = (customer.cellphone || '').replace(/\D/g, '');

  const payload = {
    amount,
    description: description || 'Pagamento Livraria Fé & Amor',
    customer: {
      name: customer.name,
      email: customer.email,
      cellphone: cleanPhone,
      taxId: (customer.taxId || '').replace(/\D/g, ''),
    },
    tracking: { utm: tracking?.utm || {}, src: tracking?.src || '' },
    api_key: SEALPAY_API_KEY,
    fbp: fbp || '',
    fbc: fbc || '',
    user_agent: user_agent || '',
  };

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
    return { error: 'Gateway retornou resposta inválida', httpStatus: 502, status: response.status, body: rawText.slice(0, 300) };
  }

  if (!response.ok) {
    console.error('[CREATE-PIX] SealPay erro:', response.status, JSON.stringify(data));
    return { error: data.message || data.error || 'Erro no gateway de pagamento', httpStatus: response.status, details: data };
  }

  if (data.pix_qr_code && !data.pix_qr_code.startsWith('data:image')) {
    data.pix_qr_code = `data:image/png;base64,${data.pix_qr_code}`;
  }

  return { data, httpStatus: 200 };
}

module.exports = { getStatus, handleWebhook, createPayment };
