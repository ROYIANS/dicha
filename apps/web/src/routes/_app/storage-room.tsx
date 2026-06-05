import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { Surface } from '@/components/Surface';

export const Route = createFileRoute('/_app/storage-room')({
  component: StorageRoomPage,
});

function StorageRoomPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-ink mb-6">{t('storagePage.title')}</h1>
      <Surface variant="card" className="p-12 flex flex-col items-center gap-4">
        <Package size={48} className="text-ink-faint" />
        <p className="text-ink-faint text-sm">{t('storagePage.empty')}</p>
      </Surface>
    </div>
  );
}
