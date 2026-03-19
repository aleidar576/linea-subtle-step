// ============================================
// 🖼️ Dynamic Open Graph Renderer (Serverless)
// ============================================

const connectDB = require('../lib/mongodb.js');
const Loja = require('../models/Loja.js');

const DEFAULT_OG_IMAGE = 'https://dusking.com.br/placeholder.svg';
const PLATFORM_NAME = 'Dusking';

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const host = req.query.host || req.headers['host'] || '';
  if (!host) {
    return res.status(400).send('<!-- missing host -->');
  }

  try {
    await connectDB();

    const Setting = require('../models/Setting.js');
    const globalDomainSetting = await Setting.findOne({ key: 'global_domain' }).lean();
    const globalDomain = globalDomainSetting?.value || process.env.PLATFORM_DOMAIN || 'dusking.com.br';

    let loja = null;

    // 1. Tentar domínio customizado
    loja = await Loja.findOne({ dominio_customizado: host, is_active: true })
      .select('nome nome_exibicao slogan favicon icone seo_config slug dominio_customizado')
      .lean();

    // 2. Tentar subdomínio
    if (!loja && host.endsWith(`.${globalDomain}`)) {
      const slug = host.replace(`.${globalDomain}`, '');
      if (slug && !slug.includes('.')) {
        loja = await Loja.findOne({ slug, is_active: true })
          .select('nome nome_exibicao slogan favicon icone seo_config slug dominio_customizado')
          .lean();
      }
    }

    if (!loja) {
      return res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8').send(
        buildHTML(PLATFORM_NAME, 'Loja não encontrada', DEFAULT_OG_IMAGE, `https://${host}`)
      );
    }

    // Fallback chain
    const title = loja.seo_config?.title || loja.nome_exibicao || loja.nome;
    const description = loja.seo_config?.description || loja.slogan || 'Conheça nossa loja!';
    const image = loja.seo_config?.og_image_url || loja.icone || loja.favicon || DEFAULT_OG_IMAGE;
    const url = `https://${host}`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(buildHTML(title, description, image, url));
  } catch (err) {
    console.error('[OG] Error:', err.message);
    return res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').send(
      buildHTML(PLATFORM_NAME, 'Erro ao carregar dados', DEFAULT_OG_IMAGE, `https://${host}`)
    );
  }
};

function buildHTML(title, description, image, url) {
  // Sanitize to prevent XSS in meta tags
  const esc = (str) => String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const t = esc(title);
  const d = esc(description);
  const img = esc(image);
  const u = esc(url);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${t}</title>
  <meta name="description" content="${d}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${t}" />
  <meta property="og:description" content="${d}" />
  <meta property="og:image" content="${img}" />
  <meta property="og:url" content="${u}" />
  <meta property="og:site_name" content="${t}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${t}" />
  <meta name="twitter:description" content="${d}" />
  <meta name="twitter:image" content="${img}" />
</head>
<body></body>
</html>`;
}
