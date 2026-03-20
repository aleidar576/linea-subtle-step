import { useEffect } from 'react';
import { useSaaSBrand } from '@/components/SaaSBrand';
import { useTheme } from '@/hooks/useTheme';

/**
 * Convert a hex color (#RRGGBB or #RGB) to an HSL string "H S% L%" 
 * compatible with Tailwind's hsl(var(--token)) pattern.
 */
function hexToHSL(hex: string): string {
  let r = 0, g = 0, b = 0;
  const h = hex.replace('#', '');
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16) / 255;
    g = parseInt(h[1] + h[1], 16) / 255;
    b = parseInt(h[2] + h[2], 16) / 255;
  } else if (h.length === 6) {
    r = parseInt(h.substring(0, 2), 16) / 255;
    g = parseInt(h.substring(2, 4), 16) / 255;
    b = parseInt(h.substring(4, 6), 16) / 255;
  }

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const light = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(light * 100)}%`;
}

/** Shift lightness of an HSL string by a delta (-100 to 100). */
function shiftLightness(hsl: string, delta: number): string {
  const parts = hsl.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
  if (!parts) return hsl;
  const h = parseFloat(parts[1]);
  const s = parseFloat(parts[2]);
  const l = Math.min(100, Math.max(0, parseFloat(parts[3]) + delta));
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

/** Determine if a color is light (lightness > 55%) for foreground contrast. */
function isLightColor(hsl: string): boolean {
  const parts = hsl.match(/([\d.]+)%\s*$/);
  return parts ? parseFloat(parts[1]) > 55 : false;
}

// All CSS vars we inject — used for cleanup
const INJECTED_VARS = [
  '--primary', '--primary-foreground',
  '--accent', '--accent-foreground',
  '--ring',
  '--background', '--foreground',
  '--card', '--card-foreground',
  '--popover', '--popover-foreground',
  '--muted', '--muted-foreground',
  '--border', '--input',
  '--secondary', '--secondary-foreground',
  '--sidebar-background', '--sidebar-foreground',
  '--sidebar-primary', '--sidebar-primary-foreground',
  '--sidebar-ring', '--sidebar-accent',
  '--sidebar-border', '--sidebar-accent-foreground',
];

/**
 * Invisible component that injects branding colors as CSS variables on :root.
 * Only used inside SaaSApp — never in LojaPublicaApp.
 */
export default function BrandingInjector() {
  const { corPrimaria, corSecundaria, fundoDark, fundoLight, textoLight, textoDark, isLoading } = useSaaSBrand();
  const { theme } = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;
    const set = (k: string, v: string) => root.style.setProperty(k, v);

    const primary = hexToHSL(corPrimaria);
    const secondary = hexToHSL(corSecundaria);
    const primaryFg = isLightColor(primary) ? '220 13% 10%' : '0 0% 100%';

    // Primary
    set('--primary', primary);
    set('--primary-foreground', primaryFg);
    set('--ring', primary);

    // Sidebar primary
    set('--sidebar-primary', primary);
    set('--sidebar-primary-foreground', primaryFg);
    set('--sidebar-ring', primary);

    if (theme === 'dark') {
      const bg = hexToHSL(fundoDark);
      const fg = hexToHSL(textoLight);
      const border = shiftLightness(bg, 14);
      const sec = shiftLightness(bg, 10);

      set('--background', bg);
      set('--foreground', fg);
      set('--card', shiftLightness(bg, 4));
      set('--card-foreground', fg);
      set('--popover', shiftLightness(bg, 4));
      set('--popover-foreground', fg);
      set('--muted', shiftLightness(bg, 8));
      set('--muted-foreground', shiftLightness(fg, -20));
      set('--accent', sec);
      set('--accent-foreground', fg);
      set('--border', border);
      set('--input', border);
      set('--secondary', sec);
      set('--secondary-foreground', shiftLightness(fg, -14));

      // Sidebar inherits main theme
      set('--sidebar-background', shiftLightness(bg, 2));
      set('--sidebar-foreground', fg);
      set('--sidebar-border', border);
      set('--sidebar-accent', sec);
      set('--sidebar-accent-foreground', fg);
    } else {
      const bg = hexToHSL(fundoLight);
      const fg = hexToHSL(textoDark);
      const border = shiftLightness(bg, -9);
      const sec = shiftLightness(bg, -4);

      set('--background', bg);
      set('--foreground', fg);
      set('--card', bg);
      set('--card-foreground', fg);
      set('--popover', bg);
      set('--popover-foreground', fg);
      set('--muted', shiftLightness(bg, -5));
      set('--muted-foreground', shiftLightness(fg, 25));
      set('--accent', sec);
      set('--accent-foreground', fg);
      set('--border', border);
      set('--input', border);
      set('--secondary', sec);
      set('--secondary-foreground', fg);

      // Sidebar inherits main theme
      set('--sidebar-background', shiftLightness(bg, -2));
      set('--sidebar-foreground', fg);
      set('--sidebar-border', border);
      set('--sidebar-accent', sec);
      set('--sidebar-accent-foreground', fg);
    }

    // Cleanup on unmount
    return () => {
      INJECTED_VARS.forEach(v => root.style.removeProperty(v));
    };
  }, [corPrimaria, corSecundaria, fundoDark, fundoLight, textoLight, textoDark, theme, isLoading]);

  return null;
}
