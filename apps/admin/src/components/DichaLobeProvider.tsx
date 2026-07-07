import { ConfigProvider, ThemeProvider } from '@lobehub/ui';
import type { ThemeConfig } from 'antd';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

const dichaAntdTheme = {
  token: {
    borderRadius: 6,
    colorBgBase: '#f7f4ef',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f7f4ef',
    colorBorder: '#ece7e0',
    colorBorderSecondary: '#ece7e0',
    colorError: '#e9b7be',
    colorFillSecondary: '#fcfaf6',
    colorInfo: '#a8c4d6',
    colorPrimary: '#7a6248',
    colorSuccess: '#a9c0a0',
    colorText: '#2e2a26',
    colorTextDescription: '#8a8178',
    colorTextPlaceholder: '#b5aea4',
    colorWarning: '#f0c3a3',
    fontFamily:
      "'Sarasa UI SC', 'Sarasa Gothic SC', 'Microsoft YaHei UI', 'PingFang SC', 'Noto Sans SC', ui-sans-serif, system-ui, sans-serif",
  },
  components: {
    Input: {
      activeBorderColor: '#7a6248',
      activeShadow: 'none',
      hoverBorderColor: '#8a8178',
    },
  },
} satisfies ThemeConfig;

export function DichaLobeProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider motion={motion}>
      <ThemeProvider
        appearance="light"
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
