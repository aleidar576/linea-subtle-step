import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/services/api';
import { lazy, Suspense, useEffect } from 'react';
import { icons, type LucideProps } from 'lucide-react';
import dynamicIconImports from 'lucide-react/dynamicIconImports';
import { useTheme } from '@/hooks/useTheme';

// ── Generic fallback favicon (shopping bag SVG) ──
export const GENERIC_BAG_FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'/%3E%3Cline x1='3' y1='6' x2='21' y2='6'/%3E%3Cpath d='M16 10a4 4 0 0 1-8 0'/%3E%3C/svg%3E";

// === Hook: useSaaSBrand ===
const BRAND_KEYS = [
  'saas_name', 'saas_slogan', 'saas_auth_subtitle', 'saas_icon_name',
  'saas_logo_url', 'saas_logo_url_light', 'saas_logo_url_home',
  'saas_logo_size', 'saas_logo_size_home', 'saas_logo_size_login',
  'browser_icon',
];

export function useSaaSBrand() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['saas-brand'],
    queryFn: () => settingsApi.getByKeys(BRAND_KEYS),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const map: Record<string, string> = {};
  settings?.forEach(s => { map[s.key] = s.value; });

  const logoUrlDark = map.saas_logo_url || '';
  const logoUrlLight = map.saas_logo_url_light || '';
  const logoUrlHome = map.saas_logo_url_home || '';

  return {
    isLoading,
    brandName: map.saas_name || 'PANDORA',
    slogan: map.saas_slogan || '',
    authSubtitle: map.saas_auth_subtitle || 'Plataforma de E-commerce',
    iconName: map.saas_icon_name || 'boxes',
    logoUrlDark,
    logoUrlLight,
    logoUrlHome,
    logoSize: parseInt(map.saas_logo_size || '32', 10) || 32,
    logoSizeHome: parseInt(map.saas_logo_size_home || '40', 10) || 40,
    logoSizeLogin: parseInt(map.saas_logo_size_login || '48', 10) || 48,
    faviconUrl: map.browser_icon || '',
    // Legacy compat
    logoUrl: logoUrlDark || logoUrlLight || '',
  };
}

/**
 * Resolve which logo URL to use based on theme preference.
 * - If both logos exist: dark for dark theme, light for light theme
 * - If only one exists: use that one for both
 * - If none: returns ''
 */
export function useResolvedLogo(themeHint?: 'dark' | 'light' | 'auto', context?: 'panel' | 'home' | 'login') {
  const { logoUrlDark, logoUrlLight, logoUrlHome } = useSaaSBrand();
  const { theme } = useTheme();

  // Homepage context: use dedicated home logo if available, otherwise fall through
  if (context === 'home' && logoUrlHome) {
    return logoUrlHome;
  }

  const effectiveTheme = themeHint === 'auto' ? theme : (themeHint || theme);

  if (logoUrlDark && logoUrlLight) {
    return effectiveTheme === 'dark' ? logoUrlDark : logoUrlLight;
  }
  return logoUrlDark || logoUrlLight || '';
}

// === Dynamic Lucide Icon ===
interface DynamicIconProps extends Omit<LucideProps, 'ref'> {
  name: string;
}

export const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const kebabName = name.toLowerCase().replace(/\s+/g, '-') as keyof typeof dynamicIconImports;

  if (dynamicIconImports[kebabName]) {
    const LazyIcon = lazy(dynamicIconImports[kebabName]);
    return (
      <Suspense fallback={<div style={{ width: props.size || 24, height: props.size || 24 }} />}>
        <LazyIcon {...props} />
      </Suspense>
    );
  }

  const pascalName = name.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') as keyof typeof icons;
  const StaticIcon = icons[pascalName];
  if (StaticIcon) return <StaticIcon {...props} />;

  const Boxes = icons['Boxes'];
  return <Boxes {...props} />;
};

// === SaaSLogo Component ===
interface SaaSLogoProps {
  size?: number;
  className?: string;
  iconClassName?: string;
  showName?: boolean;
  nameClassName?: string;
  /** 'panel' uses logoSize, 'home' uses logoSizeHome, 'login' uses logoSizeLogin */
  context?: 'panel' | 'home' | 'login';
  /** Which logo to prefer: 'dark', 'light', or 'auto' (respects current theme) */
  theme?: 'dark' | 'light' | 'auto';
}

export const SaaSLogo = ({
  size,
  className = '',
  iconClassName = '',
  showName = true,
  nameClassName = '',
  context = 'panel',
  theme: themeHint = 'auto',
}: SaaSLogoProps) => {
  const { brandName, iconName, logoSize, logoSizeHome, logoSizeLogin, isLoading } = useSaaSBrand();
  const resolvedLogo = useResolvedLogo(themeHint, context);

  // Determine final size
  const contextSize = context === 'login' ? logoSizeLogin : context === 'home' ? logoSizeHome : logoSize;
  const finalSize = size ?? contextSize;

  // While loading, show a placeholder with the expected size to prevent flicker
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div style={{ height: finalSize, width: finalSize }} />
      </div>
    );
  }

  // When a logo image exists: render only the image, no text, no wrapper
  if (resolvedLogo) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <img
          src={resolvedLogo}
          alt={brandName}
          style={{ height: finalSize, maxHeight: finalSize }}
          className="object-contain"
        />
      </div>
    );
  }

  // Fallback: Lucide icon + brand name
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`rounded-lg bg-sidebar-primary flex items-center justify-center ${iconClassName}`}
        style={{ height: finalSize, width: finalSize }}
      >
        <DynamicIcon name={iconName} className="text-sidebar-primary-foreground" size={finalSize * 0.625} />
      </div>
      {showName && (
        <span className={`font-bold ${nameClassName}`}>{brandName}</span>
      )}
    </div>
  );
};

// === Favicon Manager ===
export function useFaviconUpdater() {
  const { faviconUrl } = useSaaSBrand();

  useEffect(() => {
    const href = faviconUrl || GENERIC_BAG_FAVICON;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = href;
  }, [faviconUrl]);
}
