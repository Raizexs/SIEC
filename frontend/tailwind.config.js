/** @type {import('tailwindcss').Config} */
/**
 * SIEC Design Tokens — "Precisión Arquitectónica"
 *
 * Brand colors:
 *   - navy.DEFAULT (#1A2B48)   primary, navigation, hierarchy
 *   - orange.DEFAULT (#f39c12) CTAs, volatility indicators
 *   - rail (#f2f4f7)            side nav background
 *
 * Typography: Plus Jakarta Sans geometric sans-serif (weight 400/500/600/700/800).
 * Components: rounded-md (4-8px), shadow-sm flat shadows, subtle slate borders.
 */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Brand ───────────────────────────────────────────────────────────
        navy: {
          50: "#f0f5fa",
          100: "#d9e6f2",
          200: "#b7cee5",
          300: "#8eafcf",
          400: "#658eb6",
          500: "#44729b",
          600: "#2d597f",
          700: "#1f4466",
          800: "#183652",
          900: "#102a43",
          950: "#0b1f33",
          DEFAULT: "#102a43",
        },
        orange: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f59e0b",
          600: "#ea7a12",
          700: "#c25d0e",
          800: "#9a4b11",
          900: "#7c3f12",
          DEFAULT: "#f59e0b",
        },
        // ── Surface (tonal layers, no hard dividers) ───────────────────────
        rail: "#f2f4f7", // SideNavBar bg
        canvas: "#ffffff", // Main canvas
        elevated: "#fbfcfd", // Elevated cards
        tonal: "#f7f9fc", // Subtle surface tonal layer
        // ── Semantic states ────────────────────────────────────────────────
        success: { DEFAULT: "#16a34a", soft: "#dcfce7" },
        warning: { DEFAULT: "#f59e0b", soft: "#fef3c7" },
        danger: { DEFAULT: "#dc2626", soft: "#fee2e2" },
        info: { DEFAULT: "#0284c7", soft: "#e0f2fe" },
        // ── Backwards-compat aliases (so we don't break v1 components) ─────
        primary: "#102a43",
        "primary-container": "#102a43",
        "on-primary": "#ffffff",
        "on-primary-container": "#ffffff",
        secondary: "#f59e0b",
        "secondary-container": "#f59e0b",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#ffffff",
        background: "#f2f4f7",
        surface: "#ffffff",
        "on-surface": "#0f1a2e",
        "on-surface-variant": "#475569",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#fbfcfd",
        "surface-container": "#f7f9fc",
        "surface-container-high": "#f2f4f7",
        "surface-container-highest": "#eceef1",
        "surface-variant": "#e2e8f0",
        "surface-tint": "#102a43",
        outline: "#cbd5e1",
        "outline-variant": "#e2e8f0",
        "inverse-surface": "#102a43",
        "inverse-on-surface": "#ffffff",
        "inverse-primary": "#9ba9bf",
        error: "#dc2626",
        "on-error": "#ffffff",
        "error-container": "#fee2e2",
        "on-error-container": "#7f1d1d",
        tertiary: "#f59e0b",
        "tertiary-container": "#ffedd5",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#774010",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        manrope: ["Plus Jakarta Sans", "sans-serif"],
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Plus Jakarta Sans", "Inter", "sans-serif"],
        label: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      fontSize: {
        // Tighter scale optimized for data-dense dashboards
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.025em" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        full: "9999px",
      },
      boxShadow: {
        // Flat, subtle elevation
        card: "0 1px 2px 0 rgb(15 26 46 / 0.05)",
        "card-hover":
          "0 2px 8px -1px rgb(15 26 46 / 0.08), 0 1px 4px -1px rgb(15 26 46 / 0.04)",
        rail: "1px 0 0 0 rgb(15 26 46 / 0.04)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
