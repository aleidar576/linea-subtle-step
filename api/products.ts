import { VercelRequest, VercelResponse } from '@vercel/node';

const connectDB = require('../lib/mongodb.js');
const Product = require('../models/Product.js');
const Loja = require('../models/Loja.js');
const authPkg = require('../lib/auth.js');

const { requireAdmin, verifyToken, getTokenFromHeader } = authPkg;

function requireLojista(req: VercelRequest) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'lojista') return null;
  return decoded;
}

function slugify(str: string): string {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();

  const { id, slug, scope, loja_id } = req.query as Record<string, string | undefined>;

  // ── GET ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      // PUBLIC: Lista produtos de uma loja (sem auth)
      if (scope === 'loja-publica' && loja_id) {
        const products = await Product.find({ loja_id, is_active: true }).sort({ sort_order: 1 }).lean();
        return res.status(200).json(products);
      }

      // PUBLIC: Produto por slug de loja (sem auth)
      if (scope === 'produto-publico' && loja_id && slug) {
        const product = await Product.findOne({ loja_id, slug, is_active: true }).lean();
        if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
        return res.status(200).json(product);
      }

      // GET ?slug=xxx → busca por slug (público)
      if (slug) {
        const product = await Product.findOne({ slug, is_active: true }).lean();
        if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
        return res.status(200).json(product);
      }

      // GET ?id=xxx → busca por ID
      if (id) {
        const product = await Product.findById(id).lean();
        if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
        return res.status(200).json(product);
      }

      // GET ?loja_id=xxx → lista produtos da loja (lojista autenticado)
      if (loja_id) {
        const lojista = requireLojista(req);
        if (!lojista) return res.status(401).json({ error: 'Não autorizado' });
        const loja = await Loja.findOne({ _id: loja_id, lojista_id: lojista.lojista_id });
        if (!loja) return res.status(403).json({ error: 'Loja não pertence a este lojista' });
        const products = await Product.find({ loja_id }).sort({ sort_order: 1 }).lean();
        return res.status(200).json(products);
      }

      // GET ?scope=all → lista TODOS (admin)
      if (scope === 'all') {
        const admin = requireAdmin(req);
        if (!admin) return res.status(401).json({ error: 'Não autorizado' });
        const products = await Product.find().sort({ sort_order: 1 }).lean();
        return res.status(200).json(products);
      }

      // GET sem params → lista ativos (público)
      const products = await Product.find({ is_active: true }).sort({ sort_order: 1 }).lean();
      return res.status(200).json(products);
    } catch (error) {
      console.error('Erro no GET /products:', error);
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
  }

  // ── Detectar auth (admin OU lojista) ─────────────────
  const admin = requireAdmin(req);
  const lojista = !admin ? requireLojista(req) : null;
  if (!admin && !lojista) return res.status(401).json({ error: 'Não autorizado' });

  // Helper: validar ownership para lojista
  async function validateOwnership(productId: string) {
    if (admin) return true;
    const product = await Product.findById(productId).lean();
    if (!product || !product.loja_id) return false;
    const loja = await Loja.findOne({ _id: product.loja_id, lojista_id: lojista.lojista_id });
    return !!loja;
  }

  // POST → criar produto
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const targetLojaId = body.loja_id;

      // Lojista: validar ownership da loja
      if (lojista && targetLojaId) {
        const loja = await Loja.findOne({ _id: targetLojaId, lojista_id: lojista.lojista_id });
        if (!loja) return res.status(403).json({ error: 'Loja não pertence a este lojista' });
      }

      // Regra: max 2 produtos com mesmo nome na mesma loja
      if (targetLojaId && body.name) {
        const sameNameCount = await Product.countDocuments({ loja_id: targetLojaId, name: body.name });
        if (sameNameCount >= 2) {
          return res.status(409).json({ error: 'Já existem 2 produtos com este nome nesta loja. Máximo permitido: 2.' });
        }
      }

      // Auto-gerar slug
      let autoSlug = slugify(body.name || 'produto');
      const existingSlug = await Product.findOne({ slug: autoSlug });
      if (existingSlug) autoSlug = autoSlug + '-' + Date.now().toString(36);
      body.slug = autoSlug;

      // Auto-gerar product_id
      if (!body.product_id) {
        body.product_id = autoSlug + '-' + Date.now().toString(36);
      }

      // Auto sort_order: última posição da categoria
      const catFilter = body.category_id
        ? { loja_id: targetLojaId, category_id: body.category_id }
        : { loja_id: targetLojaId, category_id: null };
      const maxSortDoc = await Product.findOne(catFilter).sort({ sort_order: -1 }).select('sort_order').lean();
      body.sort_order = ((maxSortDoc as any)?.sort_order ?? -1) + 1;

      const product = await Product.create(body);
      return res.status(201).json(product);
    } catch (error) {
      console.error('Erro no POST /products:', error);
      return res.status(500).json({ error: 'Erro ao salvar no banco' });
    }
  }

  // PUT ?id=xxx → atualizar produto
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const hasAccess = await validateOwnership(id);
    if (!hasAccess) return res.status(403).json({ error: 'Sem permissão' });
    try {
      // Verificar troca de categoria → recalcular sort_order
      const existing = await Product.findById(id).select('category_id loja_id').lean();
      if (existing && req.body.category_id !== undefined) {
        const oldCat = (existing as any).category_id?.toString() || null;
        const newCat = req.body.category_id || null;
        if (oldCat !== newCat) {
          const catFilter = newCat
            ? { loja_id: (existing as any).loja_id, category_id: newCat }
            : { loja_id: (existing as any).loja_id, category_id: null };
          const maxSortDoc = await Product.findOne(catFilter).sort({ sort_order: -1 }).select('sort_order').lean();
          req.body.sort_order = ((maxSortDoc as any)?.sort_order ?? -1) + 1;
        }
      }

      const product = await Product.findByIdAndUpdate(id, req.body, { new: true }).lean();
      if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
      return res.status(200).json(product);
    } catch (error) {
      console.error('Erro no PUT /products:', error);
      return res.status(500).json({ error: 'Erro ao atualizar' });
    }
  }

  // DELETE ?id=xxx → deletar produto
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const hasAccess = await validateOwnership(id);
    if (!hasAccess) return res.status(403).json({ error: 'Sem permissão' });
    try {
      await Product.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Erro no DELETE /products:', error);
      return res.status(500).json({ error: 'Erro ao deletar' });
    }
  }

  // PATCH ?id=xxx → toggle ativo/inativo
  if (req.method === 'PATCH') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const hasAccess = await validateOwnership(id);
    if (!hasAccess) return res.status(403).json({ error: 'Sem permissão' });
    try {
      const { is_active } = req.body;
      const product = await Product.findByIdAndUpdate(id, { is_active }, { new: true });
      if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
      return res.status(200).json({ success: true, is_active: product.is_active });
    } catch (error) {
      console.error('Erro no PATCH /products:', error);
      return res.status(500).json({ error: 'Erro ao alternar status do produto' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
