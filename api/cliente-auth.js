// ============================================
// 🔐 Cliente Auth API (Serverless)
// ============================================

const { connectDB } = require('../lib/mongodb');
const { signToken, verifyToken } = require('../lib/auth');
const Cliente = require('../models/Cliente');
const { sendEmail, getBranding, emailVerificacaoHtml } = require('../lib/email');
const crypto = require('crypto');

function getClienteFromHeader(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const decoded = verifyToken(auth.slice(7));
  if (!decoded || decoded.role !== 'cliente') return null;
  return decoded;
}

module.exports = async (req, res) => {
  await connectDB();
  const scope = req.query.scope || '';

  try {
    // ── REGISTRO ──
    if (scope === 'registro' && req.method === 'POST') {
      const { loja_id, nome, email, senha, telefone, cpf, endereco } = req.body;
      if (!loja_id || !email || !senha) return res.status(400).json({ error: 'Dados obrigatórios: loja_id, email, senha' });
      if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

      const existing = await Cliente.findOne({ loja_id, email: email.toLowerCase().trim() });
      if (existing && existing.senha) return res.status(409).json({ error: 'Já existe uma conta com este e-mail' });

      // Generate verification token
      const tokenVerificacao = crypto.randomBytes(32).toString('hex');
      const tokenVerificacaoExpira = new Date(Date.now() + 24 * 3600000); // 24h

      let cliente;
      if (existing && !existing.senha) {
        // Upgrade guest to account
        existing.nome = nome || existing.nome;
        existing.telefone = telefone || existing.telefone;
        existing.cpf = cpf || existing.cpf;
        existing.senha = senha;
        existing.censurado = false;
        existing.email_verificado = false;
        existing.token_verificacao = tokenVerificacao;
        existing.token_verificacao_expira = tokenVerificacaoExpira;
        if (endereco) {
          existing.enderecos = [{ ...endereco, apelido: endereco.apelido || 'Casa', padrao: true }];
        }
        cliente = await existing.save();
      } else {
        cliente = await Cliente.create({
          loja_id,
          nome: nome || '',
          email: email.toLowerCase().trim(),
          telefone: telefone || '',
          cpf: cpf || '',
          senha,
          censurado: false,
          email_verificado: false,
          token_verificacao: tokenVerificacao,
          token_verificacao_expira: tokenVerificacaoExpira,
          enderecos: endereco ? [{ ...endereco, apelido: endereco.apelido || 'Casa', padrao: true }] : [],
        });
      }

      // Send verification email
      const origin = req.headers.referer ? new URL(req.headers.referer).origin : req.headers.origin || '';
      const link = `${origin}/conta/verificar?token=${tokenVerificacao}`;
      const branding = await getBranding();
      const html = emailVerificacaoHtml({ nome: nome || 'Cliente', link, branding });
      const emailResult = await sendEmail({ to: email.toLowerCase().trim(), subject: '✉️ Verifique seu email', html });
      console.log('[CLIENTE-AUTH] Email verificação enviado:', emailResult);

      // DON'T auto-login — require email verification
      return res.json({ pending_verification: true, email: cliente.email });
    }

    // ── VERIFICAR EMAIL DO CLIENTE ──
    if (scope === 'verificar-email' && req.method === 'POST') {
      const { token } = req.body;
      if (!token) return res.status(400).json({ error: 'Token obrigatório' });

      const cliente = await Cliente.findOne({
        token_verificacao: token,
        token_verificacao_expira: { $gt: new Date() },
      });
      if (!cliente) return res.status(400).json({ error: 'Token inválido ou expirado' });

      cliente.email_verificado = true;
      cliente.token_verificacao = null;
      cliente.token_verificacao_expira = null;
      await cliente.save();

      return res.json({ success: true, message: 'Email verificado com sucesso!' });
    }

    // ── REENVIAR EMAIL DE VERIFICAÇÃO ──
    if (scope === 'reenviar-verificacao' && req.method === 'POST') {
      const { loja_id, email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email obrigatório' });

      const cliente = await Cliente.findOne({ 
        ...(loja_id ? { loja_id } : {}),
        email: email.toLowerCase().trim() 
      });
      if (!cliente || !cliente.senha) return res.json({ success: true }); // Don't reveal
      if (cliente.email_verificado) return res.json({ success: true, already_verified: true });

      // Generate new token
      const tokenVerificacao = crypto.randomBytes(32).toString('hex');
      cliente.token_verificacao = tokenVerificacao;
      cliente.token_verificacao_expira = new Date(Date.now() + 24 * 3600000);
      await cliente.save();

      const origin = req.headers.referer ? new URL(req.headers.referer).origin : req.headers.origin || '';
      const link = `${origin}/conta/verificar?token=${tokenVerificacao}`;
      const branding = await getBranding();
      const html = emailVerificacaoHtml({ nome: cliente.nome || 'Cliente', link, branding });
      await sendEmail({ to: cliente.email, subject: '✉️ Verifique seu email', html });

      return res.json({ success: true });
    }

    // ── LOGIN ──
    if (scope === 'login' && req.method === 'POST') {
      const { loja_id, email, senha } = req.body;
      if (!loja_id || !email || !senha) return res.status(400).json({ error: 'Dados obrigatórios' });

      const cliente = await Cliente.findOne({ loja_id, email: email.toLowerCase().trim() });
      if (!cliente || !cliente.senha) return res.status(401).json({ error: 'E-mail ou senha inválidos' });

      const match = await cliente.comparePassword(senha);
      if (!match) return res.status(401).json({ error: 'E-mail ou senha inválidos' });

      // Check email verification
      if (!cliente.email_verificado) {
        return res.status(403).json({ 
          error: 'Email não verificado. Verifique sua caixa de entrada.',
          email_nao_verificado: true,
          email: cliente.email,
        });
      }

      const token = signToken({ cliente_id: cliente._id, loja_id, email: cliente.email, role: 'cliente' }, '30d');
      return res.json({ token, cliente: sanitize(cliente) });
    }

    // ── PERFIL (GET) ──
    if (scope === 'perfil' && req.method === 'GET') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const cliente = await Cliente.findById(auth.cliente_id);
      if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });

      return res.json({ cliente: sanitize(cliente) });
    }

    // ── ATUALIZAR PERFIL ──
    if (scope === 'atualizar-perfil' && req.method === 'PUT') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const { nome, telefone, cpf, data_nascimento } = req.body;
      const update = {};
      if (nome !== undefined) update.nome = nome;
      if (telefone !== undefined) update.telefone = telefone;
      if (cpf !== undefined) update.cpf = cpf;
      if (data_nascimento !== undefined) update.data_nascimento = data_nascimento;

      const cliente = await Cliente.findByIdAndUpdate(auth.cliente_id, update, { new: true });
      return res.json({ cliente: sanitize(cliente) });
    }

    // ── ALTERAR SENHA ──
    if (scope === 'alterar-senha' && req.method === 'PUT') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const { senha_atual, nova_senha } = req.body;
      if (!senha_atual || !nova_senha) return res.status(400).json({ error: 'Campos obrigatórios' });
      if (nova_senha.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

      const cliente = await Cliente.findById(auth.cliente_id);
      if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });

      const match = await cliente.comparePassword(senha_atual);
      if (!match) return res.status(401).json({ error: 'Senha atual incorreta' });

      cliente.senha = nova_senha;
      await cliente.save();
      return res.json({ success: true });
    }

    // ── RECUPERAR SENHA ──
    if (scope === 'recuperar-senha' && req.method === 'POST') {
      const { loja_id, email } = req.body;
      if (!loja_id || !email) return res.status(400).json({ error: 'Dados obrigatórios' });

      const { sendEmail: sendMail, getBranding: getBrand, emailRedefinicaoSenhaHtml } = require('../lib/email');

      const cliente = await Cliente.findOne({ loja_id, email: email.toLowerCase().trim() });
      if (!cliente || !cliente.senha) return res.json({ success: true }); // Don't reveal if exists

      const token = crypto.randomBytes(32).toString('hex');
      cliente.token_redefinicao = token;
      cliente.token_redefinicao_expira = new Date(Date.now() + 3600000); // 1h
      await cliente.save();

      // Build reset link based on referrer or generic
      const origin = req.headers.referer ? new URL(req.headers.referer).origin : req.headers.origin || '';
      const link = `${origin}/conta/redefinir?token=${token}`;
      const branding = await getBrand();

      const html = emailRedefinicaoSenhaHtml({ nome: cliente.nome, link, branding });
      await sendMail({ to: cliente.email, subject: '🔒 Redefinir sua senha', html });

      return res.json({ success: true });
    }

    // ── REDEFINIR SENHA ──
    if (scope === 'redefinir-senha' && req.method === 'POST') {
      const { token, nova_senha } = req.body;
      if (!token || !nova_senha) return res.status(400).json({ error: 'Dados obrigatórios' });
      if (nova_senha.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

      const cliente = await Cliente.findOne({
        token_redefinicao: token,
        token_redefinicao_expira: { $gt: new Date() },
      });
      if (!cliente) return res.status(400).json({ error: 'Token inválido ou expirado' });

      cliente.senha = nova_senha;
      cliente.token_redefinicao = null;
      cliente.token_redefinicao_expira = null;
      await cliente.save();

      return res.json({ success: true });
    }

    // ── ENDEREÇOS (LIST) ──
    if (scope === 'enderecos' && req.method === 'GET') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const cliente = await Cliente.findById(auth.cliente_id);
      return res.json({ enderecos: cliente?.enderecos || [] });
    }

    // ── ADICIONAR ENDEREÇO ──
    if (scope === 'endereco' && req.method === 'POST') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const cliente = await Cliente.findById(auth.cliente_id);
      if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });
      if (cliente.enderecos.length >= 5) return res.status(400).json({ error: 'Máximo de 5 endereços' });

      const { apelido, cep, rua, numero, complemento, bairro, cidade, estado, padrao } = req.body;
      if (padrao) cliente.enderecos.forEach(e => (e.padrao = false));

      cliente.enderecos.push({ apelido: apelido || 'Casa', cep, rua, numero, complemento: complemento || '', bairro, cidade, estado, padrao: padrao || cliente.enderecos.length === 0 });
      await cliente.save();
      return res.json({ enderecos: cliente.enderecos });
    }

    // ── EDITAR ENDEREÇO ──
    if (scope === 'endereco' && req.method === 'PUT') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const { id } = req.query;
      const cliente = await Cliente.findById(auth.cliente_id);
      if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });

      const end = cliente.enderecos.id(id);
      if (!end) return res.status(404).json({ error: 'Endereço não encontrado' });

      const { apelido, cep, rua, numero, complemento, bairro, cidade, estado, padrao } = req.body;
      if (padrao) cliente.enderecos.forEach(e => (e.padrao = false));

      Object.assign(end, {
        ...(apelido !== undefined && { apelido }),
        ...(cep !== undefined && { cep }),
        ...(rua !== undefined && { rua }),
        ...(numero !== undefined && { numero }),
        ...(complemento !== undefined && { complemento }),
        ...(bairro !== undefined && { bairro }),
        ...(cidade !== undefined && { cidade }),
        ...(estado !== undefined && { estado }),
        ...(padrao !== undefined && { padrao }),
      });
      await cliente.save();
      return res.json({ enderecos: cliente.enderecos });
    }

    // ── REMOVER ENDEREÇO ──
    if (scope === 'endereco' && req.method === 'DELETE') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const { id } = req.query;
      const cliente = await Cliente.findById(auth.cliente_id);
      if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });

      cliente.enderecos = cliente.enderecos.filter(e => e._id.toString() !== id);
      await cliente.save();
      return res.json({ enderecos: cliente.enderecos });
    }

    // ── DEFINIR ENDEREÇO PADRÃO ──
    if (scope === 'endereco-padrao' && req.method === 'PATCH') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const { id } = req.query;
      const cliente = await Cliente.findById(auth.cliente_id);
      if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });

      cliente.enderecos.forEach(e => (e.padrao = e._id.toString() === id));
      await cliente.save();
      return res.json({ enderecos: cliente.enderecos });
    }

    // ── PEDIDOS DO CLIENTE ──
    if (scope === 'meus-pedidos' && req.method === 'GET') {
      const auth = getClienteFromHeader(req);
      if (!auth) return res.status(401).json({ error: 'Não autenticado' });

      const Pedido = require('../models/Pedido');
      const pedidos = await Pedido.find({ loja_id: auth.loja_id, 'cliente.email': auth.email })
        .sort({ criado_em: -1 })
        .limit(50)
        .lean();

      return res.json({ pedidos });
    }

    return res.status(400).json({ error: 'Scope inválido' });
  } catch (err) {
    console.error('[CLIENTE-AUTH]', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

function sanitize(cliente) {
  const obj = cliente.toObject ? cliente.toObject() : { ...cliente };
  delete obj.senha;
  delete obj.token_redefinicao;
  delete obj.token_redefinicao_expira;
  delete obj.token_verificacao;
  delete obj.token_verificacao_expira;
  return obj;
}
