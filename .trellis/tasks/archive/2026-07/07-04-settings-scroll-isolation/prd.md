# Fix Settings Route Scroll Isolation

## Goal

Fix app route scrolling so settings home, settings detail pages, and other app pages do not inherit each other's scroll position when navigating or going back.

## Requirements

- Reset the app content scroll container to the top on route pathname changes.
- Apply the reset globally at the authenticated app layout level, not only inside settings detail pages.
- Ensure browser back navigation also lands at the top of the destination page.
- Remove redundant route-local scroll reset code if the layout-level behavior replaces it.

## Acceptance Criteria

- [ ] Scrolling low on `/settings`, then opening a settings detail page shows the detail page from its true top.
- [ ] Scrolling low on `/settings/profile`, then going back to `/settings` shows settings home from the top.
- [ ] Settings pages no longer rely on detail-shell-only scroll reset.
- [ ] Lint and typecheck pass using local pnpm 9.

## Definition of Done

- Code is updated and verified.
- Trellis check is loaded before final reporting.
- Spec update considered; update only if a reusable rule is learned.

## Technical Notes

- The shared scroll container is `.app-content-scroll` in `apps/web/src/routes/_app.tsx`.
- Existing partial reset lives in `apps/web/src/components/SettingsScaffold.tsx`.
- Use `/Users/xiaomengdao/.nvm/versions/node/v24.11.0/bin/pnpm` only.
