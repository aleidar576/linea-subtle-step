// ============================================
// 🛒 /api/carrinhos - Carrinhos Abandonados — Microsserviço
// ============================================

const connectDB = require('../lib/mongodb.js');
const CarrinhoAbandonado = require('../models/CarrinhoAbandonado.js');
const Loja = require('../models/Loja.js');
const authPkg = require('../lib/auth.js');

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

  const { scope, id, loja_id } = req.query;

  // ========== PÚBLICO: criar/atualizar carrinho (checkout) ==========

  if (req.method === 'POST' && scope === 'carrinho') {
    const body = req.body;
    if (!body.loja_id) return res.status(400).json({ error: 'loja_id obrigatório' });

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
    const carrinho = await CarrinhoAbandonado.findByIdAndUpdate(id, { convertido: true }, { new: true });
    if (!carrinho) return res.status(404).json({ error: 'Carrinho não encontrado' });
    return res.status(200).json(carrinho);
  }

  // ========== AUTENTICADO: listar carrinhos do lojista ==========

  const lojista = requireLojista(req);
  if (!lojista) return res.status(401).json({ error: 'Não autorizado' });

  if (req.method === 'GET' && scope === 'carrinhos' && loja_id) {
    const loja = await validateLojaOwnership(loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });

    const carrinhos = await CarrinhoAbandonado.find({ loja_id, convertido: false })
      .sort({ criado_em: -1 }).limit(200).lean();
    return res.status(200).json(carrinhos);
  }

  return res.status(400).json({ error: 'Rota não encontrada. Use scope=carrinho|carrinhos' });
};
