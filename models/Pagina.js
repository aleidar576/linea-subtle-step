// ============================================
// 📄 Pagina Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');
const { nowUtc } = require('../lib/utc.js');

const PaginaSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  titulo: { type: String, required: true },
  slug: { type: String, required: true },
  conteudo: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  criado_em: { type: Date, default: () => nowUtc() },
  atualizado_em: { type: Date, default: () => nowUtc() },
});

PaginaSchema.index({ loja_id: 1, slug: 1 }, { unique: true });

PaginaSchema.pre('save', function () {
  if (!this.isNew) this.atualizado_em = nowUtc();
});

PaginaSchema.pre('findOneAndUpdate', function () {
  this.set({ atualizado_em: nowUtc() });
});

module.exports = mongoose.models.Pagina || mongoose.model('Pagina', PaginaSchema);
