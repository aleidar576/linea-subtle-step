// ============================================
// 🔐 Auth Helpers (JWT)
// ============================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('[AUTH] FATAL: JWT_SECRET não configurado nas variáveis de ambiente. Tokens não serão validados.');
const TOKEN_EXPIRY = '7d';

function signToken(payload, expiresIn) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn || TOKEN_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getTokenFromHeader(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function requireAdmin(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') return null;
  return decoded;
}

function checkTolerancia(lojista, diasGlobal = 5) {
  if (lojista.modo_amigo || lojista.ignorar_inadimplencia) return { liberado: true, diasRestantes: Infinity };
  if (!lojista.data_vencimento) return { liberado: true, diasRestantes: Infinity };
  const totalDias = diasGlobal + (lojista.tolerancia_extra_dias || 0);
  const dataLimite = new Date(lojista.data_vencimento);
  dataLimite.setDate(dataLimite.getDate() + totalDias);
  const now = new Date();
  const diasRestantes = Math.ceil((dataLimite - now) / (1000 * 60 * 60 * 24));
  return { liberado: now < dataLimite, diasRestantes };
}

module.exports = { signToken, verifyToken, getTokenFromHeader, requireAdmin, checkTolerancia };
