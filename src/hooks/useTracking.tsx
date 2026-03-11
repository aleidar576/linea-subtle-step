import { useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trackingPixelsApi, settingsApi } from '@/services/api';
import { initPixel, fireEvent, type PixelInfo, type PixelEventData } from '@/lib/pixel-helpers';

// ============================================
// 📊 TRACKING ENGINE - Lojista Pixels (storefront)
// Uses shared helpers from pixel-helpers.ts
// ============================================

interface TrackingContextType {
  trackPageView: () => void;
  trackViewContent: (data: PixelEventData) => void;
  trackAddToCart: (data: PixelEventData) => void;
  trackInitiateCheckout: (data: PixelEventData) => void;
  trackAddPaymentInfo: (data: PixelEventData) => void;
  trackPurchase: (data: PixelEventData) => void;
  pixels: PixelInfo[];
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

// Routes where lojista pixels should NOT be loaded (internal panels)
function isInternalRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') || pathname.startsWith('/painel');
}

export function TrackingProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const lastPageView = useRef('');
  const isInternal = isInternalRoute(location.pathname);

  const { data: pixels = [] } = useQuery({
    queryKey: ['tracking-pixels'],
    queryFn: async () => {
      const data = await trackingPixelsApi.listActive();
      return data as PixelInfo[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !isInternal, // Don't fetch pixels on admin/painel routes
  });

  const { data: headScripts } = useQuery({
    queryKey: ['global-head-scripts'],
    queryFn: async () => {
      const data = await settingsApi.getByKeys(['global_head_scripts']);
      return data[0]?.value || '';
    },
    staleTime: 5 * 60 * 1000,
    enabled: !isInternal,
  });

  // Inject UTMFY / global head scripts (only on public routes)
  useEffect(() => {
    if (!headScripts || isInternal) return;
    const container = document.createElement('div');
    container.id = 'global-head-scripts';
    const old = document.getElementById('global-head-scripts');
    if (old) old.remove();
    const temp = document.createElement('div');
    temp.innerHTML = headScripts;
    const scripts = temp.querySelectorAll('script');
    scripts.forEach(script => {
      const newScript = document.createElement('script');
      Array.from(script.attributes).forEach(attr => { newScript.setAttribute(attr.name, attr.value); });
      if (script.textContent) newScript.textContent = script.textContent;
      container.appendChild(newScript);
    });
    const nonScripts = temp.querySelectorAll(':not(script)');
    nonScripts.forEach(el => { container.appendChild(el.cloneNode(true)); });
    document.head.appendChild(container);
    return () => { const el = document.getElementById('global-head-scripts'); if (el) el.remove(); };
  }, [headScripts]);

  // Initialize all pixel platforms (only on public routes)
  useEffect(() => {
    if (isInternal) return;
    pixels.forEach(pixel => {
      if (pixel.platform === 'facebook') initFacebookPixel(pixel.pixel_id);
      else if (pixel.platform === 'tiktok') initTikTokPixel(pixel.pixel_id);
      else if (pixel.platform === 'google_ads') initGoogleAds(pixel.pixel_id);
      else if (pixel.platform === 'gtm') initGTM(pixel.pixel_id);
    });
  }, [pixels, isInternal]);

  // Auto PageView on route change (only on public routes)
  useEffect(() => {
    if (pixels.length === 0 || isInternal) return;
    const path = location.pathname + location.search;
    if (lastPageView.current === path) return;
    lastPageView.current = path;
    fireEvent(pixels, 'PageView');
  }, [location.pathname, location.search, pixels]);

  const trackPageView = useCallback(() => { fireEvent(pixels, 'PageView'); }, [pixels]);
  const trackViewContent = useCallback((data: TrackingEventData) => { fireEvent(pixels, 'ViewContent', data); }, [pixels]);
  const trackAddToCart = useCallback((data: TrackingEventData) => { fireEvent(pixels, 'AddToCart', data); }, [pixels]);
  const trackInitiateCheckout = useCallback((data: TrackingEventData) => { fireEvent(pixels, 'InitiateCheckout', data); }, [pixels]);
  const trackAddPaymentInfo = useCallback((data: TrackingEventData) => { fireEvent(pixels, 'AddPaymentInfo', data); }, [pixels]);
  const trackPurchase = useCallback((data: TrackingEventData) => { fireEvent(pixels, 'Purchase', data); }, [pixels]);

  return (
    <TrackingContext.Provider value={{
      trackPageView, trackViewContent, trackAddToCart, trackInitiateCheckout,
      trackAddPaymentInfo, trackPurchase, pixels,
    }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function useTracking() {
  const ctx = useContext(TrackingContext);
  if (!ctx) throw new Error('useTracking must be used within TrackingProvider');
  return ctx;
}
