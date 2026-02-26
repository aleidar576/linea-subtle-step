// ============================================
// 📦 Product Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');

const VariacaoSchema = new mongoose.Schema({
  tipo: { type: String, default: '' },       // Cor, Tamanho, Modelo
  nome: { type: String, default: '' },
  estoque: { type: Number, default: 0 },
  preco: { type: Number, default: null },
  imagem: { type: String, default: null },
  color_hex: { type: String, default: null },
}, { _id: true });

const AvaliacaoManualSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  texto: { type: String, required: true },
  nota: { type: Number, default: 5 },
  data: { type: String, default: '' },
  imagens: { type: [String], default: [] },
}, { _id: true });

const FreteEspecificoSchema = new mongoose.Schema({
  nome: { type: String, default: '' },
  prazo_dias_min: { type: Number, default: 3 },
  prazo_dias_max: { type: Number, default: 7 },
  valor: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  exibir_no_produto: { type: Boolean, default: true },
}, { _id: true });

const ProductSchema = new mongoose.Schema({
  product_id: { type: String, required: true, unique: true },
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', index: true, default: null },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  category_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  short_description: { type: String, default: '' },
  description: { type: String, default: '' },
  description_image: { type: String, default: null },
  price: { type: Number, default: 0 },
  original_price: { type: Number, default: null },
  image: { type: String, default: '' },
  images: { type: [String], default: [] },
  features: { type: [String], default: [] },
  promotion: { type: String, default: null },
  sizes: { type: [String], default: null },
  colors: { type: mongoose.Schema.Types.Mixed, default: null },
  reviews: { type: mongoose.Schema.Types.Mixed, default: null },
  social_proof_gender: { type: String, default: null },
  sort_order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  rating: { type: Number, default: 5.0 },
  rating_count: { type: String, default: '+100' },

  // Variações
  variacoes: { type: [VariacaoSchema], default: [] },
  vender_sem_estoque: { type: Boolean, default: false },
  estoque: { type: Number, default: 0 },

  // Avaliações config
  avaliacoes_config: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      nota: 5.0,
      nota_exibicao: '5,0',
      ver_mais_modo: 'ocultar',        // 'ocultar' | 'funcional' | 'estetico'
      qtd_antes_ver_mais: 3,
      usar_comentarios_padrao: false,
      avaliacoes_manuais: [],
    },
  },

  // Frete config
  frete_config: {
    type: mongoose.Schema.Types.Mixed,
    default: { tipo: 'entregue_ate', data_1: null, data_2: null, ocultar_frete_produto: false },
  },
  frete_regra_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Frete', default: null },
  usar_frete_global: { type: Boolean, default: true },
  fretes_especificos: { type: [FreteEspecificoSchema], default: [] },

  // Fretes vinculados (novo sistema)
  fretes_vinculados: [{
    frete_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Frete', default: null },
    valor_personalizado: { type: Number, default: null },
    exibir_no_produto: { type: Boolean, default: true },
  }],

  // Extras
  badge_imagem: { type: String, default: null },
  parcelas_fake: { type: String, default: null },
  vendas_fake: { type: Number, default: 0 },
  oferta_relampago: {
    type: mongoose.Schema.Types.Mixed,
    default: { ativo: false, icone: 'zap', titulo: 'Oferta Relâmpago', data_termino: null, estoque_campanha: 0, evergreen_minutos: 0, evergreen_segundos: 0 },
  },

  // Vantagens e Proteção
  vantagens_titulo: { type: String, default: null },
  vantagens: {
    type: mongoose.Schema.Types.Mixed,
    default: { ativo: false, itens: [] },
  },
  protecao_cliente: {
    type: mongoose.Schema.Types.Mixed,
    default: { ativo: false, itens: [] },
  },

  // Pessoas vendo agora
  pessoas_vendo: {
    type: mongoose.Schema.Types.Mixed,
    default: { ativo: false, min: 10, max: 50 },
  },

  // Cross-sell
  cross_sell: {
    type: mongoose.Schema.Types.Mixed,
    default: { modo: 'aleatorio', categoria_manual_id: null },
  },

  // Dimensões físicas (para cálculo de frete via Correios/Melhor Envio)
  dimensoes: {
    peso: { type: Number, default: 0 },
    altura: { type: Number, default: 0 },
    largura: { type: Number, default: 0 },
    comprimento: { type: Number, default: 0 },
  },
}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
