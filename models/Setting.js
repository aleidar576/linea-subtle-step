// ============================================
// ⚙️ Setting Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true },
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', index: true, default: null },
  value: { type: String, default: '' },
}, { timestamps: true });

// Compound unique: key + loja_id
SettingSchema.index({ key: 1, loja_id: 1 }, { unique: true });

module.exports = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
