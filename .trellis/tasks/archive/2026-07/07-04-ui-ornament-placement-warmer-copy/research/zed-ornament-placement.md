# Zed Ornament Placement Notes

Reference: https://zed.dev/ fetched into `/tmp/zed-home.html` plus CSS snapshots `/tmp/zed-a.css` and `/tmp/zed-b.css`.

## Takeaways

- Zed's perceived richness comes more from placement discipline than from many unique patterns.
- Ornaments tend to live on structural edges: rails, section boundaries, panel chrome, masked media zones, CTA bands, and quiet empty cells.
- Pattern density is local and masked. Dense lines are usually clipped or faded so content remains calm.
- Repetition varies by section. A page can reuse line-based primitives, but adjacent sections should not feel like the same grid repeated.
- CTA and announcement areas can use a beam/band effect, but broad decorative gradients are still avoided.

## Mapping To This Task

- Keep the existing hero mostly intact; it already has grid, geometric watermark, and themed gradient.
- Add richer tiled/linear motifs to non-hero sections: ledger strips, weave fields, tick bands, and denser hatch cells.
- Prefer token-derived `currentColor`, `var(--lp-deco)`, `var(--ink)`, and `color-mix(...)`.
- Do not add decorative engineering labels, coordinates, fake numbers, or code-like text.
