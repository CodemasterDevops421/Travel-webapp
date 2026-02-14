import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        border: 'hsl(var(--border))',
        sky: {
          50: '#E6F7FF',
          100: '#CCEFFF',
          200: '#99DFFF',
          300: '#66CFFF',
          400: '#33BFFF',
          500: '#0EA5E9',
          600: '#0B84C4',
          700: '#086393',
          800: '#054262',
          900: '#032131'
        },
        violet: {
          50: '#F3EEFF',
          100: '#E7DEFF',
          200: '#CFBDFF',
          300: '#B79CFF',
          400: '#9F7BFF',
          500: '#8B5CF6',
          600: '#7049C5',
          700: '#553694',
          800: '#3A2363',
          900: '#1F1032'
        },
        amber: {
          50: '#FFFBEB',
          100: '#FFF3CD',
          200: '#FFE699',
          300: '#FFD966',
          400: '#FFCC33',
          500: '#F59E0B',
          600: '#C47F09',
          700: '#935F07',
          800: '#623F04',
          900: '#311F02'
        },
        surface: {
          light: '#FFFFFF',
          dark: '#1E293B'
        }
      },
      fontFamily: {
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      },
      boxShadow: {
        'glow': '0 0 40px -10px rgba(14, 165, 233, 0.3)',
        'glow-lg': '0 0 60px -15px rgba(14, 165, 233, 0.4)',
        'glow-violet': '0 0 40px -10px rgba(139, 92, 246, 0.3)',
        'glow-amber': '0 0 40px -10px rgba(245, 158, 11, 0.3)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
        'card': '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.15)'
      },
      backdropBlur: {
        'xs': '2px'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'gradient': 'gradient 8s ease infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'aurora': 'linear-gradient(-45deg, #0EA5E9, #8B5CF6, #F59E0B, #0EA5E9)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
      },
      backgroundSize: {
        'aurora': '300% 300%'
      }
    }
  },
  plugins: []
};

export default config;
