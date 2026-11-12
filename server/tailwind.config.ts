import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paypal: {
          blue: "#003087",
          darkblue: "#001C64",
          lightblue: "#0079C1",
          gold: "#FFC439",
          goldHover: "#F2BA36",
          gray: "#F5F7FA",
          surface: "#FFFFFF",
          border: "#E2E8F0",
          navy: "#0b1f3f",
          accent: "#2c2e2f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
