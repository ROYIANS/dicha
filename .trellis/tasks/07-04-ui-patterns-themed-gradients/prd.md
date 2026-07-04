# UI Decorative Patterns and Themed Landing Gradients

## Goal

Improve the visual richness of non-landing pages by adding more advanced decorative pattern vocabulary, while fixing two landing page styles that currently remain tied to the original warm palette instead of following the active theme palette.

## Requirements

- Keep the existing landing page design language intact; the landing page already has enough major ornamentation.
- Introduce richer decorative patterns for app/internal pages, especially woven or dense tiled patterns, so pages do not rely only on simple grid and hatch lines.
- Update the landing page intro banner ("新功能：齐默默 —— 陪你慢慢归置") so its default gradient and hover state use theme-aware variables.
- Update the landing page hero gradient mask so it follows the selected theme palette instead of staying peach/warm by default.
- Preserve the current structural aesthetic: engineering-paper rails, hairline borders, restrained matte surfaces, and theme-driven CSS variables.

## Acceptance Criteria

- [x] Switching theme palettes changes the intro banner gradient and hover color.
- [x] Switching theme palettes changes the hero section gradient tint.
- [x] At least one non-landing app page uses a richer dense/woven decorative motif that still matches existing UI rules.
- [x] Existing landing page layout and interactions remain intact.
- [x] Lint/type-check pass for the web app.

## Definition of Done

- Tests or verification commands are run where practical.
- Visual changes are scoped to existing frontend structure and CSS variables.
- No unrelated dirty files are reverted or included.

## Technical Approach

Use existing CSS custom properties and theme palette tokens instead of hard-coded palette-specific chip colors. For app-page ornamentation, prefer small reusable React/SVG decoration primitives near existing page scaffolds, rather than introducing new dependencies.

## Out of Scope

- Redesigning the landing page from scratch.
- Changing theme palette definitions beyond variables needed for the new themed decorations.
- Adding new package dependencies.

## Technical Notes

- Landing page source: `apps/web/src/routes/index.tsx`.
- Global theme/style variables: `apps/web/src/index.css`.
- Existing settings page already contains grid and hatch decoration primitives that can be extended.
- Relevant spec index: `.trellis/spec/frontend/index.md`.
