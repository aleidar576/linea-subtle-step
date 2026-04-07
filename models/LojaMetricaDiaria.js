const mongoose = require('mongoose');
const { nowUtc } = require('../lib/utc.js');

const LojaMetricaDiariaSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  date_key: { type: String, required: true, index: true },
  visitantes_unicos: { type: Number, default: 0 },
  pageviews: { type: Number, default: 0 },
  updated_at: { type: Date, default: () => nowUtc() },
}, {
  versionKey: false,
});

LojaMetricaDiariaSchema.index({ loja_id: 1, date_key: 1 }, { unique: true });

LojaMetricaDiariaSchema.pre('save', function () {
  this.updated_at = nowUtc();
});

LojaMetricaDiariaSchema.pre('findOneAndUpdate', function () {
  this.set({ updated_at: nowUtc() });
});

module.exports = mongoose.models.LojaMetricaDiaria || mongoose.model('LojaMetricaDiaria', LojaMetricaDiariaSchema);
