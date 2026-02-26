// ============================================
// ⚙️ /api/settings - Configurações Globais + Tracking Pixels (scope=pixels)
// ============================================

const connectDB = require('../lib/mongodb');
const Setting = require('../models/Setting.js');
const TrackingPixel = require('../models/TrackingPixel.js');
const Plano = require('../models/Plano.js');
const { requireAdmin } = require('../lib/auth.js');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();
  const { scope } = req.query;

  // ── scope=gateways-plataforma: Gateways habilitados (Admin) ──
  if (scope === 'gateways-plataforma') {
    if (req.method === 'GET') {
      const setting = await Setting.findOne({ key: 'gateways_ativos', loja_id: null }).lean();
      const ativos = setting?.value ? JSON.parse(setting.value) : [];
      return res.status(200).json(ativos);
    }
    if (req.method === 'PATCH') {
      const admin = requireAdmin(req);
      if (!admin) return res.status(401).json({ error: 'Não autorizado' });
      const { gateways_ativos } = req.body;
      if (!Array.isArray(gateways_ativos)) return res.status(400).json({ error: 'gateways_ativos deve ser um array' });
      await Setting.findOneAndUpdate(
        { key: 'gateways_ativos', loja_id: null },
        { value: JSON.stringify(gateways_ativos) },
        { upsert: true }
      );
      return res.status(200).json({ success: true, gateways_ativos });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── scope=planos: Listar planos (público) ──────────────
  if (scope === 'planos' && req.method === 'GET') {
    const planos = await Plano.find({ is_active: true }).sort({ ordem: 1 }).lean();
    return res.status(200).json(planos);
  }

  // ── scope=plano: CRUD individual (admin) ──────────────
  if (scope === 'plano') {
    if (req.method === 'GET' && req.query.id) {
      const plano = await Plano.findById(req.query.id).lean();
      if (!plano) return res.status(404).json({ error: 'Plano não encontrado' });
      return res.status(200).json(plano);
    }

    const admin = requireAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Não autorizado' });

    if (req.method === 'POST') {
      try {
        const plano = await Plano.create(req.body);
        return res.status(201).json(plano);
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao criar plano' });
      }
    }

    if (req.method === 'PUT' && req.query.id) {
      try {
        const plano = await Plano.findByIdAndUpdate(req.query.id, req.body, { new: true }).lean();
        if (!plano) return res.status(404).json({ error: 'Plano não encontrado' });
        return res.status(200).json(plano);
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar plano' });
      }
    }

    if (req.method === 'DELETE' && req.query.id) {
      try {
        await Plano.findByIdAndDelete(req.query.id);
        return res.status(200).json({ success: true });
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao deletar plano' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── scope=planos-seed: Seed inicial (admin, idempotente) ──
  if (scope === 'planos-seed' && req.method === 'POST') {
    const admin = requireAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Não autorizado' });

    const seedPlanos = [
      { nome: 'Starter', preco_original: 0, preco_promocional: 0, taxa_transacao: 1.5, stripe_price_id: 'price_1T4WY1Fp1n9NwetZpst9MoW0', vantagens: [], destaque: false, ordem: 0 },
      { nome: 'Pro', preco_original: 0, preco_promocional: 0, taxa_transacao: 1.2, stripe_price_id: 'price_1T4WZGFp1n9NwetZOAsuV30x', vantagens: [], destaque: true, ordem: 1 },
      { nome: 'Scale', preco_original: 0, preco_promocional: 0, taxa_transacao: 1.0, stripe_price_id: 'price_1T4WZrFp1n9NwetZEAw3WVOu', vantagens: [], destaque: false, ordem: 2 },
    ];

    const results = [];
    for (const seed of seedPlanos) {
      const existing = await Plano.findOne({ stripe_price_id: seed.stripe_price_id });
      if (!existing) {
        const created = await Plano.create(seed);
        results.push({ nome: seed.nome, action: 'created', _id: created._id });
      } else {
        results.push({ nome: seed.nome, action: 'already_exists', _id: existing._id });
      }
    }
    return res.status(200).json({ success: true, results });
  }

  // ── scope=pixels: CRUD de TrackingPixel ────────────────
  if (scope === 'pixels') {
    const { id, active } = req.query;

    // GET: Listar Pixels (público para active=true)
    if (req.method === 'GET') {
      const filter = active === 'true' ? { is_active: true } : {};
      const pixels = await TrackingPixel.find(filter).sort({ createdAt: -1 }).lean();
      return res.status(200).json(pixels);
    }

    // Proteção de Admin para alterações
    const admin = requireAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Não autorizado' });

    // POST: Criar Pixel
    if (req.method === 'POST') {
      try {
        const pixel = await TrackingPixel.create(req.body);
        return res.status(201).json(pixel);
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao criar pixel' });
      }
    }

    // PUT: Editar Pixel
    if (req.method === 'PUT' && id) {
      try {
        const pixel = await TrackingPixel.findByIdAndUpdate(id, req.body, { new: true }).lean();
        if (!pixel) return res.status(404).json({ error: 'Pixel não encontrado' });
        return res.status(200).json(pixel);
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao editar pixel' });
      }
    }

    // PATCH: Toggle active
    if (req.method === 'PATCH' && id) {
      try {
        const pixel = await TrackingPixel.findByIdAndUpdate(id, req.body, { new: true }).lean();
        if (!pixel) return res.status(404).json({ error: 'Pixel não encontrado' });
        return res.status(200).json(pixel);
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar pixel' });
      }
    }

    // DELETE: Deletar Pixel
    if (req.method === 'DELETE' && id) {
      try {
        await TrackingPixel.findByIdAndDelete(id);
        return res.status(200).json({ success: true });
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao deletar pixel' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── scope vazio: Settings padrão ───────────────────────

  // GET: Buscar configurações (público)
  if (req.method === 'GET') {
    const { keys } = req.query;
    let query = {};
    if (keys) {
      query = { key: { $in: keys.split(',') } };
    }
    try {
      const settings = await Setting.find(query).lean();
      return res.status(200).json(settings);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
  }

  // ── Rotas protegidas (admin) ─────────────────────────
  const admin = requireAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Não autorizado' });

  // POST ?action=update-sealpay-key → Atualiza chave SealPay
  if (req.method === 'POST') {
    const { action } = req.query;

    if (action === 'update-sealpay-key') {
      const { api_key } = req.body;
      if (!api_key) {
        return res.status(400).json({ error: 'Chave de API é obrigatória' });
      }
      try {
        await Setting.findOneAndUpdate(
          { key: 'sealpay_api_key' },
          { value: api_key },
          { upsert: true }
        );
        return res.status(200).json({ success: true });
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao atualizar chave da API' });
      }
    }

    if (action === 'test_message') {
      const { destinatario, mensagem } = req.body;
      if (!destinatario || !mensagem) {
        return res.status(400).json({ error: 'Destinatário e mensagem são obrigatórios' });
      }
      try {
        const tokenSetting = await Setting.findOne({ key: 'messaging_token' }).lean();
        if (!tokenSetting || !tokenSetting.value) {
          return res.status(400).json({ error: 'Token de mensagens não configurado. Salve o token antes de testar.' });
        }
        const apiResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenSetting.value}`,
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: [destinatario],
            subject: 'Mensagem de Teste',
            html: `<p>${mensagem}</p>`,
          }),
        });
        if (!apiResponse.ok) {
          const errBody = await apiResponse.json().catch(() => ({ error: 'Erro desconhecido' }));
          return res.status(apiResponse.status).json({ error: errBody.error || `Falha no envio (HTTP ${apiResponse.status})`, details: errBody });
        }
        return res.status(200).json({ success: true, message: 'Mensagem de teste enviada com sucesso!' });
      } catch (error) {
        return res.status(500).json({ error: 'Falha ao enviar mensagem de teste', details: error.message });
      }
    }

    // scope=admin-upload: Upload de imagem via Bunny.net
    if (action === 'admin-upload') {
      const { image_base64 } = req.body;
      if (!image_base64) return res.status(400).json({ error: 'image_base64 é obrigatório' });

      try {
        const apiKey = process.env.BUNNY_API_KEY;
        const storageZone = process.env.BUNNY_STORAGE_ZONE;
        const pullZone = process.env.BUNNY_PULL_ZONE;

        if (!apiKey || !storageZone || !pullZone) {
          return res.status(400).json({ error: 'Variáveis Bunny.net não configuradas.' });
        }

        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

        const uploadRes = await fetch(`https://br.storage.bunnycdn.com/${storageZone}/${fileName}`, {
          method: 'PUT',
          headers: {
            'AccessKey': apiKey,
            'Content-Type': 'application/octet-stream',
          },
          body: buffer,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => '');
          return res.status(500).json({ error: 'Falha no upload', details: errText });
        }

        const url = `https://${pullZone}/${fileName}`;
        return res.json({ url });
      } catch (error) {
        return res.status(500).json({ error: 'Erro no upload', details: error.message });
      }
    }

    // test_bunny: Testar conexão Bunny.net
    if (action === 'test_bunny') {
      const apiKey = process.env.BUNNY_API_KEY;
      const storageZone = process.env.BUNNY_STORAGE_ZONE;
      const pullZone = process.env.BUNNY_PULL_ZONE;
      if (!apiKey || !storageZone || !pullZone) {
        return res.status(400).json({ error: 'Variáveis BUNNY não configuradas na Vercel.' });
      }
      try {
        const testRes = await fetch(`https://br.storage.bunnycdn.com/${storageZone}/`, {
          headers: { AccessKey: apiKey },
        });
        if (!testRes.ok) {
          return res.status(500).json({ error: 'Falha na conexão com Bunny.net', status: testRes.status });
        }
        return res.json({ success: true, pullZone, message: 'Conexão Bunny.net OK!' });
      } catch (error) {
        return res.status(500).json({ error: 'Erro ao testar Bunny.net', details: error.message });
      }
    }

    return res.status(400).json({ error: 'Ação inválida' });
  }

  // PUT: Atualizar configurações em batch
  if (req.method === 'PUT') {
    try {
      const { settings } = req.body;
      for (const s of settings) {
        await Setting.findOneAndUpdate(
          { key: s.key },
          { value: s.value },
          { upsert: true }
        );
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
