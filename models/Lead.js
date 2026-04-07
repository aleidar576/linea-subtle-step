// ============================================
// 📧 Lead Model (Newsletter) - Multi-Tenant SaaS
// ============================================

const mongoose = require('mongoose');
const { nowUtc } = require('../lib/utc.js');

const LeadSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 255 },
  origem: { type: String, enum: ['POPUP', 'FOOTER'], default: 'POPUP' },
  criado_em: { type: Date, default: () => nowUtc() },
});

// Index único composto para evitar duplicatas por loja
LeadSchema.index({ loja_id: 1, email: 1 }, { unique: true });

module.exports = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
