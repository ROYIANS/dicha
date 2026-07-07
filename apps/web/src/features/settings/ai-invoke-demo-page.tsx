import {
  Bot,
  CircleStop,
  Clock3,
  FlaskConical,
  Layers3,
  ReceiptText,
  Send,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type {
  AiInvokeAttempt,
  AiInvokeResponse,
  AiModelUseCase,
  AiSettlementCurrency,
  AiUsageStatus,
} from '@dicha/shared';
import { invokeAiStream } from '@/api/ai';
import { DichaInput, DichaSelect, DichaTextArea } from '@/components/base/DichaControls';
import { SettingsDetailShell } from '@/components/SettingsScaffold';
import { settingsTintClass, type SettingsTint } from '@/components/settings-ui';

const useCaseOptions = [
  'assistant',
  'item_profile',
  'image_understanding',
  'tagging',
  'summarization',
] satisfies AiModelUseCase[];

const statusTone = {
  success: 'sage',
  failure: 'pink',
  degraded: 'peach',
} satisfies Record<AiUsageStatus, SettingsTint>;

export function AiInvokeDemoPage() {
  const { t } = useTranslation();
  const [useCase, setUseCase] = useState<AiModelUseCase>('assistant');
  const [modelId, setModelId] = useState('');
  const [prompt, setPrompt] = useState('请用一句话介绍一下滴茶这个应用。');
  const [isRunning, setIsRunning] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [streamAttempts, setStreamAttempts] = useState<AiInvokeAttempt[]>([]);
  const [result, setResult] = useState<AiInvokeResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runStream = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setStreamText('');
    setStreamAttempts([]);
    setResult(null);
    setError(null);
    try {
      await invokeAiStream(
        {
          useCase,
          messages: [{ role: 'user', content: prompt.trim() }],
          ...(modelId.trim() ? { modelId: modelId.trim() } : {}),
        },
        {
          onDelta: (event) => setStreamText((current) => current + event.text),
          onAttempt: (event) => setStreamAttempts((current) => [...current, event.attempt]),
          onFinal: (event) => {
            setResult(event.response);
            setStreamText(event.response.text);
            toast.success(t('settings.detail.aiInvokeDemo.success'));
          },
          onError: (event) => {
            setError(new Error(event.message));
            setStreamAttempts(event.attempts);
            toast.error(t('settings.detail.aiInvokeDemo.failed'));
          },
        },
        controller.signal,
      );
    } catch (caught) {
      if (controller.signal.aborted) {
        toast.message(t('settings.detail.aiInvokeDemo.cancelled'));
      } else {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
        toast.error(t('settings.detail.aiInvokeDemo.failed'));
      }
    } finally {
      abortRef.current = null;
      setIsRunning(false);
    }
  };

  const cancelStream = () => {
    abortRef.current?.abort();
  };

  const canSubmit = prompt.trim().length > 0 && !isRunning;

  return (
    <SettingsDetailShell
      title={t('settings.detail.aiInvokeDemo.title')}
      subtitle={t('settings.detail.aiInvokeDemo.subtitle')}
    >
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="rounded-md border border-hairline bg-surface shadow-[inset_0_-2px_0_0_color-mix(in_oklab,var(--ink)_6%,transparent)]">
          <div className="flex items-center gap-2 border-b border-hairline bg-surface-alt px-4 py-3">
            <span className={`grid size-8 place-items-center rounded-md border border-hairline ${settingsTintClass.peach}`}>
              <FlaskConical size={15} />
            </span>
            <h2 className="text-[13px] font-semibold text-ink">
              {t('settings.detail.aiInvokeDemo.formTitle')}
            </h2>
          </div>
          <div className="space-y-4 p-4">
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-ink-faint">
                {t('settings.detail.aiInvokeDemo.useCase')}
              </span>
              <DichaSelect<AiModelUseCase>
                value={useCase}
                onChange={(next) => {
                  if (typeof next === 'string') setUseCase(next as AiModelUseCase);
                }}
                disabled={isRunning}
                options={useCaseOptions.map((item) => ({
                  label: t(`settings.aiUseCases.${item}`),
                  value: item,
                }))}
                className="w-full text-[12px]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-ink-faint">
                {t('settings.detail.aiInvokeDemo.modelId')}
              </span>
              <DichaInput
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                disabled={isRunning}
                placeholder={t('settings.detail.aiInvokeDemo.modelIdPlaceholder')}
                className="w-full text-[12px]"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-ink-faint">
                {t('settings.detail.aiInvokeDemo.prompt')}
              </span>
              <DichaTextArea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={isRunning}
                placeholder={t('settings.detail.aiInvokeDemo.promptPlaceholder')}
                className="min-h-40 w-full text-[12px] leading-relaxed"
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void runStream()}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-hairline bg-[var(--sidebar-bg)] px-3 text-[12px] font-medium text-sidebar-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={14} />
                {isRunning
                  ? t('settings.detail.aiInvokeDemo.running')
                  : t('settings.detail.aiInvokeDemo.run')}
              </button>
              {isRunning ? (
                <button
                  type="button"
                  onClick={cancelStream}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 text-[12px] font-medium text-ink transition-colors hover:bg-canvas"
                >
                  <CircleStop size={14} />
                  {t('settings.detail.aiInvokeDemo.cancel')}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <InvokeResultPanel
          result={result}
          error={error}
          isRunning={isRunning}
          streamText={streamText}
          streamAttempts={streamAttempts}
        />
      </div>
    </SettingsDetailShell>
  );
}

function InvokeResultPanel({
  result,
  error,
  isRunning,
  streamText,
  streamAttempts,
}: {
  result: AiInvokeResponse | null;
  error: Error | null;
  isRunning: boolean;
  streamText: string;
  streamAttempts: AiInvokeAttempt[];
}) {
  const { t } = useTranslation();

  if (!result && !isRunning && !streamText && streamAttempts.length === 0) {
    return (
      <section className="grid min-h-[420px] place-items-center rounded-md border border-hairline bg-surface px-6 text-center">
        <div className="max-w-sm">
          <Bot size={24} className="mx-auto text-ink-faint" />
          <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">
            {error
              ? t('settings.detail.aiInvokeDemo.error', { message: error.message })
              : t('settings.detail.aiInvokeDemo.noResponse')}
          </p>
        </div>
      </section>
    );
  }
  if (!result) {
    return (
      <section className="space-y-4">
        <div className="rounded-md border border-hairline bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-alt px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot size={15} className="text-ink-faint" />
              <h2 className="text-[13px] font-semibold text-ink">
                {t('settings.detail.aiInvokeDemo.responseTitle')}
              </h2>
            </div>
            <span className="rounded-md border border-hairline bg-chip-mist px-2 py-1 text-[11px] font-medium text-mist">
              {isRunning ? t('settings.detail.aiInvokeDemo.streaming') : t('settings.detail.aiInvokeDemo.status.failure')}
            </span>
          </div>
          <div className="space-y-4 p-4">
            {error ? (
              <div className="flex gap-2 rounded-md border border-hairline bg-chip-pink px-3 py-2 text-[12px] leading-relaxed text-pink">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                <span>{error.message}</span>
              </div>
            ) : null}
            <pre className="min-h-36 whitespace-pre-wrap rounded-md border border-hairline bg-canvas px-4 py-3 text-[13px] leading-relaxed text-ink">
              {streamText || t('settings.detail.aiInvokeDemo.waiting')}
            </pre>
          </div>
        </div>
        <AttemptsPanel attempts={streamAttempts} />
      </section>
    );
  }
  const lastLatencyMs = result.attempts.at(-1)?.latencyMs ?? null;

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-alt px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot size={15} className="text-ink-faint" />
            <h2 className="text-[13px] font-semibold text-ink">
              {t('settings.detail.aiInvokeDemo.responseTitle')}
            </h2>
          </div>
          <span
            className={`rounded-md border border-hairline px-2 py-1 text-[11px] font-medium ${settingsTintClass[statusTone[result.status]]}`}
          >
            {t(`settings.detail.aiInvokeDemo.status.${result.status}`)}
          </span>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <ResultMetric
              icon={Layers3}
              tint="mist"
              label={t('settings.detail.aiInvokeDemo.selected')}
              value={result.modelName ?? '-'}
            />
            <ResultMetric
              icon={ReceiptText}
              tint="sage"
              label={t('settings.detail.aiInvokeDemo.usage')}
              value={`${result.usage.totalTokens} / ${formatInvokeCost(result.usage.estimatedCostCurrency, result.usage.estimatedCostAmount)}`}
            />
            <ResultMetric
              icon={Clock3}
              tint="lavender"
              label={t('settings.detail.aiInvokeDemo.latencyMetric')}
              value={
                lastLatencyMs === null
                  ? '-'
                  : t('settings.detail.aiInvokeDemo.latency', { value: lastLatencyMs })
              }
            />
          </div>

          {result.errorCategory ? (
            <div className="flex gap-2 rounded-md border border-hairline bg-chip-pink px-3 py-2 text-[12px] leading-relaxed text-pink">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />
              <span>{result.message ?? result.errorCategory}</span>
            </div>
          ) : null}

          <pre className="min-h-36 whitespace-pre-wrap rounded-md border border-hairline bg-canvas px-4 py-3 text-[13px] leading-relaxed text-ink">
            {result.text}
          </pre>
        </div>
      </div>

      <AttemptsPanel attempts={result.attempts} />
    </section>
  );
}

function ResultMetric({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: LucideIcon;
  tint: SettingsTint;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface-alt px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`grid size-7 place-items-center rounded-md border border-hairline ${settingsTintClass[tint]}`}>
          <Icon size={14} />
        </span>
        <span className="text-[11px] text-ink-faint">{label}</span>
      </div>
      <p className="mt-2 truncate text-[13px] font-medium text-ink">{value}</p>
    </div>
  );
}

function formatInvokeCost(currency: AiSettlementCurrency | null, amount: number): string {
  if (!currency) return '-';
  const symbol = currency === 'CNY' ? '¥' : '$';
  return `${symbol}${amount.toFixed(amount >= 1 ? 2 : 4)}`;
}

function AttemptsPanel({ attempts }: { attempts: AiInvokeAttempt[] }) {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="border-b border-hairline bg-surface-alt px-4 py-3">
        <h2 className="text-[13px] font-semibold text-ink">
          {t('settings.detail.aiInvokeDemo.attemptsTitle')}
        </h2>
      </div>
      <div className="divide-y divide-hairline/70">
        {attempts.map((attempt, index) => (
          <AttemptRow
            key={`${attempt.providerId}:${attempt.modelId}:${attempt.status}:${index}`}
            attempt={attempt}
          />
        ))}
      </div>
    </section>
  );
}

function AttemptRow({ attempt }: { attempt: AiInvokeAttempt }) {
  const { t } = useTranslation();
  const detail = useMemo(
    () =>
      [
        attempt.providerName,
        attempt.requestFormat,
        attempt.latencyMs === null
          ? null
          : t('settings.detail.aiInvokeDemo.latency', { value: attempt.latencyMs }),
      ]
        .filter(Boolean)
        .join(' / '),
    [attempt.latencyMs, attempt.providerName, attempt.requestFormat, t],
  );

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{attempt.modelName}</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">{detail}</p>
          {attempt.message ? (
            <p className="mt-1 text-[11px] leading-relaxed text-pink">{attempt.message}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-md border border-hairline px-1.5 py-0.5 text-[10px] font-medium ${settingsTintClass[statusTone[attempt.status]]}`}
        >
          {t(`settings.detail.aiInvokeDemo.status.${attempt.status}`)}
        </span>
      </div>
    </div>
  );
}
