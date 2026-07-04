import { useId } from 'react';

export function SettingsPatternField() {
  const id = useId().replace(/:/g, '');
  const fine = `settings-fine-${id}`;
  const major = `settings-major-${id}`;
  const weave = `settings-weave-${id}`;

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 size-full"
      style={{
        color: 'var(--lp-deco)',
        maskImage: 'linear-gradient(to bottom, #000 0%, transparent 82%)',
        WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, transparent 82%)',
      }}
    >
      <defs>
        <pattern id={fine} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
        </pattern>
        <pattern id={major} width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill={`url(#${fine})`} />
          <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.15" />
        </pattern>
        <pattern id={weave} width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M-12 34C2 18 18 18 32 34S62 50 76 34"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="0.85"
            opacity="0.18"
          />
          <path
            d="M-12 14C2 30 18 30 32 14S62-2 76 14"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="0.85"
            opacity="0.14"
          />
          <path
            d="M10-12C26 2 26 18 10 32S-6 62 10 76"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="0.75"
            opacity="0.1"
          />
          <path
            d="M38-12C22 2 22 18 38 32S54 62 38 76"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="0.75"
            opacity="0.1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${major})`} />
      <rect width="100%" height="100%" fill={`url(#${weave})`} />
    </svg>
  );
}

export function SettingsSlash() {
  return (
    <div className="relative h-3.5 border-b border-hairline bg-canvas">
      <SettingsHatch />
    </div>
  );
}

function SettingsHatch() {
  const id = useId().replace(/:/g, '');
  const hatch = `settings-hatch-${id}`;

  return (
    <svg aria-hidden className="pointer-events-none size-full text-ink-faint">
      <defs>
        <pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${hatch})`} opacity="0.28" />
    </svg>
  );
}
