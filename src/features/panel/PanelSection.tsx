import { Loader } from '../../components/ui/Loader/Loader';
import { usePermissions } from '../auth/usePermissions';
import { StaffAnalyticsPage, StaffEventsPage, StaffMarketsPage } from '../staff/StaffBettingPages';
import { SectionCard } from '../../components/ui/SectionCard/SectionCard';
import { getRole } from '../../config/roles';
import type { NavItem } from '../../config/roles';
import { useAuth } from '../auth/authContext';
import { DashboardView } from '../dashboard/DashboardView';
import { AgentPage } from '../agents/AgentPage';
import { AnalyticsPage } from '../analytics/AnalyticsPage';
import { BettingPage } from '../betting/BettingPage';
import { CmsPage } from '../cms/CmsPage';
import { CommissionPage } from '../commission/CommissionPage';
import { EventsPage } from '../events/EventsPage';
import { FranchisePage } from '../franchises/FranchisePage';
import { MarketsPage } from '../markets/MarketsPage';
import { NotificationsPage } from '../notifications/NotificationsPage';
import { PartnershipPage } from '../partnership/PartnershipPage';
import { PermissionsPage } from '../permissions/PermissionsPage';
import { ProfilePage } from '../profile/ProfilePage';
import { ReportsPage } from '../reports/ReportsPage';
import { SecurityPage } from '../security/SecurityPage';
import { SettingsPage } from '../settings/SettingsPage';
import { ContactSupportPage } from '../support/ContactSupportPage';
import { SupportTicketsPage } from '../support/SupportTicketsPage';
import { RiskPage } from '../risk/RiskPage';
import { SuperAgentPage } from '../superAgents/SuperAgentPage';
import { TransactionsPage } from '../transactions/TransactionsPage';
import { WalletPage } from '../wallet/WalletPage';
import { PeopleListPage } from '../users/PeopleListPage';
import styles from './PanelSection.module.css';

/** Segments that render the people list: platform users and the downline. */
const PEOPLE_SEGMENTS = new Set(['users']);

/**
 * Renders one nav destination for whichever role is signed in. Sections
 * without a design yet share a single stub, so adding one later is a new
 * branch here and nothing else.
 */
export function PanelSection({ item }: { item: NavItem }) {
  const { user } = useAuth();
  const { can, loaded } = usePermissions();
  const role = getRole(user!.roleId);
  const isStaff = role.id !== 'super-admin';

  // A hidden menu entry is still a URL: the Permissions page decides here too.
  if (item.permission) {
    if (!loaded) return <Loader block />;
    if (!can(item.permission[0], item.permission[1], 'V')) {
      return (
        <SectionCard title={item.label} subtitle={`${role.label} · ${item.label}`} size="md">
          <p className={styles.placeholder}>
            Aapke role ({role.label}) ko “{item.label}” dekhne ki permission nahi hai. Super Admin isse Permissions page se
            de sakta hai.
          </p>
        </SectionCard>
      );
    }
  }

  // Staff get read-only / downline-scoped versions of these admin pages.
  if (isStaff && item.segment === 'events') return <StaffEventsPage view="in-play" />;
  if (isStaff && item.segment === 'complete-match') return <StaffEventsPage view="complete" />;
  if (isStaff && item.segment === 'markets') return <StaffMarketsPage />;
  if (isStaff && item.segment === 'analytics') return <StaffAnalyticsPage />;

  if (item.segment === '') return <DashboardView role={role} />;

  if (item.segment === 'franchise') return <FranchisePage />;

  if (item.segment === 'super-agent') return <SuperAgentPage role={role} />;

  if (item.segment === 'agent') return <AgentPage />;

  if (item.segment === 'wallet') return <WalletPage />;

  if (item.segment === 'transactions') return <TransactionsPage />;

  if (item.segment === 'betting') return <BettingPage />;

  if (item.segment === 'events') return <EventsPage view="in-play" />;

  if (item.segment === 'complete-match') return <EventsPage view="complete" />;

  if (item.segment === 'markets') return <MarketsPage />;

  if (item.segment === 'risk') return <RiskPage />;

  if (item.segment === 'commission') return <CommissionPage />;

  if (item.segment === 'partnership') return <PartnershipPage />;

  if (item.segment === 'reports') return <ReportsPage />;

  if (item.segment === 'analytics') return <AnalyticsPage />;

  if (item.segment === 'cms') return <CmsPage />;

  if (item.segment === 'notifications') return <NotificationsPage />;

  if (item.segment === 'security') return <SecurityPage />;

  if (item.segment === 'settings') return <SettingsPage />;

  if (item.segment === 'profile') return <ProfilePage role={role} />;

  if (item.segment === 'support-tickets') return <SupportTicketsPage />;

  if (item.segment === 'support') return <ContactSupportPage />;

  if (item.segment === 'permissions') return <PermissionsPage />;

  if (PEOPLE_SEGMENTS.has(item.segment)) {
    return <PeopleListPage role={role} title={item.label} />;
  }

  return (
    <SectionCard title={item.label} subtitle={`${role.label} · ${item.label}`} size="md">
      <p className={styles.placeholder}>
        This screen is not in the Figma hand-off yet. Drop its components here — the shell, nav and
        access rules for {role.label} already work.
      </p>
    </SectionCard>
  );
}
