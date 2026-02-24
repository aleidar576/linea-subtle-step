// ============================================
// 🎟️ Cupom Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');
const { nowGMT3 } = require('../lib/date-utils.js');

const CupomSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  codigo: { type: String, required: true, uppercase: true, trim: true },
  tipo: { type: String, enum: ['percentual', 'fixo', 'frete_gratis'], required: true },
  valor: { type: Number, default: 0 },
  valor_minimo_pedido: { type: Number, default: null },
  limite_usos: { type: Number, default: null },
  usos: { type: Number, default: 0 },
  validade: { type: Date, default: null },
  
  produtos_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: [] }],
  is_active: { type: Boolean, default: true },
  criado_em: { type: Date, default: () => nowGMT3() },
  atualizado_em: { type: Date, default: () => nowGMT3() },
});

CupomSchema.index({ loja_id: 1, codigo: 1 }, { unique: true });

CupomSchema.pre('save', function () {
  if (!this.isNew) this.atualizado_em = nowGMT3();
});

CupomSchema.pre('findOneAndUpdate', function () {
  this.set({ atualizado_em: nowGMT3() });
});

module.exports = mongoose.models.Cupom || mongoose.model('Cupom', CupomSchema);
