import { createFileRoute } from '@tanstack/react-router';
import { BarChart3 } from 'lucide-react';
import { ModulePlaceholder } from '@/components/ModulePlaceholder';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/_admin/analytics')({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="统计看板"
        description="这里会区别于用户自己的统计页，承载平台级汇总、消费、调用与审计视图。"
      />
      <ModulePlaceholder
        icon={BarChart3}
        title="统计看板模块占位"
        description="平台级数据会由后端聚合后返回，前端不会直连数据库或内部数据文件。"
        items={['平台总览', 'AI 消费汇总', '审计与趋势']}
      />
    </div>
  );
}
