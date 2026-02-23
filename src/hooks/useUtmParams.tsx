import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// ============================================
// 🔗 HOOK PARA PERSISTIR PARÂMETROS UTM
// ============================================
// Este hook salva todos os parâmetros UTM na sessão
// e os mantém em todas as navegações do site

const UTM_KEYS = [
  'utm_source',
  'utm_medium', 
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'ttclid',
  'src',
  'ref',
];

const STORAGE_KEY = 'utm_params';

// Extrai UTMs da URL atual
function extractUtmFromUrl(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const utmParams: Record<string, string> = {};
  
  UTM_KEYS.forEach(key => {
    const value = params.get(key);
    if (value) {
      utmParams[key] = value;
    }
  });
  
  // Captura qualquer outro parâmetro que comece com utm_
  params.forEach((value, key) => {
    if (key.startsWith('utm_') && value) {
      utmParams[key] = value;
    }
  });
  
  return utmParams;
}

// Pega UTMs salvos do sessionStorage (e garante captura imediata da URL atual)
export const getSavedUtmParams = (): Record<string, string> => {
  try {
    const savedRaw = sessionStorage.getItem(STORAGE_KEY);
    const saved: Record<string, string> = savedRaw ? JSON.parse(savedRaw) : {};

    // 🔥 Importante: captura sincrona dos UTMs presentes AGORA na URL.
    // Isso evita o caso do usuário clicar rápido antes do useEffect rodar.
    const currentUrlUtms = extractUtmFromUrl(window.location.search);
    if (Object.keys(currentUrlUtms).length === 0) return saved;

    const merged = { ...saved, ...currentUrlUtms };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return {};
  }
};

// Salva UTMs no sessionStorage
const saveUtmParams = (params: Record<string, string>) => {
  try {
    const existing = getSavedUtmParams();
    const merged = { ...existing, ...params };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    console.warn('Erro ao salvar UTMs');
  }
};

// Adiciona UTMs a uma URL
export const appendUtmToUrl = (url: string): string => {
  const savedUtms = getSavedUtmParams();
  if (Object.keys(savedUtms).length === 0) return url;
  
  const [basePath, existingQuery] = url.split('?');
  const params = new URLSearchParams(existingQuery || '');
  
  Object.entries(savedUtms).forEach(([key, value]) => {
    if (!params.has(key)) {
      params.set(key, value);
    }
  });
  
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
};

// Hook principal
export const useUtmParams = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Captura e salva UTMs quando a página carrega
  useEffect(() => {
    const urlUtms = extractUtmFromUrl(location.search);
    
    if (Object.keys(urlUtms).length > 0) {
      saveUtmParams(urlUtms);
      console.log('📊 UTMs capturados:', urlUtms);
    }
  }, [location.search]);

  // Navegação que preserva UTMs
  const navigateWithUtm = useCallback((to: string) => {
    const urlWithUtm = appendUtmToUrl(to);
    navigate(urlWithUtm);
  }, [navigate]);

  // Retorna UTMs para uso no checkout
  const getUtmForApi = useCallback((): Record<string, string> => {
    return getSavedUtmParams();
  }, []);

  return {
    utmParams: getSavedUtmParams(),
    navigateWithUtm,
    getUtmForApi,
  };
};

// Hook para capturar dados de tracking para a API
export const useTrackingData = () => {
  const getTrackingPayload = useCallback(() => {
    const utmParams = getSavedUtmParams();
    
    // Separa UTMs tradicionais de outros parâmetros
    const utm: Record<string, string> = {};
    let src = '';
    let fbclid = '';
    let ttclid = '';
    let gclid = '';

    Object.entries(utmParams).forEach(([key, value]) => {
      if (key.startsWith('utm_')) {
        utm[key] = value;
      } else if (key === 'src') {
        src = value;
      } else if (key === 'fbclid') {
        fbclid = value;
      } else if (key === 'ttclid') {
        ttclid = value;
      } else if (key === 'gclid') {
        gclid = value;
      }
    });

    // Pega cookies do Facebook
    const getCookie = (name: string): string => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : '';
    };

    return {
      utm,
      src: src || window.location.href,
      fbp: getCookie('_fbp'),
      fbc: getCookie('_fbc') || fbclid,
      ttclid,
      gclid,
      user_agent: navigator.userAgent,
    };
  }, []);

  return { getTrackingPayload };
};
