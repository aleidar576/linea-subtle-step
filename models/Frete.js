// ============================================
// 🚚 Frete Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');
const { nowUtc } = require('../lib/utc.js');

const FreteSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  nome: { type: String, required: true },
  tipo: { type: String, enum: ['entregue_ate', 'receba_ate'], default: 'entregue_ate' },
  prazo_dias_min: { type: Number, default: 1 },
  prazo_dias_max: { type: Number, default: 7 },
  valor: { type: Number, default: 0 },
  valor_minimo_gratis: { type: Number, default: null },
  ocultar_preco: { type: Boolean, default: false },
  ordem_exibicao: { type: Number, default: 0 },
  pre_selecionado: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  criado_em: { type: Date, default: () => nowUtc() },
  atualizado_em: { type: Date, default: () => nowUtc() },
});

FreteSchema.pre('save', function () {
  if (!this.isNew) this.atualizado_em = nowUtc();
});

FreteSchema.pre('findOneAndUpdate', function () {
  this.set({ atualizado_em: nowUtc() });
});

module.exports = mongoose.models.Frete || mongoose.model('Frete', FreteSchema);
