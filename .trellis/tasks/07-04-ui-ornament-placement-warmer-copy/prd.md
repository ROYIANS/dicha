# UI Ornament Placement and Warmer Landing Copy

## Goal

Supplement the landing page with more refined linear/tiled ornament placement and soften the visible copy so it feels less mechanical and more like a gentle, thoughtful product voice. The page should keep its existing Zed-inspired engineering-paper structure, but with richer local pattern moments outside the hero.

## Requirements

- Refresh landing-page copy to feel warmer, calmer, and more human, with a restrained INFP-like gentleness.
- Avoid stiff feature phrasing, fake slogans, KPI language, and self-important poetic excess.
- Add or reuse linear/tiled ornament primitives such as weave, ledger, ticks, dot matrix, hatch, and masked grid.
- Place ornaments in meaningful structural zones: section boundaries, quiet empty cells, panel chrome, letter/author areas, and list bands.
- Keep existing landing-page structure and theme behavior. This is a supplemental polish pass, not a redesign.
- Lightly soften dashboard home copy where it is visibly mechanical.

## Acceptance Criteria

- [ ] Landing-page text reads warmer and less AI-generated while staying concise.
- [ ] Landing-page sections gain additional local pattern variety beyond only grid and slash.
- [ ] Decorative elements remain token-driven and theme-safe.
- [ ] No decorative engineering text, emoji, new images, or one-off hardcoded palette values are introduced.
- [ ] Lint and typecheck pass using the local machine pnpm 9 binary.
- [ ] Vite dev module graph is checked without stopping the user's manually running dev server.

## Definition of Done

- Frontend code updated and verified.
- Trellis check skill loaded before final reporting.
- Spec update considered; update only if this task establishes a new convention.
- Changes committed before archiving when the user confirms the commit plan.

## Technical Approach

Extend the landing page's existing ornament primitives in `apps/web/src/routes/index.tsx` rather than introducing a separate design system in this task. Add a small pattern-field primitive with variants for weave, ledger, and ticks, then use it in a few high-impact locations:

- Demo window chrome or background.
- Spec/readout strip.
- Principles empty cell.
- Extras ledger list.
- Author letter side panel.

Copy changes stay in the same route-level data/constants for now, matching the current landing-page implementation style.

## Decision (ADR-lite)

**Context**: The landing page already has strong structural bones, but many sections use the same simple grid/slash vocabulary.

**Decision**: Add local, masked, low-opacity linear pattern variants where layout already provides a structural reason for them, and revise copy in place.

**Consequences**: This keeps the polish tightly scoped and avoids a premature ornament component library. If the same pattern primitive spreads to more pages later, it should be extracted into `components/`.

## Out of Scope

- Full landing-page redesign.
- New illustration/image assets.
- New theme presets.
- Broad dashboard/app-shell redesign.
- Backend or content-management changes.

## Research References

- [`research/zed-ornament-placement.md`](research/zed-ornament-placement.md) — Zed reference observations for pattern placement and restraint.

## Technical Notes

- Relevant specs: `.trellis/spec/frontend/blueprint-aesthetic.md`, `.trellis/spec/frontend/design-system.md`, `.trellis/spec/frontend/component-guidelines.md`, `.trellis/spec/frontend/quality-guidelines.md`.
- Relevant code: `apps/web/src/routes/index.tsx`, `apps/web/src/index.css`, and lightly `apps/web/src/routes/_app/home.tsx`.
- Use `/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm` only.
