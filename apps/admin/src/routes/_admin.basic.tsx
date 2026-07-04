import { createFileRoute } from '@tanstack/react-router';
import { Database } from 'lucide-react';
import { ModulePlaceholder } from '@/components/ModulePlaceholder';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/basic')({
  component: BasicPage,
});

function BasicPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Basic Management"
        title="基础管理"
        description="这里会承载用户管理、AI 供应商/模型管理、内容资源管理等平台级入口。"
      />
      <ModulePlaceholder
        icon={Database}
        title="基础管理模块占位"
        description="本阶段只建立信息架构和路由边界，不提前做半成品 CRUD。"
        items={['用户管理', 'AI 供应商与模型', '内容与资源']}
      />
    </div>
  );
}
