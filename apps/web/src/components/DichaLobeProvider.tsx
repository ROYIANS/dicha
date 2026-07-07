import { ConfigProvider, ThemeProvider } from '@lobehub/ui';
import type { ThemeConfig } from 'antd';
import { motion } from 'motion/react';
import { useMemo, type ReactNode } from 'react';
import { useTheme } from '@/lib/hooks/useTheme';

const tokenPalette = {
  light: {
    accentMist: '#a8c4d6',
    accentPeach: '#f0c3a3',
    accentPink: '#e9b7be',
    accentSage: '#a9c0a0',
    accentWarm: '#7a6248',
    canvas: '#f7f4ef',
    hairline: '#ece7e0',
    ink: '#2e2a26',
    inkFaint: '#b5aea4',
    inkSoft: '#8a8178',
    surface: '#ffffff',
    surfaceAlt: '#fcfaf6',
  },
  dark: {
    accentMist: '#b7cfde',
    accentPeach: '#f4cfb2',
    accentPink: '#efc4ca',
    accentSage: '#b6cbad',
    accentWarm: '#a89e92',
    canvas: '#141414',
    hairline: '#2a2a2a',
    ink: '#f0ebe3',
    inkFaint: '#7c7268',
    inkSoft: '#a89e92',
    surface: '#212121',
    surfaceAlt: '#2a2a2a',
  },
} as const;

function createDichaAntdTheme(appearance: keyof typeof tokenPalette): ThemeConfig {
  const color = tokenPalette[appearance];

  return {
    token: {
      borderRadius: 6,
      colorBgBase: color.canvas,
      colorBgContainer: color.surface,
      colorBgElevated: color.surface,
      colorBgLayout: color.canvas,
      colorBorder: color.hairline,
      colorBorderSecondary: color.hairline,
      colorError: color.accentPink,
      colorFillSecondary: color.surfaceAlt,
      colorInfo: color.accentMist,
      colorLink: color.accentWarm,
      colorLinkActive: color.inkSoft,
      colorLinkHover: color.inkSoft,
      colorPrimary: color.accentWarm,
      colorSuccess: color.accentSage,
      colorText: color.ink,
      colorTextDescription: color.inkSoft,
      colorTextPlaceholder: color.inkFaint,
      colorWarning: color.accentPeach,
      fontFamily:
        "'Sarasa UI SC', 'Sarasa Gothic SC', 'Microsoft YaHei UI', 'PingFang SC', ui-sans-serif, system-ui, sans-serif",
    },
    components: {
      Input: {
        activeBorderColor: color.accentWarm,
        activeShadow: 'none',
        hoverBorderColor: color.inkSoft,
      },
    },
  };
}

export function DichaLobeProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const dichaAntdTheme = useMemo(() => createDichaAntdTheme(theme), [theme]);

  return (
    <ConfigProvider motion={motion}>
      <ThemeProvider
        appearance={theme}
        className="dicha-lobe-provider"
        enableCustomFonts={false}
        enableGlobalStyle={false}
        style={{ minHeight: 'inherit', width: '100%' }}
        theme={dichaAntdTheme}
      >
        {children}
      </ThemeProvider>
    </ConfigProvider>
  );
}
