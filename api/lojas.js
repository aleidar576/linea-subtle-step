// ============================================
// 🏪 API: Lojas (CRUD) - Multi-Tenant SaaS
// ============================================

const connectDB = require('../lib/mongodb.js');
const Loja = require('../models/Loja.js');
const authPkg = require('../lib/auth.js');

const { verifyToken, getTokenFromHeader } = authPkg;

function requireLojista(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'lojista') return null;
  return decoded;
}

const PLAN_LIMITS = { free: 1, plus: 5 };

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { id, scope, domain } = req.query;

  // === SYNC DOMAINS: Re-registrar todos os domínios na Vercel (admin only) ===
  if (scope === 'sync-domains' && req.method === 'POST') {
    const token = getTokenFromHeader(req);
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') return res.status(403).json({ error: 'Apenas admins' });

    const Setting = require('../models/Setting.js');
    const globalDomainSetting = await Setting.findOne({ key: 'global_domain' }).lean();
    const globalDomain = globalDomainSetting?.value || process.env.PLATFORM_DOMAIN || 'dusking.com.br';

    const lojas = await Loja.find({ is_active: true }).lean();
    const results = [];

    for (const loja of lojas) {
      const subdomain = `${loja.slug}.${globalDomain}`;
      try {
        const vercelRes = await fetch(
          `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: subdomain }),
          }
        );
        const data = await vercelRes.json();
        const ok = vercelRes.ok || data.error?.code === 'domain_already_exists';
        results.push({ slug: loja.slug, domain: subdomain, ok, detail: data });
      } catch (e) {
        results.push({ slug: loja.slug, domain: subdomain, ok: false, detail: e.message });
      }

      if (loja.dominio_customizado) {
        try {
          const vercelRes2 = await fetch(
            `https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: loja.dominio_customizado }),
            }
          );
          const data2 = await vercelRes2.json();
          const ok2 = vercelRes2.ok || data2.error?.code === 'domain_already_exists';
          results.push({ slug: loja.slug, domain: loja.dominio_customizado, ok: ok2, detail: data2 });
        } catch (e) {
          results.push({ slug: loja.slug, domain: loja.dominio_customizado, ok: false, detail: e.message });
        }
      }
    }

    const total = results.length;
    const success = results.filter(r => r.ok).length;
    return res.json({ total, success, failed: total - success, results });
  }

  // === DOMAINS: Add domain to Vercel ===
  if (scope === 'add-domain' && req.method === 'POST') {
    const lojista = requireLojista(req);
    if (!lojista) return res.status(401).json({ error: 'Não autorizado' });
    const { domain: domainName, loja_id: dLojaId } = req.body;
    if (!domainName || !dLojaId) return res.status(400).json({ error: 'domain e loja_id obrigatórios' });
    
    const loja = await Loja.findOne({ _id: dLojaId, lojista_id: lojista.lojista_id });
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    try {
      const vercelRes = await fetch(`https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: domainName }),
      });
      const vercelData = await vercelRes.json();
      if (!vercelRes.ok && vercelData.error?.code !== 'domain_already_exists') {
        return res.status(400).json({ error: vercelData.error?.message || 'Erro ao adicionar domínio na Vercel' });
      }
      // Save to loja
      loja.dominio_customizado = domainName;
      await loja.save();
      return res.json({ success: true, vercel: vercelData });
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao comunicar com a Vercel API' });
    }
  }

  if (scope === 'check-domain' && req.method === 'GET') {
    const lojista = requireLojista(req);
    if (!lojista) return res.status(401).json({ error: 'Não autorizado' });
    if (!domain) return res.status(400).json({ error: 'domain obrigatório' });
    try {
      const vercelRes = await fetch(`https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}`, {
        headers: { Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}` },
      });
      const vercelData = await vercelRes.json();
      return res.json(vercelData);
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao verificar domínio' });
    }
  }

  // === PUBLIC: buscar loja por domínio/subdomínio ===
  if (scope === 'public' && domain && req.method === 'GET') {
    const Setting = require('../models/Setting.js');
    const globalDomainSetting = await Setting.findOne({ key: 'global_domain' }).lean();
    const globalDomain = globalDomainSetting?.value || process.env.PLATFORM_DOMAIN || 'dusking.com.br';

    let loja = null;

    // Tentar por domínio customizado primeiro
    loja = await Loja.findOne({ dominio_customizado: domain, is_active: true }).lean();

    // Tentar por subdomínio
    if (!loja && domain.endsWith(`.${globalDomain}`)) {
      const slug = domain.replace(`.${globalDomain}`, '');
      if (slug && !slug.includes('.')) {
        loja = await Loja.findOne({ slug, is_active: true }).lean();
      }
    }

    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    // Verificar se loja pode ser exibida (Regra de Ouro + Bloqueio por inadimplência)
    const Lojista = require('../models/Lojista.js');
    const dono = await Lojista.findById(loja.lojista_id).lean();

    // Bloqueio por inadimplência (subscription past_due fora da carência)
    if (dono && dono.subscription_status === 'past_due' && !dono.modo_amigo) {
      const toleranciaGlobal = 7; // dias padrão
      const toleranciaExtra = dono.tolerancia_extra_dias || 0;
      const totalTolerancia = toleranciaGlobal + toleranciaExtra;
      if (dono.data_vencimento) {
        const vencimento = new Date(dono.data_vencimento);
        const agora = new Date();
        const diffDias = Math.floor((agora.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDias > totalTolerancia) {
          return res.status(403).json({ error: 'Loja bloqueada', is_blocked: true });
        }
      }
    }

    // Bloqueio por acesso suspenso pelo admin
    if (dono && dono.acesso_bloqueado) {
      return res.status(403).json({ error: 'Loja bloqueada', is_blocked: true });
    }

    // Regra de ouro legada
    if (dono && dono.plano === 'free' && !dono.modo_amigo && !dono.ignorar_inadimplencia && !loja.ativada_por_admin && !dono.subscription_status) {
      return res.status(403).json({ error: 'Loja Offline', offline: true });
    }

    // Buscar pixels da loja
    const TrackingPixel = require('../models/TrackingPixel.js');
    const pixels = await TrackingPixel.find({ loja_id: loja._id, is_active: true }).lean();

    return res.status(200).json({
      _id: loja._id,
      nome: loja.nome,
      nome_exibicao: loja.nome_exibicao,
      slug: loja.slug,
      favicon: loja.favicon,
      icone: loja.icone,
      configuracoes: loja.configuracoes,
      is_active: loja.is_active,
      pixels,
    });
  }

  const lojista = requireLojista(req);
  if (!lojista) return res.status(401).json({ error: 'Não autorizado' });

  // GET - Listar ou detalhar
  if (req.method === 'GET') {
    if (id) {
      const loja = await Loja.findOne({ _id: id, lojista_id: lojista.lojista_id });
      if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });
      return res.status(200).json(loja);
    }
    const lojas = await Loja.find({ lojista_id: lojista.lojista_id }).sort({ criado_em: -1 });
    return res.status(200).json(lojas);
  }

  // POST - Criar loja
  if (req.method === 'POST') {
    const { nome, nome_exibicao } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome é obrigatório' });

    // Gerar slug automaticamente a partir do nome
    let cleanSlug = nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (cleanSlug.length < 3) cleanSlug = cleanSlug + '-loja';

    // Verificar limite do plano
    const plano = lojista.plano || 'free';
    const limit = PLAN_LIMITS[plano] || 1;
    const count = await Loja.countDocuments({ lojista_id: lojista.lojista_id, is_active: true });
    if (count >= limit) {
      return res.status(403).json({ error: `O plano ${plano} permite apenas ${limit} loja(s). Faça upgrade.` });
    }

    // Verificar slug único
    const existing = await Loja.findOne({ slug: cleanSlug });
    if (existing) return res.status(409).json({ error: 'Este slug já está em uso' });

    const loja = await Loja.create({
      lojista_id: lojista.lojista_id,
      nome,
      nome_exibicao: nome_exibicao || nome,
      slug: cleanSlug,
      configuracoes: {
        cores_globais: {
          brand_primary: '#E60023',
          brand_secondary: '#F1F1F2',
          bg_base: '#F8F8F8',
          bg_surface: '#FFFFFF',
          text_primary: '#111111',
          whatsapp_button: '#25D366',
        },
      },
    });

    // Auto-register subdomain on Vercel
    if (process.env.VERCEL_PROJECT_ID && process.env.VERCEL_ACCESS_TOKEN) {
      try {
        const Setting = require('../models/Setting.js');
        const globalDomainSetting = await Setting.findOne({ key: 'global_domain', loja_id: null }).lean();
        const globalDomain = globalDomainSetting?.value || process.env.PLATFORM_DOMAIN || 'dusking.com.br';
        const subdomain = `${cleanSlug}.${globalDomain}`;
        await fetch(`https://api.vercel.com/v10/projects/${process.env.VERCEL_PROJECT_ID}/domains`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: subdomain }),
        });
      } catch (e) {
        console.error('[LOJAS] Erro ao registrar subdomínio na Vercel:', e.message);
      }
    }

    return res.status(201).json(loja);
  }

  // PUT - Atualizar loja
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });

    const loja = await Loja.findOne({ _id: id, lojista_id: lojista.lojista_id });
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    const allowed = ['nome', 'nome_exibicao', 'favicon', 'icone', 'dominio_customizado'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    // Merge configuracoes with dot-notation to avoid overwriting existing keys
    if (req.body.configuracoes && typeof req.body.configuracoes === 'object') {
      for (const [subKey, subVal] of Object.entries(req.body.configuracoes)) {
        update[`configuracoes.${subKey}`] = subVal;
      }
    }

    const updated = await Loja.findByIdAndUpdate(id, { $set: update }, { new: true });
    return res.status(200).json(updated);
  }

  // DELETE - Desativar loja
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });

    const loja = await Loja.findOne({ _id: id, lojista_id: lojista.lojista_id });
    if (!loja) return res.status(404).json({ error: 'Loja não encontrada' });

    loja.is_active = false;
    await loja.save();
    return res.status(200).json({ success: true, message: 'Loja desativada' });
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
