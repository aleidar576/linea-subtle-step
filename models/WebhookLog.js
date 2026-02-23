// ============================================
// 📋 WebhookLog Model (Mongoose) - Multi-Tenant, TTL 24h
// ============================================

const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  txid: { type: String, index: true },
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', index: true, default: null },
  evento: { type: String },
  status: { type: String },
  valor: { type: Number },
  nome: { type: String },
  email: { type: String },
  telefone: { type: String },
  cpf: { type: String },
  raw_body: { type: Object },
  pixel_dispatches: [{ type: Object }],
  created_at: {
    type: Date,
    default: Date.now,
    expires: 86400,
  },
});

module.exports = mongoose.models.WebhookLog || mongoose.model('WebhookLog', webhookLogSchema);
