// ============================================
// 💳 Appmax Payment Service (Strategy Pattern)
// ============================================

const Setting = require('../../../models/Setting.js');
const Loja = require('../../../models/Loja.js');
const Lojista = require('../../../models/Lojista.js');
const Pedido = require('../../../models/Pedido.js');

// ── Status mapping (API v3 Appmax → interno) ──
const STATUS_MAP = {
  approved: 'pago',
  authorized: 'pago',
  declined: 'recusado',
  refused: 'recusado',
  refunded: 'estornado',
  chargeback: 'chargeback',
  processing: 'pendente',
  pending: 'pendente',
};

/**
 * Obtém URLs da plataforma (auth + api) para Appmax,
 * respeitando toggle sandbox do admin.
 */
async function getAppmaxUrls() {
  const setting = await Setting.findOne({ key: 'gateways_ativos', loja_id: null }).lean();
  let config = {};
  if (setting?.value) {
    try { config = JSON.parse(setting.value); } catch {}
  }
  const appmaxConfig = config.appmax || {};
  const isSandbox = !!appmaxConfig.sandbox;
  const authUrl = isSandbox
    ? (appmaxConfig.auth_url_sandbox || 'https://sandbox.appmax.com.br')
    : (appmaxConfig.auth_url_prod || 'https://admin.appmax.com.br');
  const apiUrl = isSandbox
    ? (appmaxConfig.api_url_sandbox || 'https://sandbox.appmax.com.br')
    : (appmaxConfig.api_url_prod || 'https://admin.appmax.com.br');
  return { authUrl, apiUrl };
}

/**
 * Obtém Bearer Token temporário via OAuth2.
 */
async function getToken(lojista) {
  const appmaxCreds = lojista.gateways_config?.appmax;
  if (!appmaxCreds?.client_id || !appmaxCreds?.client_secret) {
    throw new Error('Credenciais Appmax não configuradas para este lojista');
  }

  const { authUrl, apiUrl } = await getAppmaxUrls();

  const tokenParams = new URLSearchParams();
  tokenParams.append('grant_type', 'client_credentials');
  tokenParams.append('client_id', appmaxCreds.client_id);
  tokenParams.append('client_secret', appmaxCreds.client_secret);

  const tokenRes = await fetch(`${authUrl}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: tokenParams,
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    console.error('[APPMAX] Erro ao obter token:', tokenRes.status, JSON.stringify(tokenData));
    throw new Error('Falha na autenticação com a Appmax');
  }

  const access_token = String(
    tokenData.access_token || tokenData.data?.access_token || tokenData.token || tokenData.data?.token || ''
  );
  if (!access_token) {
    console.error('[APPMAX] Token vazio após parsing:', JSON.stringify(tokenData));
    throw new Error('Token de acesso Appmax vazio');
  }
  return { access_token, apiUrl };
}

/**
 * Fetch resiliente: tenta token no body primeiro, fallback para header Bearer.
 * Para GET, envia token como query param no modo 1.
 */
async function appmaxFetch(url, method, payload, token) {
  const cleanToken = String(token).trim();

  // ── Modo 1: token no body (POST) ou query param (GET) ──
  let res1;
  if (method === 'GET') {
    const sep = url.includes('?') ? '&' : '?';
    res1 = await fetch(`${url}${sep}access-token=${encodeURIComponent(cleanToken)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
  } else {
    const bodyWithToken = { ...payload, 'access-token': cleanToken };
    res1 = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(bodyWithToken),
    });
  }

  if (res1.status !== 401 && res1.status !== 403) {
    console.log(`[APPMAX] Modo body-token: ${method} ${url} → ${res1.status}`);
    return res1;
  }

  // ── Modo 2: fallback com header Authorization Bearer ──
  console.warn(`[APPMAX] body-token rejeitado (${res1.status}), tentando header Bearer...`);
  const fallbackHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${cleanToken}`,
  };
  if (method === 'GET') {
    return fetch(url, { method: 'GET', headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${cleanToken}` } });
  }
  return fetch(url, {
    method,
    headers: fallbackHeaders,
    body: JSON.stringify(payload),
  });
}

/**
 * Cria pagamento via Appmax API v3.
 */
async function createPayment({ amount, method, customer, shipping, items, card_token, installments, loja_id }) {
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
  if (!method) {
    return { error: 'method é obrigatório (pix, credit_card, boleto)', httpStatus: 400 };
  }
  if (method === 'credit_card' && !card_token) {
    return { error: 'card_token é obrigatório para pagamento com cartão', httpStatus: 400 };
  }
  if (method === 'credit_card' && (!installments || installments < 1 || installments > 12)) {
    return { error: 'installments deve ser entre 1 e 12 para cartão', httpStatus: 400 };
  }

  try {
    // Carregar Loja → Lojista
    const loja = await Loja.findById(loja_id).lean();
    if (!loja) return { error: 'Loja não encontrada', httpStatus: 404 };

    const lojista = await Lojista.findById(loja.lojista_id);
    if (!lojista) return { error: 'Lojista não encontrado', httpStatus: 404 };

    const { access_token, apiUrl } = await getToken(lojista);

    // Separar nome
    const nameParts = (customer.name || '').trim().split(/\s+/);
    const firstname = nameParts[0] || '';
    const lastname = nameParts.slice(1).join(' ') || firstname;

    const cleanPhone = (customer.cellphone || '').replace(/\D/g, '');
    const cleanCpf = (customer.taxId || '').replace(/\D/g, '');

    // Montar payload API v3
    const payload = {
      customer: {
        firstname,
        lastname,
        email: customer.email,
        telephone: cleanPhone,
        cpf: cleanCpf,
      },
      cart: {
        products: (items || []).map(item => ({
          name: item.name || 'Produto',
          qty: item.quantity || 1,
          price_unit: (item.price || 0) / 100, // centavos → reais
          sku: item.sku || item.product_id || item.id || 'SKU-FALLBACK',
        })),
      },
      payment: {
        method,
        ...(method === 'credit_card' ? { card_token, installments: installments || 1 } : {}),
      },
    };

    // Shipping/Billing
    if (shipping) {
      const addr = {
        street: shipping.rua || shipping.street || '',
        number: shipping.numero || shipping.number || '',
        complement: shipping.complemento || shipping.complement || '',
        neighborhood: shipping.bairro || shipping.neighborhood || '',
        city: shipping.cidade || shipping.city || '',
        state: shipping.estado || shipping.state || '',
        zipcode: (shipping.cep || shipping.zipCode || '').replace(/\D/g, ''),
      };
      payload.shipping = addr;
      payload.billing = addr;
    }

    console.log(`[APPMAX] Criando pagamento ${method} para loja ${loja_id} (${amount} centavos)`);

    const orderRes = await appmaxFetch(`${apiUrl}/v3/order`, 'POST', payload, access_token);

    let orderData;
    const rawText = await orderRes.text();
    try {
      orderData = JSON.parse(rawText);
    } catch {
      console.error('[APPMAX] Resposta não-JSON:', orderRes.status, rawText.slice(0, 500));
      return { error: 'Gateway retornou resposta inválida', httpStatus: 502 };
    }

    if (!orderRes.ok) {
      console.error('[APPMAX] Erro na API:', orderRes.status, JSON.stringify(orderData));
      return {
        error: orderData.message || orderData.error || 'Erro no gateway Appmax',
        httpStatus: orderRes.status,
        details: orderData,
      };
    }

    // Normalizar resposta
    const order = orderData.data || orderData;
    const txid = String(order.id || order.order_id || '');

    const normalized = {
      success: true,
      method,
      txid,
      data: {
        txid,
        method,
      },
    };

    if (method === 'pix') {
      normalized.data.pix_qr_code = order.pix?.qr_code || order.qr_code || '';
      normalized.data.pix_code = order.pix?.code || order.pix_code || '';
      if (normalized.data.pix_qr_code && !normalized.data.pix_qr_code.startsWith('data:image')) {
        normalized.data.pix_qr_code = `data:image/png;base64,${normalized.data.pix_qr_code}`;
      }
    } else if (method === 'boleto') {
      normalized.data.pdf_url = order.boleto?.url || order.pdf_url || '';
    } else if (method === 'credit_card') {
      const rawStatus = (order.status || '').toLowerCase();
      normalized.data.status = STATUS_MAP[rawStatus] || rawStatus;
    }

    return { data: normalized.data, httpStatus: 200 };
  } catch (err) {
    console.error('[APPMAX] Erro inesperado:', err.message, err.stack);
    return { error: err.message || 'Erro interno ao processar pagamento', httpStatus: 500 };
  }
}

/**
 * Consulta status de pagamento.
 */
async function getStatus(txid) {
  // 1. DB primeiro
  const pedido = await Pedido.findOne({
    $or: [{ 'pagamento.txid': txid }, { 'pagamento.appmax_order_id': txid }],
  }).select('status pagamento.pago_em loja_id').lean();

  if (pedido && pedido.status === 'pago') {
    return { status: 'paid', source: 'db', pago_em: pedido.pagamento?.pago_em };
  }

  // 2. Fallback: consultar Appmax API
  try {
    if (pedido?.loja_id) {
      const loja = await Loja.findById(pedido.loja_id).lean();
      if (loja) {
        const lojista = await Lojista.findById(loja.lojista_id);
        if (lojista) {
          const { access_token, apiUrl } = await getToken(lojista);
          const statusRes = await appmaxFetch(`${apiUrl}/v3/order/${txid}`, 'GET', null, access_token);
          const statusData = await statusRes.json();
          return { data: statusData, httpStatus: statusRes.status };
        }
      }
    }
  } catch (err) {
    console.error('[APPMAX] Erro ao consultar status:', err.message);
  }

  // Se não encontrou, retorna pendente
  return { data: { status: 'pending' }, httpStatus: 200 };
}

/**
 * Processa webhook de pagamento Appmax.
 */
async function handleWebhook({ body, req }) {
  const orderId = body.order_id || body.id;
  const rawStatus = (body.status || '').toLowerCase();
  const mappedStatus = STATUS_MAP[rawStatus];

  if (!orderId) {
    console.warn('[APPMAX-WEBHOOK] order_id ausente no body');
    return { ok: false, error: 'order_id ausente' };
  }

  if (!mappedStatus) {
    console.log(`[APPMAX-WEBHOOK] Status "${rawStatus}" não mapeado, ignorando`);
    return { ok: true, ignored: true };
  }

  // Buscar pedido
  const pedido = await Pedido.findOne({
    $or: [{ 'pagamento.txid': String(orderId) }, { 'pagamento.appmax_order_id': String(orderId) }],
  });

  if (!pedido) {
    console.warn(`[APPMAX-WEBHOOK] Pedido não encontrado para order_id: ${orderId}`);
    return { ok: false, error: 'Pedido não encontrado' };
  }

  // Atualizar status
  const updateData = { status: mappedStatus };
  if (mappedStatus === 'pago') {
    updateData['pagamento.pago_em'] = new Date();
  }

  const result = await Pedido.findByIdAndUpdate(pedido._id, { $set: updateData }, { new: true });

  console.log(`[APPMAX-WEBHOOK] Pedido ${result._id} → ${mappedStatus} (status original: ${rawStatus})`);

  // Dispatch CAPI Purchase se pagamento confirmado
  if (mappedStatus === 'pago') {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : (req?.headers?.['x-forwarded-proto'] || 'https') + '://' + (req?.headers?.host || 'localhost');
      await fetch(`${baseUrl}/api/tracking-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento: 'Purchase',
          txid: String(orderId),
          status: 'paid',
          valor: result.total || 0,
          nome: result.cliente?.nome || '',
          email: result.cliente?.email || '',
          telefone: result.cliente?.telefone || '',
          cpf: result.cliente?.cpf || '',
          loja_id: result.loja_id?.toString() || '',
        }),
      });
      console.log(`[APPMAX-WEBHOOK] CAPI Purchase dispatched para pedido ${result._id}`);
    } catch (capiErr) {
      console.error('[APPMAX-WEBHOOK] Erro CAPI:', capiErr.message);
    }
  }

  return { ok: true, status: mappedStatus };
}

module.exports = { getStatus, handleWebhook, createPayment };
