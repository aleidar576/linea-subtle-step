// ============================================
// 🚚 Frete Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');
const { nowGMT3 } = require('../lib/date-utils.js');

const FreteSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  nome: { type: String, required: true },
  tipo: { type: String, enum: ['entregue_ate', 'receba_ate'], default: 'entregue_ate' },
  prazo_dias_min: { type: Number, default: 1 },
  prazo_dias_max: { type: Number, default: 7 },
  valor: { type: Number, default: 0 },
  valor_minimo_gratis: { type: Number, default: null },
  ocultar_preco: { type: Boolean, default: false },
  exibir_no_produto: { type: Boolean, default: true },
  ordem_exibicao: { type: Number, default: 0 },
  pre_selecionado: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  criado_em: { type: Date, default: () => nowGMT3() },
  atualizado_em: { type: Date, default: () => nowGMT3() },
});

FreteSchema.pre('save', function () {
  if (!this.isNew) this.atualizado_em = nowGMT3();
});

FreteSchema.pre('findOneAndUpdate', function () {
  this.set({ atualizado_em: nowGMT3() });
});

module.exports = mongoose.models.Frete || mongoose.model('Frete', FreteSchema);
