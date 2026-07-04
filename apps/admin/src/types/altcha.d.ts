import type { AltchaWidgetElement } from 'altcha';
import type { HTMLAttributes, Ref } from 'react';

interface AltchaWidgetAttributes extends HTMLAttributes<AltchaWidgetElement> {
  ref?: Ref<AltchaWidgetElement>;
  challenge?: string;
  auto?: string;
  name?: string;
  display?: string;
  hidefooter?: boolean | string;
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
