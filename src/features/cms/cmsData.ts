import { CmsIcon, EyeIcon, GiftIcon, PencilIcon } from '../../components/icons';
import type { BadgeTone } from '../../components/ui/Badge/Badge';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { CmsContentItem, CmsKind, CmsStatus } from '../../lib/api/cms';
import { formatCount, platformTimeZone } from '../../lib/format';

export const CMS_TABS = ['Announcements', 'Banners', 'Promotions', 'Noticeboard'] as const;

export type CmsTab = (typeof CMS_TABS)[number];

/** Pill-tab label -> backend `CMS_KINDS` value. */
export const CMS_KIND_BY_TAB: Record<CmsTab, CmsKind> = {
  Announcements: 'Announcement',
  Banners: 'Banner',
  Promotions: 'Promotion',
  Noticeboard: 'Notice',
};

export const CMS_STATUSES: CmsStatus[] = ['Draft', 'Published', 'Archived'];

/** Who an item is for — matches the backend's CMS_TARGETS. */
export const CMS_TARGETS = [
  { value: 'All', label: 'Everyone (app + staff panels)' },
  { value: 'Players', label: 'Players (app)' },
  { value: 'Staff', label: 'Staff panels' },
] as const;

/** App screens a banner tap can open (or paste an https:// link). */
export const BANNER_LINKS = [
  { value: '', label: 'Nothing' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'referral', label: 'Refer a Friend' },
  { value: 'live', label: 'Live Matches' },
  { value: 'bets', label: 'My Bets' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'help', label: 'Help & Support' },
  { value: 'url', label: 'Web link…' },
] as const;

export const CONTENT_STATUS_TONE: Record<CmsStatus, BadgeTone> = {
  Published: 'success',
  Draft: 'warning',
  Archived: 'neutral',
};

export function cmsStats(items: CmsContentItem[]): StatCardProps[] {
  const published = (kind: CmsKind) =>
    items.filter((item) => item.kind === kind && item.status === 'Published').length;
  const totalViews = items.reduce((sum, item) => sum + (item.views || 0), 0);
  const drafts = items.filter((item) => item.status === 'Draft').length;

  return [
    {
      label: 'Active Announcements',
      value: formatCount(published('Announcement')),
      icon: CmsIcon,
      accent: 'blue',
      tinted: true,
    },
    { label: 'Active Promotions', value: formatCount(published('Promotion')), icon: GiftIcon, accent: 'green' },
    { label: 'Total Views', value: formatCount(totalViews), caption: 'All content', icon: EyeIcon, accent: 'cyan' },
    { label: 'Drafts', value: formatCount(drafts), caption: 'Not yet published', icon: PencilIcon, accent: 'yellow' },
  ];
}

export function formatContentDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { timeZone: platformTimeZone(), day: '2-digit', month: 'short', year: 'numeric' });
}
