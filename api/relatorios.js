// ============================================
// 📊 /api/relatorios - Relatórios — Microsserviço
// ============================================

const connectDB = require('../lib/mongodb.js');
const Pedido = require('../models/Pedido.js');
const Loja = require('../models/Loja.js');
const Lojista = require('../models/Lojista.js');
const authPkg = require('../lib/auth.js');
const { sendReportEmail, emailRelatorioHtml, generateReportFiles, getBranding } = require('../lib/email.js');

const { verifyToken, getTokenFromHeader } = authPkg;

function requireLojista(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'lojista') return null;
  return decoded;
}

async function validateLojaOwnership(lojaId, lojistaId) {
  return Loja.findOne({ _id: lojaId, lojista_id: lojistaId });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { scope, loja_id } = req.query;

  const lojista = requireLojista(req);
  if (!lojista) return res.status(401).json({ error: 'Não autorizado' });

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

    const docCount = await Pedido.countDocuments(matchFilter);
    let intervalDays = 0;
    if (date_from && date_to) {
      intervalDays = Math.ceil((new Date(date_to) - new Date(date_from)) / (1000 * 60 * 60 * 24));
    } else if (!date_from && !date_to) {
      intervalDays = 999;
    }

    const isHeavy = docCount > 2000 || intervalDays > 90;

    if (isHeavy) {
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

        const vendasData = vendas_por_dia.map(v => ({ Data: v._id, Pedidos: v.count, Receita: v.total }));
        const vendasHeaders = [
          { key: 'Data', label: 'Data' },
          { key: 'Pedidos', label: 'Pedidos' },
          { key: 'Receita', label: 'Receita (R$)', format: 'currency' },
        ];
        const { csvBuffer, xlsxBuffer } = generateReportFiles(vendasData, vendasHeaders);

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

  return res.status(400).json({ error: 'Rota não encontrada. Use scope=relatorios' });
};
