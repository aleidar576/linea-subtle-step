// ============================================
// 🎫 Ticket Model (Mongoose) - Segurança SaaS
// ============================================

const mongoose = require('mongoose');
const { nowGMT3 } = require('../lib/date-utils.js');

const TicketSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['compromisso_conta', 'suporte', 'bug'], required: true },
  lojista_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lojista', required: true, index: true },
  status: { type: String, enum: ['aberto', 'resolvido'], default: 'aberto' },
  descricao: { type: String, default: '' },
  criado_em: { type: Date, default: () => nowGMT3() },
});

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
