// ============================================
// 📄 Pagina Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');
const { nowGMT3 } = require('../lib/date-utils.js');

const PaginaSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  titulo: { type: String, required: true },
  slug: { type: String, required: true },
  conteudo: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  criado_em: { type: Date, default: () => nowGMT3() },
  atualizado_em: { type: Date, default: () => nowGMT3() },
});

PaginaSchema.index({ loja_id: 1, slug: 1 }, { unique: true });

PaginaSchema.pre('save', function () {
  if (!this.isNew) this.atualizado_em = nowGMT3();
});

PaginaSchema.pre('findOneAndUpdate', function () {
  this.set({ atualizado_em: nowGMT3() });
});

module.exports = mongoose.models.Pagina || mongoose.model('Pagina', PaginaSchema);
