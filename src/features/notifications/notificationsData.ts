import { AlertTriangleIcon, BellIcon, CheckCircleIcon, WalletIcon } from '../../components/icons';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { ApiNotification } from '../../lib/api/notifications';
import { formatCount } from '../../lib/format';

export function notificationStats(items: ApiNotification[], unreadCount: number): StatCardProps[] {
  const count = (category: ApiNotification['category']) =>
    items.filter((item) => item.category === category).length;

  return [
    { label: 'Unread', value: formatCount(unreadCount), icon: BellIcon, accent: 'live' },
    { label: 'Risk Alerts', value: formatCount(count('risk')), icon: AlertTriangleIcon, accent: 'red' },
    { label: 'Wallet Alerts', value: formatCount(count('wallet')), icon: WalletIcon, accent: 'yellow' },
    { label: 'General', value: formatCount(count('general')), icon: CheckCircleIcon, accent: 'green' },
  ];
}
