const mongoose = require('mongoose');
const { nowUtc } = require('../lib/utc.js');

const LojaVisitanteDiarioSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  visitor_id: { type: String, required: true, trim: true },
  date_key: { type: String, required: true, index: true },
  first_seen_at: { type: Date, default: () => nowUtc() },
  last_seen_at: { type: Date, default: () => nowUtc() },
  landing_path: { type: String, default: '/' },
  referrer_host: { type: String, default: '' },
  user_agent_hash: { type: String, default: '' },
  ip_hash: { type: String, default: '' },
  timezone: { type: String, default: 'America/Sao_Paulo' },
}, {
  versionKey: false,
});

LojaVisitanteDiarioSchema.index({ loja_id: 1, visitor_id: 1, date_key: 1 }, { unique: true });
LojaVisitanteDiarioSchema.index({ loja_id: 1, date_key: 1 });

module.exports = mongoose.models.LojaVisitanteDiario || mongoose.model('LojaVisitanteDiario', LojaVisitanteDiarioSchema);
