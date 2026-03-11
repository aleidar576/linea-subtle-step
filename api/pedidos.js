// ============================================
// 📦 /api/pedidos - Core: Checkout + Gestão de Pedidos
// ============================================

const connectDB = require('../lib/mongodb.js');
const Pedido = require('../models/Pedido.js');
const CarrinhoAbandonado = require('../models/CarrinhoAbandonado.js');
const Cliente = require('../models/Cliente.js');
const Loja = require('../models/Loja.js');
const authPkg = require('../lib/auth.js');
const { sendEmail, getBranding, emailRastreioHtml } = require('../lib/email.js');

const { verifyToken, getTokenFromHeader } = authPkg;

const PAYMENT_DEBUG_LOGS = process.env.PAYMENT_DEBUG_LOGS === '1';

function safePaymentDetails(details) {
  if (!details) return null;
  return {
    method: details.method || null,
    installments: Number(details.installments || 1),
    card_brand: details.card_brand || null,
    last4: details.last4 ? String(details.last4).slice(-4) : null,
  };
}

function paymentDebugLog(tag, payload) {
  if (!PAYMENT_DEBUG_LOGS) return;
  console.log(`[PAYMENT-DEBUG][PEDIDOS] ${tag}`, payload);
}

function requireLojista(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'lojista') return null;
  return decoded;
}

async function validateLojaOwnership(lojaId, lojistaId) {
  const loja = await Loja.findOne({ _id: lojaId, lojista_id: lojistaId });
  return loja;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { scope, id, loja_id, action, status: filterStatus, page = '1', per_page = '20', search } = req.query;

  // ========== PÚBLICO: criar pedido (checkout) ==========

  if (req.method === 'POST' && scope === 'pedido') {
    try {
      const body = req.body;
      paymentDebugLog('incoming_checkout_payload', {
        loja_id: body?.loja_id || null,
        status: body?.status || null,
        payment_method: body?.pagamento?.metodo || null,
        payment_details: safePaymentDetails(body?.payment_details),
      });
      if (!body.loja_id) return res.status(400).json({ error: 'loja_id obrigatório' });

      // Auto-increment numero
      const lastPedido = await Pedido.findOne({ loja_id: body.loja_id }).sort({ numero: -1 }).select('numero').lean();
      const numero = (lastPedido?.numero || 0) + 1;

      // Upsert cliente
      let cliente_id = null;
      if (body.cliente?.email) {
        let cliente = await Cliente.findOne({ loja_id: body.loja_id, email: body.cliente.email });
        if (!cliente) {
          const censurado = !body.exigir_cadastro;
          cliente = await Cliente.create({
            loja_id: body.loja_id,
            nome: body.cliente.nome || '',
            email: body.cliente.email,
            telefone: body.cliente.telefone || '',
            cpf: body.cliente.cpf || '',
            censurado,
            total_pedidos: 1,
            total_gasto: body.total || 0,
          });
        } else {
          cliente.total_pedidos += 1;
          cliente.total_gasto += (body.total || 0);
          await cliente.save();
        }
        cliente_id = cliente._id;
      }

      const pedido = await Pedido.create({
        numero,
        loja_id: body.loja_id,
        cliente_id,
        itens: body.itens || [],
        subtotal: body.subtotal || 0,
        desconto: body.desconto || 0,
        frete: body.frete || 0,
        total: body.total || 0,
        cupom: body.cupom || null,
        status: ['pago', 'em_analise'].includes(body.status) ? body.status : 'pendente',
        pagamento: body.pagamento || { metodo: 'pix', txid: null, pix_code: null, pago_em: null },
        cliente: body.cliente || {},
        endereco: body.endereco || null,
        utms: body.utms || {},
        frete_id: body.frete_id || null,
        frete_nome: body.frete_nome || null,
        payment_details: body.payment_details || null,
      });

      paymentDebugLog('pedido_saved', {
        pedido_id: pedido?._id ? String(pedido._id) : null,
        numero: pedido?.numero || null,
        status: pedido?.status || null,
        payment_method: pedido?.pagamento?.metodo || null,
        payment_details: safePaymentDetails(pedido?.payment_details),
      });

      // === ACUMULAR TAXAS DA PLATAFORMA quando pedido é criado já como pago ===
      if (pedido.status === 'pago' && pedido.total > 0) {
        try {
          const { acumularTaxasPlataforma } = require('../lib/services/pedidos/confirmarPagamento.js');
          await acumularTaxasPlataforma(pedido, '[PEDIDO-CREATE]');
        } catch (taxErr) {
          console.error('[PEDIDO-CREATE] Erro ao acumular taxa:', taxErr.message);
        }
      }

      return res.status(201).json(pedido);
    } catch (err) {
      console.error('[PEDIDO] Erro ao criar pedido:', err.message);
      return res.status(500).json({ error: 'Erro ao criar pedido', details: err.message });
    }
  }

  // ========== AUTENTICADO: lojista ==========

  const lojista = requireLojista(req);
  if (!lojista) return res.status(401).json({ error: 'Não autorizado' });

  // --- LISTAGEM DE PEDIDOS ---

  if (req.method === 'GET' && scope === 'pedidos' && loja_id) {
    const loja = await validateLojaOwnership(loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });

    const query = { loja_id };
    if (filterStatus) query.status = filterStatus;
    if (search) {
      query.$or = [
        { 'cliente.nome': { $regex: search, $options: 'i' } },
        { 'cliente.email': { $regex: search, $options: 'i' } },
        { numero: parseInt(search) || -1 },
      ];
    }

    const pageNum = Math.max(1, parseInt(page));
    const limit = Math.min(100, Math.max(1, parseInt(per_page)));
    const skip = (pageNum - 1) * limit;

    const [pedidos, total] = await Promise.all([
      Pedido.find(query).sort({ criado_em: -1 }).skip(skip).limit(limit).lean(),
      Pedido.countDocuments(query),
    ]);

    return res.status(200).json({ pedidos, total, page: pageNum, per_page: limit });
  }

  // --- DETALHE DO PEDIDO ---

  if (req.method === 'GET' && scope === 'pedido' && id) {
    const pedido = await Pedido.findById(id).lean();
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    const loja = await validateLojaOwnership(pedido.loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });
    return res.status(200).json(pedido);
  }

  // --- ATUALIZAÇÃO DO PEDIDO ---

  if (req.method === 'PATCH' && scope === 'pedido' && id) {
    const pedido = await Pedido.findById(id);
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    const loja = await validateLojaOwnership(pedido.loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });

    if (action === 'rastreio') {
      const { codigo } = req.body;
      if (!codigo) return res.status(400).json({ error: 'Código de rastreio obrigatório' });
      pedido.rastreio = codigo;
      await pedido.save();

      if (pedido.cliente?.email) {
        try {
          const branding = await getBranding();
          await sendEmail({
            to: pedido.cliente.email,
            subject: `Seu pedido #${pedido.numero} foi enviado!`,
            html: emailRastreioHtml({
              nome: pedido.cliente.nome,
              numero_pedido: pedido.numero,
              codigo_rastreio: codigo,
              branding,
            }),
          });
        } catch (e) {
          console.error('[PEDIDO] Erro ao enviar email rastreio:', e.message);
        }
      }

      return res.status(200).json(pedido);
    }

    if (action === 'observacao') {
      pedido.observacoes_internas = req.body.texto || '';
      await pedido.save();
      return res.status(200).json(pedido);
    }

    if (action === 'status') {
      const novoStatus = req.body.status;
      const validStatuses = ['pendente', 'em_analise', 'pago', 'recusado', 'estornado', 'chargeback'];
      if (!validStatuses.includes(novoStatus)) return res.status(400).json({ error: 'Status inválido' });

      const statusOrder = { pendente: 0, em_analise: 1, pago: 2, recusado: 3, estornado: 4, chargeback: 5 };
      const finais = ['recusado', 'estornado', 'chargeback'];
      if (!finais.includes(novoStatus) && statusOrder[novoStatus] < statusOrder[pedido.status]) {
        return res.status(400).json({ error: 'Não é possível retroagir o status' });
      }

      pedido.status = novoStatus;
      if (novoStatus === 'pago') pedido.pagamento = { ...pedido.pagamento, pago_em: new Date() };
      await pedido.save();

      // === ACUMULAR TAXAS + CONVERTER CARRINHO quando pedido muda para pago ===
      if (novoStatus === 'pago' && pedido.total > 0) {
        try {
          const { acumularTaxasPlataforma } = require('../lib/services/pedidos/confirmarPagamento.js');
          await acumularTaxasPlataforma(pedido, '[PEDIDO]');
        } catch (taxErr) {
          console.error('[PEDIDO] Erro ao acumular taxa:', taxErr.message);
        }
      }

      if (novoStatus === 'pago' && pedido.pagamento?.txid) {
        await CarrinhoAbandonado.deleteOne({ txid: pedido.pagamento.txid });
      }

      return res.status(200).json(pedido);
    }

    if (action === 'dados') {
      const { cliente: clienteData, endereco: enderecoData, atualizar_cadastro } = req.body;
      const onlyDigits = (s) => (s || '').replace(/\D/g, '');

      // Validação server-side
      if (clienteData) {
        if (clienteData.cpf) {
          const cpfDigits = onlyDigits(clienteData.cpf);
          if (cpfDigits.length !== 11 && cpfDigits.length !== 14) {
            return res.status(400).json({ error: 'CPF deve ter 11 dígitos ou CNPJ 14 dígitos' });
          }
        }
        if (clienteData.telefone) {
          const telDigits = onlyDigits(clienteData.telefone);
          if (telDigits.length < 10) {
            return res.status(400).json({ error: 'Telefone deve ter no mínimo 10 dígitos' });
          }
        }
        if (clienteData.nome !== undefined && !clienteData.nome.trim()) {
          return res.status(400).json({ error: 'Nome é obrigatório' });
        }
      }
      if (enderecoData) {
        if (enderecoData.cep) {
          const cepDigits = onlyDigits(enderecoData.cep);
          if (cepDigits.length !== 8) {
            return res.status(400).json({ error: 'CEP deve ter 8 dígitos' });
          }
        }
      }

      // Atualizar dados no pedido (Mixed types require markModified)
      if (clienteData) {
        pedido.cliente = { ...pedido.cliente, ...clienteData };
        pedido.markModified('cliente');
      }
      if (enderecoData) {
        pedido.endereco = { ...pedido.endereco, ...enderecoData };
        pedido.markModified('endereco');
      }
      await pedido.save();

      // Atualizar cadastro global do cliente se solicitado
      if (atualizar_cadastro && pedido.cliente_id) {
        try {
          const clienteDoc = await Cliente.findById(pedido.cliente_id);
          if (clienteDoc) {
            if (clienteData?.nome) clienteDoc.nome = clienteData.nome;
            if (clienteData?.telefone) clienteDoc.telefone = clienteData.telefone;
            if (clienteData?.cpf) clienteDoc.cpf = clienteData.cpf;
            await clienteDoc.save();
          }
        } catch (e) {
          console.error('[PEDIDO] Erro ao atualizar cadastro do cliente:', e.message);
        }
      }

      return res.status(200).json(pedido);
    }

    return res.status(400).json({ error: 'action inválida' });
  }

  return res.status(400).json({ error: 'Rota não encontrada. Use scope=pedido|pedidos' });
};
