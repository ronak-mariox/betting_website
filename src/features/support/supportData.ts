import {
  AlertTriangleIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  HelpCircleIcon,
  SupportIcon,
  XCircleIcon,
} from '../../components/icons';
import type { StatCardProps } from '../../components/ui/StatCard/StatCard';
import type { ApiTicket, TicketPriority, TicketStatus, TicketUserRef } from '../../lib/api/support';
import { formatCount, platformTimeZone } from '../../lib/format';

/**
 * rgb triplets per priority and status. Orange (#ff9800) and the muted grey
 * are not in tokens.css, so the pair lives here rather than as global tokens.
 */
export const PRIORITY_RGB: Record<TicketPriority, string> = {
  Urgent: '239, 68, 68',
  High: '255, 152, 0',
  Medium: '250, 204, 21',
  Low: '34, 197, 94',
};

export const STATUS_RGB: Record<TicketStatus, string> = {
  Open: '33, 150, 243',
  'In Progress': '250, 204, 21',
  Resolved: '184, 194, 204',
  Closed: '184, 194, 204',
};

export const ALL_STATUS = 'All Status';
export const ALL_PRIORITY = 'All Priority';
export const STATUS_OPTIONS = [ALL_STATUS, 'Open', 'In Progress', 'Resolved', 'Closed'];
export const PRIORITY_OPTIONS = [ALL_PRIORITY, 'Urgent', 'High', 'Medium', 'Low'];

/** Status transitions offered on the drawer — node 119:64128. */
export const TICKET_ACTIONS: { label: string; status: TicketStatus; rgb: string }[] = [
  { label: 'Mark as In Progress', status: 'In Progress', rgb: '250, 204, 21' },
  { label: 'Mark as Resolved', status: 'Resolved', rgb: '34, 197, 94' },
  { label: 'Mark as Closed', status: 'Closed', rgb: '184, 194, 204' },
  { label: 'Reopen', status: 'Open', rgb: '33, 150, 243' },
];

const ROLE_LABEL: Record<string, string> = {
  'super-admin': 'Super Admin',
  franchise: 'Franchise',
  'super-agent': 'Super Agent',
  agent: 'Agent',
  player: 'Player',
};

export const roleLabel = (role: string) => ROLE_LABEL[role] ?? role;

export function userName(ref: TicketUserRef | string | null | undefined, fallback = 'Unknown'): string {
  if (!ref || typeof ref === 'string') return fallback;
  return ref.name || ref.username;
}

export function userCode(ref: TicketUserRef | string | null | undefined): string {
  if (!ref) return '—';
  return typeof ref === 'string' ? ref.slice(-6).toUpperCase() : ref.username;
}

export const ticketCode = (ticket: ApiTicket) => `TKT-${ticket._id.slice(-6).toUpperCase()}`;

export function formatTicketDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { timeZone: platformTimeZone(), day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
}

export function ticketStats(tickets: ApiTicket[]): StatCardProps[] {
  const count = (status: TicketStatus) => tickets.filter((ticket) => ticket.status === status).length;
  const high = tickets.filter((ticket) => ticket.priority === 'High' || ticket.priority === 'Urgent').length;
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const today = tickets.filter((ticket) => new Date(ticket.createdAt).getTime() >= dayAgo).length;

  return [
    { label: 'Total Tickets', value: formatCount(tickets.length), caption: 'All time', icon: SupportIcon, accent: 'blue' },
    { label: 'Open Tickets', value: formatCount(count('Open')), caption: 'Awaiting action', icon: HelpCircleIcon, accent: 'cyan' },
    { label: 'In Progress', value: formatCount(count('In Progress')), caption: 'Being handled', icon: ClockIcon, accent: 'yellow' },
    { label: 'Resolved', value: formatCount(count('Resolved')), caption: 'Awaiting close', icon: CheckCircleIcon, accent: 'green' },
    { label: 'Closed', value: formatCount(count('Closed')), caption: 'Completed', icon: XCircleIcon, accent: 'neutral' },
    { label: 'High Priority', value: formatCount(high), caption: 'Urgent + High', icon: AlertTriangleIcon, accent: 'red' },
    { label: "Today's Tickets", value: formatCount(today), caption: 'Last 24 hours', icon: CalendarIcon, accent: 'violet' },
  ];
}
