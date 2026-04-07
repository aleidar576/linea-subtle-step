// ============================================
// 🎫 Ticket Model (Mongoose) - Segurança SaaS
// ============================================

const mongoose = require('mongoose');
const { nowUtc } = require('../lib/utc.js');

const TicketSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['compromisso_conta', 'suporte', 'bug'], required: true },
  lojista_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lojista', required: true, index: true },
  status: { type: String, enum: ['aberto', 'resolvido'], default: 'aberto' },
  descricao: { type: String, default: '' },
  criado_em: { type: Date, default: () => nowUtc() },
});

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
