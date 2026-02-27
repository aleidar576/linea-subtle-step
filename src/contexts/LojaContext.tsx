import React, { createContext, useContext } from 'react';
import type { FooterConfig, HomepageConfig, LogoConfig } from '@/services/saas-api';

interface LojaPixel {
  _id: string;
  platform: 'facebook' | 'tiktok' | 'google_ads' | 'gtm';
  pixel_id: string;
  access_token: string;
  conversion_label?: string;
  events?: string[];
  trigger_pages?: string[];
  is_active: boolean;
}

interface CoresGlobais {
  brand_primary?: string;
  brand_secondary?: string;
  bg_base?: string;
  bg_surface?: string;
  text_primary?: string;
  whatsapp_button?: string;
  // Legacy
  cor_primaria?: string;
  cor_secundaria?: string;
  cor_fundo?: string;
  cor_texto?: string;
}

interface LojaContextType {
  lojaId: string;
  slug: string;
  nome: string;
  nomeExibicao: string;
  favicon: string;
  icone: string;
  tema: string;
  categoriaHomeId: string | null;
  sealpayKey: string | null;
  customCss: string;
  pixels: LojaPixel[];
  searchEnabled: boolean;
  chatbotEnabled: boolean;
  coresGlobais: CoresGlobais | null;
  homepageConfig: HomepageConfig | null;
  footer: FooterConfig | null;
  logo: LogoConfig | null;
  whatsappNumero: string;
  exigirCadastro: boolean;
  slogan: string;
  cartConfig: any | null;
  gatewayAtivo: string | null;
  gatewayLoading: boolean;
  metodosSuportados: string[];
  isLoading: boolean;
  notFound: boolean;
}

const LojaContext = createContext<LojaContextType | undefined>(undefined);

export const LojaProvider: React.FC<{ value: LojaContextType; children: React.ReactNode }> = ({ value, children }) => (
  <LojaContext.Provider value={value}>{children}</LojaContext.Provider>
);

export function useLoja() {
  const ctx = useContext(LojaContext);
  if (!ctx) throw new Error('useLoja must be used within LojaProvider');
  return ctx;
}
