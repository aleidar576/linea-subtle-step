// ============================================
// 🏷️ /api/etiquetas - Fulfillment/Etiquetas — Microsserviço
// ============================================

const connectDB = require('../lib/mongodb.js');
const Pedido = require('../models/Pedido.js');
const Loja = require('../models/Loja.js');
const authPkg = require('../lib/auth.js');
const { getShippingService } = require('../lib/services/fretes');

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

  const { scope } = req.query;

  const lojista = requireLojista(req);
  if (!lojista) return res.status(401).json({ error: 'Não autorizado' });

  // --- GERAR ETIQUETA ---
  if (req.method === 'POST' && scope === 'gerar-etiqueta') {
    try {
      const { pedidoId, overrideServiceId } = req.body;
      if (!pedidoId) return res.status(400).json({ error: 'pedidoId obrigatório' });

      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
      const loja = await validateLojaOwnership(pedido.loja_id, lojista.lojista_id);
      if (!loja) return res.status(403).json({ error: 'Acesso negado' });

      const shippingService = getShippingService(loja.configuracoes?.integracoes);
      const result = await shippingService.gerarEtiqueta({ pedido, loja, overrideServiceId });

      if (result.error) {
        return res.status(result.httpStatus || 500).json({ error: result.error, details: result.details });
      }
      return res.status(result.httpStatus || 200).json(result.data);
    } catch (err) {
      console.error('[ETIQUETA] Erro gerar etiqueta:', err.message);
      const status = err.statusCode || 500;
      return res.status(status).json({ error: err.message || 'Erro interno ao gerar etiqueta', details: err.details || err.message });
    }
  }

  // --- CANCELAR ETIQUETA ---
  if (req.method === 'POST' && scope === 'cancelar-etiqueta') {
    try {
      const { pedidoId } = req.body;
      if (!pedidoId) return res.status(400).json({ error: 'pedidoId obrigatório' });

      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });
      const loja = await validateLojaOwnership(pedido.loja_id, lojista.lojista_id);
      if (!loja) return res.status(403).json({ error: 'Acesso negado' });

      const shippingService = getShippingService(loja.configuracoes?.integracoes);
      const result = await shippingService.cancelarEtiqueta({ pedido, loja });

      if (result.error) {
        return res.status(result.httpStatus || 500).json({ error: result.error });
      }
      return res.status(result.httpStatus || 200).json(result.data);
    } catch (err) {
      console.error('[ETIQUETA] Erro cancelar etiqueta:', err.message);
      return res.status(500).json({ error: 'Erro interno ao cancelar etiqueta', details: err.message });
    }
  }

  return res.status(400).json({ error: 'Rota não encontrada. Use scope=gerar-etiqueta|cancelar-etiqueta' });
};
