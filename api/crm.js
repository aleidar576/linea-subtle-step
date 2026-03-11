// ============================================
// 👤 /api/crm - CRM (Clientes) — Microsserviço
// ============================================

const connectDB = require('../lib/mongodb.js');
const Cliente = require('../models/Cliente.js');
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

  const { scope, id, loja_id, search } = req.query;

  const lojista = requireLojista(req);
  if (!lojista) return res.status(401).json({ error: 'Não autorizado' });

  // --- LISTAR CLIENTES ---
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

  // --- DETALHE CLIENTE ---
  if (req.method === 'GET' && scope === 'cliente' && id) {
    const cliente = await Cliente.findById(id).lean();
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    const loja = await validateLojaOwnership(cliente.loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });
    return res.status(200).json(cliente);
  }

  // --- EDITAR CLIENTE ---
  if (req.method === 'PUT' && scope === 'cliente' && id) {
    const cliente = await Cliente.findById(id);
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
    const loja = await validateLojaOwnership(cliente.loja_id, lojista.lojista_id);
    if (!loja) return res.status(403).json({ error: 'Acesso negado' });

    const { nome, telefone } = req.body;
    if (nome !== undefined) cliente.nome = nome;
    if (telefone !== undefined) cliente.telefone = telefone;
    await cliente.save();
    return res.status(200).json(cliente);
  }

  // --- REDEFINIR SENHA CLIENTE ---
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

  return res.status(400).json({ error: 'Rota não encontrada. Use scope=clientes|cliente|criar-cliente|redefinir-senha-cliente' });
};
