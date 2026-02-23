// ============================================
// 🛒 CarrinhoAbandonado Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');

const CarrinhoItemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
}, { _id: false });

const CarrinhoAbandonadoSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  etapa: {
    type: String,
    enum: ['customer', 'shipping', 'payment'],
    default: 'customer',
  },
  itens: { type: [CarrinhoItemSchema], default: [] },
  total: { type: Number, default: 0 },
  cliente: {
    type: mongoose.Schema.Types.Mixed,
    default: { nome: '', email: '', telefone: '', cpf: '' },
  },
  endereco: { type: mongoose.Schema.Types.Mixed, default: null },
  pix_code: { type: String, default: null },
  txid: { type: String, default: null },
  utms: { type: mongoose.Schema.Types.Mixed, default: {} },
  convertido: { type: Boolean, default: false },
  criado_em: { type: Date, default: () => new Date() },
});

CarrinhoAbandonadoSchema.index({ loja_id: 1, criado_em: -1 });

module.exports = mongoose.models.CarrinhoAbandonado || mongoose.model('CarrinhoAbandonado', CarrinhoAbandonadoSchema);
