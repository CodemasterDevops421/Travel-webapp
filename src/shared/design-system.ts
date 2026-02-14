export const designSystem = {
  colors: {
    primary: {
      DEFAULT: '#0EA5E9',
      50: '#E6F7FF',
      100: '#CCEFFF',
      200: '#99DFFF',
      300: '#66CFFF',
      400: '#33BFFF',
      500: '#0EA5E9',
      600: '#0B84C4',
      700: '#086393',
      800: '#054262',
      900: '#032131',
      foreground: '#FFFFFF'
    },
    secondary: {
      DEFAULT: '#8B5CF6',
      50: '#F3EEFF',
      100: '#E7DEFF',
      200: '#CFBDFF',
      300: '#B79CFF',
      400: '#9F7BFF',
      500: '#8B5CF6',
      600: '#7049C5',
      700: '#553694',
      800: '#3A2363',
      900: '#1F1032',
      foreground: '#FFFFFF'
    },
    accent: {
      DEFAULT: '#F59E0B',
      50: '#FFFBEB',
      100: '#FFF3CD',
      200: '#FFE699',
      300: '#FFD966',
      400: '#FFCC33',
      500: '#F59E0B',
      600: '#C47F09',
      700: '#935F07',
      800: '#623F04',
      900: '#311F02',
      foreground: '#FFFFFF'
    },
    background: {
      light: '#F8FAFC',
      dark: '#0F172A'
    },
    surface: {
      light: '#FFFFFF',
      dark: '#1E293B'
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
      muted: '#94A3B8'
    }
  },
  typography: {
    fontFamily: {
      heading: ['Plus Jakarta Sans', 'sans-serif'],
      body: ['Inter', 'sans-serif']
    },
    sizes: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem'
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    glow: '0 0 40px -10px rgba(14, 165, 233, 0.3)',
    'glow-secondary': '0 0 40px -10px rgba(139, 92, 246, 0.3)',
    'glow-accent': '0 0 40px -10px rgba(245, 158, 11, 0.3)'
  },
  animations: {
    fadeIn: 'fadeIn 0.5s ease-out',
    slideUp: 'slideUp 0.5s ease-out',
    slideDown: 'slideDown 0.3s ease-out',
    scaleIn: 'scaleIn 0.3s ease-out',
    pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
    float: 'float 3s ease-in-out infinite',
    shimmer: 'shimmer 2s linear infinite'
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
    }
  },
  glassmorphism: {
    light: 'bg-white/70 backdrop-blur-xl border border-white/20',
    medium: 'bg-white/50 backdrop-blur-lg border border-white/30',
    dark: 'bg-slate-900/70 backdrop-blur-xl border border-white/10'
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
} as const;

export type DesignSystem = typeof designSystem;
