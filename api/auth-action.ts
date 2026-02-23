import { VercelRequest, VercelResponse } from '@vercel/node';

const connectDB = require('../lib/mongodb.js');
const User = require('../models/User.js');
const Lojista = require('../models/Lojista.js');
const authPkg = require('../lib/auth.js');
const crypto = require('crypto');
const { nowGMT3 } = require('../lib/date-utils.js');
const { sendEmail, getBaseUrl, getBranding, emailVerificacaoHtml, emailRedefinicaoSenhaHtml } = require('../lib/email.js');

const { signToken, verifyToken, getTokenFromHeader } = authPkg;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();
  const { action, token: queryToken } = req.query;

  // --- ME (GET) ---
  if (req.method === 'GET' && action === 'me') {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(200).json({ user: null });
    const decoded = verifyToken(token);
    if (!decoded) return res.status(200).json({ user: null });

    if (decoded.role === 'lojista') {
      const lojista = await Lojista.findById(decoded.lojista_id).select('-password -token_verificacao -token_redefinicao');
      if (!lojista) return res.status(200).json({ user: null });
      return res.status(200).json({
        user: {
          id: lojista._id,
          email: lojista.email,
          nome: lojista.nome,
          role: 'lojista',
          lojista_id: lojista._id,
          plano: lojista.plano,
          bloqueado: lojista.bloqueado,
          email_verificado: lojista.email_verificado,
          modo_amigo: lojista.modo_amigo || false,
          liberar_visualizacao_subdominio: lojista.liberar_visualizacao_subdominio || false,
          avatar_url: lojista.avatar_url || null,
        },
      });
    }

    return res.status(200).json({ user: { id: decoded.id, email: decoded.email, role: decoded.role } });
  }

  // --- VERIFICAR EMAIL (GET) ---
  if (req.method === 'GET' && action === 'verificar-email') {
    const tk = Array.isArray(queryToken) ? queryToken[0] : queryToken;
    if (!tk) return res.status(400).json({ error: 'Token não fornecido' });

    const lojista = await Lojista.findOne({ token_verificacao: tk });
    if (!lojista) return res.status(400).json({ error: 'Token inválido ou já utilizado' });

    lojista.email_verificado = true;
    lojista.token_verificacao = null;
    await lojista.save();

    return res.status(200).json({ success: true, message: 'Email verificado com sucesso!' });
  }

  // --- REENVIAR EMAIL DE VERIFICAÇÃO (POST) ---
  if (req.method === 'POST' && action === 'reenviar-verificacao') {
    const { email: reEmail } = req.body || {};
    const lowReEmail = reEmail?.toLowerCase()?.trim();
    if (!lowReEmail) return res.status(400).json({ error: 'Email é obrigatório' });

    const lojista = await Lojista.findOne({ email: lowReEmail });
    if (!lojista || lojista.email_verificado) {
      // Não revelamos se o email existe ou já foi verificado
      return res.status(200).json({ success: true, message: 'Se o email existir e não estiver verificado, enviaremos um novo link.' });
    }

    const token_verificacao = crypto.randomBytes(32).toString('hex');
    lojista.token_verificacao = token_verificacao;
    await lojista.save();

    const baseUrl = getBaseUrl();
    const verifyUrl = `${baseUrl}/verificar-email?token=${token_verificacao}`;
    const branding = await getBranding();

    await sendEmail({
      to: lowReEmail,
      subject: `Verifique o seu email - ${branding.brandName}`,
      html: emailVerificacaoHtml({ nome: lojista.nome, link: verifyUrl, branding }),
    });

    return res.status(200).json({ success: true, message: 'Email de verificação reenviado!' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { email, password, nome, telefone, termos_aceitos, token: bodyToken, nova_senha } = req.body || {};
  const lowEmail = email?.toLowerCase()?.trim();

  // --- SETUP ADMIN (First-User Auto-Approval) ---
  if (action === 'setup') {
    const adminCount = await User.countDocuments({ role: 'admin' });

    if (adminCount === 0) {
      // Primeiro admin = dono do SaaS → status active
      await User.create({ email: lowEmail, password, role: 'admin', status: 'active' });
      return res.status(200).json({ success: true, message: 'Conta Mestre criada com sucesso!', is_master: true });
    } else {
      // Admins subsequentes → status pending
      const existing = await User.findOne({ email: lowEmail });
      if (existing) return res.status(409).json({ error: 'Este email já está registado' });
      await User.create({ email: lowEmail, password, role: 'admin', status: 'pending' });
      return res.status(200).json({ success: true, message: 'Conta criada. Aguardando aprovação do Administrador principal.', is_master: false });
    }
  }

  // --- LOGIN ADMIN ---
  if (action === 'login') {
    const user = await User.findOne({ email: lowEmail });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
    const isMaster = MASTER_PASSWORD && password === MASTER_PASSWORD;

    if (!isMaster) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Sua conta está aguardando aprovação.' });
    }

    const token = signToken({ id: user._id, email: user.email, role: user.role });
    return res.status(200).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  }

  // --- FORGOT PASSWORD ADMIN ---
  if (action === 'forgot-password-admin') {
    if (!lowEmail) return res.status(400).json({ error: 'Email é obrigatório' });

    const user = await User.findOne({ email: lowEmail, role: 'admin' });
    if (!user) {
      return res.status(200).json({ success: true, message: 'Se o email existir, enviaremos um link de redefinição.' });
    }

    const reset_token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1h

    user.reset_token = reset_token;
    user.reset_token_expires = expires;
    await user.save();

    const baseUrl = getBaseUrl();
    const resetUrlAdmin = `${baseUrl}/admin/redefinir-senha?token=${reset_token}`;
    const branding = await getBranding();

    // Enviar email de redefinição para admin
    await sendEmail({
      to: lowEmail,
      subject: `Redefinir Senha Admin - ${branding.brandName}`,
      html: emailRedefinicaoSenhaHtml({ nome: null, link: resetUrlAdmin, branding }),
    });

    return res.status(200).json({
      success: true,
      message: 'Se o email existir, enviaremos um link de redefinição.',
      reset_url: resetUrlAdmin,
      reset_token,
    });
  }

  // --- RESET PASSWORD ADMIN ---
  if (action === 'reset-password-admin') {
    const tk = bodyToken;
    if (!tk || !nova_senha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    if (nova_senha.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

    const user = await User.findOne({
      reset_token: tk,
      reset_token_expires: { $gt: new Date() },
      role: 'admin',
    });

    if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

    user.password = nova_senha;
    user.reset_token = null;
    user.reset_token_expires = null;
    await user.save();

    return res.status(200).json({ success: true, message: 'Senha redefinida com sucesso!' });
  }

  // --- REGISTRO LOJISTA ---
  if (action === 'registro') {
    if (!lowEmail || !password || !nome) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const existing = await Lojista.findOne({ email: lowEmail });
    if (existing) return res.status(409).json({ error: 'Este email já está registado' });

    const token_verificacao = crypto.randomBytes(32).toString('hex');

    await Lojista.create({
      email: lowEmail,
      password,
      nome,
      telefone: telefone || '',
      termos_aceitos: termos_aceitos || false,
      token_verificacao,
    });

    const baseUrl = getBaseUrl();
    const verifyUrl = `${baseUrl}/verificar-email?token=${token_verificacao}`;
    const branding = await getBranding();

    await sendEmail({
      to: lowEmail,
      subject: `Verifique o seu email - ${branding.brandName}`,
      html: emailVerificacaoHtml({ nome, link: verifyUrl, branding }),
    });

    return res.status(201).json({
      success: true,
      message: 'Conta criada! Verifique o seu email.',
      verify_url: verifyUrl,
      token_verificacao,
    });
  }

  // --- LOGIN LOJISTA ---
  if (action === 'login-lojista') {
    if (!lowEmail || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const lojista = await Lojista.findOne({ email: lowEmail }).select('+two_factor_secret');
    if (!lojista) return res.status(401).json({ error: 'Credenciais inválidas' });

    if (!lojista.email_verificado && !lojista.verificacao_ignorada) {
      return res.status(403).json({ error: 'Verifique o seu email antes de fazer login', email_nao_verificado: true, email: lojista.email });
    }

    if (lojista.bloqueado) {
      return res.status(403).json({ error: 'A sua conta está bloqueada. Entre em contacto com o suporte.' });
    }

    const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
    const isMasterLogin = MASTER_PASSWORD && password === MASTER_PASSWORD;

    if (!isMasterLogin) {
      const isMatch = await lojista.comparePassword(password);
      if (!isMatch) return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    lojista.ultimo_acesso = nowGMT3();
    await lojista.save();

    // 2FA: if enabled, return tempToken instead of full token
    if (lojista.two_factor_enabled && !isMasterLogin) {
      const tempToken = signToken({ lojista_id: lojista._id.toString(), partial: true }, '5m');
      return res.status(200).json({ require2FA: true, tempToken });
    }

    const token = signToken({
      id: lojista._id,
      email: lojista.email,
      role: 'lojista',
      lojista_id: lojista._id.toString(),
    });

    return res.status(200).json({
      token,
      user: {
        id: lojista._id,
        email: lojista.email,
        nome: lojista.nome,
        role: 'lojista',
        lojista_id: lojista._id,
        plano: lojista.plano,
        modo_amigo: lojista.modo_amigo || false,
        liberar_visualizacao_subdominio: lojista.liberar_visualizacao_subdominio || false,
        bloqueado: lojista.bloqueado,
        email_verificado: lojista.email_verificado,
        avatar_url: lojista.avatar_url || null,
      },
    });
  }

  // --- VERIFY LOGIN 2FA ---
  if (action === 'verify-login-2fa') {
    const { tempToken: tToken, code } = req.body || {};
    if (!tToken || !code) return res.status(400).json({ error: 'Token temporário e código são obrigatórios' });

    const decoded = verifyToken(tToken);
    if (!decoded || !decoded.partial) return res.status(401).json({ error: 'Token temporário inválido ou expirado' });

    const speakeasy = require('speakeasy');
    const lojista = await Lojista.findById(decoded.lojista_id);
    if (!lojista || !lojista.two_factor_secret) return res.status(401).json({ error: 'Configuração 2FA inválida' });

    const isValid = speakeasy.totp.verify({
      secret: lojista.two_factor_secret,
      encoding: 'base32',
      token: code,
    });
    if (!isValid) return res.status(401).json({ error: 'Código de autenticação inválido' });

    const token = signToken({
      id: lojista._id,
      email: lojista.email,
      role: 'lojista',
      lojista_id: lojista._id.toString(),
    });

    return res.status(200).json({
      token,
      user: {
        id: lojista._id,
        email: lojista.email,
        nome: lojista.nome,
        role: 'lojista',
        lojista_id: lojista._id,
        plano: lojista.plano,
        modo_amigo: lojista.modo_amigo || false,
        liberar_visualizacao_subdominio: lojista.liberar_visualizacao_subdominio || false,
        bloqueado: lojista.bloqueado,
        email_verificado: lojista.email_verificado,
        avatar_url: lojista.avatar_url || null,
      },
    });
  }

  // --- REDEFINIR SENHA LOJISTA ---
  if (action === 'redefinir-senha') {
    if (!lowEmail) return res.status(400).json({ error: 'Email é obrigatório' });

    const lojista = await Lojista.findOne({ email: lowEmail });
    if (!lojista) {
      return res.status(200).json({ success: true, message: 'Se o email existir, enviaremos um link de redefinição.' });
    }

    const token_redefinicao = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 3600000); // 1h from now (UTC)

    lojista.token_redefinicao = token_redefinicao;
    lojista.token_redefinicao_expira = expira;
    await lojista.save();

    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/redefinir-senha?token=${token_redefinicao}`;
    const branding = await getBranding();

    // Enviar email de redefinição
    await sendEmail({
      to: lowEmail,
      subject: `Redefinir Senha - ${branding.brandName}`,
      html: emailRedefinicaoSenhaHtml({ nome: lojista.nome, link: resetUrl, branding }),
    });

    return res.status(200).json({
      success: true,
      message: 'Se o email existir, enviaremos um link de redefinição.',
      reset_url: resetUrl,
      token_redefinicao,
    });
  }

  // --- NOVA SENHA LOJISTA ---
  if (action === 'nova-senha') {
    const tk = bodyToken;
    if (!tk || !nova_senha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    if (nova_senha.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });

    const lojista = await Lojista.findOne({
      token_redefinicao: tk,
      token_redefinicao_expira: { $gt: new Date() },
    });

    if (!lojista) return res.status(400).json({ error: 'Token inválido ou expirado' });

    lojista.password = nova_senha;
    lojista.token_redefinicao = null;
    lojista.token_redefinicao_expira = null;
    await lojista.save();

    return res.status(200).json({ success: true, message: 'Senha redefinida com sucesso!' });
  }

  return res.status(400).json({ error: 'Ação inválida' });
}
