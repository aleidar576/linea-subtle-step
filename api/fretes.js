// ============================================
// 🚚 Fretes API (Microsserviço de Logística)
// Fase 2 — Strangler Fig (extraído de loja-extras.js)
// ============================================

const mongoose = require('mongoose');
const connectDB = require('../lib/mongodb.js');
const jwt = require('jsonwebtoken');

// Models
const Frete = require('../models/Frete.js');
const Loja = require('../models/Loja.js');
const Product = require('../models/Product.js');

// Services (Strategy Pattern)
const { getShippingService } = require('../lib/services/fretes');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('[FRETES] FATAL: JWT_SECRET não configurado nas variáveis de ambiente.');

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
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { scope, id, loja_id } = req.query;
  const method = req.method;

  // Parse body for POST/PUT
  if (method !== 'GET' && method !== 'DELETE' && method !== 'OPTIONS') {
    const rawBody = await getRawBody(req);
    try {
      req.body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      req.body = {};
    }
  }

  // ==========================================
  // PUBLIC: Fretes de uma loja (sem auth)
  // ==========================================
  if (scope === 'fretes-publico' && method === 'GET' && loja_id) {
    const fretes = await Frete.find({ loja_id, is_active: true }).sort({ ordem_exibicao: 1 }).lean();
    return res.json(fretes);
  }

  // ==========================================
  // PUBLIC: Calcular Frete Híbrido (Manuais + Melhor Envio)
  // ==========================================
  if (scope === 'calcular-frete' && method === 'POST') {
    try {
      const { loja_id: bodyLojaId, to_postal_code, items } = req.body || {};
      if (!bodyLojaId || !to_postal_code) {
        return res.status(400).json({ error: 'loja_id e to_postal_code são obrigatórios' });
      }

      const lojaDoc = await Loja.findById(bodyLojaId).lean();
      if (!lojaDoc) return res.status(404).json({ error: 'Loja não encontrada' });

      // 1. Fretes manuais ativos (com soma por produto via fretes_vinculados)
      const fretesDb = await Frete.find({ loja_id: bodyLojaId, is_active: true }).sort({ ordem_exibicao: 1 }).lean();

      const productIds = (items || []).map(i => i.id).filter(Boolean);
      const productsDb = productIds.length ? await Product.find({
        $or: [
          { product_id: { $in: productIds } },
          { _id: { $in: productIds.filter(id => /^[a-f0-9]{24}$/i.test(id)) } },
        ],
        loja_id: bodyLojaId,
      }).lean() : [];

      const manuais = [];
      for (const f of fretesDb) {
        const freteIdStr = f._id.toString();
        let totalPrice = 0;
        let isValid = true;

        for (const item of (items || [])) {
          const qty = Number(item.quantity) || 1;
          const prod = productsDb.find(p =>
            p.product_id === item.id || p._id.toString() === item.id
          );

          if (prod && Array.isArray(prod.fretes_vinculados)) {
            const vinculo = prod.fretes_vinculados.find(v =>
              v.frete_id && v.frete_id.toString() === freteIdStr
            );
            if (vinculo) {
              if (vinculo.exibir_no_produto === false) {
                isValid = false;
                break;
              }
              const val = (vinculo.valor_personalizado !== null && vinculo.valor_personalizado !== undefined)
                ? vinculo.valor_personalizado
                : Number(f.valor) || 0;
              totalPrice += val * qty;
            } else {
              totalPrice += (Number(f.valor) || 0) * qty;
            }
          } else {
            totalPrice += (Number(f.valor) || 0) * qty;
          }
        }

        if (isValid) {
          manuais.push({
            id: freteIdStr,
            name: f.nome,
            price: totalPrice,
            delivery_time: f.prazo_dias_max || f.prazo_dias_min || 0,
            picture: '',
          });
        }
      }

      // 2. Melhor Envio (via Shipping Service)
      const meConfig = lojaDoc.configuracoes?.integracoes?.melhor_envio;
      const cepOrigem = lojaDoc.configuracoes?.endereco?.cep;
      const shippingService = getShippingService(lojaDoc.configuracoes?.integracoes);
      const melhorEnvioOpcoes = await shippingService.calcularFrete({ meConfig, cepOrigem, to_postal_code, items });

      return res.status(200).json({ success: true, fretes: [...manuais, ...melhorEnvioOpcoes] });
    } catch (err) {
      console.error('[CALCULAR-FRETE] Erro geral:', err);
      return res.status(500).json({ error: 'Erro ao calcular frete' });
    }
  }

  // ==========================================
  // AUTH REQUIRED — Painel do Lojista
  // ==========================================
  const user = verifyLojista(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const resolvedLojaId = loja_id || req.body?.loja_id;

  if (resolvedLojaId) {
    const owns = await verifyOwnership(user, resolvedLojaId);
    if (!owns) return res.status(403).json({ error: 'Sem permissão para esta loja' });
  }

  try {
    // ==========================================
    // FRETES (CRUD)
    // ==========================================
    if (scope === 'fretes' && method === 'GET') {
      const fretes = await Frete.find({ loja_id: resolvedLojaId }).sort({ ordem_exibicao: 1 }).lean();
      return res.json(fretes);
    }

    if (scope === 'frete') {
      if (method === 'POST') {
        const data = req.body;
        if (!data.nome || !data.loja_id) return res.status(400).json({ error: 'nome e loja_id obrigatórios' });
        const count = await Frete.countDocuments({ loja_id: data.loja_id });
        const frete = await Frete.create({ ...data, ordem_exibicao: data.ordem_exibicao ?? count });
        return res.status(201).json(frete);
      }

      if (method === 'PUT' && id) {
        const frete = await Frete.findById(id);
        if (!frete) return res.status(404).json({ error: 'Frete não encontrado' });
        const owns = await verifyOwnership(user, frete.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        const updated = await Frete.findByIdAndUpdate(id, req.body, { new: true });
        return res.json(updated);
      }

      if (method === 'DELETE' && id) {
        const frete = await Frete.findById(id);
        if (!frete) return res.status(404).json({ error: 'Frete não encontrado' });
        const owns = await verifyOwnership(user, frete.loja_id);
        if (!owns) return res.status(403).json({ error: 'Sem permissão' });
        await Product.updateMany({ frete_regra_id: frete._id }, { $set: { frete_regra_id: null } });
        await Frete.findByIdAndDelete(id);
        return res.json({ success: true });
      }
    }

    return res.status(400).json({ error: `Scope "${scope}" inválido ou método não suportado` });
  } catch (err) {
    console.error('[FRETES]', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
