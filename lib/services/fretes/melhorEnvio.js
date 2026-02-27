// ============================================
// 🚚 Melhor Envio Shipping Service (Strategy Pattern)
// ============================================

const Product = require('../../models/Product.js');

const onlyDigits = (s) => (s || '').replace(/\D/g, '');

/**
 * Safe JSON parser for Melhor Envio responses (handles HTML error pages).
 */
async function safeMeJson(response, label) {
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    console.error(`[ME] ${label} retornou não-JSON (Status ${response.status}):`, text.substring(0, 500));
    throw new Error(`A API do Melhor Envio falhou e retornou um formato inválido (Status: ${response.status}). Tente novamente em instantes.`);
  }
  if (!response.ok) {
    console.error(`[ME] ${label} error:`, JSON.stringify(data));
    const msg = data?.message || data?.error || `Erro interno no Melhor Envio (Status: ${response.status})`;
    if (typeof msg === 'string' && msg.toLowerCase().includes('saldo')) {
      const err = new Error('Saldo insuficiente na carteira do Melhor Envio. Adicione créditos e tente novamente.');
      err.statusCode = 402;
      throw err;
    }
    const err = new Error(msg);
    err.statusCode = 422;
    err.details = data;
    throw err;
  }
  return data;
}

/**
 * Retorna headers padrão do Melhor Envio.
 */
function getMeHeaders(token) {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'Dusking (suporte@dusking.com.br)',
  };
}

/**
 * Retorna a base URL do Melhor Envio (sandbox ou produção).
 */
function getMeBaseUrl(isSandbox) {
  return isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
}

/**
 * Gera etiqueta de envio via Melhor Envio.
 */
async function gerarEtiqueta({ pedido, loja, overrideServiceId }) {
  const integracoes = loja.configuracoes?.integracoes?.melhor_envio;
  if (!integracoes?.ativo || !integracoes?.token) {
    return { error: 'Integração Melhor Envio não configurada', httpStatus: 400 };
  }

  const meToken = integracoes.token;
  const isSandbox = integracoes.sandbox;
  const meBase = getMeBaseUrl(isSandbox);
  const meHeaders = getMeHeaders(meToken);

  // Idempotent: if already has order, just print
  if (pedido.melhor_envio_order_id) {
    const printRes = await fetch(`${meBase}/api/v2/me/shipment/print`, {
      method: 'POST', headers: meHeaders,
      body: JSON.stringify({ mode: 'public', orders: [pedido.melhor_envio_order_id] }),
    });
    const printData = await safeMeJson(printRes, 'Print (idempotent)');
    const url = printData.url || pedido.etiqueta_url;
    if (url) { pedido.etiqueta_url = url; await pedido.save(); }
    return { data: { etiqueta_url: url, codigo_rastreio: pedido.codigo_rastreio, already_existed: true }, httpStatus: 200 };
  }

  // Determine service_id
  const serviceId = overrideServiceId || pedido.frete_id;
  if (!serviceId) return { error: 'Nenhum serviço de frete selecionado (frete_id ausente)', httpStatus: 400 };

  // Fetch product dimensions from DB
  const productIds = pedido.itens.map(i => i.product_id);
  const products = await Product.find({ product_id: { $in: productIds }, loja_id: pedido.loja_id }).lean();
  const prodMap = {};
  products.forEach(p => { prodMap[p.product_id] = p; });

  const endereco = loja.configuracoes?.endereco || {};
  const empresa = loja.configuracoes?.empresa || {};

  const itemsWithDims = pedido.itens.map(item => {
    const prod = prodMap[item.product_id];
    const dims = prod?.dimensoes || {};
    return {
      name: item.name,
      quantity: item.quantity,
      unitary_value: item.price / 100,
      weight: dims.peso || 0.3,
      width: dims.largura || 11,
      height: dims.altura || 2,
      length: dims.comprimento || 16,
    };
  });

  // Single consolidated volume
  const volume = {
    weight: itemsWithDims.reduce((acc, i) => acc + i.weight * i.quantity, 0),
    width: Math.max(...itemsWithDims.map(i => i.width)),
    height: itemsWithDims.reduce((acc, i) => acc + i.height * i.quantity, 0),
    length: Math.max(...itemsWithDims.map(i => i.length)),
  };

  // --- Remetente (from) ---
  const fromDoc = onlyDigits(empresa.documento);
  const fromPayload = {
    name: empresa.razao_social || loja.nome,
    address: endereco.logradouro,
    number: endereco.numero || 'S/N',
    complement: endereco.complemento || '',
    district: endereco.bairro,
    city: endereco.cidade,
    state_abbr: endereco.estado,
    postal_code: onlyDigits(endereco.cep),
    phone: onlyDigits(empresa.telefone),
    email: empresa.email_suporte || '',
  };
  if (fromDoc.length > 11) {
    fromPayload.company_document = fromDoc;
    fromPayload.state_register = '';
  } else {
    fromPayload.document = fromDoc;
  }

  // --- Destinatario (to) ---
  const toDoc = onlyDigits(pedido.cliente?.cpf || pedido.cliente?.documento || '');
  const toPayload = {
    name: pedido.cliente?.nome || '',
    address: pedido.endereco?.rua || pedido.endereco?.logradouro || '',
    number: pedido.endereco?.numero || 'S/N',
    complement: pedido.endereco?.complemento || '',
    district: pedido.endereco?.bairro || '',
    city: pedido.endereco?.cidade || '',
    state_abbr: pedido.endereco?.estado || '',
    postal_code: onlyDigits(pedido.endereco?.cep),
    phone: onlyDigits(pedido.cliente?.telefone || ''),
    email: pedido.cliente?.email || '',
  };
  if (toDoc.length > 11) {
    toPayload.company_document = toDoc;
    toPayload.state_register = '';
  } else {
    toPayload.document = toDoc;
  }

  const cartPayload = {
    service: Number(serviceId),
    from: fromPayload,
    to: toPayload,
    products: itemsWithDims,
    volumes: [volume],
    options: { non_commercial: true, receipt: false, own_hand: false },
  };

  // 1) POST /cart
  const cartRes = await fetch(`${meBase}/api/v2/me/cart`, { method: 'POST', headers: meHeaders, body: JSON.stringify(cartPayload) });
  const cartData = await safeMeJson(cartRes, 'Cart');
  const orderId = cartData.id;
  if (!orderId) {
    return { error: 'Resposta inesperada do carrinho ME', httpStatus: 422, details: cartData };
  }

  // 2) POST /checkout
  const checkoutRes = await fetch(`${meBase}/api/v2/me/shipment/checkout`, { method: 'POST', headers: meHeaders, body: JSON.stringify({ orders: [orderId] }) });
  await safeMeJson(checkoutRes, 'Checkout');

  // 3) POST /generate
  const genRes = await fetch(`${meBase}/api/v2/me/shipment/generate`, { method: 'POST', headers: meHeaders, body: JSON.stringify({ orders: [orderId] }) });
  const genData = await safeMeJson(genRes, 'Generate');
  let trackingCode = null;
  if (genData && typeof genData === 'object') {
    const orderGen = genData[orderId] || genData;
    trackingCode = orderGen.tracking || orderGen.protocol || null;
  }

  // 4) POST /print
  const printRes = await fetch(`${meBase}/api/v2/me/shipment/print`, { method: 'POST', headers: meHeaders, body: JSON.stringify({ mode: 'public', orders: [orderId] }) });
  const printData = await safeMeJson(printRes, 'Print');
  const etiquetaUrl = printData.url || null;

  // Save to DB
  pedido.melhor_envio_order_id = orderId;
  pedido.melhor_envio_status = 'generated';
  pedido.etiqueta_url = etiquetaUrl;
  pedido.codigo_rastreio = trackingCode;
  pedido.markModified('melhor_envio_order_id');
  pedido.markModified('melhor_envio_status');
  pedido.markModified('etiqueta_url');
  pedido.markModified('codigo_rastreio');
  await pedido.save();

  return { data: { melhor_envio_order_id: orderId, etiqueta_url: etiquetaUrl, codigo_rastreio: trackingCode }, httpStatus: 200 };
}

/**
 * Cancela etiqueta no Melhor Envio.
 */
async function cancelarEtiqueta({ pedido, loja }) {
  if (!pedido.melhor_envio_order_id) {
    return { error: 'Pedido não possui etiqueta para cancelar', httpStatus: 400 };
  }

  const integracoes = loja.configuracoes?.integracoes?.melhor_envio;
  const meToken = integracoes?.token;
  const isSandbox = integracoes?.sandbox;
  const meBase = getMeBaseUrl(isSandbox);
  const meHeaders = getMeHeaders(meToken);

  const cancelRes = await fetch(`${meBase}/api/v2/me/shipment/cancel`, {
    method: 'POST', headers: meHeaders,
    body: JSON.stringify({ order: { id: pedido.melhor_envio_order_id, reason_id: '2', description: 'Cancelado pelo painel' } }),
  });

  // Safe parse — cancel pode falhar mas não deve travar
  const cancelText = await cancelRes.text();
  let cancelData;
  try { cancelData = cancelText ? JSON.parse(cancelText) : {}; } catch (e) {
    console.error(`[ME] Cancel retornou não-JSON (Status ${cancelRes.status}):`, cancelText.substring(0, 500));
  }
  if (!cancelRes.ok) {
    console.error('[ME] Cancel error:', cancelData || cancelText);
  }

  pedido.melhor_envio_order_id = null;
  pedido.melhor_envio_status = null;
  pedido.etiqueta_url = null;
  pedido.codigo_rastreio = null;
  pedido.markModified('melhor_envio_order_id');
  pedido.markModified('melhor_envio_status');
  pedido.markModified('etiqueta_url');
  pedido.markModified('codigo_rastreio');
  await pedido.save();

  return { data: { success: true }, httpStatus: 200 };
}

/**
 * Calcula frete via Melhor Envio (para cotação pública).
 */
async function calcularFrete({ meConfig, cepOrigem, to_postal_code, items }) {
  if (!meConfig?.ativo || !meConfig?.token || !cepOrigem) {
    return [];
  }

  try {
    const baseUrl = getMeBaseUrl(meConfig.sandbox);

    const products = (items || []).map(item => ({
      id: item.id || 'prod',
      width: item.dimensions?.width || 11,
      height: item.dimensions?.height || 2,
      length: item.dimensions?.length || 16,
      weight: item.weight || 0.3,
      insurance_value: item.price || 0,
      quantity: item.quantity || 1,
    }));

    const mePayload = {
      from: { postal_code: cepOrigem.replace(/\D/g, '') },
      to: { postal_code: to_postal_code.replace(/\D/g, '') },
      products,
    };

    const meRes = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: getMeHeaders(meConfig.token),
      body: JSON.stringify(mePayload),
    });

    if (meRes.ok) {
      const meData = await meRes.json();
      const opcoes = Array.isArray(meData) ? meData : [];
      return opcoes
        .filter(opt => !opt.error)
        .map(opt => ({
          id: String(opt.id),
          name: opt.name || opt.company?.name || 'Envio',
          price: Number(opt.custom_price) || Number(opt.price) || 0,
          delivery_time: opt.custom_delivery_time || opt.delivery_time || 0,
          picture: opt.company?.picture || '',
        }));
    } else {
      console.warn('[CALCULAR-FRETE] Melhor Envio retornou status', meRes.status);
      return [];
    }
  } catch (meErr) {
    console.error('[CALCULAR-FRETE] Erro Melhor Envio (fallback manuais):', meErr.message);
    return [];
  }
}

module.exports = { gerarEtiqueta, cancelarEtiqueta, calcularFrete };
