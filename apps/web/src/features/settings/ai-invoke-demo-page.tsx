import { useMutation } from '@tanstack/react-query';
import {
  Bot,
  Clock3,
  FlaskConical,
  Layers3,
  ReceiptText,
  Send,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type {
  AiInvokeAttempt,
  AiInvokeResponse,
  AiModelUseCase,
  AiUsageStatus,
} from '@dicha/shared';
import { invokeAi } from '@/api/ai';
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

  const mutation = useMutation({
    mutationFn: () =>
      invokeAi({
        useCase,
        messages: [{ role: 'user', content: prompt.trim() }],
        ...(modelId.trim() ? { modelId: modelId.trim() } : {}),
      }),
    onSuccess: () => toast.success(t('settings.detail.aiInvokeDemo.success')),
    onError: () => toast.error(t('settings.detail.aiInvokeDemo.failed')),
  });

  const canSubmit = prompt.trim().length > 0 && !mutation.isPending;

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
              <select
                value={useCase}
                onChange={(event) => setUseCase(event.target.value as AiModelUseCase)}
                disabled={mutation.isPending}
                className="h-9 w-full rounded-md border border-hairline bg-surface px-3 text-[12px] text-ink outline-none focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
              >
                {useCaseOptions.map((item) => (
                  <option key={item} value={item}>
                    {t(`settings.aiUseCases.${item}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-ink-faint">
                {t('settings.detail.aiInvokeDemo.modelId')}
              </span>
              <input
                value={modelId}
                onChange={(event) => setModelId(event.target.value)}
                disabled={mutation.isPending}
                placeholder={t('settings.detail.aiInvokeDemo.modelIdPlaceholder')}
                className="h-9 w-full rounded-md border border-hairline bg-surface px-3 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-ink-faint">
                {t('settings.detail.aiInvokeDemo.prompt')}
              </span>
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={mutation.isPending}
                placeholder={t('settings.detail.aiInvokeDemo.promptPlaceholder')}
                className="min-h-40 w-full resize-y rounded-md border border-hairline bg-surface px-3 py-2 text-[12px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-mist disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => mutation.mutate()}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-hairline bg-[var(--sidebar-bg)] px-3 text-[12px] font-medium text-sidebar-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={14} />
              {mutation.isPending
                ? t('settings.detail.aiInvokeDemo.running')
                : t('settings.detail.aiInvokeDemo.run')}
            </button>
          </div>
        </section>

        <InvokeResultPanel result={mutation.data} error={mutation.error} />
      </div>
    </SettingsDetailShell>
  );
}

function InvokeResultPanel({
  result,
  error,
}: {
  result: AiInvokeResponse | undefined;
  error: Error | null;
}) {
  const { t } = useTranslation();

  if (!result) {
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
              value={`${result.usage.totalTokens} / $${result.usage.estimatedCostUsd.toFixed(6)}`}
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
