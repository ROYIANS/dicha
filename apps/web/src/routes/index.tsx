import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, Chip } from '@heroui/react';
import { toast } from 'sonner';
import { healthQueryOptions } from '@/api/health';

export const Route = createFileRoute('/')({
  // loader-first: prefetch before render so the component reads a warm cache.
  loader: ({ context: { queryClient } }) => queryClient.ensureQueryData(healthQueryOptions()),
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();
  // Same factory as the loader → reads loader-warmed cache, no waterfall.
  const { data } = useQuery(healthQueryOptions());
  const dbUp = data?.db === 'up';

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6 text-foreground">
      <Card className="w-[360px]">
        <Card.Header>
          <Card.Title>{t('app.title')}</Card.Title>
          <Card.Description>{t('app.subtitle')}</Card.Description>
        </Card.Header>
        <Card.Content>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{t('health.db')}</span>
            <Chip
              color={dbUp ? 'success' : 'danger'}
              onClick={() => toast.success(t('health.title'))}
            >
              {dbUp ? t('health.up') : t('health.down')}
            </Chip>
          </div>
        </Card.Content>
      </Card>
    </main>
  );
}
