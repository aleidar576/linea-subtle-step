// ============================================
// 📋 Plano Model (Mongoose) - Subscription Plans
// ============================================

const mongoose = require('mongoose');
const { nowGMT3 } = require('../lib/date-utils.js');

const PlanoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  subtitulo: { type: String, default: '' },
  textoDestaque: { type: String, default: '' },
  preco_original: { type: Number, default: 0 },
  preco_promocional: { type: Number, default: 0 },
  taxa_transacao: { type: Number, default: 2.0 },
  taxa_transacao_percentual: { type: Number, default: 1.5 },
  taxa_transacao_trial: { type: Number, default: 2.0 },
  taxa_transacao_fixa: { type: Number, default: 0 },
  stripe_price_id: { type: String, required: function() { return !this.isSobMedida; }, default: '' },
  vantagens: { type: [String], default: [] },
  desvantagens: { type: [String], default: [] },
  destaque: { type: Boolean, default: false },
  ordem: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  isSobMedida: { type: Boolean, default: false },
  textoBotao: { type: String, default: '' },
  whatsappNumero: { type: String, default: '' },
  whatsappMensagem: { type: String, default: '' },
  categoria: { type: String, enum: ['business', 'loja_pronta'], default: 'business' },
  isPagamentoUnico: { type: Boolean, default: false },
  maxParcelas: { type: Number, default: 12 },
  destaques: { type: [String], default: [] },
  criado_em: { type: Date, default: () => nowGMT3() },
});

module.exports = mongoose.models.Plano || mongoose.model('Plano', PlanoSchema);
