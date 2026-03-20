const connectDB = require('../lib/mongodb');
const { requireAdmin } = require('../lib/auth');
const LandingPageCMS = require('../models/LandingPageCMS');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  await connectDB();

  // GET — público (será consumido pela landing page)
  if (req.method === 'GET') {
    try {
      const doc = await LandingPageCMS.getSingleton();
      return res.status(200).json(doc);
    } catch (err) {
      console.error('[landing-cms] GET error:', err);
      return res.status(500).json({ error: 'Erro ao buscar dados do CMS.' });
    }
  }

  // PUT — admin only
  if (req.method === 'PUT') {
    const admin = requireAdmin(req);
    if (!admin) return res.status(401).json({ error: 'Não autorizado.' });

    try {
      const { hero, zPatternBlocks, miniFeatures, integrations, faq, sobre, contato, legal } = req.body;
      const doc = await LandingPageCMS.findOneAndUpdate(
        {},
        { hero, zPatternBlocks, miniFeatures, integrations, faq, sobre, contato, legal },
        { upsert: true, new: true, runValidators: true }
      );
      return res.status(200).json(doc);
    } catch (err) {
      console.error('[landing-cms] PUT error:', err);
      return res.status(500).json({ error: 'Erro ao salvar dados do CMS.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
