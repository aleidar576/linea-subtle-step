// ============================================
// 📂 API: Categorias (CRUD) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');
const connectDB = require('../lib/mongodb.js');
const Category = require('../models/Category.js');
const Product = require('../models/Product.js');
const Loja = require('../models/Loja.js');
const authPkg = require('../lib/auth.js');
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
    const mongoose = require('mongoose');
    const lojaObjId = mongoose.Types.ObjectId.createFromHexString(loja_id);
    
    // Count products per category using both category_id and category_ids
    // Handle legacy data where category_id might be stored as string
    const catIdStrings = catIds.map(id => id.toString());
    const allCatVariants = [...catIds, ...catIdStrings];
    
    const counts = await Product.aggregate([
      { $match: { loja_id: lojaObjId, $or: [{ category_id: { $in: allCatVariants } }, { category_ids: { $elemMatch: { $in: allCatVariants } } }] } },
      { $addFields: {
        _all_cats: {
          $setUnion: [
            { $cond: [{ $ifNull: ['$category_id', false] }, ['$category_id'], []] },
            { $cond: [{ $isArray: '$category_ids' }, '$category_ids', []] },
          ]
        }
      }},
      { $unwind: '$_all_cats' },
      { $group: { _id: { $toString: '$_all_cats' }, count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id] = c.count; });

    // Count uncategorized: no category_id AND (no category_ids OR empty)
    const uncategorized = await Product.countDocuments({
      loja_id: lojaObjId,
      $or: [{ category_id: null }, { category_id: { $exists: false } }],
      $and: [{ $or: [{ category_ids: { $exists: false } }, { category_ids: { $size: 0 } }] }],
    });

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

    const mongoose = require('mongoose');
    const catObjId = new mongoose.Types.ObjectId(id);
    const catStr = id.toString();

    // Remove category from products - handle both ObjectId and string in category_id
    const moved = await Product.updateMany(
      { $or: [
        { category_id: catObjId },
        { category_id: catStr },
        { category_ids: catObjId },
        { category_ids: catStr },
      ]},
      {
        $pull: { category_ids: { $in: [catObjId, catStr] } },
      }
    );

    // Now fix category_id: set to null where it matches, then re-sync from category_ids
    await Product.updateMany(
      { $or: [{ category_id: catObjId }, { category_id: catStr }] },
      { $set: { category_id: null } }
    );

    // Sync category_id from remaining category_ids (where category_id is now null but array has items)
    await Product.updateMany(
      { category_id: null, 'category_ids.0': { $exists: true } },
      [{ $set: { category_id: { $arrayElemAt: ['$category_ids', 0] } } }]
    );

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
      const { products, mode } = req.body;
      // mode: 'add-to-category' | 'remove-from-category' | 'reorder' (legacy: undefined = replace)
      if (!products || !Array.isArray(products)) return res.status(400).json({ error: 'products é obrigatório' });

      if (mode === 'add-to-category') {
        // Add category to category_ids array (multi-category)
        const ops = [];
        for (const p of products) {
          if (!p.id || !p.category_id) continue;
          ops.push({
            updateOne: {
              filter: { _id: p.id },
              update: {
                $addToSet: { category_ids: new mongoose.Types.ObjectId(p.category_id) },
                $set: { sort_order: p.sort_order ?? 0 },
              },
            },
          });
        }
        if (ops.length > 0) await Product.bulkWrite(ops);

        // Sync legacy category_id with first element of category_ids
        for (const p of products) {
          if (!p.id) continue;
          const prod = await Product.findById(p.id).select('category_ids').lean();
          if (prod && Array.isArray(prod.category_ids) && prod.category_ids.length > 0) {
            await Product.updateOne({ _id: p.id }, { $set: { category_id: prod.category_ids[0] } });
          }
        }

        return res.status(200).json({ success: true });
      }

      if (mode === 'remove-from-category') {
        // Remove category from category_ids array
        for (const p of products) {
          if (!p.id || !p.category_id) continue;
          const catObjId = new mongoose.Types.ObjectId(p.category_id);
          await Product.updateOne(
            { _id: p.id },
            { $pull: { category_ids: catObjId } }
          );
          // Re-sync legacy category_id
          const prod = await Product.findById(p.id).select('category_ids').lean();
          if (prod) {
            const newPrimary = (Array.isArray(prod.category_ids) && prod.category_ids.length > 0)
              ? prod.category_ids[0]
              : null;
            await Product.updateOne({ _id: p.id }, { $set: { category_id: newPrimary } });
          }
        }
        return res.status(200).json({ success: true });
      }

      // Legacy / reorder mode: update category_id + sort_order directly
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
