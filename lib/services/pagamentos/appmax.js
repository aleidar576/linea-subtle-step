// ============================================
// 💳 Appmax Payment Service (API v1 - Fluxo Oficial)
// Customer → Order → Payment (3 etapas)
// ============================================

const Setting = require('../../../models/Setting.js');
const Loja = require('../../../models/Loja.js');
const Lojista = require('../../../models/Lojista.js');
const Pedido = require('../../../models/Pedido.js');

// ── Status mapping (Appmax → interno) ──
const STATUS_MAP = {
  aprovado: 'pago',
  autorizado: 'pago',
  pendente: 'pendente',
  cancelado: 'recusado',
  estornado: 'estornado',
  recusado_por_risco: 'recusado',
  integrado: 'pago',
  pendente_integracao: 'pago',
  // Legados da v3
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
 * URLs oficiais da Appmax (conforme documentação).
 * Auth e API possuem domínios SEPARADOS.
 */
async function getAppmaxUrls() {
  const setting = await Setting.findOne({ key: 'gateways_ativos', loja_id: null }).lean();
  let config = {};
  if (setting?.value) {
    try { config = JSON.parse(setting.value); } catch {}
  }
  const appmaxConfig = config.appmax || {};
  const isSandbox = !!appmaxConfig.sandbox;

  // URLs CORRETAS conforme documentação oficial Appmax
  const authUrl = isSandbox
    ? (appmaxConfig.auth_url_sandbox || 'https://auth.sandboxappmax.com.br')
    : (appmaxConfig.auth_url_prod || 'https://auth.appmax.com.br');
  const apiUrl = isSandbox
    ? (appmaxConfig.api_url_sandbox || 'https://api.sandboxappmax.com.br')
    : (appmaxConfig.api_url_prod || 'https://api.appmax.com.br');

  return { authUrl, apiUrl, isSandbox };
}

/**
 * Obtém Bearer Token via OAuth2 (domínio auth separado).
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

  console.log(`[APPMAX] Obtendo token em ${authUrl}/oauth2/token`);

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
  ).trim();

  if (!access_token) {
    console.error('[APPMAX] Token vazio após parsing:', JSON.stringify(tokenData));
    throw new Error('Token de acesso Appmax vazio');
  }

  console.log(`[APPMAX] Token obtido com sucesso (expira em ${tokenData.expires_in || '?'}s)`);
  return { access_token, apiUrl };
}

/**
 * Fetch autenticado para API Appmax (domínio api).
 * Usa Authorization: Bearer conforme documentação oficial.
 */
async function appmaxApiFetch(apiUrl, path, method, payload, token) {
  const url = `${apiUrl}${path}`;
  const cleanToken = String(token).trim();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${cleanToken}`,
  };

  const options = { method, headers };
  if (method !== 'GET' && payload) {
    options.body = JSON.stringify(payload);
  }

  console.log(`[APPMAX] ${method} ${url}`);
  const res = await fetch(url, options);

  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error(`[APPMAX] Resposta não-JSON (${res.status}):`, rawText.slice(0, 500));
    return { ok: false, status: res.status, data: null, error: 'Resposta inválida do gateway' };
  }

  if (!res.ok) {
    console.error(`[APPMAX] Erro ${res.status}:`, JSON.stringify(data));
  } else {
    console.log(`[APPMAX] ${method} ${path} → ${res.status} OK`);
  }

  return { ok: res.ok, status: res.status, data };
}

/**
 * Cria pagamento via Appmax API v1 (fluxo oficial de 3 etapas).
 * Etapa 1: POST /v1/customers
 * Etapa 2: POST /v1/orders
 * Etapa 3: POST /v1/payments/{method}
 */
async function createPayment({ amount, method, customer, shipping, items, card_data, installments, loja_id }) {
  // Validações básicas
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

  try {
    // Carregar Loja → Lojista
    const loja = await Loja.findById(loja_id).lean();
    if (!loja) return { error: 'Loja não encontrada', httpStatus: 404 };

    const lojista = await Lojista.findById(loja.lojista_id);
    if (!lojista) return { error: 'Lojista não encontrado', httpStatus: 404 };

    const { access_token, apiUrl } = await getToken(lojista);

    // ── Preparar dados do cliente ──
    const nameParts = (customer.name || '').trim().split(/\s+/);
    const first_name = nameParts[0] || '';
    const last_name = nameParts.slice(1).join(' ') || first_name;
    const phone = (customer.cellphone || customer.phone || '').replace(/\D/g, '');
    const document_number = (customer.taxId || customer.cpf || customer.document || '').replace(/\D/g, '');

    // Validar document_number para PIX e Boleto (obrigatório pela Appmax)
    if ((method === 'pix' || method === 'boleto') && (!document_number || (document_number.length !== 11 && document_number.length !== 14))) {
      return { error: 'CPF (11 dígitos) ou CNPJ (14 dígitos) é obrigatório para pagamento via ' + method.toUpperCase(), httpStatus: 400 };
    }

    // ══════════════════════════════════════
    // ETAPA 1: Criar Customer
    // ══════════════════════════════════════
    const customerPayload = {
      first_name,
      last_name,
      email: customer.email,
      phone,
      document_number,
      ip: customer.ip || '127.0.0.1',
    };

    // Endereço do cliente (se disponível)
    if (shipping) {
      customerPayload.address = {
        postcode: (shipping.cep || shipping.zipCode || '').replace(/\D/g, ''),
        street: shipping.rua || shipping.street || '',
        number: String(shipping.numero || shipping.number || 'S/N'),
        complement: shipping.complemento || shipping.complement || '',
        district: shipping.bairro || shipping.neighborhood || '',
        city: shipping.cidade || shipping.city || '',
        state: shipping.estado || shipping.state || '',
      };
    }

    // Produtos vinculados ao customer (para rastreamento)
    if (items?.length) {
      customerPayload.products = items.map(item => ({
        sku: String(item.sku || item.product_id || item.id || 'SKU-DEFAULT'),
        name: item.name || 'Produto',
        quantity: item.quantity || 1,
        unit_value: item.price || 0, // já em centavos
        type: 'physical',
      }));
    }

    console.log(`[APPMAX] Etapa 1: Criando customer ${customer.email}`);
    const custResult = await appmaxApiFetch(apiUrl, '/v1/customers', 'POST', customerPayload, access_token);

    if (!custResult.ok) {
      return {
        error: custResult.data?.message || custResult.data?.errors?.message || 'Erro ao criar cliente na Appmax',
        httpStatus: custResult.status,
        details: custResult.data,
      };
    }

    const customer_id = custResult.data?.data?.customer?.id || custResult.data?.id;
    if (!customer_id) {
      console.error('[APPMAX] customer_id não retornado:', JSON.stringify(custResult.data));
      return { error: 'Appmax não retornou customer_id', httpStatus: 502 };
    }
    console.log(`[APPMAX] Customer criado: ${customer_id}`);

    // ══════════════════════════════════════
    // ETAPA 2: Criar Order
    // ══════════════════════════════════════
    const orderPayload = {
      customer_id,
      discount_value: 0,
      shipping_value: Number(shipping?.valor || shipping?.price || 0),
      products: (items || []).map(item => ({
        sku: String(item.sku || item.product_id || item.id || 'SKU-DEFAULT'),
        name: item.name || 'Produto',
        quantity: Number(item.quantity || 1),
        unit_value: Number(item.price || 0),
      })),
    };

    // Fallback: se products vazio ou todos com unit_value 0, usar produto genérico
    if (!orderPayload.products.length || orderPayload.products.every(p => !p.unit_value)) {
      orderPayload.products = [{
        sku: 'PEDIDO-UNICO',
        name: 'Pedido',
        quantity: 1,
        unit_value: Number(amount),
      }];
    }

    // Consistência financeira: produtos/frete/desconto devem fechar com o total final
    const productsSum = orderPayload.products.reduce((sum, p) => sum + (Number(p.unit_value || 0) * Number(p.quantity || 1)), 0);
    const incomingAmount = Number(amount || 0);

    if (!orderPayload.shipping_value && incomingAmount > productsSum) {
      orderPayload.shipping_value = incomingAmount - productsSum;
    }

    const expectedTotal = productsSum + Number(orderPayload.shipping_value || 0);
    orderPayload.discount_value = expectedTotal > incomingAmount ? (expectedTotal - incomingAmount) : 0;
    orderPayload.products_value = productsSum;

    console.log(`[APPMAX] Etapa 2: Criando order para customer ${customer_id} (${amount} centavos)`);
    const orderResult = await appmaxApiFetch(apiUrl, '/v1/orders', 'POST', orderPayload, access_token);

    if (!orderResult.ok) {
      return {
        error: orderResult.data?.message || orderResult.data?.errors?.message || 'Erro ao criar pedido na Appmax',
        httpStatus: orderResult.status,
        details: orderResult.data,
      };
    }

    const order_id = orderResult.data?.data?.order?.id || orderResult.data?.id;
    if (!order_id) {
      console.error('[APPMAX] order_id não retornado:', JSON.stringify(orderResult.data));
      return { error: 'Appmax não retornou order_id', httpStatus: 502 };
    }
    console.log(`[APPMAX] Order criada: ${order_id}`);

    // ══════════════════════════════════════
    // ETAPA 3: Criar Payment
    // ══════════════════════════════════════
    let paymentPath;
    let paymentPayload;

    if (method === 'pix') {
      paymentPath = '/v1/payments/pix';
      paymentPayload = {
        order_id,
        customer_id,
        payment_data: {
          pix: {
            document_number: String(document_number || '').replace(/\D/g, ''),
          },
        },
      };
    } else if (method === 'boleto') {
      paymentPath = '/v1/payments/boleto';
      paymentPayload = {
        order_id,
        payment_data: {
          boleto: {
            document_number,
          },
        },
      };
    } else if (method === 'credit_card') {
      paymentPath = '/v1/payments/credit-card';
      if (!card_data || !card_data.number || !card_data.cvv || !card_data.exp_month || !card_data.exp_year || !card_data.name) {
        return { error: 'Dados do cartão incompletos (number, cvv, exp_month, exp_year, name são obrigatórios)', httpStatus: 400 };
      }
      paymentPayload = {
        order_id,
        customer_id,
        payment_data: {
          credit_card: {
            number: String(card_data.number).replace(/\D/g, ''),
            cvv: String(card_data.cvv),
            expiration_month: String(card_data.exp_month).padStart(2, '0'),
            expiration_year: String(card_data.exp_year),
            holder_name: String(card_data.name),
            holder_document_number: String(card_data.holder_document_number || document_number || '').replace(/\D/g, ''),
            installments: installments || 1,
          },
        },
      };
    } else {
      return { error: `Método de pagamento "${method}" não suportado`, httpStatus: 400 };
    }

    console.log(`[APPMAX] Etapa 3: Criando pagamento ${method} para order ${order_id}`);
    console.log(`[APPMAX] Payment payload:`, JSON.stringify(paymentPayload));
    console.log(`[APPMAX] Order payload enviado:`, JSON.stringify(orderPayload));
    const payResult = await appmaxApiFetch(apiUrl, paymentPath, 'POST', paymentPayload, access_token);

    if (!payResult.ok) {
      const errorMsg = payResult.data?.errors?.message || payResult.data?.message || payResult.data?.error?.message || 'Erro ao processar pagamento na Appmax';
      const errorStr = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
      console.error(`[APPMAX] Pagamento ${method} falhou (${payResult.status}):`, errorStr);
      return {
        error: method === 'pix' && payResult.status === 400
          ? 'PIX indisponível no momento. Verifique se o provedor PIX está configurado na conta Appmax. ' + errorStr
          : errorStr,
        httpStatus: payResult.status,
        details: payResult.data,
      };
    }

    // ── Normalizar resposta ──
    const payData = payResult.data?.data || payResult.data || {};
    const txid = String(order_id);

    const normalized = {
      txid,
      method,
      appmax_order_id: txid,
      appmax_customer_id: String(customer_id),
    };

    if (method === 'pix') {
      const paymentData = payResult?.data?.data?.payment || payResult?.data?.payment || {};
      const qrCodeRaw = paymentData.pix_qrcode || '';
      const emvCode = paymentData.pix_emv || '';
      normalized.pix_qr_code = qrCodeRaw
        ? (qrCodeRaw.startsWith('data:image') ? qrCodeRaw : `data:image/png;base64,${qrCodeRaw}`)
        : '';
      normalized.pix_code = emvCode;
    } else if (method === 'boleto') {
      console.log('[APPMAX RAW BOLETO RESPONSE]:', JSON.stringify(payResult.data));
      const paymentData = payResult?.data?.data?.payment || payResult?.data?.payment || {};
      normalized.pdf_url = paymentData.boleto_link_pdf || '';
      normalized.digitable_line = paymentData.boleto_digitable_line || paymentData.boleto_payment_code || '';
    } else if (method === 'credit_card') {
      const rawStatus = (payData.status || payData.order?.status || '').toLowerCase();
      normalized.status = STATUS_MAP[rawStatus] || rawStatus || 'pendente';
    }

    console.log(`[APPMAX] ✅ Pagamento ${method} criado com sucesso! order_id=${order_id}`);
    return { data: normalized, httpStatus: 200 };
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

  // 2. Fallback: consultar Appmax API v1
  try {
    if (pedido?.loja_id) {
      const loja = await Loja.findById(pedido.loja_id).lean();
      if (loja) {
        const lojista = await Lojista.findById(loja.lojista_id);
        if (lojista) {
          const { access_token, apiUrl } = await getToken(lojista);
          const result = await appmaxApiFetch(apiUrl, `/v1/orders/${txid}`, 'GET', null, access_token);
          if (result.ok) {
            const orderStatus = (result.data?.data?.order?.status || '').toLowerCase();
            const mapped = STATUS_MAP[orderStatus];
            if (mapped) {
              return { data: { status: mapped }, httpStatus: 200 };
            }
          }
          return { data: result.data, httpStatus: result.status };
        }
      }
    }
  } catch (err) {
    console.error('[APPMAX] Erro ao consultar status:', err.message);
  }

  return { data: { status: 'pending' }, httpStatus: 200 };
}

/**
 * Processa webhook de pagamento Appmax.
 */
async function handleWebhook({ body, req }) {
  const orderId = body.order_id || body.id;
  const rawEvent = (body.event || '').toLowerCase();
  const rawStatus = (body.status || '').toLowerCase();

  // Mapear evento webhook para status interno
  let mappedStatus;
  if (rawEvent === 'order_approved' || rawEvent === 'order_paid' || rawEvent === 'order_paid_by_pix' || rawEvent === 'order_billet_paid') {
    mappedStatus = 'pago';
  } else if (rawEvent === 'order_refund') {
    mappedStatus = 'estornado';
  } else if (rawEvent === 'order_chargeback_in_treatment') {
    mappedStatus = 'chargeback';
  } else if (rawEvent === 'payment_not_authorized') {
    mappedStatus = 'recusado';
  } else {
    mappedStatus = STATUS_MAP[rawStatus];
  }

  if (!orderId) {
    console.warn('[APPMAX-WEBHOOK] order_id ausente no body');
    return { ok: false, error: 'order_id ausente' };
  }

  if (!mappedStatus) {
    console.log(`[APPMAX-WEBHOOK] Evento "${rawEvent}" / status "${rawStatus}" não mapeado, ignorando`);
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
  console.log(`[APPMAX-WEBHOOK] Pedido ${result._id} → ${mappedStatus} (evento: ${rawEvent}, status: ${rawStatus})`);

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
