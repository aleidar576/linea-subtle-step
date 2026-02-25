const connectDB = require('../lib/mongodb.js');
const User = require('../models/User.js');
const Lojista = require('../models/Lojista.js');
const Loja = require('../models/Loja.js');
const Product = require('../models/Product.js');
const Pedido = require('../models/Pedido.js');
const Notificacao = require('../models/Notificacao.js');
const Ticket = require('../models/Ticket.js');
const { requireAdmin, signToken, verifyToken, getTokenFromHeader } = require('../lib/auth.js');
const crypto = require('crypto');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { scope, id, action, plano } = req.query;

  // =============================================
  // PÚBLICO: security-report (link do email)
  // =============================================
  if (scope === 'security-report' && req.method === 'GET') {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token obrigatório' });

    const lojista = await Lojista.findOne({ security_token: token });
    if (!lojista) return res.status(400).json({ error: 'Token inválido ou já utilizado' });

    lojista.bloqueado = true;
    lojista.security_token = null;
    await lojista.save();

    await Ticket.create({
      tipo: 'compromisso_conta',
      lojista_id: lojista._id,
      status: 'aberto',
      descricao: `Lojista ${lojista.email} reportou comprometimento de conta via email de alteração de senha.`,
    });

    await Notificacao.create({
      titulo: 'Conta Bloqueada por Segurança',
      mensagem: 'Sua conta foi bloqueada após você reportar uma alteração de senha não autorizada. O suporte foi acionado.',
      lojista_id: lojista._id,
      tipo: 'seguranca',
    });

    // Redirect to confirmation page
    const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:5173';
    return res.redirect(302, `${baseUrl}/seguranca-confirmacao`);
  }

  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Não autorizado' });

  const currentAdmin = await User.findById(admin.id);
  if (!currentAdmin || currentAdmin.status !== 'active') {
    return res.status(403).json({ error: 'Apenas administradores ativos podem acessar' });
  }

  // =============================================
  // SCOPE: lojistas - Gestão de lojistas do SaaS
  // =============================================
  if (scope === 'lojistas') {
    // Impersonate: login como lojista
    if (req.method === 'GET' && action === 'impersonate' && id) {
      const lojista = await Lojista.findById(id);
      if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });
      const token = signToken({ id: lojista._id, email: lojista.email, role: 'lojista', lojista_id: lojista._id.toString() });
      return res.status(200).json({ token });
    }

    // Métricas do lojista
    if (req.method === 'GET' && action === 'lojista-metrics' && id) {
      const lojas = await Loja.find({ lojista_id: id, is_active: true }).select('_id slug nome');
      const lojaIds = lojas.map(l => l._id);
      const totalProdutos = await Product.countDocuments({ loja_id: { $in: lojaIds } });
      const pedidoStats = await Pedido.aggregate([
        { $match: { loja_id: { $in: lojaIds }, status: 'pago' } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
      ]);
      return res.status(200).json({
        totalProdutos,
        totalPedidos: pedidoStats[0]?.count || 0,
        totalVendas: pedidoStats[0]?.total || 0,
        lojas: lojas.map(l => ({ slug: l.slug, nome: l.nome })),
      });
    }

    if (req.method === 'GET') {
      const lojistas = await Lojista.find()
        .select('-password -token_verificacao -token_redefinicao -token_redefinicao_expira')
        .sort({ criado_em: -1 });

      // Normalizar planos legados
      const legacyPlans = { free_plus: 'plus', pro: 'plus' };
      for (const l of lojistas) {
        if (legacyPlans[l.plano]) {
          await Lojista.findByIdAndUpdate(l._id, { plano: legacyPlans[l.plano] });
          l.plano = legacyPlans[l.plano];
        }
        // Normalizar campo legado ignorar_inadimplencia -> modo_amigo
        if (l.ignorar_inadimplencia && !l.modo_amigo) {
          await Lojista.findByIdAndUpdate(l._id, { modo_amigo: true });
          l.modo_amigo = true;
        }
      }

      // Contar lojas de cada lojista
      const lojistaIds = lojistas.map(l => l._id);
      const lojaCounts = await Loja.aggregate([
        { $match: { lojista_id: { $in: lojistaIds }, is_active: true } },
        { $group: { _id: '$lojista_id', count: { $sum: 1 } } }
      ]);
      const countMap = {};
      lojaCounts.forEach(c => { countMap[c._id.toString()] = c.count; });

      const result = lojistas.map(l => ({
        ...l.toObject(),
        modo_amigo: l.modo_amigo || false,
        qtd_lojas: countMap[l._id.toString()] || 0,
      }));

      return res.status(200).json(result);
    }

    if (req.method === 'PATCH' && id) {
      const lojista = await Lojista.findById(id);
      if (!lojista) return res.status(404).json({ error: 'Lojista não encontrado' });

      if (action === 'bloquear') {
        lojista.bloqueado = !lojista.bloqueado;
        await lojista.save();
        return res.status(200).json({ success: true, bloqueado: lojista.bloqueado });
      }

      if (action === 'bloquear-acesso') {
        lojista.acesso_bloqueado = !lojista.acesso_bloqueado;
        await lojista.save();
        return res.status(200).json({ success: true, acesso_bloqueado: lojista.acesso_bloqueado });
      }

      if (action === 'plano' && plano) {
        if (!['free', 'plus'].includes(plano)) {
          return res.status(400).json({ error: 'Plano inválido' });
        }
        lojista.plano = plano;
        await lojista.save();
        return res.status(200).json({ success: true, plano: lojista.plano });
      }

      if (action === 'tolerancia') {
        const { modo_amigo, tolerancia_extra_dias } = req.body;
        if (modo_amigo !== undefined) lojista.modo_amigo = modo_amigo;
        if (tolerancia_extra_dias !== undefined) lojista.tolerancia_extra_dias = Number(tolerancia_extra_dias) || 0;
        await lojista.save();
        return res.status(200).json({ success: true, modo_amigo: lojista.modo_amigo, tolerancia_extra_dias: lojista.tolerancia_extra_dias });
      }

      if (action === 'toggle-ver-subdominio') {
        lojista.liberar_visualizacao_subdominio = !lojista.liberar_visualizacao_subdominio;
        await lojista.save();
        return res.status(200).json({
          success: true,
          liberar_visualizacao_subdominio: lojista.liberar_visualizacao_subdominio
        });
      }

      if (action === 'ignorar-verificacao') {
        lojista.verificacao_ignorada = true;
        await lojista.save();
        return res.status(200).json({ success: true, verificacao_ignorada: true });
      }

      return res.status(400).json({ error: 'Ação inválida' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  }

  // =============================================
  // SCOPE: stats - Estatísticas globais do SaaS
  // =============================================
  if (scope === 'stats') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

    const totalLojistas = await Lojista.countDocuments();
    const lojistasAtivos = await Lojista.countDocuments({ bloqueado: false, email_verificado: true });
    const lojistasBloqueados = await Lojista.countDocuments({ bloqueado: true });
    const totalLojas = await Loja.countDocuments();
    const lojasAtivas = await Loja.countDocuments({ is_active: true });

    // Novos cadastros por mês (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const cadastrosPorMes = await Lojista.aggregate([
      { $match: { criado_em: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$criado_em' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return res.status(200).json({
      totalLojistas,
      lojistasAtivos,
      lojistasBloqueados,
      totalLojas,
      lojasAtivas,
      cadastrosPorMes,
    });
  }

  // =============================================
  // SCOPE: broadcast - Avisos globais
  // =============================================
  if (scope === 'broadcast') {
    if (req.method === 'POST') {
      const { titulo, mensagem } = req.body || {};
      if (!titulo || !mensagem) return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });

      const lojistas = await Lojista.find({ bloqueado: false }).select('_id');
      const docs = lojistas.map(l => ({
        titulo, mensagem, lojista_id: l._id, tipo: 'aviso',
      }));
      await Notificacao.insertMany(docs);
      return res.status(200).json({ success: true, count: docs.length });
    }
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (scope === 'broadcasts') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
    // Return unique broadcasts (last 50 by admin)
    const notifs = await Notificacao.aggregate([
      { $match: { tipo: 'aviso' } },
      { $group: { _id: { titulo: '$titulo', mensagem: '$mensagem' }, titulo: { $first: '$titulo' }, mensagem: { $first: '$mensagem' }, criado_em: { $first: '$criado_em' } } },
      { $sort: { criado_em: -1 } },
      { $limit: 50 },
    ]);
    return res.status(200).json(notifs);
  }

  // =============================================
  // SCOPE: tickets - Gestão de tickets
  // =============================================
  if (scope === 'tickets') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
    const tickets = await Ticket.find().sort({ criado_em: -1 }).limit(100).lean();
    // Enrich with lojista email
    const lojistaIds = [...new Set(tickets.map(t => t.lojista_id.toString()))];
    const lojistas = await Lojista.find({ _id: { $in: lojistaIds } }).select('email').lean();
    const emailMap = {};
    lojistas.forEach(l => { emailMap[l._id.toString()] = l.email; });
    const enriched = tickets.map(t => ({ ...t, lojista_email: emailMap[t.lojista_id.toString()] || 'N/A' }));
    return res.status(200).json(enriched);
  }

  if (scope === 'ticket') {
    if (req.method === 'PATCH' && id) {
      const ticket = await Ticket.findById(id);
      if (!ticket) return res.status(404).json({ error: 'Ticket não encontrado' });
      ticket.status = 'resolvido';
      await ticket.save();
      // Desbloquear lojista se era compromisso de conta
      if (ticket.tipo === 'compromisso_conta') {
        await Lojista.findByIdAndUpdate(ticket.lojista_id, { bloqueado: false });
      }
      return res.status(200).json({ success: true });
    }
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // =============================================
  // DEFAULT: Gestão de admins do sistema (Equipe)
  // =============================================
  if (req.method === 'GET') {
    const admins = await User.find({ role: 'admin' })
      .select('-password -reset_token -reset_token_expires')
      .sort({ createdAt: 1 });
    return res.status(200).json(admins);
  }

  if (req.method === 'PATCH') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const target = await User.findById(id);
    if (!target || target.role !== 'admin') return res.status(404).json({ error: 'Admin não encontrado' });
    target.status = 'active';
    await target.save();
    return res.status(200).json({ success: true, message: 'Admin aprovado com sucesso!' });
  }

  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    if (id === admin.id) return res.status(400).json({ error: 'Você não pode remover a si mesmo' });
    const target = await User.findById(id);
    if (!target || target.role !== 'admin') return res.status(404).json({ error: 'Admin não encontrado' });
    await User.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: 'Admin removido com sucesso!' });
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
