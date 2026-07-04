import { createFileRoute } from '@tanstack/react-router';
import { Settings2 } from 'lucide-react';
import { ModulePlaceholder } from '@/components/ModulePlaceholder';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/system')({
  component: SystemPage,
});

function SystemPage() {
  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="系统功能"
        description="后续会接入服务健康、配置摘要、维护任务与内部工具，所有敏感信息仍由后端过滤。"
      />
      <ModulePlaceholder
        icon={Settings2}
        title="系统功能模块占位"
        description="当前只保留安全入口，避免在前端暴露任何 server-only 配置。"
        items={['服务健康', '配置摘要', '维护任务']}
      />
    </div>
  );
}
