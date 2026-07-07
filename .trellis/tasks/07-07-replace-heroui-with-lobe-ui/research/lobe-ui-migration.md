# Lobe UI Migration Research

## Sources

* Local source: `D:\Code\Study\lobe-ui`
* Context7 library docs: `/lobehub/lobe-ui`
* Ant Design docs: `/ant-design/ant-design`
* Current app source: `D:\Code\Study\vidorra-life`

## Package and dependency facts

* Lobe UI package name is `@lobehub/ui`.
* Local package version inspected: `5.19.0`.
* Peer dependencies include:
  * `antd ^6.1.1`
  * `motion ^12.0.0`
  * `react ^19.0.0`
  * `react-dom ^19.0.0`
* Lobe UI docs show app setup with:
  * `ThemeProvider` from `@lobehub/ui`
  * `ConfigProvider` from `@lobehub/ui`
  * `motion` from `motion/react`, passed as `ConfigProvider motion={motion}`
* The project already uses React 19, so React peer alignment is favorable.

## Exports and component mapping

`@lobehub/ui` main export includes:

* `ThemeProvider`
* `ConfigProvider`
* `Input`, `InputNumber`, `InputPassword`, `TextArea`, `InputOPT`
* `Dropdown`, `DropdownMenu`
* `Tooltip`
* `Form`, `Button`, and other base components

`@lobehub/ui/base-ui` also exports lower-level base components:

* `Button`
* `DropdownMenu`
* `Tooltip`
* `Select`
* `Segmented`
* `Tabs`
* `Switch`
* `Toast`

## HeroUI usage in current repo

Direct `@heroui/react` imports:

* `apps/web/src/features/settings/ai-settings-pages.tsx`
  * `Dropdown`
  * `Input`
  * `Tooltip`
* `apps/web/src/routes/login.tsx`
  * `InputOTP`

Global style imports:

* `apps/web/src/index.css`
  * `@import '@heroui/styles';`
* `apps/admin/src/index.css`
  * `@import '@heroui/styles';`

No direct `@heroui/react` imports were found in `apps/admin/src`.

## API differences to account for

### Tooltip

HeroUI usage is compound:

```tsx
<Tooltip>
  <Tooltip.Trigger>...</Tooltip.Trigger>
  <Tooltip.Content>...</Tooltip.Content>
</Tooltip>
```

Lobe UI base tooltip uses a prop-based shape:

```tsx
<Tooltip title="..." className="...">
  <button />
</Tooltip>
```

Migration should rewrite trigger/content compound blocks to `title` plus child element.

### Dropdown

HeroUI usage is compound:

```tsx
<Dropdown>
  <Dropdown.Trigger>...</Dropdown.Trigger>
  <Dropdown.Popover>
    <Dropdown.Menu selectedKeys onAction>
      <Dropdown.Item />
    </Dropdown.Menu>
  </Dropdown.Popover>
</Dropdown>
```

Lobe UI offers `DropdownMenu` with an item-based API and trigger children. The migration should map sort options into `items` with `key`, `label`, and click behavior rather than preserving compound menu markup.

### OTP

HeroUI usage is compound:

```tsx
<InputOTP maxLength={6} value={otp} onChange={setOtp} onComplete={verifyOtp}>
  <InputOTP.Group>
    <InputOTP.Slot index={0} />
    ...
  </InputOTP.Group>
</InputOTP>
```

Lobe UI local source has `InputOPT`, not `InputOTP`. It wraps `AntInput.OTP`.

Ant Design `Input.OTP` props include:

* `length`
* `value`
* `defaultValue`
* `disabled`
* `autoComplete`
* `formatter`
* `separator`
* `mask`
* `size`
* `variant`
* `onInput` — fires as fields change and returns `string[]`
* `onChange` — fires when all fields are filled and returns `string`

There is no documented `onComplete`; use `onChange` as the completion signal and `onInput` to maintain controlled partial state.

## Migration recommendation

Use Lobe UI as the new base component system and Ant Design as its required primitive layer:

1. Add provider plumbing in both `apps/web` and `apps/admin`.
2. Add a small theme adapter that maps existing CSS token values into AntD/Lobe theme tokens.
3. Replace current HeroUI callsites.
4. Remove HeroUI package dependencies and global CSS imports.
5. Keep specialized libraries unless separately requested:
   * `lucide-react`
   * `@lobehub/icons`
   * `recharts`
   * `sonner`
   * `altcha`
   * `boring-avatars`
   * `@tanstack/react-table`

## Risks

* AntD/Lobe default styles may visually drift from the project design unless token mapping is explicit.
* Removing `@heroui/styles` can affect global CSS variables if any remaining selectors rely on HeroUI token names.
* OTP completion behavior must be checked carefully because event semantics differ.
* Floating layer portal behavior should be verified for dropdowns and tooltips after provider setup.
