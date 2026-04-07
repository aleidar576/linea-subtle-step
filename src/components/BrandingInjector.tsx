import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

const LIGHT_THEME = {
  primary: '193 100% 41%',
  primaryForeground: '0 0% 100%',
  secondary: '201 22% 35%',
  secondaryForeground: '0 0% 100%',
  background: '210 100% 99%',
  foreground: '210 21% 11%',
  card: '0 0% 100%',
  cardForeground: '210 21% 11%',
  popover: '0 0% 100%',
  popoverForeground: '210 21% 11%',
  muted: '210 60% 97%',
  mutedForeground: '201 14% 27%',
  accent: '210 60% 97%',
  accentForeground: '210 21% 11%',
  border: '201 21% 83%',
  input: '201 21% 83%',
  ring: '193 100% 41%',
  destructive: '0 75% 42%',
  destructiveForeground: '0 0% 100%',
  sidebarBackground: '210 33% 98%',
  sidebarForeground: '215 25% 27%',
  sidebarBorder: '214 23% 88%',
  sidebarAccent: '0 0% 100%',
  sidebarAccentForeground: '193 100% 41%',
  sidebarPrimary: '193 100% 41%',
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarRing: '193 100% 41%',

  inverseOnSurface: '210 40% 98%',
  onSecondaryFixed: '198 100% 8%',
  surfaceVariant: '210 23% 89%',
  primaryFixedDim: '193 100% 65%',
  onTertiary: '0 0% 100%',
  errorContainer: '6 100% 92%',
  primaryFixed: '197 100% 86%',
  tertiaryFixedDim: '10 100% 82%',
  surfaceContainer: '210 43% 93%',
  tertiary: '11 81% 38%',
  onSurface: '210 21% 11%',
  surfaceBright: '210 100% 99%',
  secondaryFixedDim: '201 39% 77%',
  onSurfaceVariant: '201 14% 27%',
  surfaceTint: '192 100% 25%',
  surface: '210 100% 99%',
  onTertiaryFixedVariant: '11 100% 27%',
  onPrimaryContainer: '190 100% 22%',
  primaryContainer: '193 100% 41%',
  surfaceDim: '211 24% 85%',
  onPrimaryFixedVariant: '191 100% 19%',
  onBackground: '210 21% 11%',
  outlineVariant: '201 23% 77%',
  onSecondaryContainer: '202 21% 37%',
  onTertiaryFixed: '10 85% 12%',
  onPrimary: '0 0% 100%',
  inverseSurface: '211 12% 19%',
  inversePrimary: '193 100% 65%',
  surfaceContainerHighest: '210 23% 89%',
  outline: '204 8% 46%',
  secondaryFixed: '200 61% 87%',
  onSecondary: '0 0% 100%',
  secondaryContainer: '200 61% 87%',
  error: '0 75% 42%',
  tertiaryFixed: '10 100% 91%',
  onSecondaryFixedVariant: '199 29% 26%',
  tertiaryContainer: '10 100% 80%',
  onErrorContainer: '356 100% 29%',
  onPrimaryFixed: '198 100% 8%',
  surfaceContainerHigh: '210 27% 90%',
  onError: '0 0% 100%',
  surfaceContainerLowest: '0 0% 100%',
  surfaceContainerLow: '210 60% 96%',
  onTertiaryContainer: '11 70% 36%',
};

const DARK_THEME = {
  primary: '193 100% 41%',
  primaryForeground: '222 47% 11%',
  secondary: '201 39% 77%',
  secondaryForeground: '210 40% 98%',
  background: '222 79% 5%',
  foreground: '210 40% 98%',
  card: '217 33% 10%',
  cardForeground: '210 40% 98%',
  popover: '217 33% 10%',
  popoverForeground: '210 40% 98%',
  muted: '215 28% 17%',
  mutedForeground: '215 20% 65%',
  accent: '215 28% 17%',
  accentForeground: '210 40% 98%',
  border: '0 0% 100% / 0.05',
  input: '215 28% 17%',
  ring: '193 100% 41%',
  destructive: '0 84% 60%',
  destructiveForeground: '222 47% 11%',
  sidebarBackground: '217 33% 10%',
  sidebarForeground: '215 20% 65%',
  sidebarBorder: '0 0% 100% / 0.05',
  sidebarAccent: '0 0% 100% / 0.05',
  sidebarAccentForeground: '193 100% 41%',
  sidebarPrimary: '193 100% 41%',
  sidebarPrimaryForeground: '222 47% 11%',
  sidebarRing: '193 100% 41%',

  surfaceContainer: '211 18% 14%',
  surfaceContainerHighest: '212 12% 23%',
  primaryFixed: '197 100% 86%',
  secondaryFixed: '200 61% 87%',
  primaryFixedDim: '193 100% 65%',
  onSurface: '210 40% 98%',
  tertiaryFixedDim: '10 100% 82%',
  onTertiaryContainer: '10 100% 91%',
  outline: '204 9% 56%',
  onPrimaryFixedVariant: '191 100% 19%',
  secondaryContainer: '199 29% 26%',
  secondaryFixedDim: '201 39% 77%',
  surfaceBright: '210 21% 11%',
  onPrimaryContainer: '191 100% 13%',
  surface: '217 33% 10%',
  tertiaryContainer: '11 81% 35%',
  onTertiaryFixed: '10 85% 12%',
  surfaceContainerLow: '210 21% 11%',
  surfaceVariant: '201 14% 27%',
  onSurfaceVariant: '201 23% 77%',
  surfaceDim: '210 21% 7%',
  onError: '356 100% 20%',
  surfaceContainerLowest: '210 21% 7%',
  onSecondaryFixed: '198 100% 8%',
  onTertiaryFixedVariant: '11 100% 27%',
  inverseOnSurface: '210 40% 98%',
  onSecondary: '200 47% 17%',
  inversePrimary: '192 100% 25%',
  tertiaryFixed: '10 100% 91%',
  onPrimary: '191 100% 13%',
  inverseSurface: '210 40% 98%',
  tertiary: '10 100% 82%',
  primaryContainer: '193 100% 41%',
  onSecondaryFixedVariant: '199 29% 26%',
  onTertiary: '0 0% 100%',
  onSecondaryContainer: '200 61% 87%',
  onPrimaryFixed: '198 100% 8%',
  onErrorContainer: '6 100% 92%',
  errorContainer: '356 100% 29%',
  surfaceTint: '193 100% 65%',
  error: '4 100% 84%',
  outlineVariant: '201 14% 27%',
  onBackground: '210 40% 98%',
  surfaceContainerHigh: '212 17% 19%',
};

function setVar(root: HTMLElement, name: string, value: string) {
  root.style.setProperty(name, value);
}

export default function BrandingInjector() {
  const { theme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const palette = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

    setVar(root, '--primary', palette.primary);
    setVar(root, '--primary-foreground', palette.primaryForeground);
    setVar(root, '--secondary', palette.secondary);
    setVar(root, '--secondary-foreground', palette.secondaryForeground);
    setVar(root, '--background', palette.background);
    setVar(root, '--foreground', palette.foreground);
    setVar(root, '--card', palette.card);
    setVar(root, '--card-foreground', palette.cardForeground);
    setVar(root, '--popover', palette.popover);
    setVar(root, '--popover-foreground', palette.popoverForeground);
    setVar(root, '--muted', palette.muted);
    setVar(root, '--muted-foreground', palette.mutedForeground);
    setVar(root, '--accent', palette.accent);
    setVar(root, '--accent-foreground', palette.accentForeground);
    setVar(root, '--border', palette.border);
    setVar(root, '--input', palette.input);
    setVar(root, '--ring', palette.ring);
    setVar(root, '--destructive', palette.destructive);
    setVar(root, '--destructive-foreground', palette.destructiveForeground);

    setVar(root, '--sidebar-background', palette.sidebarBackground);
    setVar(root, '--sidebar-foreground', palette.sidebarForeground);
    setVar(root, '--sidebar-border', palette.sidebarBorder);
    setVar(root, '--sidebar-accent', palette.sidebarAccent);
    setVar(root, '--sidebar-accent-foreground', palette.sidebarAccentForeground);
    setVar(root, '--sidebar-primary', palette.sidebarPrimary);
    setVar(root, '--sidebar-primary-foreground', palette.sidebarPrimaryForeground);
    setVar(root, '--sidebar-ring', palette.sidebarRing);

    setVar(root, '--inverse-on-surface', palette.inverseOnSurface);
    setVar(root, '--on-secondary-fixed', palette.onSecondaryFixed);
    setVar(root, '--surface-variant', palette.surfaceVariant);
    setVar(root, '--primary-fixed-dim', palette.primaryFixedDim);
    setVar(root, '--on-tertiary', palette.onTertiary);
    setVar(root, '--error-container', palette.errorContainer);
    setVar(root, '--primary-fixed', palette.primaryFixed);
    setVar(root, '--tertiary-fixed-dim', palette.tertiaryFixedDim);
    setVar(root, '--surface-container', palette.surfaceContainer);
    setVar(root, '--tertiary', palette.tertiary);
    setVar(root, '--on-surface', palette.onSurface);
    setVar(root, '--surface-bright', palette.surfaceBright);
    setVar(root, '--secondary-fixed-dim', palette.secondaryFixedDim);
    setVar(root, '--on-surface-variant', palette.onSurfaceVariant);
    setVar(root, '--surface-tint', palette.surfaceTint);
    setVar(root, '--surface', palette.surface);
    setVar(root, '--on-tertiary-fixed-variant', palette.onTertiaryFixedVariant);
    setVar(root, '--on-primary-container', palette.onPrimaryContainer);
    setVar(root, '--primary-container', palette.primaryContainer);
    setVar(root, '--surface-dim', palette.surfaceDim);
    setVar(root, '--on-primary-fixed-variant', palette.onPrimaryFixedVariant);
    setVar(root, '--on-background', palette.onBackground);
    setVar(root, '--outline-variant', palette.outlineVariant);
    setVar(root, '--on-secondary-container', palette.onSecondaryContainer);
    setVar(root, '--on-tertiary-fixed', palette.onTertiaryFixed);
    setVar(root, '--on-primary', palette.onPrimary);
    setVar(root, '--inverse-surface', palette.inverseSurface);
    setVar(root, '--inverse-primary', palette.inversePrimary);
    setVar(root, '--surface-container-highest', palette.surfaceContainerHighest);
    setVar(root, '--outline', palette.outline);
    setVar(root, '--secondary-fixed', palette.secondaryFixed);
    setVar(root, '--on-secondary', palette.onSecondary);
    setVar(root, '--secondary-container', palette.secondaryContainer);
    setVar(root, '--error', palette.error);
    setVar(root, '--tertiary-fixed', palette.tertiaryFixed);
    setVar(root, '--on-secondary-fixed-variant', palette.onSecondaryFixedVariant);
    setVar(root, '--tertiary-container', palette.tertiaryContainer);
    setVar(root, '--on-error-container', palette.onErrorContainer);
    setVar(root, '--on-primary-fixed', palette.onPrimaryFixed);
    setVar(root, '--surface-container-high', palette.surfaceContainerHigh);
    setVar(root, '--on-error', palette.onError);
    setVar(root, '--surface-container-lowest', palette.surfaceContainerLowest);
    setVar(root, '--surface-container-low', palette.surfaceContainerLow);
    setVar(root, '--on-tertiary-container', palette.onTertiaryContainer);
  }, [theme]);

  return null;
}
