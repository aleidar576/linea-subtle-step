const mongoose = require('mongoose');

const HeroSchema = new mongoose.Schema({
  titulo: { type: String, default: '' },
  subtitulo: { type: String, default: '' },
  ctaTexto: { type: String, default: '' },
  bottomTexto: { type: String, default: '' },
  imagemUrl: { type: String, default: '' },
}, { _id: false });

const ZPatternBlockSchema = new mongoose.Schema({
  titulo: { type: String, default: '' },
  descricao: { type: String, default: '' },
  imagemUrl: { type: String, default: '' },
  alinhamentoImagem: { type: String, enum: ['esquerda', 'direita'], default: 'direita' },
}, { _id: false });

const MiniFeatureSchema = new mongoose.Schema({
  iconeNome: { type: String, default: '' },
  titulo: { type: String, default: '' },
  descricao: { type: String, default: '' },
}, { _id: false });

const FAQItemSchema = new mongoose.Schema({
  pergunta: { type: String, default: '' },
  resposta: { type: String, default: '' },
}, { _id: false });

const LandingPageCMSSchema = new mongoose.Schema({
  hero: { type: HeroSchema, default: () => ({}) },
  zPatternBlocks: { type: [ZPatternBlockSchema], default: [] },
  miniFeatures: { type: [MiniFeatureSchema], default: [] },
  integrations: { type: [String], default: [] },
  faq: { type: [FAQItemSchema], default: [] },
}, { timestamps: true });

LandingPageCMSSchema.statics.getSingleton = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.models.LandingPageCMS || mongoose.model('LandingPageCMS', LandingPageCMSSchema);
