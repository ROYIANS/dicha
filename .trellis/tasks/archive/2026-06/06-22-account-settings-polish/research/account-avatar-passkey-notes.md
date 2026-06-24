# Account Avatar + Passkey Notes

## Boring Avatars

Sources:

- Boring Avatars README: https://raw.githubusercontent.com/boringdesigners/boring-avatars/master/README.md
- jsDelivr npm package page: https://www.jsdelivr.com/package/npm/boring-avatars

Findings:

- Use npm package `boring-avatars` instead of hosted avatar API.
- Current package version observed via jsDelivr/npm: `2.0.4`.
- The React component generates deterministic SVG avatars from a `name` seed.
- Supported variants include `marble`, `beam`, `pixel`, `sunset`, `ring`, and `bauhaus`.
- Important props for this task:
  - `name`
  - `variant`
  - `colors`
  - `size`
  - `square`
  - `title`
- For dicha, use a fixed warm palette derived from design tokens rather than the package default colors.
- Avoid remote avatar URLs for generated defaults; uploaded custom images remain supported through `/api/media/avatar`.

Recommended MVP:

- Use `Avatar` from `boring-avatars` in a small local wrapper, e.g. `GeneratedAvatar`.
- Seed candidates from stable values like `email`, `displayName`, `homeName`, and a few suffix variants.
- Save selected generated avatars as a deterministic descriptor string only if supported by existing `user.image` semantics, or use a local generated-avatar marker convention if needed. If that becomes awkward, render generated avatars as default/fallback and keep uploaded image URLs for persisted custom avatars.

## Better Auth Passkey

Sources:

- Better Auth passkey docs via Context7, from `docs/content/docs/plugins/passkey.mdx`

Findings:

- `authClient.passkey.addPasskey({ name })` supports an optional name. If omitted, Better Auth defaults to email or user ID.
- Existing passkeys can be renamed with `authClient.passkey.update({ id, name })`.
- Existing passkeys can be deleted with `authClient.passkey.deletePasskey({ id })` in this codebase's current client shape, or `passkey.delete` in upstream docs terminology.
- Existing list hook `useListPasskeys()` is already wired in `AccountModal`.

Recommended MVP:

- Prompt for a passkey name before calling `addPasskey`.
- Default suggested name can be device-ish and human readable, e.g. `Royians 的设备` or `Passkey · 2026-06-22`.
- Add inline rename UI per passkey row.
- Add confirmation before delete.
- No backend endpoint should be needed unless the installed client typings differ from docs.

