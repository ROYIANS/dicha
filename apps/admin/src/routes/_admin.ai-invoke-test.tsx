import { createFileRoute } from '@tanstack/react-router';
import {
  Bot,
  CircleStop,
  Clock3,
  Layers3,
  ReceiptText,
  Send,
  TriangleAlert,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { invokeAdminAiStream } from '@/api/admin';
import { HeroSelect, HeroTextArea, HeroTextInput } from '@/components/HeroControls';
import { PageHeader } from '@/components/PageHeader';
import type { AiInvokeAttempt, AiInvokeResponse, AiModelUseCase, AiUsageStatus } from '@dicha/shared';

const useCaseOptions = [
  'assistant',
  'item_profile',
  'image_understanding',
  'tagging',
  'summarization',
] satisfies AiModelUseCase[];

const statusClass = {
  success: 'bg-chip-sage text-sage',
  degraded: 'bg-chip-peach text-peach',
  failure: 'bg-chip-pink text-pink',
} satisfies Record<AiUsageStatus, string>;

export const Route = createFileRoute('/_admin/ai-invoke-test')({
  component: AiInvokeTestPage,
});

function AiInvokeTestPage() {
  const [useCase, setUseCase] = useState<AiModelUseCase>('assistant');
  const [modelId, setModelId] = useState('');
  const [prompt, setPrompt] = useState('请用一句话确认 Dicha AI 官方流式调用是否正常。');
  const [isRunning, setIsRunning] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [attempts, setAttempts] = useState<AiInvokeAttempt[]>([]);
  const [result, setResult] = useState<AiInvokeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit = prompt.trim().length > 0 && !isRunning;

  const runStream = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    setStreamText('');
    setAttempts([]);
    setResult(null);
    setError(null);
    try {
      await invokeAdminAiStream(
        {
          useCase,
          messages: [{ role: 'user', content: prompt.trim() }],
          ...(modelId.trim() ? { modelId: modelId.trim() } : {}),
        },
        {
          onDelta: (event) => setStreamText((current) => current + event.text),
          onAttempt: (event) => setAttempts((current) => [...current, event.attempt]),
          onFinal: (event) => {
            setResult(event.response);
            setStreamText(event.response.text);
            toast.success('AI 流式调用成功');
          },
          onError: (event) => {
            setAttempts(event.attempts);
            setError(event.message);
            toast.error('AI 流式调用失败');
          },
        },
        controller.signal,
      );
    } catch (caught) {
      if (controller.signal.aborted) {
        toast.message('已取消本次流式调用');
      } else {
        setError(caught instanceof Error ? caught.message : String(caught));
        toast.error('AI 流式调用失败');
      }
    } finally {
      abortRef.current = null;
      setIsRunning(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="AI Stream Test"
        title="AI 调用测试"
        description="通过当前超级管理员身份调用官方 Dicha AI 路径，验证流式输出、降级 attempts、token 与积分结算摘要。"
      />
      <div className="grid gap-4 p-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:p-8">
        <section className="rounded-md border border-hairline bg-surface">
          <div className="border-b border-hairline bg-surface-alt px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">测试请求</h2>
          </div>
          <div className="space-y-4 p-4">
            <FieldLabel label="用途">
              <HeroSelect
                value={useCase}
                onChange={(nextUseCase) => setUseCase(nextUseCase as AiModelUseCase)}
                isDisabled={isRunning}
                options={useCaseOptions.map((item) => ({ value: item, label: item }))}
              />
            </FieldLabel>
            <FieldLabel label="指定模型 ID">
              <HeroTextInput
                value={modelId}
                onChange={setModelId}
                disabled={isRunning}
                placeholder="留空则使用用途分配"
              />
            </FieldLabel>
            <FieldLabel label="提示词">
              <HeroTextArea
                value={prompt}
                onChange={setPrompt}
                disabled={isRunning}
                className="min-h-40"
              />
            </FieldLabel>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void runStream()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-sidebar-bg px-3 text-xs font-medium text-sidebar-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="size-3.5" />
                {isRunning ? '流式生成中...' : '发送流式调用'}
              </button>
              {isRunning ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-hairline bg-surface-alt px-3 text-xs font-medium text-ink"
                >
                  <CircleStop className="size-3.5" />
                  取消
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <StreamResult
          result={result}
          streamText={streamText}
          attempts={attempts}
          isRunning={isRunning}
          error={error}
        />
      </div>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function StreamResult({
  result,
  streamText,
  attempts,
  isRunning,
  error,
}: {
  result: AiInvokeResponse | null;
  streamText: string;
  attempts: AiInvokeAttempt[];
  isRunning: boolean;
  error: string | null;
}) {
  const lastLatencyMs = result?.attempts.at(-1)?.latencyMs ?? attempts.at(-1)?.latencyMs ?? null;
  const activeStatus = result?.status ?? (error ? 'failure' : null);

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface-alt px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-ink-soft" />
            <h2 className="text-sm font-semibold text-ink">模型响应</h2>
          </div>
          {activeStatus ? (
            <span className={`rounded-md border border-hairline px-2 py-1 text-xs ${statusClass[activeStatus]}`}>
              {activeStatus}
            </span>
          ) : (
            <span className="rounded-md border border-hairline bg-chip-mist px-2 py-1 text-xs text-mist">
              {isRunning ? 'streaming' : 'idle'}
            </span>
          )}
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Metric icon={Layers3} label="命中模型" value={result?.modelName ?? '-'} />
            <Metric
              icon={ReceiptText}
              label="Token / 积分"
              value={
                result
                  ? `${result.usage.totalTokens} / ${result.usage.creditAmount}`
                  : '-'
              }
            />
            <Metric
              icon={Clock3}
              label="延迟"
              value={lastLatencyMs === null ? '-' : `${lastLatencyMs} ms`}
            />
          </div>
          {error ? (
            <div className="flex gap-2 rounded-md border border-hairline bg-chip-pink px-3 py-2 text-xs leading-relaxed text-pink">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
          <pre className="min-h-44 whitespace-pre-wrap rounded-md border border-hairline bg-canvas px-4 py-3 text-sm leading-relaxed text-ink">
            {streamText || '等待流式输出...'}
          </pre>
        </div>
      </div>
      <AttemptsTable attempts={result?.attempts ?? attempts} />
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Layers3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-hairline bg-surface-alt px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-ink-soft">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function AttemptsTable({ attempts }: { attempts: AiInvokeAttempt[] }) {
  const rows = useMemo(() => attempts, [attempts]);
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-hairline bg-surface px-4 py-6 text-center text-sm text-ink-soft">
        暂无调用尝试
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="border-b border-hairline bg-surface-alt px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">调用尝试</h2>
      </div>
      <div className="divide-y divide-hairline/70">
        {rows.map((attempt, index) => (
          <div key={`${attempt.providerId}:${attempt.modelId}:${index}`} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{attempt.modelName}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {[attempt.providerName, attempt.requestFormat, attempt.latencyMs === null ? null : `${attempt.latencyMs} ms`]
                    .filter(Boolean)
                    .join(' / ')}
                </p>
                {attempt.message ? (
                  <p className="mt-1 text-xs leading-relaxed text-pink">{attempt.message}</p>
                ) : null}
              </div>
              <span className={`shrink-0 rounded-md border border-hairline px-2 py-1 text-xs ${statusClass[attempt.status]}`}>
                {attempt.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
