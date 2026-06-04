# Research: HeroUI v3 + Tailwind v4 setup for `apps/web` (React 19 + Vite)

- **Query**: Current stable setup of `@heroui/react` v3 + `@heroui/styles` + Tailwind v4 (`@tailwindcss/vite`) in a React 19 + Vite app; theming via oklch vars + day/night swap; React 19 / React Aria caveats; react-hook-form `<Controller>` integration (zod); a smoke example.
- **Scope**: external (HeroUI official docs + npm registry) + internal repo mapping
- **Date**: 2026-06-04
- **Verification source**: HeroUI `heroui-react` skill's official doc-fetcher scripts (`~/.claude/skills/heroui-react/scripts/*.mjs`, which pull live from `heroui.com` and the `heroui-inc/heroui@v3` GitHub source) + `npm view` for current versions/peer deps. (context7 MCP was not callable as a tool in this run; the skill scripts hit the same authoritative HeroUI v3 source.)

> The bundled skill `SKILL.md` documents v3.0.1; the **live registry/theme endpoint report v3.0.5 docs and v3.1.0 packages**. Figures below are from the live registry.

---

## ⚠️ Two findings that contradict the task brief — read first

1. **HeroUI v3 has NO `HeroUIProvider`.** The provider was a **v2** concept. v3 needs *no* HeroUI provider in the app root — you import the CSS and render components directly. Both the HeroUI skill (authored by HeroUI) and the official theming doc render components with no HeroUI provider. The app root only needs the CSS import; optionally wrap with **React Aria's** `RouterProvider`/`I18nProvider` (see §3/§5), not a HeroUI one. Do **not** scaffold a `HeroUIProvider`.
2. **Vite 7/8 require Node `^20.19.0 || >=22.12.0`.** The repo `package.json` `engines.node` is `">=20"` and `.nvmrc` is bare `20`. Node `20.0–20.18` will be **rejected** by Vite. Bump the floor to `>=20.19` (or `.nvmrc` → `20.19.0`/`22`).

---

## Findings

### 1. Current stable versions (npm, 2026-06-04)

| Package | Latest | Notes for this repo |
|---|---|---|
| `@heroui/react` | **3.1.0** | peer: `react >=19.0.0`, `react-dom >=19.0.0`, `tailwindcss >=4.0.0`. **Bundles** `react-aria-components@1.17.0`, `tailwind-variants@3.2.2`, `tailwind-merge@3.4.0`, `@react-aria/*` as direct deps. |
| `@heroui/styles` | **3.1.0** | peer: `tailwindcss >=4.0.0`. Ships the CSS imported via `@heroui/styles`. Keep version-locked to `@heroui/react`. |
| `tailwindcss` | **4.3.0** | v4 mandatory; v3 will not work. |
| `@tailwindcss/vite` | **4.3.0** | peer: `vite ^5.2 || ^6 || ^7 || ^8`. Keep aligned with `tailwindcss`. |
| `vite` | 8.0.16 | engines `^20.19.0 \|\| >=22.12.0`. **Recommend pinning Vite 7.x** for a stable scaffold (Vite 8 + plugin-react 6 is rolldown-based / bleeding edge). |
| `@vitejs/plugin-react` | 6.0.2 (→ Vite 8 only) | **Use `^5.2.0`** (peer `vite ^4.2 \|\| 5 \|\| 6 \|\| 7 \|\| 8`) if you pin Vite 7. v6 peer-requires `vite ^8` + rolldown babel plugin. |
| `react` / `react-dom` | 19.x | repo already resolves `react@19.2.7` / `react-dom@19.2.7` in `pnpm-lock.yaml` — satisfies HeroUI's `>=19`. |
| `react-hook-form` | 7.77.0 | peer: `react ^16.8 \|\| 17 \|\| 18 \|\| 19`. |
| `@hookform/resolvers` | 5.4.0 | peer: `react-hook-form ^7.55.0`. Import path: `@hookform/resolvers/zod`. |
| `zod` | 4.4.3 | for the shared contract schemas. |
| `@gravity-ui/icons` | 2.18.0 | icon set used throughout HeroUI v3 docs examples (optional). |
| `tailwind-variants` | 3.2.2 | bundled by `@heroui/react`; install explicitly only if app code authors its own `tv()` variants. |

> `react-aria-components` is a **transitive** dep of `@heroui/react` (pinned `1.17.0`). Do **not** add it to `apps/web` directly unless you import its primitives (e.g. `RouterProvider`); if you do, match `^1.17`.

### 2. Install + Vite plugin + CSS entry + app root

**Install (recommended stable combo: Vite 7 + plugin-react 5):**
```bash
pnpm --filter @vidorra/web add @heroui/react @heroui/styles
pnpm --filter @vidorra/web add react react-dom
pnpm --filter @vidorra/web add react-hook-form @hookform/resolvers zod
pnpm --filter @vidorra/web add -D vite@^7 @vitejs/plugin-react@^5 @tailwindcss/vite tailwindcss \
  typescript @types/react @types/react-dom
# optional: pnpm --filter @vidorra/web add @gravity-ui/icons tailwind-variants
```
> The web package has no `package.json` yet (`apps/web/README.md` is a placeholder). Create one with `"name": "@vidorra/web"` so the `--filter` above works and Turbo picks up `dev`/`build`/`typecheck`. Workspace globs already include `apps/*` (`pnpm-workspace.yaml`).

**`apps/web/vite.config.ts`** — register the Tailwind v4 Vite plugin (no `tailwind.config.js`, no PostCSS needed in v4):
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

**`apps/web/src/index.css`** — Tailwind first, HeroUI styles after (import order matters):
```css
@import "tailwindcss";
@import "@heroui/styles";
```

**`apps/web/index.html`** — set the active theme statically on `<html>` (Vite SPA = no SSR, so no hydration concern):
```html
<html lang="zh-CN" class="light" data-theme="light">
  <body class="bg-background text-foreground">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**`apps/web/src/main.tsx`** — import the CSS; **no `HeroUIProvider`**:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```
> Optional (only if you want HeroUI `Link`/pressable `href` to drive TanStack Router): wrap `<App/>` with React Aria's `RouterProvider` from `react-aria-components` and call `router.navigate`. Locale → `I18nProvider`. Both come from `react-aria-components` (bundled), not from HeroUI.

### 3. Theme via oklch CSS variables + day/night (昼夜) swap

**Where the variables live** (from `node scripts/get_theme.mjs`, theme `default`, v3.0.5):
- Imported by `@import "@heroui/styles"`. Primitives + light values are declared on **`:root, [data-theme='light']`**; dark overrides on **`[data-theme='dark']`**. All colors are `oklch(...)`.
- Naming: no suffix = background (`--accent`, `--background`, `--surface`); `-foreground` = text on it (`--accent-foreground`). Hover/soft/secondary tints are **derived** via `color-mix(...)` from the base vars, so overriding a base (e.g. `--accent`, `--surface`) cascades automatically.
- Key semantic vars to drive a palette: `--background`, `--foreground`, `--surface`, `--overlay`, `--accent`(+`-foreground`), `--default`, `--muted`, `--border`, `--separator`, `--focus`, `--radius`, plus status `--success/--warning/--danger`.

**Switch dark/light at runtime** — toggle BOTH `class` and `data-theme` on `<html>` (HeroUI keys off `data-theme`; `class="dark"` keeps Tailwind's `dark:` utilities working). No `next-themes` (that's the Next.js path); for Vite use a tiny vanilla helper:
```ts
// apps/web/src/lib/theme.ts
export type Mode = "light" | "dark";
export function applyTheme(mode: Mode) {
  const html = document.documentElement;
  html.dataset.theme = mode;             // HeroUI semantic vars
  html.classList.toggle("dark", mode === "dark"); // Tailwind dark: utilities
  localStorage.setItem("theme", mode);
}
```

**Day/night palette swap (the project's 昼夜 goal):** override the oklch vars in `:root` *after* the two imports — these win over HeroUI defaults. Either override `:root` directly, or define named theme blocks and switch `data-theme` to them at runtime (the docs' own pattern, e.g. an `ocean`/`ocean-dark` pair):
```css
/* apps/web/src/index.css — after the two @imports */
:root {                       /* day palette */
  --accent: oklch(0.62 0.195 254);
  --background: oklch(0.97 0 0);
}
[data-theme="night"] {        /* night palette — flip data-theme to "night" at runtime */
  color-scheme: dark;
  --accent: oklch(0.70 0.16  264);
  --background: oklch(0.16 0.01 286);
  --foreground: var(--snow);
  --surface: oklch(0.21 0.006 286);
  /* …override only the bases you want; color-mix derivations follow */
}
```
Because HeroUI components read these vars, swapping the `data-theme` value (or live-mutating `document.documentElement.style.setProperty('--accent', ...)`) re-skins the whole UI with no component changes — the intended runtime palette mechanism. (Source: `/docs/react/getting-started/theming.mdx` "Override colors" + "Create your own theme".)

### 4. React 19 + React Aria compatibility caveats

- **React 19 is required, not optional**: `@heroui/react@3.1.0` peer = `react >=19.0.0`, `react-dom >=19.0.0`. Repo is already on React 19.2.7 ✔.
- **Built on React Aria**: v3 depends on `react-aria-components@1.17.0` (bundled). React Aria 1.x officially supports React 19; install is clean.
- **Event API differs from DOM**: React Aria form controls (`TextField`, `Switch`, `Checkbox`, …) pass the **value** to `onChange` (a `string`/`boolean`/`Set`), **not** a DOM event — so `onChange={(value) => …}`, never `e.target.value`. Buttons use **`onPress`**, not `onClick`. This is the #1 gotcha when wiring forms/handlers.
- **Refs**: under React 19 `ref` is a normal prop; attach RHF's `field.ref` to `<Input>` (React Aria forwards it to the DOM input) for focus-on-error.
- **No SSR/hydration concerns** for a pure Vite SPA: set `data-theme`/`class` statically in `index.html`. (`suppressHydrationWarning` + `next-themes` are only for SSR frameworks.) `@react-aria/ssr` is bundled but inert in CSR.
- **Compound API**: components compose via dot-notation subcomponents (`Card.Header`, `Card.Title`, …); do not flatten to props (that was v2).

### 5. HeroUI controlled input ↔ react-hook-form `<Controller>` (+ zod)

`TextField` is fully controlled with `value` (string) + `onChange(value)`; that maps 1:1 onto `<Controller>`'s `field`. Drive invalid state from `fieldState.error` and render `<FieldError>`:
```tsx
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Form, Input, Label, TextField, FieldError } from "@heroui/react";

const schema = z.object({ email: z.string().email("请输入有效邮箱") });
type FormValues = z.infer<typeof schema>; // reuse a shared contract schema here

export function EmailForm() {
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  return (
    <Form className="flex w-96 flex-col gap-4" onSubmit={handleSubmit((d) => console.log(d))}>
      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            name={field.name}
            type="email"
            value={field.value ?? ""}          // RHF value -> React Aria
            onChange={field.onChange}           // React Aria passes the string back
            onBlur={field.onBlur}
            isInvalid={!!fieldState.error}
          >
            <Label>Email</Label>
            <Input ref={field.ref} placeholder="you@example.com" />
            <FieldError>{fieldState.error?.message}</FieldError>
          </TextField>
        )}
      />
      <Button type="submit">提交</Button>
    </Form>
  );
}
```
> Alternative (no RHF): HeroUI `<Form>` + per-field `validate={(v) => …}` uses React Aria's native validation and `new FormData(e.currentTarget)` on submit (see `form.mdx`). The task wants the `<Controller>` + zod path above so contract schemas are reused.

### 6. Smoke example (proves the Tailwind + HeroUI pipeline)

```tsx
// apps/web/src/App.tsx
import { Button, Card } from "@heroui/react";

export function App() {
  return (
    <main className="min-h-dvh grid place-items-center bg-background text-foreground p-6">
      <Card className="w-[360px]">
        <Card.Header>
          <Card.Title>安逸生活 · web</Card.Title>
          <Card.Description>HeroUI v3 + Tailwind v4 styling pipeline OK.</Card.Description>
        </Card.Header>
        <Card.Content>
          <p className="text-muted text-sm">If this is styled, the CSS imports resolved.</p>
        </Card.Content>
        <Card.Footer>
          <Button onPress={() => alert("pressed")}>Primary</Button>
          <Button variant="secondary">Secondary</Button>
        </Card.Footer>
      </Card>
    </main>
  );
}
```
If colors/spacing render and the button shows the accent fill, the `@import "tailwindcss"` + `@import "@heroui/styles"` chain and the `@tailwindcss/vite` plugin are wired correctly. Toggle `document.documentElement.dataset.theme` between `light`/`dark` to confirm the oklch swap.

---

## Repo mapping summary (Node 20, Vite, React 19, TS strict NodeNext)

| Concern | This repo | Action |
|---|---|---|
| Package | `apps/web` placeholder, no `package.json` | create `@vidorra/web` pkg with `dev`/`build`/`typecheck` so Turbo + `pnpm --filter` work |
| Node | `engines.node: ">=20"`, `.nvmrc: 20` | **raise floor to `>=20.19`** (Vite 7/8 hard requirement) |
| Bundler | Vite (monorepo) | Vite `^7` + `@vitejs/plugin-react@^5` + `@tailwindcss/vite` (or Vite 8 + plugin-react 6 if you want bleeding edge) |
| React | 19.2.7 resolved in lockfile | satisfies HeroUI `>=19` ✔ |
| TS | strict, `NodeNext` (`tsconfig.base.json`) | fine; HeroUI ships its own types. Vite/JSX configs are app-local. |
| Provider | task brief says "HeroUIProvider" | **none** — v3 removed it; CSS import only |
| Forms | zod contract schemas via `@hookform/resolvers/zod` | `<Controller>` pattern in §5 |

## Caveats / Not Found

- `@heroui/react` is **v3.1.0** live, while the local skill `SKILL.md` still says 3.0.1 — trust the live versions in §1.
- HeroUI's official **Vite getting-started doc 500'd** at fetch time (`/docs/react/getting-started/vite`, `/installation`, `/handbook/dark-mode` all returned HTTP 500). The Vite/PostCSS specifics above are reconstructed from the **theming doc** (which fetched fine), the **Tailwind v4 + Vite** plugin contract (`@tailwindcss/vite` peer = `vite ^5.2 || 6 || 7 || 8`), and the skill's Next.js setup adapted to Vite. Re-fetch the Vite doc when the endpoint recovers to confirm any HeroUI-specific Vite note.
- Whether to pin **Vite 7 vs 8** is a project call (stability vs latest); both satisfy `@tailwindcss/vite` and the Node `>=20.19` floor.
- I did not run an install or build (research scope only); versions/peers are from `npm view`, not from a resolved lockfile in `apps/web`.
