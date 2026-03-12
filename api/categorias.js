// ============================================
// 📂 API: Categorias (CRUD) - Multi-Tenant
// ============================================

const connectDB = require('../lib/mongodb.js');
const Category = require('../models/Category.js');
const Product = require('../models/Product.js');
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

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  await connectDB();
  const lojista = requireLojista(req);
  if (!lojista) return res.status(401).json({ error: 'Não autorizado' });

  const { id, loja_id, action } = req.query;

  // Validar ownership da loja
  async function validateLoja(lojaId) {
    const loja = await Loja.findOne({ _id: lojaId, lojista_id: lojista.lojista_id });
    return !!loja;
  }

  // GET - listar categorias da loja
  if (req.method === 'GET') {
    if (!loja_id) return res.status(400).json({ error: 'loja_id é obrigatório' });
    const valid = await validateLoja(loja_id);
    if (!valid) return res.status(403).json({ error: 'Loja não pertence a este lojista' });

    const cats = await Category.find({ loja_id }).sort({ ordem: 1 }).lean();
    // Count products per category
    const catIds = cats.map(c => c._id);
    const lojaObjId = require('mongoose').Types.ObjectId.createFromHexString(loja_id);
    
    // Count products per category using both category_id and category_ids
    const counts = await Product.aggregate([
      { $match: { loja_id: lojaObjId, $or: [{ category_id: { $in: catIds } }, { category_ids: { $elemMatch: { $in: catIds } } }] } },
      { $addFields: {
        _all_cats: {
          $setUnion: [
            { $cond: [{ $ifNull: ['$category_id', false] }, ['$category_id'], []] },
            { $cond: [{ $isArray: '$category_ids' }, '$category_ids', []] },
          ]
        }
      }},
      { $unwind: '$_all_cats' },
      { $match: { _all_cats: { $in: catIds } } },
      { $group: { _id: '$_all_cats', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const uncategorized = await Product.countDocuments({ loja_id, category_id: null, $or: [{ category_ids: { $exists: false } }, { category_ids: { $size: 0 } }] });

    const result = cats.map(c => ({ ...c, qtd_produtos: countMap[c._id.toString()] || 0 }));
    return res.status(200).json({ categories: result, uncategorized_count: uncategorized });
  }

  // POST - criar categoria
  if (req.method === 'POST') {
    const { nome, loja_id: bodyLojaId, parent_id } = req.body;
    const targetLoja = bodyLojaId || loja_id;
    if (!nome || !targetLoja) return res.status(400).json({ error: 'nome e loja_id são obrigatórios' });

    const valid = await validateLoja(targetLoja);
    if (!valid) return res.status(403).json({ error: 'Loja não pertence a este lojista' });

    let slug = slugify(nome);
    const existing = await Category.findOne({ loja_id: targetLoja, slug });
    if (existing) slug = slug + '-' + Date.now().toString(36);

    const maxOrdem = await Category.findOne({ loja_id: targetLoja }).sort({ ordem: -1 });
    const ordem = maxOrdem ? maxOrdem.ordem + 1 : 0;

    const cat = await Category.create({ loja_id: targetLoja, nome, slug, parent_id: parent_id || null, ordem });
    return res.status(201).json(cat);
  }

  // PUT - atualizar
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada' });
    const valid = await validateLoja(cat.loja_id.toString());
    if (!valid) return res.status(403).json({ error: 'Sem permissão' });

    const { nome, slug: newSlug, ordem: newOrdem, banner } = req.body;
    if (nome) {
      cat.nome = nome;
      cat.slug = newSlug || slugify(nome);
    } else if (newSlug) {
      cat.slug = newSlug;
    }
    if (newOrdem !== undefined) cat.ordem = newOrdem;
    if (banner !== undefined) {
      cat.banner = banner;
      cat.markModified('banner');
    }
    await cat.save();
    return res.status(200).json(cat);
  }

  // DELETE - deletar
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'ID é obrigatório' });
    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ error: 'Categoria não encontrada' });
    const valid = await validateLoja(cat.loja_id.toString());
    if (!valid) return res.status(403).json({ error: 'Sem permissão' });

    // Move products to uncategorized
    const moved = await Product.updateMany({ category_id: cat._id }, { $set: { category_id: null } });
    // Move subcategories to uncategorized
    await Category.updateMany({ parent_id: cat._id }, { $set: { parent_id: null } });
    await Category.findByIdAndDelete(id);
    return res.status(200).json({ success: true, produtos_movidos: moved.modifiedCount });
  }

  // PATCH - reorder + bulk-update-products
  if (req.method === 'PATCH') {
    if (action === 'reorder') {
      const { items } = req.body; // [{ id, ordem }]
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items é obrigatório' });
      const ops = items.map(i => ({
        updateOne: { filter: { _id: i.id }, update: { $set: { ordem: i.ordem } } },
      }));
      await Category.bulkWrite(ops);
      return res.status(200).json({ success: true });
    }

    if (action === 'bulk-update-products') {
      const { products } = req.body; // [{ id, category_id, sort_order }]
      if (!products || !Array.isArray(products)) return res.status(400).json({ error: 'products é obrigatório' });
      const ops = products.map(p => ({
        updateOne: {
          filter: { _id: p.id },
          update: { $set: { category_id: p.category_id ?? null, sort_order: p.sort_order ?? 0 } },
        },
      }));
      await Product.bulkWrite(ops);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Ação não reconhecida' });
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
