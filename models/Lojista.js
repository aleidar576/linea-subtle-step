// ============================================
// 👤 Lojista Model (Mongoose) - Multi-Tenant SaaS
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nowGMT3 } = require('../lib/date-utils.js');

const LojistaSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  nome: { type: String, default: '' },
  telefone: { type: String, default: '' },
  email_verificado: { type: Boolean, default: false },
  verificacao_ignorada: { type: Boolean, default: false },
  token_verificacao: { type: String, default: null },
  token_redefinicao: { type: String, default: null },
  token_redefinicao_expira: { type: Date, default: null },
  termos_aceitos: { type: Boolean, default: false },
  plano: { type: String, enum: ['free', 'plus', 'starter', 'pro', 'scale'], default: 'free' },
  bloqueado: { type: Boolean, default: false },
  modo_amigo: { type: Boolean, default: false },
  cpf_cnpj: { type: String, default: '' },
  stripe_customer_id: { type: String, default: null },
  stripe_subscription_id: { type: String, default: null },
  subscription_status: { type: String, enum: [null, 'trialing', 'active', 'past_due', 'canceled', 'unpaid'], default: null },
  plano_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Plano', default: null },
  acesso_bloqueado: { type: Boolean, default: false },
  liberar_visualizacao_subdominio: { type: Boolean, default: false },
  tolerancia_extra_dias: { type: Number, default: 0 },
  data_vencimento: { type: Date, default: null },
  ultimo_acesso: { type: Date, default: null },
  two_factor_secret: { type: String, default: null },
  two_factor_enabled: { type: Boolean, default: false },
  avatar_url: { type: String, default: null },
  config_emails: {
    type: {
      pedidos_pendentes: { type: Boolean, default: false },
      pedidos_pagos: { type: Boolean, default: false },
      alteracao_senha: { type: Boolean, default: true },
    },
    default: { pedidos_pendentes: false, pedidos_pagos: false, alteracao_senha: true },
  },
  cancel_at_period_end: { type: Boolean, default: false },
  cancel_at: { type: Date, default: null },
  security_token: { type: String, default: null },
  taxas_acumuladas: { type: Number, default: 0 },
  data_vencimento_taxas: { type: Date, default: null },
  historico_assinatura: [{
    evento: { type: String, required: true },
    data: { type: Date, default: Date.now },
    detalhes: { type: String, default: '' },
  }],
  criado_em: { type: Date, default: () => nowGMT3() },
});

LojistaSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

LojistaSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.models.Lojista || mongoose.model('Lojista', LojistaSchema);
