/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "Lora", "Georgia", "serif"],
        body: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        // Semantic tokens (mirror the CSS custom properties in index.css)
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          soft: "var(--primary-soft)",
          border: "var(--primary-border)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          soft: "var(--accent-soft)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          2: "var(--surface-2)",
          sunken: "var(--surface-sunken)",
        },
        ink: {
          strong: "var(--text-strong)",
          DEFAULT: "var(--text)",
          muted: "var(--text-muted)",
          faint: "var(--text-faint)",
        },
        line: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        // Legacy names (still referenced in a few spots)
        navy: "var(--primary)",
        "navy-light": "var(--primary-hover)",
        blue: "var(--primary)",
        gold: "var(--accent)",
        "gold-pale": "var(--accent-soft)",
        cream: "var(--surface-2)",
        "warm-white": "var(--surface)",
        stone: "var(--surface-sunken)",
        "stone-dark": "var(--border-strong)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
      },
      maxWidth: {
        content: "720px",
      },
      width: {
        sidebar: "256px",
      },
    },
  },
  plugins: [],
};
