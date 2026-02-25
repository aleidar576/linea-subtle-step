// ============================================
// 📋 Plano Model (Mongoose) - Subscription Plans
// ============================================

const mongoose = require('mongoose');
const { nowGMT3 } = require('../lib/date-utils.js');

const PlanoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  preco_original: { type: Number, default: 0 },
  preco_promocional: { type: Number, default: 0 },
  taxa_transacao: { type: Number, default: 2.0 },
  stripe_price_id: { type: String, required: true },
  vantagens: { type: [String], default: [] },
  destaque: { type: Boolean, default: false },
  ordem: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  criado_em: { type: Date, default: () => nowGMT3() },
});

module.exports = mongoose.models.Plano || mongoose.model('Plano', PlanoSchema);
