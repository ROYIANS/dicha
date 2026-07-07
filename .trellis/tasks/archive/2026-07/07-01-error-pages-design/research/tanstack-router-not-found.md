# TanStack Router not-found handling

## Sources

* TanStack Router Not Found Errors guide: https://tanstack.com/router/v1/docs/guide/not-found-errors
* TanStack Router RouterOptions type: https://tanstack.com/router/v1/docs/api/router/RouterOptionsType

## Findings

* Current TanStack Router v1 recommends `notFoundComponent` on routes and `defaultNotFoundComponent` on `createRouter`.
* `NotFoundRoute` is deprecated and should not be used for new code.
* Non-matching paths automatically throw a not-found error.
* `notFoundMode: 'root'` can force not-found rendering through the root boundary instead of fuzzy matching to a nested layout.
* `defaultErrorComponent` remains the router-wide fallback for thrown errors.

## Repo Mapping

* `apps/web/src/routes/__root.tsx` can define `notFoundComponent` and a richer `errorComponent`.
* `apps/web/src/router.tsx` can define `defaultNotFoundComponent`, `defaultErrorComponent`, and likely `notFoundMode: 'root'` if we want the global creative 404 outside authenticated `_app` chrome.
* A shared component under `apps/web/src/components/` can keep visual and text behavior consistent across 404 and 500-style states.
