// ============================================
// 👤 Cliente Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const EnderecoSchema = new mongoose.Schema({
  apelido: { type: String, default: 'Casa' },
  cep: { type: String, default: '' },
  rua: { type: String, default: '' },
  numero: { type: String, default: '' },
  complemento: { type: String, default: '' },
  bairro: { type: String, default: '' },
  cidade: { type: String, default: '' },
  estado: { type: String, default: '' },
  padrao: { type: Boolean, default: false },
}, { _id: true });

const ClienteSchema = new mongoose.Schema({
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', required: true, index: true },
  nome: { type: String, default: '' },
  email: { type: String, default: '' },
  telefone: { type: String, default: '' },
  cpf: { type: String, default: '' },
  censurado: { type: Boolean, default: false },
  total_pedidos: { type: Number, default: 0 },
  total_gasto: { type: Number, default: 0 }, // centavos

  // Auth fields
  senha: { type: String, default: null },
  email_verificado: { type: Boolean, default: false },
  token_redefinicao: { type: String, default: null },
  token_redefinicao_expira: { type: Date, default: null },
  token_verificacao: { type: String, default: null },
  token_verificacao_expira: { type: Date, default: null },
  data_nascimento: { type: String, default: '' },

  // Addresses
  enderecos: { type: [EnderecoSchema], default: [] },

  criado_em: { type: Date, default: () => new Date() },
});

ClienteSchema.index({ loja_id: 1, email: 1 }, { unique: true });

// Hash password before save
ClienteSchema.pre('save', async function () {
  if (!this.isModified('senha') || !this.senha) return;
  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
});

ClienteSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.senha) return false;
  return bcrypt.compare(candidatePassword, this.senha);
};

module.exports = mongoose.models.Cliente || mongoose.model('Cliente', ClienteSchema);
