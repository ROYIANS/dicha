import { Camera, QrCode, ScanLine, Sparkles, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

export type ActionItem = {
  label: 'inputBar.actions.record' | 'inputBar.actions.camera' | 'inputBar.actions.scan' | 'inputBar.actions.ai';
  icon: LucideIcon;
  className: string;
};

export const actionItems: ActionItem[] = [
  { label: 'inputBar.actions.record', icon: ScanLine, className: 'app-action-dial-item--record' },
  { label: 'inputBar.actions.camera', icon: Camera, className: 'app-action-dial-item--camera' },
  { label: 'inputBar.actions.scan', icon: QrCode, className: 'app-action-dial-item--scan' },
  { label: 'inputBar.actions.ai', icon: Sparkles, className: 'app-action-dial-item--ai' },
];

export function handleActionStub(label: string) {
  toast.info(`${label}功能即将开放`);
}
