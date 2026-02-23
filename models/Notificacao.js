// ============================================
// 🔔 Notificacao Model (Mongoose) - Multi-Tenant SaaS
// ============================================

const mongoose = require('mongoose');
const { nowGMT3 } = require('../lib/date-utils.js');

const NotificacaoSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  mensagem: { type: String, required: true },
  lida: { type: Boolean, default: false },
  lojista_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lojista', required: true, index: true },
  tipo: { type: String, enum: ['sistema', 'aviso', 'seguranca'], default: 'aviso' },
  criado_em: { type: Date, default: () => nowGMT3() },
});

module.exports = mongoose.models.Notificacao || mongoose.model('Notificacao', NotificacaoSchema);
