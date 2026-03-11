// ============================================
// 📊 Pixel Helpers — Shared init & fire functions
// Used by both TrackingProvider (lojista) and SaaSPixelProvider (platform)
// ============================================

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    ttq: any;
    gtag: any;
    dataLayer: any[];
  }
}

export interface PixelInfo {
  platform: 'facebook' | 'tiktok' | 'google_ads' | 'gtm';
  pixel_id: string;
  access_token?: string;
  conversion_label?: string;
  is_active: boolean;
}

export interface PixelEventData {
  content_id?: string;
  content_name?: string;
  content_category?: string;
  value?: number;
  currency?: string;
  contents?: Array<{ id: string; quantity: number; price?: number }>;
  num_items?: number;
  [key: string]: any;
}

const initializedPixels = new Set<string>();

// ==================
// Facebook Pixel
// ==================
export function initFacebookPixel(pixelId: string) {
  const key = `fb_${pixelId}`;
  if (initializedPixels.has(key)) return;
  initializedPixels.add(key);

  if (!window.fbq) {
    const n: any = (window.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  }
  window.fbq('set', 'autoConfig', false, pixelId);
  window.fbq('init', pixelId);
  console.log(`📊 Facebook Pixel ${pixelId} initialized (autoConfig disabled)`);
}

// ==================
// TikTok Pixel
// ==================
export function initTikTokPixel(pixelId: string) {
  const key = `tt_${pixelId}`;
  if (initializedPixels.has(key)) return;
  initializedPixels.add(key);

  if (!window.ttq) {
    const ttq: any = (window.ttq = window.ttq || []);
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    ttq.setAndDefer = function (t: any, e: string) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
    for (let i = 0; i < ttq.methods.length; i++) { ttq.setAndDefer(ttq, ttq.methods[i]); }
    ttq.instance = function (t: string) { const e = ttq._i[t] || []; for (let n = 0; n < ttq.methods.length; n++) { ttq.setAndDefer(e, ttq.methods[n]); } return e; };
    ttq.load = function (e: string, n?: any) {
      const r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
      ttq._t = ttq._t || {}; ttq._t[e] = +new Date();
      ttq._o = ttq._o || {}; ttq._o[e] = n || {};
      const o = document.createElement('script'); o.type = 'text/javascript'; o.async = true;
      o.src = r + '?sdkid=' + e + '&lib=ttq'; document.head.appendChild(o);
    };
    ttq.load(pixelId);
    console.log(`📊 TikTok Pixel ${pixelId} initialized`);
  } else {
    window.ttq.load(pixelId);
    console.log(`📊 TikTok Pixel ${pixelId} initialized (additional)`);
  }
}

// ==================
// Google Ads (gtag.js)
// ==================
export function initGoogleAds(conversionId: string) {
  const key = `gads_${conversionId}`;
  if (initializedPixels.has(key)) return;
  initializedPixels.add(key);

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
    document.head.appendChild(script);
  }
  window.gtag('config', conversionId);
  console.log(`📊 Google Ads ${conversionId} initialized`);
}

// ==================
// Google Tag Manager
// ==================
export function initGTM(containerId: string) {
  const key = `gtm_${containerId}`;
  if (initializedPixels.has(key)) return;
  initializedPixels.add(key);

  window.dataLayer = window.dataLayer || [];

  (function (w: any, d: Document, s: string, l: string, i: string) {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const f = d.getElementsByTagName(s)[0];
    const j = d.createElement(s) as HTMLScriptElement;
    const dl = l !== 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f?.parentNode?.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', containerId);

  const noscript = document.createElement('noscript');
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`;
  iframe.height = '0'; iframe.width = '0';
  iframe.style.display = 'none'; iframe.style.visibility = 'hidden';
  noscript.appendChild(iframe);
  document.body.insertBefore(noscript, document.body.firstChild);

  console.log(`📊 GTM ${containerId} initialized`);
}

// ==================
// Event Dispatchers
// ==================
export function fireFacebookEvent(event: string, data?: PixelEventData) {
  if (window.fbq) {
    if (data) { window.fbq('track', event, data); } else { window.fbq('track', event); }
    console.log(`📊 FB Event: ${event}`, data || '');
  }
}

export function fireTikTokEvent(event: string, data?: PixelEventData) {
  if (window.ttq) {
    if (data) { window.ttq.track(event, data); } else { window.ttq.track(event); }
    console.log(`📊 TT Event: ${event}`, data || '');
  }
}

export function fireGoogleAdsEvent(pixels: PixelInfo[], event: string, data?: PixelEventData) {
  if (!window.gtag) return;
  const gadsPixels = pixels.filter(p => p.platform === 'google_ads');

  if (event === 'PageView') {
    window.gtag('event', 'page_view');
    console.log('📊 GAds Event: page_view');
  } else if (event === 'Purchase' && data) {
    for (const px of gadsPixels) {
      if (px.conversion_label) {
        window.gtag('event', 'conversion', {
          send_to: `${px.pixel_id}/${px.conversion_label}`,
          value: data.value || 0,
          currency: data.currency || 'BRL',
          transaction_id: data.content_id || '',
        });
        console.log(`📊 GAds Conversion: ${px.pixel_id}/${px.conversion_label}`, data);
      }
    }
  } else if (event === 'AddToCart' && data) {
    window.gtag('event', 'add_to_cart', {
      currency: data.currency || 'BRL',
      value: data.value || 0,
      items: data.contents?.map(c => ({ id: c.id, quantity: c.quantity })) || [],
    });
    console.log('📊 GAds Event: add_to_cart', data);
  } else if (event === 'ViewContent' && data) {
    window.gtag('event', 'view_item', {
      currency: data.currency || 'BRL',
      value: data.value || 0,
      items: [{ id: data.content_id, name: data.content_name }],
    });
    console.log('📊 GAds Event: view_item', data);
  } else if (event === 'InitiateCheckout' && data) {
    window.gtag('event', 'begin_checkout', {
      currency: data.currency || 'BRL',
      value: data.value || 0,
    });
    console.log('📊 GAds Event: begin_checkout', data);
  } else if (event === 'CompleteRegistration' && data) {
    for (const px of gadsPixels) {
      if (px.conversion_label) {
        window.gtag('event', 'conversion', {
          send_to: `${px.pixel_id}/${px.conversion_label}`,
        });
        console.log(`📊 GAds Conversion (Registration): ${px.pixel_id}/${px.conversion_label}`);
      }
    }
  } else if (event === 'Subscribe' && data) {
    for (const px of gadsPixels) {
      if (px.conversion_label) {
        window.gtag('event', 'conversion', {
          send_to: `${px.pixel_id}/${px.conversion_label}`,
          value: data.value || 0,
          currency: data.currency || 'BRL',
        });
        console.log(`📊 GAds Conversion (Subscribe): ${px.pixel_id}/${px.conversion_label}`, data);
      }
    }
  }
}

export function fireGTMEvent(event: string, data?: PixelEventData) {
  if (!window.dataLayer) return;
  const eventMap: Record<string, string> = {
    PageView: 'page_view',
    ViewContent: 'view_item',
    AddToCart: 'add_to_cart',
    InitiateCheckout: 'begin_checkout',
    AddPaymentInfo: 'add_payment_info',
    Purchase: 'purchase',
    CompleteRegistration: 'complete_registration',
    Subscribe: 'subscribe',
  };
  const gtmEvent = eventMap[event] || event;
  window.dataLayer.push({ event: gtmEvent, ecommerce: data || {} });
  console.log(`📊 GTM dataLayer: ${gtmEvent}`, data || '');
}

export function fireEvent(pixels: PixelInfo[], event: string, data?: PixelEventData) {
  const hasFb = pixels.some(p => p.platform === 'facebook');
  const hasTt = pixels.some(p => p.platform === 'tiktok');
  const hasGads = pixels.some(p => p.platform === 'google_ads');
  const hasGtm = pixels.some(p => p.platform === 'gtm');
  if (hasFb) fireFacebookEvent(event, data);
  if (hasTt) fireTikTokEvent(event, data);
  if (hasGads) fireGoogleAdsEvent(pixels, event, data);
  if (hasGtm) fireGTMEvent(event, data);
}

export function initPixel(pixel: PixelInfo) {
  if (pixel.platform === 'facebook') initFacebookPixel(pixel.pixel_id);
  else if (pixel.platform === 'tiktok') initTikTokPixel(pixel.pixel_id);
  else if (pixel.platform === 'google_ads') initGoogleAds(pixel.pixel_id);
  else if (pixel.platform === 'gtm') initGTM(pixel.pixel_id);
}
