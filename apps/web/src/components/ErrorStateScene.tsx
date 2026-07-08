import { Link } from '@tanstack/react-router';
import { ArrowLeft, Compass, Home, RefreshCw, SearchX, ServerCrash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@/components/AppBrand';

type ErrorStateSceneProps = {
  variant: 'not-found' | 'error';
  errorMessage?: string;
};

type ErrorVariant = ErrorStateSceneProps['variant'];

type ErrorCopy = {
  eyebrow: string;
  code: string;
  title: string;
  body: string;
  note: string;
  signalLabel: string;
  signalValue: string;
};

type Tone = 'lavender' | 'peach' | 'sage' | 'mist' | 'pink';

const toneClass: Record<Tone, string> = {
  lavender: 'bg-chip-lavender text-lavender',
  peach: 'bg-chip-peach text-peach',
  sage: 'bg-chip-sage text-sage',
  mist: 'bg-chip-mist text-mist',
  pink: 'bg-chip-pink text-pink',
};

const toneBorderClass: Record<Tone, string> = {
  lavender: 'border-lavender',
  peach: 'border-peach',
  sage: 'border-sage',
  mist: 'border-mist',
  pink: 'border-pink',
};

export function ErrorStateScene({ variant, errorMessage }: ErrorStateSceneProps) {
  const { t } = useTranslation();
  const copy: ErrorCopy =
    variant === 'not-found'
      ? {
          eyebrow: t('errors.notFound.eyebrow'),
          code: t('errors.notFound.code'),
          title: t('errors.notFound.title'),
          body: t('errors.notFound.body'),
          note: t('errors.notFound.note'),
          signalLabel: t('errors.notFound.signalLabel'),
          signalValue: t('errors.notFound.signalValue'),
        }
      : {
          eyebrow: t('errors.error.eyebrow'),
          code: t('errors.error.code'),
          title: t('errors.error.title'),
          body: t('errors.error.body'),
          note: t('errors.error.note'),
          signalLabel: t('errors.error.signalLabel'),
          signalValue: t('errors.error.signalValue'),
        };
  const Icon = variant === 'not-found' ? SearchX : ServerCrash;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-canvas text-ink">
      <ErrorGrid />
      <div className="absolute inset-x-0 top-0 z-10 border-b border-hairline bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="inline-flex min-w-0 items-center gap-2">
            <BrandMark className="h-5 w-[30px]" style={{ color: 'var(--foreground)' }} />
            <span className="font-serif text-[16px] font-semibold text-ink">滴茶</span>
          </Link>
          <span className="rounded-md border border-hairline bg-surface-alt px-2.5 py-1 text-[11px] font-medium text-ink-faint">
            {copy.signalLabel}
          </span>
        </div>
      </div>

      <section className="relative z-[1] mx-auto grid min-h-dvh max-w-6xl items-center gap-8 px-4 pb-10 pt-20 sm:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] lg:gap-12">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-hairline bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-ink-faint">
            <Icon size={13} />
            {copy.eyebrow}
          </div>
          <p className="mt-7 font-serif text-7xl font-semibold leading-none text-ink sm:text-8xl lg:text-9xl">
            {copy.code}
          </p>
          <h1 className="mt-4 max-w-[11ch] font-serif text-4xl font-semibold leading-[1.08] text-ink sm:text-5xl lg:text-6xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-[42rem] text-[14px] leading-7 text-ink-soft sm:text-[15px]">
            {copy.body}
          </p>
          {errorMessage ? (
            <p className="mt-4 max-w-xl rounded-md border border-hairline bg-surface-alt px-3 py-2 text-[12px] leading-relaxed text-ink-faint">
              {errorMessage}
            </p>
          ) : null}

          <div className="mt-7 flex flex-col gap-2 sm:flex-row">
            <Link
              to="/"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-[var(--accent)] px-4 text-[13px] font-medium text-sidebar-ink shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--accent-foreground)_12%,transparent)] transition-[transform,opacity] active:translate-y-px"
            >
              <Home size={15} />
              {t('errors.actions.home')}
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-surface px-4 text-[13px] font-medium text-ink-soft shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--foreground)_8%,transparent)] transition-colors hover:text-ink active:translate-y-px"
            >
              <ArrowLeft size={15} />
              {t('errors.actions.back')}
            </button>
            {variant === 'error' ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-surface px-4 text-[13px] font-medium text-ink-soft shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--foreground)_8%,transparent)] transition-colors hover:text-ink active:translate-y-px"
              >
                <RefreshCw size={15} />
                {t('errors.actions.reload')}
              </button>
            ) : null}
          </div>
        </div>

        <LostRoomMap variant={variant} signal={copy.signalValue} note={copy.note} />
      </section>
    </main>
  );
}

function ErrorGrid() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklab,var(--foreground)_7%,transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab,var(--foreground)_7%,transparent) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(to bottom, #000 45%, transparent)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-px w-[200vw] -translate-x-1/2 bg-[color-mix(in_oklab,var(--foreground)_14%,transparent)]"
      />
    </>
  );
}

function LostRoomMap({
  variant,
  signal,
  note,
}: {
  variant: ErrorVariant;
  signal: string;
  note: string;
}) {
  const sceneTone: Tone = variant === 'not-found' ? 'mist' : 'pink';
  const active = toneBorderClass[sceneTone];

  return (
    <div className="relative min-h-[380px] overflow-hidden rounded-card border border-hairline bg-surface shadow-float lg:min-h-[520px]">
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-hairline bg-surface-alt px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`grid size-8 place-items-center rounded-md border border-hairline ${toneClass[sceneTone]}`}>
            <Compass size={15} />
          </span>
          <div>
            <p className="text-[12px] font-semibold text-ink">{signal}</p>
            <p className="text-[10px] text-ink-faint">{note}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={`h-1.5 w-5 rounded-full ${index === 0 ? 'bg-sage' : 'bg-hairline'}`}
            />
          ))}
        </div>
      </div>

      <div
        aria-hidden
        className="absolute inset-0 top-[57px] opacity-[0.22]"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklab,var(--foreground)_9%,transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab,var(--foreground)_9%,transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      <div className="absolute inset-x-8 bottom-8 top-24 sm:inset-x-12 sm:bottom-12">
        <MapPath variant={variant} />
        <RoomNode className="left-[5%] top-[22%]" label="衣橱" tone="lavender" />
        <RoomNode className="left-[35%] top-[7%]" label="书房" tone="peach" />
        <RoomNode className="right-[8%] top-[31%]" label="杂物间" tone="sage" />
        <RoomNode className="bottom-[13%] left-[18%]" label="世界" tone="mist" />
        <MissingNode variant={variant} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 grid border-t border-hairline bg-surface-alt sm:grid-cols-3">
        {['路径索引', '房间坐标', '返回信号'].map((item, index) => (
          <div
            key={item}
            className="border-b border-hairline px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
          >
            <p className="text-[10px] font-medium text-ink-faint">{item}</p>
            <p className="mt-1 text-[12px] font-semibold text-ink">
              {index === 0 ? '重新编目' : index === 1 ? '等待校准' : '可用'}
            </p>
          </div>
        ))}
      </div>

      <span className="absolute left-5 top-[57px] h-[calc(100%-57px)] w-px bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)]" />
      <span className="absolute right-5 top-[57px] h-[calc(100%-57px)] w-px bg-[color-mix(in_oklab,var(--foreground)_12%,transparent)]" />
      <span className={`absolute right-5 top-24 size-2 rotate-45 border bg-surface ${active}`} />
      <span className="absolute bottom-24 left-5 size-2 rotate-45 border border-hairline bg-surface" />
    </div>
  );
}

function MapPath({ variant }: { variant: ErrorVariant }) {
  const stroke = variant === 'not-found' ? 'var(--muted)' : 'var(--danger)';
  return (
    <svg className="absolute inset-0 size-full" aria-hidden viewBox="0 0 520 360" preserveAspectRatio="none">
      <path
        d="M34 92 C120 52 168 38 232 64 C306 96 310 158 400 152 C456 148 486 118 504 88"
        fill="none"
        stroke="color-mix(in oklab, var(--foreground) 14%, transparent)"
        strokeWidth="1"
        strokeDasharray="8 8"
      />
      <path
        d="M64 250 C136 222 186 248 230 196 C272 146 320 206 384 188 C434 174 468 212 492 252"
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={variant === 'not-found' ? '1 10' : '12 8'}
      />
      <path
        d="M150 66 L150 305 M312 42 L312 318 M36 176 L494 176"
        fill="none"
        stroke="color-mix(in oklab, var(--foreground) 10%, transparent)"
        strokeWidth="1"
      />
    </svg>
  );
}

function RoomNode({
  className,
  label,
  tone,
}: {
  className: string;
  label: string;
  tone: 'lavender' | 'peach' | 'sage' | 'mist';
}) {
  return (
    <div className={`absolute ${className}`}>
      <span className={`grid size-11 place-items-center rounded-md border border-hairline ${toneClass[tone]}`}>
        <Home size={17} />
      </span>
      <span className="mt-1 block rounded-md border border-hairline bg-surface px-2 py-1 text-[11px] font-medium text-ink-soft">
        {label}
      </span>
    </div>
  );
}

function MissingNode({ variant }: { variant: ErrorVariant }) {
  const tone: Tone = variant === 'not-found' ? 'mist' : 'pink';
  return (
    <div className="absolute bottom-[31%] right-[27%]">
      <div className={`relative grid size-24 place-items-center rounded-md border ${toneBorderClass[tone]} ${toneClass[tone]}`}>
        <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rotate-45 border border-current bg-surface" />
        <SearchX size={30} />
      </div>
      <p className="mt-2 max-w-32 rounded-md border border-hairline bg-surface px-2 py-1 text-[11px] font-medium leading-relaxed text-ink-soft">
        {variant === 'not-found' ? '这间房还没有被建档。' : '这间房暂时没有回应。'}
      </p>
    </div>
  );
}
