import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { GlassPanel } from '@/components/GlassPanel';

export const Route = createFileRoute('/_app/storage-room')({
  component: StorageRoomPage,
});

function StorageRoomPage() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('storagePage.title')}</h1>
      <GlassPanel variant="subtle" className="p-12 flex flex-col items-center gap-4">
        <Package size={48} className="text-gray-300" />
        <p className="text-gray-400 text-sm">{t('storagePage.empty')}</p>
      </GlassPanel>
    </div>
  );
}
