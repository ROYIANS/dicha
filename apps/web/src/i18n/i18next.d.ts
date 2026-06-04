import 'i18next';
import { type ZhResources } from './locales/zh';

// Key-level type safety via declaration merging (architecture.md §6).
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: ZhResources;
  }
}
