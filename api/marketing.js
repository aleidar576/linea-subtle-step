// ============================================
// 📢 Marketing API (Cupons + Leads + Pixels)
// Fase 5 — Extraído de loja-extras.js
// ============================================

const mongoose = require('mongoose');
const connectDB = require('../lib/mongodb.js');
const jwt = require('jsonwebtoken');

// Models
const Cupom = require('../models/Cupom.js');
const Loja = require('../models/Loja.js');
const Lead = require('../models/Lead.js');
const TrackingPixel = require('../models/TrackingPixel.js');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('[MARKETING] FATAL: JWT_SECRET não configurado nas variáveis de ambiente.');

function verifyLojista(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role !== 'lojista') return null;
    return decoded;
  } catch { return null; }
}

async function verifyOwnership(user, lojaId) {
  const loja = await Loja.findById(lojaId).lean();
  if (!loja) return false;
  return loja.lojista_id.toString() === user.lojista_id;
}

module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { scope, id, loja_id, codigo } = req.query;
  const method = req.method;

  const rawBody = method !== 'GET' && method !== 'DELETE' && method !== 'OPTIONS'
    ? await getRawBody(req)
    : null;

  if (rawBody) {
    try { req.body = JSON.parse(rawBody); } catch { req.body = {}; }
  }

  // === PUBLIC: Validar cupom (checkout) ===
  if (scope === 'cupom-publico' && method === 'GET') {
    if (!loja_id || !codigo) return res.status(400).json({ error: 'loja_id e codigo são obrigatórios' });
    const cupom = await Cupom.findOne({ loja_id, codigo: codigo.toUpperCase(), is_active: true }).lean();
    if (!cupom) return res.status(404).json({ error: 'Cupom não encontrado ou inativo' });
    if (cupom.validade && new Date(cupom.validade) < new Date()) return res.status(410).json({ error: 'Cupom expirado' });
    if (cupom.limite_usos !== null && cupom.usos >= cupom.limite_usos) return res.status(410).json({ error: 'Cupom esgotado' });
    return res.json({ tipo: cupom.tipo, valor: cupom.valor, valor_minimo_pedido: cupom.valor_minimo_pedido, codigo: cupom.codigo, produtos_ids: cupom.produtos_ids || [] });
  }

  // === PUBLIC: Bulk cupons for popup ===
  if (scope === 'cupons-popup' && method === 'GET') {
    const ids = req.query.ids;
    if (!loja_id || !ids) return res.status(400).json({ error: 'loja_id e ids são obrigatórios' });
    const idList = ids.split(',').map(s => s.trim()).filter(Boolean);
    const cupons = await Cupom.find({ _id: { $in: idList }, loja_id, is_active: true }).lean();
    return res.json(cupons.map(c => ({ _id: c._id, codigo: c.codigo, tipo: c.tipo, valor: c.valor })));
  }

  // === PUBLIC: Newsletter subscribe (lead) ===
  if (scope === 'lead-newsletter' && method === 'POST') {
    const { loja_id: bodyLojaId, email, origem } = req.body;
    const lid = bodyLojaId || loja_id;
    if (!lid || !email) return res.status(400).json({ error: 'loja_id e email são obrigatórios' });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'E-mail inválido' });
    await Lead.findOneAndUpdate(
      { loja_id: lid, email: email.toLowerCase().trim() },
      { $setOnInsert: { loja_id: lid, email: email.toLowerCase().trim(), origem: origem || 'POPUP' } },
      { upsert: true, new: true }
    );
    return res.json({ success: true });
  }

  // === AUTH REQUIRED ===
  const user = verifyLojista(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const resolvedLojaId = loja_id || req.body?.loja_id;

  if (resolvedLojaId) {
    const owns = await verifyOwnership(user, resolvedLojaId);
    if (!owns) return res.status(403).json({ error: 'Sem permissão para esta loja' });
  }

  try {
    // ==========================================
    // CUPONS
    // ==========================================
    if (scope === 'cupons' && method === 'GET') {
      const cupons = await Cupom.find({ loja_id: resolvedLojaId }).sort({ criado_em: -1 }).lean();
      return res.json(cupons);
    }

    if (scope === 'cupom') {
      if (method === 'POST') {
        const data = req.body;
        if (!data.codigo || !data.tipo || data.valor == null || !data.loja_id) {
          return res.status(400).json({ error: 'codigo, tipo, valor e loja_id obrigatórios' });
        }
        const exists = await Cupom.findOne({ loja_id: data.loja_id, codigo: data.codigo.toUpperCase() });
        if (exists) return res.status(409).json({ error: 'Já existe um cupom com este código nesta loja' });
        const cupom = await Cupom.create(data);
        return res.status(201).json(cupom);
      }

      if (method === 'PUT' && id) {
        const cupom = await Cupom.findById(id);
        if (!cupom) return res.status(404).json({ error: 'Cupom não encontrado' });
        const owns = await verifyOwnership(user, cupom.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const updated = await Cupom.findByIdAndUpdate(id, req.body, { new: true });
        return res.json(updated);
      }

      if (method === 'DELETE' && id) {
        const cupom = await Cupom.findById(id);
        if (!cupom) return res.status(404).json({ error: 'Cupom não encontrado' });
        const owns = await verifyOwnership(user, cupom.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await Cupom.findByIdAndDelete(id);
        return res.json({ success: true });
      }

      if (method === 'PATCH' && id) {
        const cupom = await Cupom.findById(id);
        if (!cupom) return res.status(404).json({ error: 'Cupom não encontrado' });
        const owns = await verifyOwnership(user, cupom.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const updated = await Cupom.findByIdAndUpdate(id, { is_active: !cupom.is_active }, { new: true });
        return res.json(updated);
      }
    }

    // ==========================================
    // PIXELS
    // ==========================================
    if (scope === 'pixels' && method === 'GET') {
      const pixels = await TrackingPixel.find({ loja_id: resolvedLojaId }).sort({ createdAt: -1 }).lean();
      return res.json(pixels);
    }

    if (scope === 'pixel') {
      if (method === 'POST') {
        const data = req.body;
        if (!data.pixel_id || !data.platform || !data.loja_id) return res.status(400).json({ error: 'pixel_id, platform e loja_id obrigatórios' });
        const pixel = await TrackingPixel.create(data);
        return res.status(201).json(pixel);
      }

      if (method === 'PUT' && id) {
        const pixel = await TrackingPixel.findById(id);
        if (!pixel) return res.status(404).json({ error: 'Pixel não encontrado' });
        const owns = await verifyOwnership(user, pixel.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const updated = await TrackingPixel.findByIdAndUpdate(id, req.body, { new: true });
        return res.json(updated);
      }

      if (method === 'DELETE' && id) {
        const pixel = await TrackingPixel.findById(id);
        if (!pixel) return res.status(404).json({ error: 'Pixel não encontrado' });
        const owns = await verifyOwnership(user, pixel.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await TrackingPixel.findByIdAndDelete(id);
        return res.json({ success: true });
      }
    }

    // ==========================================
    // LEADS (Newsletter)
    // ==========================================
    if (scope === 'leads' && method === 'GET') {
      const leads = await Lead.find({ loja_id: resolvedLojaId }).sort({ criado_em: -1 }).lean();
      const Cliente = require('../models/Cliente.js');
      const emails = leads.map(l => l.email);
      const clientes = await Cliente.find({ loja_id: resolvedLojaId, email: { $in: emails } }).select('email').lean();
      const clienteEmails = new Set(clientes.map(c => c.email.toLowerCase()));
      const result = leads.map(l => ({
        ...l,
        vinculo: clienteEmails.has(l.email) ? 'Cliente Cadastrado' : 'Visitante',
      }));
      return res.json(result);
    }

    if (scope === 'leads-export' && method === 'GET') {
      const leads = await Lead.find({ loja_id: resolvedLojaId }).sort({ criado_em: -1 }).lean();
      const Cliente = require('../models/Cliente.js');
      const emails = leads.map(l => l.email);
      const clientes = await Cliente.find({ loja_id: resolvedLojaId, email: { $in: emails } }).select('email').lean();
      const clienteEmails = new Set(clientes.map(c => c.email.toLowerCase()));
      return res.json(leads.map(l => ({
        ...l,
        vinculo: clienteEmails.has(l.email) ? 'Cliente Cadastrado' : 'Visitante',
      })));
    }

    if (scope === 'lead') {
      if (method === 'PUT' && id) {
        const lead = await Lead.findById(id);
        if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
        const owns = await verifyOwnership(user, lead.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const { email } = req.body;
        if (email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
          if (!emailRegex.test(email)) return res.status(400).json({ error: 'E-mail inválido' });
          lead.email = email.toLowerCase().trim();
          await lead.save();
        }
        return res.json(lead);
      }

      if (method === 'DELETE' && id) {
        const lead = await Lead.findById(id);
        if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
        const owns = await verifyOwnership(user, lead.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await Lead.findByIdAndDelete(id);
        return res.json({ success: true });
      }
    }

    if (scope === 'leads-import' && method === 'POST') {
      const { emails, origem } = req.body;
      if (!resolvedLojaId || !Array.isArray(emails)) return res.status(400).json({ error: 'loja_id e emails[] obrigatórios' });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const validEmails = emails.filter(e => typeof e === 'string' && emailRegex.test(e.trim())).map(e => ({
        loja_id: resolvedLojaId,
        email: e.toLowerCase().trim(),
        origem: origem || 'POPUP',
      }));
      if (!validEmails.length) return res.status(400).json({ error: 'Nenhum e-mail válido' });
      try {
        const result = await Lead.insertMany(validEmails, { ordered: false });
        return res.json({ success: true, inseridos: result.length });
      } catch (err) {
        const inserted = err.insertedDocs?.length || 0;
        return res.json({ success: true, inseridos: inserted });
      }
    }

    return res.status(400).json({ error: `Scope "${scope}" inválido ou método não suportado` });
  } catch (err) {
    console.error('[MARKETING]', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
