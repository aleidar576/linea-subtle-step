// ============================================
// 📸 Mídia API (Bunny.net Upload + Mux Video Commerce)
// Microsserviço extraído de loja-extras.js (Fase 1 - Strangler Fig)
// ============================================

const mongoose = require('mongoose');
const connectDB = require('../lib/mongodb.js');
const jwt = require('jsonwebtoken');

// Models
const Loja = require('../models/Loja.js');
const Product = require('../models/Product.js');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) console.error('[MIDIA] FATAL: JWT_SECRET não configurado nas variáveis de ambiente.');

function verifyLojista(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    if (decoded.role !== 'lojista') return null;
    return decoded;
  } catch { return null; }
}

async function verifyOwnership(user, lojaId) {
  const loja = await Loja.findById(lojaId).lean();
  if (!loja) return false;
  return loja.lojista_id.toString() === user.lojista_id;
}

// Desabilitar bodyParser da Vercel para receber raw body
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { scope, loja_id } = req.query;
  const method = req.method;

  // Ler raw body para POST/PUT/PATCH
  if (method !== 'GET' && method !== 'DELETE' && method !== 'OPTIONS') {
    const rawBody = await getRawBody(req);
    try {
      req.body = JSON.parse(rawBody);
    } catch {
      req.body = {};
    }
  }

  // === AUTH REQUIRED ===
  const user = verifyLojista(req);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const resolvedLojaId = loja_id || req.body?.loja_id;

  if (resolvedLojaId) {
    const owns = await verifyOwnership(user, resolvedLojaId);
    if (!owns) return res.status(403).json({ error: 'Sem permissão para esta loja' });
  }

  try {
    // ==========================================
    // MÍDIAS (Agregação de produtos)
    // ==========================================
    if (scope === 'midias' && method === 'GET') {
      const products = await Product.find({ loja_id: resolvedLojaId }).select('product_id name image images variacoes').lean();
      const urlMap = {};
      for (const p of products) {
        const allUrls = [p.image, ...(p.images || [])];
        for (const v of (p.variacoes || [])) {
          if (v.imagem) allUrls.push(v.imagem);
        }
        for (const url of allUrls) {
          if (!url) continue;
          if (!urlMap[url]) urlMap[url] = { url, usado_em: [] };
          urlMap[url].usado_em.push({ product_id: p.product_id, name: p.name });
        }
      }
      const midias = Object.values(urlMap).sort((a, b) => b.usado_em.length - a.usado_em.length);
      return res.json(midias);
    }

    if (scope === 'midia' && method === 'DELETE') {
      const { url } = req.body;
      if (!url || !resolvedLojaId) return res.status(400).json({ error: 'url e loja_id obrigatórios' });
      const products = await Product.find({ loja_id: resolvedLojaId, $or: [{ image: url }, { images: url }, { 'variacoes.imagem': url }] });
      let count = 0;
      for (const p of products) {
        if (p.image === url) p.image = (p.images || []).find(i => i !== url) || '';
        p.images = (p.images || []).filter(i => i !== url);
        for (const v of (p.variacoes || [])) {
          if (v.imagem === url) v.imagem = null;
        }
        await p.save();
        count++;
      }
      return res.json({ success: true, removido_de: count });
    }

    // ==========================================
    // UPLOAD BUNNY.NET
    // ==========================================
    if (scope === 'upload' && method === 'POST') {
      const { image_base64 } = req.body;
      if (!image_base64) return res.status(400).json({ error: 'image_base64 é obrigatório' });

      const apiKey = process.env.BUNNY_API_KEY;
      const storageZone = process.env.BUNNY_STORAGE_ZONE;
      const pullZone = process.env.BUNNY_PULL_ZONE;
      if (!apiKey || !storageZone || !pullZone) {
        return res.status(400).json({ error: 'Variáveis Bunny.net não configuradas.' });
      }

      try {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

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
          console.error('[BUNNY]', errText);
          return res.status(500).json({ error: 'Falha no upload para Bunny.net', details: errText });
        }

        const url = `https://${pullZone}/${fileName}`;
        return res.json({ url });
      } catch (err) {
        console.error('[BUNNY]', err);
        return res.status(500).json({ error: 'Erro no upload', details: err.message });
      }
    }

    // ==========================================
    // MUX VIDEO COMMERCE
    // ==========================================

    // === MUX: Gerar URL de Direct Upload ===
    if (scope === 'mux-upload' && method === 'POST') {
      const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
      const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
      if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
        return res.status(500).json({ error: 'Mux não configurado no servidor (MUX_TOKEN_ID / MUX_TOKEN_SECRET)' });
      }

      const Mux = require('@mux/mux-node');
      const mux = new Mux.default({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });

      try {
        const upload = await mux.video.uploads.create({
          new_asset_settings: {
            playback_policy: ['public'],
            encoding_tier: 'baseline',
          },
          cors_origin: '*',
        });

        return res.json({
          upload_url: upload.url,
          upload_id: upload.id,
        });
      } catch (err) {
        console.error('[MUX-UPLOAD] ❌ Erro ao criar upload:', err.message);
        return res.status(500).json({ error: 'Erro ao gerar URL de upload do Mux' });
      }
    }

    // === MUX: Verificar status do upload/asset ===
    if (scope === 'mux-status' && method === 'GET') {
      const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
      const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
      if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
        return res.status(500).json({ error: 'Mux não configurado' });
      }

      const uploadId = req.query.upload_id;
      if (!uploadId) return res.status(400).json({ error: 'upload_id é obrigatório' });

      const Mux = require('@mux/mux-node');
      const mux = new Mux.default({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });

      try {
        const upload = await mux.video.uploads.retrieve(uploadId);
        if (!upload.asset_id) {
          return res.json({ status: 'waiting', asset_id: null, playback_id: null });
        }

        const asset = await mux.video.assets.retrieve(upload.asset_id);
        const playbackId = asset.playback_ids?.[0]?.id || null;

        return res.json({
          status: asset.status,
          asset_id: upload.asset_id,
          playback_id: playbackId,
        });
      } catch (err) {
        console.error('[MUX-STATUS] ❌ Erro:', err.message);
        return res.status(500).json({ error: 'Erro ao verificar status do vídeo' });
      }
    }

    // === MUX: Deletar vídeo (asset) ===
    if (scope === 'mux-delete' && method === 'DELETE') {
      const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
      const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
      if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
        return res.status(500).json({ error: 'Mux não configurado' });
      }

      const { asset_id: assetId, product_id: productId } = req.query;
      if (!assetId) return res.status(400).json({ error: 'asset_id é obrigatório' });

      const Mux = require('@mux/mux-node');
      const mux = new Mux.default({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });

      try {
        try {
          await mux.video.assets.delete(assetId);
          console.log(`[MUX-DELETE] ✅ Asset ${assetId} deletado do Mux`);
        } catch (muxErr) {
          console.warn(`[MUX-DELETE] ⚠️ Falha ao deletar asset no Mux (pode já estar deletado):`, muxErr.message);
        }

        if (productId) {
          await Product.findByIdAndUpdate(productId, {
            $pull: { videos: { asset_id: assetId } },
          });
          console.log(`[MUX-DELETE] ✅ Vídeo removido do produto ${productId}`);
        }

        return res.json({ success: true });
      } catch (err) {
        console.error('[MUX-DELETE] ❌ Erro:', err.message);
        return res.status(500).json({ error: 'Erro ao deletar vídeo' });
      }
    }

    // ==========================================
    // UPLOAD EXTERNO → BUNNY.NET (Anti-Hotlink)
    // ==========================================
    if (scope === 'upload-external' && method === 'POST') {
      const { urls } = req.body;
      if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ error: 'urls (array) é obrigatório' });
      }

      const normalizedUrls = [...new Set(
        urls
          .filter((u) => typeof u === 'string')
          .map((u) => u.trim())
          .filter(Boolean)
      )];
      if (normalizedUrls.length === 0) {
        return res.status(400).json({ error: 'Nenhuma URL válida enviada' });
      }

      const apiKey = process.env.BUNNY_API_KEY;
      const storageZone = process.env.BUNNY_STORAGE_ZONE;
      const pullZone = process.env.BUNNY_PULL_ZONE;
      if (!apiKey || !storageZone || !pullZone) {
        return res.status(400).json({ error: 'Variáveis Bunny.net não configuradas.' });
      }

      const MIME_TO_EXT = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'image/avif': '.avif',
      };

      async function uploadExternalImageToBunny(url) {
        if (!/^https?:\/\//i.test(url)) {
          return { original: url, new_url: null, error: 'URL inválida (não começa com http)' };
        }

        // Skip if already on our CDN
        if (url.includes(pullZone)) {
          return { original: url, new_url: url };
        }

        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch {
          return { original: url, new_url: null, error: 'URL malformada' };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
          const resp = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
              'Referer': `${parsedUrl.origin}/`,
            },
            redirect: 'follow',
          });
          if (!resp.ok) return { original: url, new_url: null, error: `Servidor retornou HTTP ${resp.status} (${resp.statusText || 'erro'})` };

          const contentType = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
          
          // Check if response is actually an image
          if (contentType && !contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
            return { original: url, new_url: null, error: `Tipo de conteúdo não é imagem: ${contentType}` };
          }
          
          const ext = MIME_TO_EXT[contentType] || '.webp';

          const buffer = Buffer.from(await resp.arrayBuffer());
          if (buffer.length < 100) return { original: url, new_url: null, error: `Arquivo muito pequeno (${buffer.length} bytes) — possivelmente corrompido` };

          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

          const uploadRes = await fetch(`https://br.storage.bunnycdn.com/${storageZone}/${fileName}`, {
            method: 'PUT',
            headers: { 'AccessKey': apiKey, 'Content-Type': 'application/octet-stream' },
            body: buffer,
          });

          if (!uploadRes.ok) {
            const errText = await uploadRes.text().catch(() => '');
            return { original: url, new_url: null, error: `Falha no upload para CDN (HTTP ${uploadRes.status}): ${errText.slice(0, 100)}` };
          }

          return { original: url, new_url: `https://${pullZone}/${fileName}` };
        } catch (err) {
          const msg = err.name === 'AbortError'
            ? 'Timeout: servidor de origem demorou mais de 8s para responder'
            : `Erro de rede: ${err.message}`;
          return { original: url, new_url: null, error: msg };
        } finally {
          clearTimeout(timeout);
        }
      }

      const BATCH_SIZE = 30;
      const mapped = [];
      for (let i = 0; i < normalizedUrls.length; i += BATCH_SIZE) {
        const batch = normalizedUrls.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(batch.map((u) => uploadExternalImageToBunny(u)));
        mapped.push(...results.map((r) => (r.status === 'fulfilled' ? r.value : { original: '', new_url: null })));
      }

      return res.json({ results: mapped });
    }

    return res.status(400).json({ error: `Scope "${scope}" inválido ou método não suportado` });
  } catch (err) {
    console.error('[MIDIA]', err);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
