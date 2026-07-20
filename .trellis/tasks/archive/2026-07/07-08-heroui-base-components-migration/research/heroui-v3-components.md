# HeroUI v3 Components Research

## Sources

* `https://heroui.com/react/llms.txt`
* `https://heroui.com/react/llms-components.txt`
* `https://www.heroui.com/en/docs/react/components/select`

## Key Takeaways

* HeroUI v3 is built on Tailwind CSS v4 and React Aria Components, which matches the current frontend stack.
* Both `apps/web` and `apps/admin` already depend on `@heroui/react` and `@heroui/styles`.
* HeroUI's component set covers the broader migration areas:
  * Buttons: `Button`, `ButtonGroup`, `CloseButton`, `ToggleButton`, `ToggleButtonGroup`
  * Forms: `Form`, `InputGroup`, `InputOTP`, `NumberField`, `TextArea`, `Fieldset`, `Label`, `Description`, `FieldError`
  * Selection: `Select`, `ListBox`, `ComboBox`, `Autocomplete`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`
  * Layout/overlays: `Tabs`, `Modal`, `Drawer`, `AlertDialog`, `Dropdown`, `Tooltip`, `Toast`
  * Data display: `Table`, `Chip`, `Badge`, `Alert`, `Skeleton`, `Spinner`
* For this task, `Button`, `Modal`, and `Table` are intentionally out of scope even though HeroUI supports them.
* `Select` is composable: it uses `Select.Trigger`, `Select.Value`, `Select.Indicator`, `Select.Popover`, and `ListBox`.
* `ListBox.Section` exists and can map the current grouped model selector behavior where models are grouped by provider.

## Mapping for This Repo

| Current pattern | HeroUI target | Notes |
|---|---|---|
| Native `<input>` | `Input` | Preserve controlled values and validation messages. |
| Native numeric `<input>` | `NumberField` | Prefer for integer/decimal configuration where step/min matter. |
| Native `<textarea>` | `TextArea` | Preserve rows/min-height only where layout requires it. |
| Native `<select>` | `Select + ListBox` | Use `ListBox.Section` for grouped options. |
| Native checkbox | `Checkbox` or `Switch` | Boolean feature toggles should generally use `Switch`. |
| Custom `SettingsSwitch` | `Switch` | Thin wrapper can be kept only if it simplifies settings row layout. |
| Custom tab buttons | `Tabs` | Start with `_admin.system.tsx`. |
| Native table markup | `Table` | TanStack Table may still provide row/column models. |
| Custom modal shell | `Modal` / `AlertDialog` | Out of scope for this task. |
| Native/custom table markup | `Table` | Out of scope for this task. |
| Login OTP custom input | `InputOTP` | Web already uses it; admin should match. Remove heavy style overrides. |

## Suggested Migration Strategy

Start with low-risk controlled wrappers, then login, then large forms, then tables. Avoid turning the migration into a design polish pass; keep the visual target as HeroUI default plus existing global theme tokens.
