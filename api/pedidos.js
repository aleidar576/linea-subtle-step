// ============================================
// 📦 /api/pedidos - Pedidos, Carrinhos, Clientes
// ============================================

const connectDB = require('../lib/mongodb.js');
const Pedido = require('../models/Pedido.js');
const CarrinhoAbandonado = require('../models/CarrinhoAbandonado.js');
const Cliente = require('../models/Cliente.js');
const Loja = require('../models/Loja.js');
const authPkg = require('../lib/auth.js');
const { sendEmail, getBranding, emailRastreioHtml, sendReportEmail, emailRelatorioHtml, generateReportFiles } = require('../lib/email.js');
const Lojista = require('../models/Lojista.js');
const Plano = require('../models/Plano.js');
const Product = require('../models/Product.js');

const { verifyToken, getTokenFromHeader } = authPkg;

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

  // ========== PÚBLICO: criar pedido e carrinho (checkout) ==========

  if (req.method === 'POST' && scope === 'pedido') {
    try {
      const body = req.body;
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
        status: 'pendente',
        pagamento: body.pagamento || { metodo: 'pix', txid: null, pix_code: null, pago_em: null },
        cliente: body.cliente || {},
        endereco: body.endereco || null,
        utms: body.utms || {},
        frete_id: body.frete_id || null,
        frete_nome: body.frete_nome || null,
      });

      return res.status(201).json(pedido);
    } catch (err) {
      console.error('[PEDIDO] Erro ao criar pedido:', err.message);
      return res.status(500).json({ error: 'Erro ao criar pedido', details: err.message });
    }
  }

  if (req.method === 'POST' && scope === 'carrinho') {
    const body = req.body;
    if (!body.loja_id) return res.status(400).json({ error: 'loja_id obrigatório' });

    // Se já existe carrinho com mesmo email+loja, atualizar
    let carrinho = null;
    if (body.cliente?.email) {
      carrinho = await CarrinhoAbandonado.findOne({
        loja_id: body.loja_id,
        'cliente.email': body.cliente.email,
        convertido: false,
      }).sort({ criado_em: -1 });
    }

    if (carrinho) {
      carrinho.etapa = body.etapa || carrinho.etapa;
      carrinho.itens = body.itens || carrinho.itens;
      carrinho.total = body.total || carrinho.total;
      carrinho.cliente = body.cliente || carrinho.cliente;
      carrinho.endereco = body.endereco || carrinho.endereco;
      carrinho.pix_code = body.pix_code || carrinho.pix_code;
      carrinho.txid = body.txid || carrinho.txid;
      carrinho.utms = body.utms || carrinho.utms;
      await carrinho.save();
      return res.status(200).json(carrinho);
    }

    carrinho = await CarrinhoAbandonado.create({
      loja_id: body.loja_id,
      etapa: body.etapa || 'customer',
      itens: body.itens || [],
      total: body.total || 0,
      cliente: body.cliente || {},
      endereco: body.endereco || null,
      utms: body.utms || {},
    });

    return res.status(201).json(carrinho);
  }

  if (req.method === 'PATCH' && scope === 'carrinho' && id) {
    // Marcar como convertido (pode ser público ou autenticado)
    const carrinho = await CarrinhoAbandonado.findByIdAndUpdate(id, { convertido: true }, { new: true });
    if (!carrinho) return res.status(404).json({ error: 'Carrinho não encontrado' });
    return res.status(200).json(carrinho);
  }

  // ========== AUTENTICADO: lojista ==========

  const lojista = requireLojista(req);
  if (!lojista) return res.status(401).json({ error: 'Não autorizado' });

  // --- PEDIDOS ---

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

  if (req.method === 'GET' && scope === 'pedido' && id) {
    const pedido = await Pedido.findById(id).lean();
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
    const loja = await validateLojaOwnership(pedido.loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });
    return res.status(200).json(pedido);
  }

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

      // Enviar email ao cliente
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

      // Hierarquia: status finais (recusado, estornado, chargeback) podem ser aplicados a qualquer momento
      const statusOrder = { pendente: 0, em_analise: 1, pago: 2, recusado: 3, estornado: 4, chargeback: 5 };
      const finais = ['recusado', 'estornado', 'chargeback'];
      if (!finais.includes(novoStatus) && statusOrder[novoStatus] < statusOrder[pedido.status]) {
        return res.status(400).json({ error: 'Não é possível retroagir o status' });
      }

      pedido.status = novoStatus;
      if (novoStatus === 'pago') pedido.pagamento = { ...pedido.pagamento, pago_em: new Date() };
      await pedido.save();

      // === ACUMULAR TAXAS quando pedido muda para pago ===
      if (novoStatus === 'pago' && pedido.total > 0) {
        try {
          const lojaDoc = await Loja.findById(pedido.loja_id).select('lojista_id').lean();
          if (lojaDoc) {
            const lojistaDoc = await Lojista.findById(lojaDoc.lojista_id);
            if (lojistaDoc && lojistaDoc.modo_amigo) {
              console.log(`[PEDIDO] Lojista ${lojistaDoc.email} é VIP (modo_amigo) — taxa zerada para pedido ${pedido._id}`);
            } else if (lojistaDoc && lojistaDoc.plano_id) {
              const plano = await Plano.findById(lojistaDoc.plano_id).lean();
              if (plano) {
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
                console.log(`[PEDIDO] Taxa acumulada: R$ ${valorTaxaArredondado.toFixed(2)} para lojista ${lojistaDoc.email} (total acumulado: R$ ${lojistaDoc.taxas_acumuladas.toFixed(2)})`);
              }
            }
          }
        } catch (taxErr) {
          console.error('[PEDIDO] Erro ao acumular taxa:', taxErr.message);
        }
      }

      // Marcar carrinho como convertido se pago
      if (novoStatus === 'pago' && pedido.pagamento?.txid) {
        await CarrinhoAbandonado.updateOne(
          { txid: pedido.pagamento.txid, convertido: false },
          { convertido: true }
        );
      }

      return res.status(200).json(pedido);
    }

    return res.status(400).json({ error: 'action inválida' });
  }

  // --- CARRINHOS ABANDONADOS ---

  if (req.method === 'GET' && scope === 'carrinhos' && loja_id) {
    const loja = await validateLojaOwnership(loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });

    const carrinhos = await CarrinhoAbandonado.find({ loja_id, convertido: false })
      .sort({ criado_em: -1 }).limit(200).lean();
    return res.status(200).json(carrinhos);
  }

  // --- CLIENTES ---

  if (req.method === 'GET' && scope === 'clientes' && loja_id) {
    const loja = await validateLojaOwnership(loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });

    const query = { loja_id };
    if (search) {
      query.$or = [
        { nome: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const clientes = await Cliente.find(query).sort({ criado_em: -1 }).lean();
    return res.status(200).json(clientes);
  }

  if (req.method === 'GET' && scope === 'cliente' && id) {
    const cliente = await Cliente.findById(id).lean();
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    const loja = await validateLojaOwnership(cliente.loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });
    return res.status(200).json(cliente);
  }

  if (req.method === 'PUT' && scope === 'cliente' && id) {
    const cliente = await Cliente.findById(id);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    const loja = await validateLojaOwnership(cliente.loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });

    // Campos editáveis (NUNCA email)
    const { nome, telefone } = req.body;
    if (nome !== undefined) cliente.nome = nome;
    if (telefone !== undefined) cliente.telefone = telefone;
    await cliente.save();
    return res.status(200).json(cliente);
  }

  if (req.method === 'POST' && scope === 'redefinir-senha-cliente' && id) {
    const cliente = await Cliente.findById(id).lean();
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    const loja = await validateLojaOwnership(cliente.loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });
    return res.status(200).json({ success: true, message: 'Funcionalidade em desenvolvimento' });
  }

  // --- CRIAR CLIENTE MANUALMENTE ---
  if (req.method === 'POST' && scope === 'criar-cliente' && loja_id) {
    const loja = await validateLojaOwnership(loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });
    const { nome, email, telefone, cpf } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });
    const existing = await Cliente.findOne({ loja_id, email });
    if (existing) return res.status(409).json({ error: 'Cliente com este email já existe' });
    const cliente = await Cliente.create({
      loja_id,
      nome: nome || '',
      email,
      telefone: telefone || '',
      cpf: cpf || '',
      censurado: false,
      total_pedidos: 0,
      total_gasto: 0,
    });
    return res.status(201).json(cliente);
  }

  // --- RELATÓRIOS ---

  if (req.method === 'GET' && scope === 'relatorios' && loja_id) {
    const loja = await validateLojaOwnership(loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });

    const { date_from, date_to } = req.query;
    const matchFilter = { loja_id, status: 'pago' };
    if (date_from || date_to) {
      matchFilter.criado_em = {};
      if (date_from) matchFilter.criado_em.$gte = new Date(date_from);
      if (date_to) matchFilter.criado_em.$lte = new Date(date_to);
    }

    // === DEFENSIVE QUERYING ===
    const docCount = await Pedido.countDocuments(matchFilter);
    let intervalDays = 0;
    if (date_from && date_to) {
      intervalDays = Math.ceil((new Date(date_to) - new Date(date_from)) / (1000 * 60 * 60 * 24));
    } else if (!date_from && !date_to) {
      intervalDays = 999; // "Todo o tempo" = always async
    }

    const isHeavy = docCount > 2000 || intervalDays > 90;

    if (isHeavy) {
      // Process report BEFORE responding (Vercel kills process after res.send)
      try {
        const [vendas_por_dia, vendas_por_produto, totaisAgg] = await Promise.all([
          Pedido.aggregate([
            { $match: matchFilter },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$criado_em' } }, count: { $sum: 1 }, total: { $sum: '$total' } } },
            { $sort: { _id: 1 } },
          ]),
          Pedido.aggregate([
            { $match: matchFilter },
            { $unwind: '$itens' },
            { $group: { _id: '$itens.name', nome: { $first: '$itens.name' }, quantidade: { $sum: '$itens.quantity' }, receita: { $sum: { $multiply: ['$itens.price', '$itens.quantity'] } } } },
            { $sort: { receita: -1 } },
            { $limit: 50 },
          ]),
          Pedido.aggregate([
            { $match: matchFilter },
            { $group: { _id: null, pedidos: { $sum: 1 }, receita: { $sum: '$total' } } },
          ]),
        ]);

        // Generate files
        const vendasData = vendas_por_dia.map(v => ({ Data: v._id, Pedidos: v.count, Receita: v.total }));
        const vendasHeaders = [
          { key: 'Data', label: 'Data' },
          { key: 'Pedidos', label: 'Pedidos' },
          { key: 'Receita', label: 'Receita (R$)', format: 'currency' },
        ];
        const { csvBuffer, xlsxBuffer } = generateReportFiles(vendasData, vendasHeaders);

        // Get lojista email
        const lojistaDoc = await Lojista.findById(lojista.lojista_id).select('email nome').lean();
        const periodo = date_from && date_to
          ? `${new Date(date_from).toLocaleDateString('pt-BR')} a ${new Date(date_to).toLocaleDateString('pt-BR')}`
          : 'Todo o período';

        if (lojistaDoc?.email) {
          const branding = await getBranding();
          await sendReportEmail({
            to: lojistaDoc.email,
            nomeRelatorio: `vendas-${loja.nome || 'loja'}`,
            html: emailRelatorioHtml({ nome: lojistaDoc.nome, nomeRelatorio: 'Vendas por Dia', periodo, branding }),
            csvBuffer,
            xlsxBuffer,
          });
        }
      } catch (err) {
        console.error('[RELATORIOS] Erro ao gerar relatório assíncrono:', err.message);
      }

      return res.status(200).json({ status: 'async_report', docCount, intervalDays });
    }

    // Normal flow (within limits)
    const [vendas_por_dia, vendas_por_produto, totaisAgg] = await Promise.all([
      Pedido.aggregate([
        { $match: matchFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$criado_em' } }, count: { $sum: 1 }, total: { $sum: '$total' } } },
        { $sort: { _id: 1 } },
      ]),
      Pedido.aggregate([
        { $match: matchFilter },
        { $unwind: '$itens' },
        { $group: { _id: '$itens.name', nome: { $first: '$itens.name' }, quantidade: { $sum: '$itens.quantity' }, receita: { $sum: { $multiply: ['$itens.price', '$itens.quantity'] } } } },
        { $sort: { receita: -1 } },
        { $limit: 50 },
      ]),
      Pedido.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, pedidos: { $sum: 1 }, receita: { $sum: '$total' } } },
      ]),
    ]);

    return res.status(200).json({
      vendas_por_dia,
      vendas_por_produto,
      totais: { pedidos: totaisAgg[0]?.pedidos || 0, receita: totaisAgg[0]?.receita || 0 },
    });
  }

  // ========== GERAR ETIQUETA MELHOR ENVIO ==========

  if (req.method === 'POST' && scope === 'gerar-etiqueta') {
    try {
      const { pedidoId, overrideServiceId } = req.body;
      if (!pedidoId) return res.status(400).json({ error: 'pedidoId obrigatório' });

      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
      const loja = await validateLojaOwnership(pedido.loja_id, lojista.lojista_id);
      if (!loja) return res.status(403).json({ error: 'Acesso negado' });

      const integracoes = loja.configuracoes?.integracoes?.melhor_envio;
      if (!integracoes?.ativo || !integracoes?.token) {
        return res.status(400).json({ error: 'Integração Melhor Envio não configurada' });
      }

      const meToken = integracoes.token;
      const isSandbox = integracoes.sandbox;
      const meBase = isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
      const meHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${meToken}`,
        'User-Agent': 'Dusking (suporte@dusking.com.br)',
      };

      // Safe JSON parser for ME responses (handles HTML error pages)
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

      const onlyDigits = (s) => (s || '').replace(/\D/g, '');

      // Idempotent: if already has order, just print
      if (pedido.melhor_envio_order_id) {
        const printRes = await fetch(`${meBase}/api/v2/me/shipment/print`, {
          method: 'POST', headers: meHeaders,
          body: JSON.stringify({ mode: 'public', orders: [pedido.melhor_envio_order_id] }),
        });
        const printData = await safeMeJson(printRes, 'Print (idempotent)');
        const url = printData.url || pedido.etiqueta_url;
        if (url) { pedido.etiqueta_url = url; await pedido.save(); }
        return res.status(200).json({ etiqueta_url: url, codigo_rastreio: pedido.codigo_rastreio, already_existed: true });
      }

      // Determine service_id
      const serviceId = overrideServiceId || pedido.frete_id;
      if (!serviceId) return res.status(400).json({ error: 'Nenhum serviço de frete selecionado (frete_id ausente)' });

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

      const cartPayload = {
        service: Number(serviceId),
        from: {
          name: empresa.razao_social || loja.nome || 'Loja',
          document: onlyDigits(empresa.documento),
          address: endereco.logradouro || '',
          number: endereco.numero || 'S/N',
          complement: endereco.complemento || '',
          district: endereco.bairro || '',
          city: endereco.cidade || '',
          state_abbr: endereco.estado || '',
          postal_code: onlyDigits(endereco.cep),
          phone: onlyDigits(empresa.telefone || '11999999999'),
          email: empresa.email_suporte || 'suporte@dusking.com.br',
        },
        to: {
          name: pedido.cliente?.nome || '',
          document: onlyDigits(pedido.cliente?.cpf),
          address: pedido.endereco?.rua || pedido.endereco?.logradouro || '',
          number: pedido.endereco?.numero || 'S/N',
          complement: pedido.endereco?.complemento || '',
          district: pedido.endereco?.bairro || '',
          city: pedido.endereco?.cidade || '',
          state_abbr: pedido.endereco?.estado || '',
          postal_code: onlyDigits(pedido.endereco?.cep),
          phone: onlyDigits(pedido.cliente?.telefone || '11999999999'),
          email: pedido.cliente?.email || '',
        },
        products: itemsWithDims,
        volumes: [volume],
        options: { non_commercial: true, receipt: false, own_hand: false },
      };

      // 1) POST /cart
      const cartRes = await fetch(`${meBase}/api/v2/me/cart`, { method: 'POST', headers: meHeaders, body: JSON.stringify(cartPayload) });
      const cartData = await safeMeJson(cartRes, 'Cart');
      const orderId = cartData.id;
      if (!orderId) return res.status(422).json({ error: 'Resposta inesperada do carrinho ME', details: cartData });

      // 2) POST /checkout
      const checkoutRes = await fetch(`${meBase}/api/v2/me/shipment/checkout`, { method: 'POST', headers: meHeaders, body: JSON.stringify({ orders: [orderId] }) });
      await safeMeJson(checkoutRes, 'Checkout');

      // 3) POST /generate
      const genRes = await fetch(`${meBase}/api/v2/me/shipment/generate`, { method: 'POST', headers: meHeaders, body: JSON.stringify({ orders: [orderId] }) });
      const genData = await safeMeJson(genRes, 'Generate');
      // Extract tracking from generate response
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

      return res.status(200).json({ melhor_envio_order_id: orderId, etiqueta_url: etiquetaUrl, codigo_rastreio: trackingCode });
    } catch (err) {
      console.error('[ME] Erro gerar etiqueta:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({ error: err.message || 'Erro interno ao gerar etiqueta', details: err.details || err.message });
    }
  }

  // ========== CANCELAR ETIQUETA MELHOR ENVIO ==========

  if (req.method === 'POST' && scope === 'cancelar-etiqueta') {
    try {
      const { pedidoId } = req.body;
      if (!pedidoId) return res.status(400).json({ error: 'pedidoId obrigatório' });

      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
      const loja = await validateLojaOwnership(pedido.loja_id, lojista.lojista_id);
      if (!loja) return res.status(403).json({ error: 'Acesso negado' });

      if (!pedido.melhor_envio_order_id) {
        return res.status(400).json({ error: 'Pedido não possui etiqueta para cancelar' });
      }

      const integracoes = loja.configuracoes?.integracoes?.melhor_envio;
      const meToken = integracoes?.token;
      const isSandbox = integracoes?.sandbox;
      const meBase = isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
      const meHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${meToken}`,
        'User-Agent': 'Dusking (suporte@dusking.com.br)',
      };

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
        // Não bloqueia — limpa campos locais mesmo se ME falhar
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

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[ME] Erro cancelar etiqueta:', err.message);
      return res.status(500).json({ error: 'Erro interno ao cancelar etiqueta', details: err.message });
    }
  }

  return res.status(400).json({ error: 'Rota não encontrada. Use scope=pedidos|pedido|carrinhos|carrinho|clientes|cliente|criar-cliente|relatorios|gerar-etiqueta|cancelar-etiqueta' });
};
