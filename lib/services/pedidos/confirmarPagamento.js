// ============================================
// ✅ Confirmar Pagamento - Módulo Centralizado
// Acumula taxas, converte carrinho, marca pago
// Importado por api/pedidos.js e webhooks de gateways
// ============================================

const Pedido = require('../../../models/Pedido.js');
const Loja = require('../../../models/Loja.js');
const Lojista = require('../../../models/Lojista.js');
const Plano = require('../../../models/Plano.js');
const CarrinhoAbandonado = require('../../../models/CarrinhoAbandonado.js');

/**
 * Acumula taxas da plataforma para o lojista dono do pedido.
 * @param {Object} pedido - Documento do pedido (com loja_id e total)
 * @param {string} logPrefix - Prefixo para logs
 */
async function acumularTaxasPlataforma(pedido, logPrefix = '[TAXAS]') {
  if (!pedido.total || pedido.total <= 0) return;

  const lojaDoc = await Loja.findById(pedido.loja_id).select('lojista_id').lean();
  if (!lojaDoc) return;

  const lojistaDoc = await Lojista.findById(lojaDoc.lojista_id);
  if (!lojistaDoc) return;

  if (lojistaDoc.modo_amigo) {
    console.log(`${logPrefix} Lojista ${lojistaDoc.email} é VIP (modo_amigo) — taxa zerada`);
    return;
  }

  if (!lojistaDoc.plano_id) return;

  const plano = await Plano.findById(lojistaDoc.plano_id).lean();
  if (!plano) return;

  const taxaPercentual = lojistaDoc.subscription_status === 'trialing'
    ? (plano.taxa_transacao_trial || 2.0)
    : (plano.taxa_transacao_percentual || plano.taxa_transacao || 1.5);
  const taxaFixa = plano.taxa_transacao_fixa || 0;
  const valorTaxa = (pedido.total * taxaPercentual / 100) + (taxaFixa > 0 ? taxaFixa : 0);
  const valorTaxaArredondado = Math.round(valorTaxa * 100) / 100;

  lojistaDoc.taxas_acumuladas = (lojistaDoc.taxas_acumuladas || 0) + valorTaxaArredondado;
  if (!lojistaDoc.data_vencimento_taxas) {
    lojistaDoc.data_vencimento_taxas = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  await lojistaDoc.save();
  console.log(`${logPrefix} Taxa acumulada: R$ ${valorTaxaArredondado.toFixed(2)} para ${lojistaDoc.email} (total: R$ ${lojistaDoc.taxas_acumuladas.toFixed(2)})`);
}

/**
 * Confirma pagamento de um pedido: marca como pago, acumula taxas, converte carrinho.
 * Idempotente — se já pago, retorna sem duplicar.
 * 
 * @param {Object} params
 * @param {string} [params.txid] - txid do pagamento (SealPay/PIX)
 * @param {string} [params.appmax_order_id] - order_id do Appmax
 * @param {string} [params.logPrefix] - Prefixo para logs
 * @returns {{ ok: boolean, pedido?: Object, already_paid?: boolean, error?: string }}
 */
async function confirmarPagamentoPedido({ txid, appmax_order_id, logPrefix = '[CONFIRMAR-PGTO]' }) {
  // 1. Buscar pedido
  const query = [];
  if (txid) query.push({ 'pagamento.txid': txid });
  if (appmax_order_id) query.push({ 'pagamento.appmax_order_id': String(appmax_order_id) });

  if (query.length === 0) {
    return { ok: false, error: 'txid ou appmax_order_id obrigatório' };
  }

  const pedido = await Pedido.findOne(query.length === 1 ? query[0] : { $or: query });
  if (!pedido) {
    console.warn(`${logPrefix} Pedido não encontrado (txid: ${txid}, appmax: ${appmax_order_id})`);
    return { ok: false, error: 'Pedido não encontrado' };
  }

  // 2. Idempotência — se já pago, não duplicar
  if (pedido.status === 'pago') {
    console.log(`${logPrefix} Pedido ${pedido._id} já está pago, ignorando`);
    return { ok: true, already_paid: true, pedido };
  }

  // 3. Marcar como pago
  pedido.status = 'pago';
  pedido.pagamento = { ...pedido.pagamento, pago_em: new Date() };
  pedido.markModified('pagamento');
  await pedido.save();
  console.log(`${logPrefix} Pedido ${pedido._id} marcado como pago`);

  // 4. Acumular taxas da plataforma
  try {
    await acumularTaxasPlataforma(pedido, logPrefix);
  } catch (taxErr) {
    console.error(`${logPrefix} Erro ao acumular taxa:`, taxErr.message);
  }

  // 5. Excluir carrinho abandonado (pedido pago = carrinho não é mais necessário)
  try {
    const txidCarrinho = pedido.pagamento?.txid;
    if (txidCarrinho) {
      await CarrinhoAbandonado.deleteOne({ txid: txidCarrinho });
    }
  } catch (cartErr) {
    console.error(`${logPrefix} Erro ao excluir carrinho:`, cartErr.message);
  }

  return { ok: true, pedido };
}

module.exports = { confirmarPagamentoPedido, acumularTaxasPlataforma };
