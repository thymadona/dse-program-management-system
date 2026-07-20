import type { Config } from "tailwindcss";
import preset from "@dse-pms/config/tailwind-preset";
import animate from "tailwindcss-animate";

const config: Config = {
  presets: [preset],
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    // Scan the ui package so its Tailwind classes are generated.
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  plugins: [animate],
};

export default config;
