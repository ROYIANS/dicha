/**
 * `altcha-widget` 自定义元素的 JSX 声明。
 *
 * altcha@3 自带 React 类型在 dist/types/react.d.ts，但未通过 package exports 暴露
 * 子路径（exports 仅开放 '.' / './external' / './lib' / './types'），Bundler 解析
 * 下无法 import 那份深路径声明，故在本项目本地补一份最小 JSX intrinsic 声明。
 * 元素类与行为来自 `import 'altcha'`（副作用注册 Web Component）。
 */
import type { AltchaWidgetElement } from 'altcha';
import type { HTMLAttributes, Ref } from 'react';

interface AltchaWidgetAttributes extends HTMLAttributes<AltchaWidgetElement> {
  ref?: Ref<AltchaWidgetElement>;
  /** 拉取挑战的 URL（或挑战 JSON 字符串）。 */
  challenge?: string;
  /** 自动触发时机：'off' | 'onfocus' | 'onload' | 'onsubmit'。 */
  auto?: string;
  /** 隐藏输入字段名（默认 'altcha'）。 */
  name?: string;
  /** 视觉布局：'standard' | 'bar' | 'floating' | 'overlay' | 'invisible'。 */
  display?: string;
  /** 隐藏 ALTCHA 署名链接。 */
  hidefooter?: boolean | string;
  /** 隐藏 ALTCHA logo。 */
  hidelogo?: boolean | string;
  suppressHydrationWarning?: boolean;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': AltchaWidgetAttributes;
    }
  }
}

declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': AltchaWidgetAttributes;
    }
  }
}
