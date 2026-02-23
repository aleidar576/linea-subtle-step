// ============================================
// 🏪 Loja Model (Mongoose) - Multi-Tenant SaaS
// ============================================

const mongoose = require('mongoose');
const { nowGMT3 } = require('../lib/date-utils.js');

const LojaSchema = new mongoose.Schema({
  lojista_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Lojista', required: true, index: true },
  nome: { type: String, required: true },
  nome_exibicao: { type: String, default: '' },
  slogan: { type: String, default: '' },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  favicon: { type: String, default: '' },
  icone: { type: String, default: '' },
  dominio_customizado: { type: String, default: null },
  dominio_verificado: { type: Boolean, default: false },
  configuracoes: {
    exigir_cadastro_cliente: { type: Boolean, default: false },
    tema: { type: String, default: 'market-tok' },
    categoria_home_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    sealpay_api_key: { type: String, default: null },
    custom_css: { type: String, default: '' },
    footer: { type: mongoose.Schema.Types.Mixed, default: null },
    whatsapp_numero: { type: String, default: '' },
    cores_globais: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        brand_primary: '#E60023',
        brand_secondary: '#F1F1F2',
        bg_base: '#F8F8F8',
        bg_surface: '#FFFFFF',
        text_primary: '#111111',
        whatsapp_button: '#25D366',
      },
    },
    homepage_config: { type: mongoose.Schema.Types.Mixed, default: null },
    produto_config: { type: mongoose.Schema.Types.Mixed, default: null },
    scripts_customizados: { type: [mongoose.Schema.Types.Mixed], default: [] },
    logo: { type: mongoose.Schema.Types.Mixed, default: null },
    cart_config: { type: mongoose.Schema.Types.Mixed, default: null },
    checkout_config: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  ativada_por_admin: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  criado_em: { type: Date, default: () => nowGMT3() },
  atualizado_em: { type: Date, default: () => nowGMT3() },
});

LojaSchema.pre('save', function () {
  if (!this.isNew) this.atualizado_em = nowGMT3();
});

LojaSchema.pre('findOneAndUpdate', function () {
  this.set({ atualizado_em: nowGMT3() });
});

module.exports = mongoose.models.Loja || mongoose.model('Loja', LojaSchema);
