// ============================================
// 📊 SaaS Pixel Provider — Platform-level tracking
// Isolated from lojista pixels. Active ONLY on institutional routes.
// ============================================

import { useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { trackingPixelsApi } from '@/services/api';
import { initPixel, fireEvent, type PixelInfo, type PixelEventData } from '@/lib/pixel-helpers';

// Whitelist of institutional routes where SaaS pixels are active
const INSTITUTIONAL_ROUTES = ['/', '/registro', '/login', '/verificar-email', '/redefinir-senha', '/seguranca-confirmacao'];
// Also activate on subscription success callback (Stripe redirect)
const PARAM_ACTIVATION = { path: '/painel/assinatura', param: 'success' };

function isInstitutionalRoute(pathname: string, search: string): boolean {
  if (INSTITUTIONAL_ROUTES.includes(pathname)) return true;
  // Activate on Stripe checkout return
  if (pathname === PARAM_ACTIVATION.path && new URLSearchParams(search).has(PARAM_ACTIVATION.param)) return true;
  return false;
}

interface SaaSPixelContextType {
  trackSaaSEvent: (event: string, data?: PixelEventData) => void;
}

const SaaSPixelContext = createContext<SaaSPixelContextType | undefined>(undefined);

export function SaaSPixelProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const lastPageView = useRef('');
  const isActive = isInstitutionalRoute(location.pathname, location.search);

  const { data: pixels = [] } = useQuery({
    queryKey: ['saas-pixels'],
    queryFn: async () => {
      const data = await trackingPixelsApi.listActive();
      return data as PixelInfo[];
    },
    staleTime: 10 * 60 * 1000,
    enabled: isActive,
  });

  // Initialize pixels only on institutional routes
  useEffect(() => {
    if (!isActive || pixels.length === 0) return;
    pixels.forEach(initPixel);
  }, [pixels, isActive]);

  // Auto PageView on institutional route change
  useEffect(() => {
    if (!isActive || pixels.length === 0) return;
    const path = location.pathname + location.search;
    if (lastPageView.current === path) return;
    lastPageView.current = path;
    fireEvent(pixels, 'PageView');
    console.log('📊 [SaaS] PageView fired on', location.pathname);
  }, [location.pathname, location.search, pixels, isActive]);

  const trackSaaSEvent = useCallback((event: string, data?: PixelEventData) => {
    if (pixels.length === 0) return;
    fireEvent(pixels, event, data);
    console.log(`📊 [SaaS] Event: ${event}`, data || '');
  }, [pixels]);

  return (
    <SaaSPixelContext.Provider value={{ trackSaaSEvent }}>
      {children}
    </SaaSPixelContext.Provider>
  );
}

export function useSaaSPixels() {
  const ctx = useContext(SaaSPixelContext);
  if (!ctx) throw new Error('useSaaSPixels must be used within SaaSPixelProvider');
  return ctx;
}
