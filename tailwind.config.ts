import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: '#d7dce6',
        muted: '#6b7280',
        accent: '#2f6fed',
        accent2: '#0e8f83',
        success: '#1f9d55',
        warning: '#b45309',
        danger: '#dc2626',
      },
    },
  },
  plugins: [],
};

export default config;
