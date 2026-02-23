// ============================================
// 📊 TrackingPixel Model (Mongoose) - Multi-Tenant
// ============================================

const mongoose = require('mongoose');

const TrackingPixelSchema = new mongoose.Schema({
  platform: { type: String, enum: ['facebook', 'tiktok', 'google_ads', 'gtm'], required: true },
  pixel_id: { type: String, required: true },
  access_token: { type: String, default: '' },
  loja_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loja', index: true, default: null },
  events: { type: [String], default: ['PageView'] },
  trigger_pages: { type: [String], default: ['all'] },
  trigger_product_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: [] }],
  conversion_label: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.TrackingPixel || mongoose.model('TrackingPixel', TrackingPixelSchema);
