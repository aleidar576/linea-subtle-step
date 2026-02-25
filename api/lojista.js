// ============================================
// 👤 API: Lojista (Perfil + Senha + 2FA + Avatar) - SaaS
// ============================================

const connectDB = require('../lib/mongodb.js');
const Lojista = require('../models/Lojista.js');
const Notificacao = require('../models/Notificacao.js');
const authPkg = require('../lib/auth.js');
const crypto = require('crypto');
const { sendPasswordChangeAlert } = require('../lib/email.js');

const { verifyToken, getTokenFromHeader } = authPkg;

function requireLojista(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'lojista') return null;
  return decoded;
}

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();
  const auth = requireLojista(req);
  if (!auth) return res.status(401).json({ error: 'Não autorizado' });

  const { action } = req.query;

  // GET - Perfil
  if (req.method === 'GET') {
    const lojista = await Lojista.findById(auth.lojista_id).select('-password -token_verificacao -token_redefinicao -token_redefinicao_expira -two_factor_secret');
    if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });
    return res.status(200).json(lojista);
  }

  // PUT - Atualizar perfil ou alterar senha
  if (req.method === 'PUT') {
    if (action === 'senha') {
      const { senha_atual, nova_senha } = req.body;
      if (!senha_atual || !nova_senha) return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
      if (nova_senha.length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });

      const lojista = await Lojista.findById(auth.lojista_id);
      if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });

      const isMatch = await lojista.comparePassword(senha_atual);
      if (!isMatch) return res.status(401).json({ error: 'Senha atual incorreta' });

      // Generate security token for "not me" button
      const securityToken = crypto.randomBytes(32).toString('hex');
      lojista.security_token = securityToken;
      lojista.password = nova_senha;
      await lojista.save();

      // Send password change alert email
      sendPasswordChangeAlert({ email: lojista.email, nome: lojista.nome, securityToken });

      return res.status(200).json({ success: true, message: 'Senha alterada com sucesso' });
    }

    // Atualizar perfil (nome, telefone, cpf_cnpj, avatar_url, config_emails)
    const { nome, telefone, cpf_cnpj, avatar_url, config_emails } = req.body;
    const update = {};
    if (nome !== undefined) update.nome = nome;
    if (telefone !== undefined) update.telefone = telefone;
    if (cpf_cnpj !== undefined) update.cpf_cnpj = cpf_cnpj;
    if (avatar_url !== undefined) update.avatar_url = avatar_url;
    if (config_emails !== undefined) {
      update.config_emails = {
        pedidos_pendentes: config_emails.pedidos_pendentes ?? false,
        pedidos_pagos: config_emails.pedidos_pagos ?? false,
        alteracao_senha: true, // always true
      };
    }

    const lojista = await Lojista.findByIdAndUpdate(auth.lojista_id, update, { new: true })
      .select('-password -token_verificacao -token_redefinicao -token_redefinicao_expira -two_factor_secret');
    return res.status(200).json(lojista);
  }

  // POST - 2FA actions
  if (req.method === 'POST') {
    if (action === 'generate-2fa') {
      try {
        const speakeasy = require('speakeasy');
        const QRCode = require('qrcode');

        const lojista = await Lojista.findById(auth.lojista_id);
        if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });

        const secret = speakeasy.generateSecret({ name: 'Pandora:' + lojista.email });
        lojista.two_factor_secret = secret.base32;
        await lojista.save();

        const qrCode = await QRCode.toDataURL(secret.otpauth_url);
        return res.status(200).json({ qrCode, secret: secret.base32 });
      } catch (err) {
        console.error('[2FA] generate-2fa error:', err);
        return res.status(500).json({ error: 'Erro ao gerar 2FA', details: err.message });
      }
    }

    if (action === 'enable-2fa') {
      try {
        const { token: otpToken } = req.body || {};
        if (!otpToken) return res.status(400).json({ error: 'Código é obrigatório' });

        const speakeasy = require('speakeasy');
        const lojista = await Lojista.findById(auth.lojista_id);
        if (!lojista || !lojista.two_factor_secret) return res.status(400).json({ error: 'Gere o QR Code primeiro' });

        const isValid = speakeasy.totp.verify({
          secret: lojista.two_factor_secret,
          encoding: 'base32',
          token: otpToken,
        });
        if (!isValid) return res.status(400).json({ error: 'Código inválido. Tente novamente.' });

        lojista.two_factor_enabled = true;
        await lojista.save();
        return res.status(200).json({ success: true, message: '2FA ativado com sucesso' });
      } catch (err) {
        console.error('[2FA] enable-2fa error:', err);
        return res.status(500).json({ error: 'Erro ao ativar 2FA', details: err.message });
      }
    }

    if (action === 'disable-2fa') {
      const { senha_atual } = req.body || {};
      if (!senha_atual) return res.status(400).json({ error: 'Senha atual é obrigatória' });

      const lojista = await Lojista.findById(auth.lojista_id);
      if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });

      const isMatch = await lojista.comparePassword(senha_atual);
      if (!isMatch) return res.status(401).json({ error: 'Senha atual incorreta' });

      lojista.two_factor_enabled = false;
      lojista.two_factor_secret = null;
      await lojista.save();
      return res.status(200).json({ success: true, message: '2FA desativado com sucesso' });
    }

    return res.status(400).json({ error: 'Ação inválida' });
  }

  // GET/PATCH - Notificações
  if (req.method === 'GET' && action === 'notificacoes') {
    const notifs = await Notificacao.find({ lojista_id: auth.lojista_id }).sort({ criado_em: -1 }).limit(50).lean();
    return res.status(200).json(notifs);
  }

  if (req.method === 'PATCH' && action === 'notificacao-lida') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    await Notificacao.findOneAndUpdate({ _id: id, lojista_id: auth.lojista_id }, { lida: true });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PATCH' && action === 'notificacoes-todas-lidas') {
    await Notificacao.updateMany({ lojista_id: auth.lojista_id, lida: false }, { lida: true });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
