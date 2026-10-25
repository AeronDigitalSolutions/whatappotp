import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: "#25D366",
        "whatsapp-dark": "#128C7E",
        apple: {
          obsidian: "#030712",
          midnight: "#070c14",
          surface: "#0d1522",
          card: "#111c2d",
          border: "rgba(255, 255, 255, 0.08)",
          borderGlow: "rgba(52, 211, 153, 0.35)",
          emerald: "#10B981",
          mint: "#34D399",
          laser: "#00FF9D"
        }
      },
      boxShadow: {
        "apple-glass": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.12), 0 20px 50px -15px rgba(0, 0, 0, 0.65)",
        "apple-card": "inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 12px 30px -10px rgba(0, 0, 0, 0.5)",
        "apple-card-hover": "inset 0 1px 0 0 rgba(255, 255, 255, 0.2), 0 24px 60px -12px rgba(0, 0, 0, 0.75), 0 0 35px -5px rgba(16, 185, 129, 0.25)",
        "apple-glow": "0 0 30px -5px rgba(16, 185, 129, 0.4)",
        "apple-glow-lg": "0 0 60px -10px rgba(16, 185, 129, 0.3)",
        "apple-glow-cyan": "0 0 40px -8px rgba(6, 182, 212, 0.35)",
        "apple-btn": "inset 0 1px 0 0 rgba(255, 255, 255, 0.35), 0 8px 24px -4px rgba(16, 185, 129, 0.5)",
      },
      keyframes: {
        appleFadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        appleFloat: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmerSlide: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        auraPulse: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.04)" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(52, 211, 153, 0.25)" },
          "50%": { borderColor: "rgba(52, 211, 153, 0.7)" },
        }
      },
      animation: {
        "apple-fade-up": "appleFadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "apple-float": "appleFloat 6s ease-in-out infinite",
        "shimmer-slide": "shimmerSlide 4s linear infinite",
        "aura-pulse": "auraPulse 5s ease-in-out infinite",
        "border-glow": "borderGlow 3s ease-in-out infinite",
      }
    },
  },
  plugins: [],
};
export default config;
