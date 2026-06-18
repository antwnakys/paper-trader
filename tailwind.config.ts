import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e14",
        panel: "#131722",
        panel2: "#1c2230",
        border: "#2a3142",
        muted: "#8b94a7",
        text: "#e6e9ef",
        brand: "#3b82f6",
        up: "#16c784",
        down: "#ea3943",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
