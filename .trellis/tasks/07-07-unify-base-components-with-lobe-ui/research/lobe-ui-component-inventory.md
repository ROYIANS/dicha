# Lobe UI Component Inventory And Replacement Checklist

## Source

Scanned local Lobe UI source at `D:\Code\Study\lobe-ui`:

* `src/index.ts`
* `src/base-ui/index.ts`

Scanned project usage under:

* `apps/web/src`
* `apps/admin/src`

## Lobe UI Components Relevant To This Migration

### Inputs And Form Controls

| Need | Lobe UI target | Notes |
| --- | --- | --- |
| Text input | `Input` | Already used in AI settings. Good default replacement for plain text fields. |
| Password input | `InputPassword` | Use for provider keys, login password, secret/token fields. |
| Number input | `InputNumber` | Use for pricing, retry counts, credit amounts, limits, temperature/topP/etc. |
| Multiline text | `TextArea` | Use for prompts, JSON-ish text, descriptions, bios. |
| OTP | `InputOPT` | Already used on login; keep and only theme/fix styling if needed. |
| Hotkey input | `HotkeyInput` | Not a current priority. Useful later for shortcut settings. |
| Slider + numeric input | `SliderWithInput` | Good candidate for AI params like temperature/topP if UX wants richer controls. |
| Editable inline text | `EditableText` | Not current priority; useful later for inline labels/names. |

### Choice Controls

| Need | Lobe UI target | Notes |
| --- | --- | --- |
| Select/dropdown select | `Select` | Main replacement for native `<select>` and custom `ModelSelect`. Supports options better than native styling. |
| Autocomplete | `AutoComplete` | Useful for model/search-like fields if options are many. |
| Checkbox | `Checkbox`, `CheckboxGroup` | Replace raw `type="checkbox"` in admin/provider capability settings. |
| Switch | `Switch` from base-ui or AntD/Lobe surface | Replace `SettingsSwitch` and boolean settings toggles. |
| Segmented choices | `Segmented` | Good for compact mode/type selection. |
| Tabs | `Tabs` | Only replace if existing tabs are self-written base UI. |
| Date | `DatePicker` | Not currently central; keep in inventory. |
| Color choices | `ColorSwatches`, `ImageSelect` | Potentially useful for theme/avatar choices, not MVP. |

### Forms And Layout Helpers

| Need | Lobe UI target | Notes |
| --- | --- | --- |
| Form container | `Form` | Good target for settings/admin forms if validation and layout can align. |
| Form row/item | `FormItem` | Use for label/help/error standardization. |
| Form groups | `FormGroup` | Can replace repeated settings form groups where appropriate. |
| Modal form | `FormModal` | Candidate for add/edit provider/model dialogs. |
| Submit footer | `FormSubmitFooter` | Candidate if it can preserve our button style. |

### Floating And Overlay

| Need | Lobe UI target | Notes |
| --- | --- | --- |
| Modal | `Modal` | Replace custom `ModalShell` if API/styling fits. |
| Drawer | `Drawer` | Use for side editing/detail flows if introduced. |
| Popover | `Popover` | Replace custom small floating panels where they are base UI, not bespoke product UI. |
| Tooltip | `Tooltip` | Already used as `LobeTooltip`; continue. |
| Dropdown menu | `DropdownMenu`, `Dropdown` | Already used in AI settings; expand for action menus. |
| Context menu | `ContextMenu*` helpers | Not current priority. |

### Feedback And Display

| Need | Lobe UI target | Notes |
| --- | --- | --- |
| Alert | `Alert` | Use for settings warnings/errors instead of bespoke warning boxes where suitable. |
| Empty state | `Empty` | Candidate for blank lists/states. |
| Skeleton | `Skeleton` suite | Candidate for loading states. |
| Tag | `Tag` | Candidate for status/capability chips. |
| Text/Typography | `Text`, `Typography` | Use sparingly; project typography tokens still matter. |
| Toast | `toast`, `ToastHost` | Explicitly out of scope; keep `sonner`. |

## Project Replacement Checklist

### P0 Foundation

| Area | Current | Target | Status |
| --- | --- | --- | --- |
| Web theme provider | AntD token mapping in `apps/web/src/components/DichaLobeProvider.tsx` | Expand component tokens for form controls and overlays | To do |
| Admin theme provider | Static token mapping in `apps/admin/src/components/DichaLobeProvider.tsx` | Mirror relevant component tokens | To do |
| Base wrapper layer | None | Thin wrappers for high-volume controls, optional direct imports for low-volume controls | Decide |
| Buttons | Project-specific class/style | Keep project style; only bridge where Lobe forms need it | Keep |
| Toast | `sonner` | Keep `sonner`; separate visual task later | Out of scope |

### P1 Web Small Wins

| File | Current | Target | Notes |
| --- | --- | --- | --- |
| `apps/web/src/components/SettingsScaffold.tsx` | Custom `SettingsSwitch` with `button role="switch"` | `Switch` | Low blast radius; used in settings pages. |
| `apps/web/src/components/ModelSelect.tsx` | Native `<select>` with `optgroup` | `Select` | Preserve group labels, empty option, unavailable state, selected model helper text. |
| `apps/web/src/features/settings/ai-invoke-demo-page.tsx` | Native `select/input/textarea` | `Select/Input/TextArea` | Simple test page, good early migration. |
| `apps/web/src/features/settings/credits-page.tsx` | Single native `input` | `Input` | Tiny replacement. |
| `apps/web/src/routes/login.tsx` | Native login inputs + `InputOPT` | `Input/InputPassword`, keep `InputOPT` | OTP already Lobe UI. |

### P2 Web Core Forms

| File | Current | Target | Notes |
| --- | --- | --- | --- |
| `apps/web/src/features/settings/ai-settings-pages.tsx` | `TextField`, raw `textarea`, raw `select`, raw numeric `input`, `ModalShell` | `Input/InputPassword/TextArea/Select/InputNumber/Modal/FormModal/FormItem` | Biggest Web chunk; do after foundation and small wins. |
| `apps/web/src/routes/_app/account.tsx` | `SelectControl`, native `input/select/textarea` | `Input/TextArea/Select/FormItem` | Important user-facing profile/security flow. |

### P3 Admin Console

| File | Current | Target | Notes |
| --- | --- | --- | --- |
| `apps/admin/src/routes/_admin.dicha-ai.tsx` | Heavy `admin-input`, raw select/textarea/checkbox | `Input/InputPassword/InputNumber/TextArea/Select/Checkbox/Switch/Form` | Highest Admin concentration. |
| `apps/admin/src/routes/_admin.ai-providers.tsx` | Heavy `admin-input`, raw checkbox/select/textarea | Same as above | Provider/model config forms. |
| `apps/admin/src/routes/_admin.credits.*.tsx` | Local `NumberField`, raw inputs/textareas | `Input/InputNumber/TextArea` | Several small forms. |
| `apps/admin/src/routes/_admin.audit-logs.tsx` | Search/filter input/select | `Input/Select` | Low complexity. |
| `apps/admin/src/routes/_admin.analytics.tsx` | Select filters | `Select` | Low complexity. |
| `apps/admin/src/routes/_admin.basic.tsx` | Input/select filters | `Input/Select` | Low complexity. |
| `apps/admin/src/routes/login.tsx` | Native login inputs | `Input/InputPassword` | Keep admin login visual aligned. |

## Recommended Migration Order

1. Foundation: theme token expansion and optional wrapper layer.
2. Web P1: `SettingsSwitch`, `ModelSelect`, AI invoke demo, credits input, login inputs.
3. Web P2: AI settings forms/modals, account profile/security controls.
4. Admin P3: provider/Dicha AI pages first, then smaller admin pages.
5. Cleanup: remove obsolete local field components/classes where no longer referenced.

## Risks And Watchpoints

* Lobe UI uses AntD tokens and `polished`; token values must be concrete parseable colors, not unresolved CSS variable strings.
* Select replacement can subtly change value types and `onChange` signatures compared with native events.
* Modal/Form replacement may affect focus trapping, enter-to-submit, escape-close, and async submit flows.
* Admin pages may rely on dense layout; Lobe default spacing may need local size overrides.
* `InputOPT` previously had border/focus visual regressions; preserve the latest fix while touching shared input styles.
* Theme changes must be checked in both light and dark Web themes; Admin currently appears light-only.
* Avoid top-level dynamic imports from `@lobehub/icons` such as `ModelIcon`, `ProviderIcon`, and `modelMappings` in route chunks. They pull a large icon registry into the page bundle. Prefer a small explicit icon whitelist or lightweight fallbacks.

## Bundle Notes

`apps/web/src/features/settings/ai-settings-pages.tsx` was previously emitted as a ~3.2 MB route chunk because the page imported `ModelIcon`, `ProviderIcon`, and `modelMappings` from `@lobehub/icons`, which caused the dynamic model/provider SVG registry to be bundled with the route. Replacing that usage with explicit subpath icon imports for common providers/models reduced the route chunk to ~452 KB in a local Vite production build. Lobe/AntD control code is now emitted as a shared `DichaControls` chunk instead of being embedded in the AI settings route.
