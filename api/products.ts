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

      // PUBLIC: Produtos de uma categoria por slug (paginado + server-side filters)
      if (scope === 'categoria-publica' && loja_id) {
        const Category = require('../models/Category.js');
        const { category_slug, sort: sortParam, price_min, price_max, variations: variationsParam, subcategory_ids: subcatParam, page: pageParam, limit: limitParam } = req.query as Record<string, string | undefined>;
        if (!category_slug) return res.status(400).json({ error: 'category_slug é obrigatório' });

        const category = await Category.findOne({ loja_id, slug: category_slug, is_active: true }).lean();
        if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });

        const subcategories = await Category.find({ loja_id, parent_id: category._id, is_active: true }).sort({ ordem: 1 }).lean();

        // Determine which category IDs to filter by
        let filterCatIds: any[];
        if (subcatParam) {
          // Server-side subcategory filter: only use the requested subcategory IDs (validated against real subcats)
          const validSubIds = new Set(subcategories.map((s: any) => s._id.toString()));
          const requestedIds = subcatParam.split(',').filter((id: string) => validSubIds.has(id));
          filterCatIds = requestedIds.length > 0
            ? requestedIds.map((id: string) => new (require('mongoose')).Types.ObjectId(id))
            : [category._id, ...subcategories.map((s: any) => s._id)];
        } else {
          filterCatIds = [category._id, ...subcategories.map((s: any) => s._id)];
        }

        const filter: any = {
          loja_id,
          is_active: true,
          $or: [
            { category_id: { $in: filterCatIds } },
            { category_ids: { $in: filterCatIds } },
          ],
        };

        if (price_min) filter.price = { ...filter.price, $gte: Number(price_min) };
        if (price_max) filter.price = { ...filter.price, $lte: Number(price_max) };
        if (variationsParam) {
          const vars = variationsParam.split(',').map(v => v.trim()).filter(Boolean);
          if (vars.length > 0) {
            filter['variacoes.nome'] = { $in: vars };
          }
        }

        // Pagination with anti-scraping limit
        const limit = Math.min(Number(limitParam) || 24, 48);
        const page = Math.max(Number(pageParam) || 1, 1);
        const skip = (page - 1) * limit;

        // Projection: only card fields
        const cardFields = 'product_id slug name image price original_price promotion rating rating_count variacoes sort_order vendas_count category_id category_ids is_active createdAt';

        let sortObj: any = { sort_order: 1 };
        switch (sortParam) {
          case 'vendidos': sortObj = { vendas_count: -1 }; break;
          case 'recentes': sortObj = { createdAt: -1 }; break;
          case 'menor_preco': sortObj = { price: 1 }; break;
          case 'maior_preco': sortObj = { price: -1 }; break;
        }

        // Discount sort: use aggregation pipeline (never sort in memory)
        if (sortParam === 'desconto') {
          const cardProject = {
            product_id: 1, slug: 1, name: 1, image: 1, price: 1, original_price: 1,
            promotion: 1, rating: 1, rating_count: 1, variacoes: 1, sort_order: 1,
            vendas_count: 1, category_id: 1, category_ids: 1, is_active: 1, createdAt: 1,
          };
          const pipeline: any[] = [
            { $match: filter },
            { $addFields: {
              desconto_calc: {
                $cond: [
                  { $and: [{ $gt: ['$original_price', 0] }, { $gt: ['$original_price', '$price'] }] },
                  { $subtract: ['$original_price', '$price'] },
                  0,
                ],
              },
            }},
            { $sort: { desconto_calc: -1 } },
            { $skip: skip },
            { $limit: limit },
            { $project: { ...cardProject, desconto_calc: 0 } },
          ];
          const [products, total] = await Promise.all([
            Product.aggregate(pipeline),
            Product.countDocuments(filter),
          ]);
          return res.status(200).json({ category, products, subcategories, total, page, totalPages: Math.ceil(total / limit) });
        }

        // Standard sort: find with projection + pagination
        const [products, total] = await Promise.all([
          Product.find(filter).select(cardFields).sort(sortObj).skip(skip).limit(limit).lean(),
          Product.countDocuments(filter),
        ]);

        return res.status(200).json({ category, products, subcategories, total, page, totalPages: Math.ceil(total / limit) });
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

      // Auto-gerar codigo_interno sequencial por loja
      delete body.codigo_interno; // nunca aceitar do cliente
      if (targetLojaId) {
        const maxCodigoDoc = await Product.findOne({ loja_id: targetLojaId }).sort({ codigo_interno: -1 }).select('codigo_interno').lean();
        body.codigo_interno = ((maxCodigoDoc as any)?.codigo_interno ?? 0) + 1;
      }

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

  // DELETE bulk (scope=bulk)
  if (req.method === 'DELETE' && scope === 'bulk') {
    try {
      const { ids, loja_id: bodyLojaId } = req.body || {};
      if (!Array.isArray(ids) || !ids.length || !bodyLojaId) {
        return res.status(400).json({ error: 'ids[] e loja_id são obrigatórios' });
      }
      if (lojista) {
        const loja = await Loja.findOne({ _id: bodyLojaId, lojista_id: lojista.lojista_id });
        if (!loja) return res.status(403).json({ error: 'Sem permissão' });
      }
      const result = await Product.deleteMany({ _id: { $in: ids }, loja_id: bodyLojaId });
      return res.status(200).json({ success: true, deleted: result.deletedCount });
    } catch (error) {
      console.error('Erro no DELETE bulk /products:', error);
      return res.status(500).json({ error: 'Erro ao excluir em lote' });
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

  // PATCH bulk (scope=bulk)
  if (req.method === 'PATCH' && scope === 'bulk') {
    try {
      const { ids, loja_id: bodyLojaId, is_active } = req.body || {};
      if (!Array.isArray(ids) || !ids.length || !bodyLojaId || typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'ids[], loja_id e is_active são obrigatórios' });
      }
      if (lojista) {
        const loja = await Loja.findOne({ _id: bodyLojaId, lojista_id: lojista.lojista_id });
        if (!loja) return res.status(403).json({ error: 'Sem permissão' });
      }
      const result = await Product.updateMany(
        { _id: { $in: ids }, loja_id: bodyLojaId },
        { $set: { is_active } }
      );
      return res.status(200).json({ success: true, modified: result.modifiedCount });
    } catch (error) {
      console.error('Erro no PATCH bulk /products:', error);
      return res.status(500).json({ error: 'Erro ao atualizar em lote' });
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
