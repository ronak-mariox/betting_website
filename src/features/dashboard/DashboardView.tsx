import type { RoleDefinition } from '../../config/roles';
import { AgentDashboard } from './AgentDashboard';
import { LiveDashboard } from './LiveDashboard';

/**
 * Super-admin gets the platform-wide dashboard (node 79:1537, `/dashboard`).
 * Franchise, super-agent and agent get their own network's live figures
 * (node 139:114739, `/network/dashboard`, scoped to their downline).
 */
export function DashboardView({ role }: { role: RoleDefinition }) {
  if (role.id === 'super-admin') return <LiveDashboard />;
  return <AgentDashboard />;
}
