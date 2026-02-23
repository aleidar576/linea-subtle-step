// ============================================
// 📂 Category Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  nome: { type: String, required: true },
  slug: { type: String, required: true },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  ordem: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

CategorySchema.index({ loja_id: 1, slug: 1 }, { unique: true });

module.exports = mongoose.models.Category || mongoose.model('Category', CategorySchema);
