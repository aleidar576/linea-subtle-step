import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Novas Cores do Stitch MD3 para o Painel do Lojista
        "surface-container": "hsl(var(--surface-container))",
        "surface-container-highest": "hsl(var(--surface-container-highest))",
        "primary-fixed": "hsl(var(--primary-fixed))",
        "secondary-fixed": "hsl(var(--secondary-fixed))",
        "primary-fixed-dim": "hsl(var(--primary-fixed-dim))",
        "on-surface": "hsl(var(--on-surface))",
        "tertiary-fixed-dim": "hsl(var(--tertiary-fixed-dim))",
        "on-tertiary-container": "hsl(var(--on-tertiary-container))",
        "outline": "hsl(var(--outline))",
        "on-primary-fixed-variant": "hsl(var(--on-primary-fixed-variant))",
        "secondary-container": "hsl(var(--secondary-container))",
        "secondary-fixed-dim": "hsl(var(--secondary-fixed-dim))",
        "surface-bright": "hsl(var(--surface-bright))",
        "on-primary-container": "hsl(var(--on-primary-container))",
        "surface": "hsl(var(--surface))",
        "tertiary-container": "hsl(var(--tertiary-container))",
        "on-tertiary-fixed": "hsl(var(--on-tertiary-fixed))",
        "surface-container-low": "hsl(var(--surface-container-low))",
        "surface-variant": "hsl(var(--surface-variant))",
        "on-surface-variant": "hsl(var(--on-surface-variant))",
        "surface-dim": "hsl(var(--surface-dim))",
        "on-error": "hsl(var(--on-error))",
        "surface-container-lowest": "hsl(var(--surface-container-lowest))",
        "on-secondary-fixed": "hsl(var(--on-secondary-fixed))",
        "on-tertiary-fixed-variant": "hsl(var(--on-tertiary-fixed-variant))",
        "inverse-on-surface": "hsl(var(--inverse-on-surface))",
        "on-secondary": "hsl(var(--on-secondary))",
        "inverse-primary": "hsl(var(--inverse-primary))",
        "tertiary-fixed": "hsl(var(--tertiary-fixed))",
        "on-primary": "hsl(var(--on-primary))",
        "inverse-surface": "hsl(var(--inverse-surface))",
        "tertiary": "hsl(var(--tertiary))",
        "primary-container": "hsl(var(--primary-container))",
        "on-secondary-fixed-variant": "hsl(var(--on-secondary-fixed-variant))",
        "on-tertiary": "hsl(var(--on-tertiary))",
        "on-secondary-container": "hsl(var(--on-secondary-container))",
        "on-primary-fixed": "hsl(var(--on-primary-fixed))",
        "error-container": "hsl(var(--error-container))",
        "on-error-container": "hsl(var(--on-error-container))",
        "surface-tint": "hsl(var(--surface-tint))",
        "outline-variant": "hsl(var(--outline-variant))",
        "on-background": "hsl(var(--on-background))",
        "surface-container-high": "hsl(var(--surface-container-high))",
        // TikTok Shop colors
        tiktok: {
          red: "hsl(var(--tiktok-red))",
          pink: "hsl(var(--tiktok-pink))",
          cyan: "hsl(var(--tiktok-cyan))",
          dark: "hsl(var(--tiktok-dark))",
          gray: "hsl(var(--tiktok-gray))",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        headline: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--primary) / 0.4), 0 0 40px hsl(var(--primary) / 0.2)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow: "0 0 30px hsl(var(--primary) / 0.6), 0 0 60px hsl(var(--primary) / 0.3)",
            transform: "scale(1.02)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 25s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
