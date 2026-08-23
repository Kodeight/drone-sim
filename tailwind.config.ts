import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Light mode
        border: '#d7dce6',
        muted: '#6b7280',
        accent: '#2563eb',
        accent2: '#0891b2',
        success: '#16a34a',
        warning: '#d97706',
        danger: '#dc2626',
        // Dark mode tokens (used with dark: prefix)
        'dark-app': '#050B14',
        'dark-panel': '#0B1420',
        'dark-secondary': '#101B29',
        'dark-border': '#1e3a5f',
        'dark-text': '#e2e8f0',
        'dark-muted': '#64748b',
        'dark-accent': '#06b6d4',
        'dark-success': '#22c55e',
        'dark-warning': '#f59e0b',
        'dark-danger': '#ef4444',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
