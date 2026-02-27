// ============================================
// 📦 Pedido Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');

const PedidoItemSchema = new mongoose.Schema({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  slug: { type: String, default: '' },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }, // centavos
  variacao: { type: String, default: null },
  cupom_aplicado: { type: Boolean, default: false },
}, { _id: false });

const PedidoSchema = new mongoose.Schema({
  numero: { type: Number, required: true },
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
  itens: { type: [PedidoItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  desconto: { type: Number, default: 0 },
  frete: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  cupom: { type: mongoose.Schema.Types.Mixed, default: null },
  status: {
    type: String,
    default: 'pendente',
    validate: {
      validator: function (v) {
        // Status universais de pagamento (BYOG-ready)
        const VALID = ['pendente', 'em_analise', 'pago', 'recusado', 'estornado', 'chargeback'];
        // Permite leitura de status legados sem quebrar
        const LEGACY = ['enviado', 'entregue', 'cancelado'];
        return VALID.includes(v) || LEGACY.includes(v);
      },
      message: props => `'${props.value}' não é um status válido`,
    },
  },
  pagamento: {
    type: mongoose.Schema.Types.Mixed,
    default: { metodo: 'pix', txid: null, pix_code: null, pago_em: null },
  },
  cliente: {
    type: mongoose.Schema.Types.Mixed,
    default: { nome: '', email: '', telefone: '', cpf: '' },
  },
  endereco: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  rastreio: { type: String, default: null },
  observacoes_internas: { type: String, default: '' },
  frete_id: { type: String, default: null },
  frete_nome: { type: String, default: null },
  melhor_envio_order_id: { type: String, default: null },
  melhor_envio_status: { type: String, default: null },
  etiqueta_url: { type: String, default: null },
  codigo_rastreio: { type: String, default: null },
  utms: { type: mongoose.Schema.Types.Mixed, default: {} },
  criado_em: { type: Date, default: () => new Date() },
  atualizado_em: { type: Date, default: () => new Date() },
});

// Auto-increment numero per loja
PedidoSchema.index({ loja_id: 1, numero: -1 });

PedidoSchema.pre('save', function (next) {
  this.atualizado_em = new Date();
  next();
});

module.exports = mongoose.models.Pedido || mongoose.model('Pedido', PedidoSchema);
