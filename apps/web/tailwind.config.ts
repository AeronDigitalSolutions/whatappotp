import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: "#25D366",
        "whatsapp-dark": "#128C7E",
      },
    },
  },
  plugins: [],
};
export default config;
