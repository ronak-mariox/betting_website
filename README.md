# BetMaster Pro — Web Panels

React + TypeScript (Vite) implementation of the Figma file
[Betting App](https://www.figma.com/design/DDn4Wt7skvLstgchpGybDV/Betting-App), built for the four
panel roles: **Super Admin, Franchise, Super Agent, Agent**.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle
npm run lint
```

## Screens implemented

| Figma node | Screen | Where |
| --- | --- | --- |
| `119:64198` | Login with quick demo role login | [src/features/auth/](src/features/auth/) |
| `79:1537` | Admin dashboard (stats, charts, live matches, risk, tables, feed) | [src/features/dashboard/](src/features/dashboard/) |
| `79:3065` | Users list — stats, toolbar, table, pagination | [PeopleListPage.tsx](src/features/users/PeopleListPage.tsx) |
| `79:4484` | Add New User dialog | [AddUserModal.tsx](src/features/users/AddUserModal.tsx) |
| `79:6144`, `79:12933`, `79:8679`, `79:9518`, `79:10332`, `79:12074` | User detail drawer — all six tabs (Overview, Bets, Transactions, Kyc, Activity, Devices) | [UserDrawer.tsx](src/features/users/UserDrawer.tsx) |
| `111:3` | Franchise directory — stats, toolbar, record card grid | [FranchisePage.tsx](src/features/franchises/FranchisePage.tsx) |
| `101:2`, `101:803` | Create Franchise dialog (commission splits appear once a type is picked) | [CreateFranchiseModal.tsx](src/features/franchises/CreateFranchiseModal.tsx) |
| `114:13787`, `116:15541`, `116:16345`, `116:17152` | Franchise detail drawer — Overview, Super Agents, Wallet, Settings | [FranchiseDrawer.tsx](src/features/franchises/FranchiseDrawer.tsx) |
| `116:17943`, `116:18917`, `116:19859`, `116:20803`, `116:22685`, `116:23728`, `116:24739`, `116:25750` | Super agent drawer (from the franchise drawer *and* the super agent page) — Overview, Agents, Users, Performance | [SuperAgentDrawer.tsx](src/features/franchises/SuperAgentDrawer.tsx) |
| `112:698` | Super agent directory — stats, capability panel, table, highlight cards | [SuperAgentPage.tsx](src/features/superAgents/SuperAgentPage.tsx) |
| `116:21713` | Create Super Agent dialog | [CreateSuperAgentModal.tsx](src/features/superAgents/CreateSuperAgentModal.tsx) |
| `112:1579` | Agent directory — stats, filters, table, pagination | [AgentPage.tsx](src/features/agents/AgentPage.tsx) |
| `116:26729` | Create Agent dialog | [CreateAgentModal.tsx](src/features/agents/CreateAgentModal.tsx) |
| `116:27600`, `116:28563`, `116:29510`, `116:30416`, `116:31356`, `116:33379` | Agent drawer — Overview, Users, Wallet, Transactions, Reports, Activity | [AgentDrawer.tsx](src/features/agents/AgentDrawer.tsx) |
| `112:2359`, `117:34376` | Wallet console — stats, partner payments, quick actions, request tabs and the Payments tab | [WalletPage.tsx](src/features/wallet/WalletPage.tsx), [PaymentsTab.tsx](src/features/wallet/PaymentsTab.tsx) |
| `117:35363`, `119:36414`, `119:37465`, `119:38529` | Manual Credit / Debit / Transfer / Adjustment dialogs | [WalletActionModal.tsx](src/features/wallet/WalletActionModal.tsx) |
| `119:39582` | New Payment dialog | [NewPaymentModal.tsx](src/features/wallet/NewPaymentModal.tsx) |
| `112:3084` | Transaction ledger — stats, type filters, table, pagination | [TransactionsPage.tsx](src/features/transactions/TransactionsPage.tsx) |
| `112:3861` | Betting board — stats, API provider status, match list | [BettingPage.tsx](src/features/betting/BettingPage.tsx) |
| `119:40667`, `119:42501`, `119:43428` | Match drawer — Overview, Markets, Bets | [MatchDrawer.tsx](src/features/betting/MatchDrawer.tsx) |
| `112:4629` | Events board — stats, sport filters, event table | [EventsPage.tsx](src/features/events/EventsPage.tsx) |
| `119:44399`, `119:45485`, `119:46569`, `119:47705` | Event activity drawer — Overview, Markets, Bets, Exposure | [EventDrawer.tsx](src/features/events/EventDrawer.tsx) |
| `112:5525` | Market manager — stats, event scopes, odds table | [MarketsPage.tsx](src/features/markets/MarketsPage.tsx) |
| `119:49597`, `119:48795` | Add Market / Edit Market dialog (one component, two modes) | [MarketFormModal.tsx](src/features/markets/MarketFormModal.tsx) |
| `112:6245` | Risk console — stats, exposure monitor, three alert panels | [RiskPage.tsx](src/features/risk/RiskPage.tsx) |
| `112:6945` | Commission console — stats, hierarchy breakdown, distribution ring | [CommissionPage.tsx](src/features/commission/CommissionPage.tsx) |
| `112:7569` | Partnership directory — stats, section tabs, partner table | [PartnershipPage.tsx](src/features/partnership/PartnershipPage.tsx) |
| `119:51060`, `119:54518` | Add / Edit Partnership dialog (one component, two modes) | [PartnerFormModal.tsx](src/features/partnership/PartnerFormModal.tsx) |
| `119:52099`, `119:52900`, `119:53743` | Partner detail drawer — Overview, Revenue, Settings | [PartnerDrawer.tsx](src/features/partnership/PartnerDrawer.tsx) |
| `112:8228` | Reports console — stats, six report kinds, custom builder | [ReportsPage.tsx](src/features/reports/ReportsPage.tsx) |
| `119:55473` | Report preview sheet — sample output table | [ReportPreviewModal.tsx](src/features/reports/ReportPreviewModal.tsx) |
| `112:8897` | Analytics console — growth stats, trend chart, highlights | [AnalyticsPage.tsx](src/features/analytics/AnalyticsPage.tsx) |
| `112:9398` | CMS console — stats, marquee, content tabs and list | [CmsPage.tsx](src/features/cms/CmsPage.tsx) |
| `119:56306` | Create New Announcement dialog | [AnnouncementModal.tsx](src/features/cms/AnnouncementModal.tsx) |
| `112:9991` | Notification centre — stats and the read/unread feed | [NotificationsPage.tsx](src/features/notifications/NotificationsPage.tsx) |
| `112:10472`, `119:56949`, `119:57459`, `119:58016`, `119:58582` | Security console — Logs, Sessions, Audit, IP Whitelist, Settings | [SecurityPage.tsx](src/features/security/SecurityPage.tsx) |
| `112:11029`, `119:59071`, `119:59499`, `119:59881`, `119:60319`, `119:60728` | Platform settings — General, Limits, Commission, Notifications, Brand, API Keys | [SettingsPage.tsx](src/features/settings/SettingsPage.tsx) |
| `112:11449`, `119:61175`, `119:61631`, `119:62157`, `119:62736` | Account profile — identity rail, Edit Profile, Change Password, Activity, Login History, Devices | [ProfilePage.tsx](src/features/profile/ProfilePage.tsx) |
| `112:11927` | Support ticket queue — stats, filters, ticket table | [SupportTicketsPage.tsx](src/features/support/SupportTicketsPage.tsx) |
| `119:63200` | Ticket detail sheet — meta, requester, status actions, conversation, reply | [TicketDrawer.tsx](src/features/support/TicketDrawer.tsx) |
| `112:12758` | Role permissions — role selector, legend, six-group grant matrix | [PermissionsPage.tsx](src/features/permissions/PermissionsPage.tsx) |
| `119:64431` | Franchise dashboard — same composition as Super Admin, Franchise figures | [DashboardView.tsx](src/features/dashboard/DashboardView.tsx) |
| `119:67293`, `119:67966` | Franchise users list + Add User dialog — adds the Agent and Last Login columns | [PeopleListPage.tsx](src/features/users/PeopleListPage.tsx) |
| `119:68771`, `119:69595`, `119:70475`, `119:71282`, `119:72050`, `119:72889` | Franchise user drawer — all six tabs, with the owning agent shown | [UserDrawer.tsx](src/features/users/UserDrawer.tsx) |
| `119:73716` | Franchise super agent directory — own book only, no Franchise column | [SuperAgentPage.tsx](src/features/superAgents/SuperAgentPage.tsx) |
| `119:74203`, `119:74852`, `119:75469`, `119:76158` | Franchise super agent drawer — Overview, Agents, Users, Performance | [SuperAgentDrawer.tsx](src/features/franchises/SuperAgentDrawer.tsx) |
| `139:77328`, `139:78005` | Franchise agent directory + Create Agent dialog | [AgentPage.tsx](src/features/agents/AgentPage.tsx) |
| `139:78773`, `139:79633`, `139:80477`, `139:81280`, `139:82117`, `139:82954` | Franchise agent drawer — all six tabs (the agent sheet underlines in green) | [AgentDrawer.tsx](src/features/agents/AgentDrawer.tsx) |
| `139:83848` | Franchise commission — breakdown table + distribution ring | [CommissionPage.tsx](src/features/commission/CommissionPage.tsx) |
| `139:84369` | Franchise reports — six kinds + custom report builder | [ReportsPage.tsx](src/features/reports/ReportsPage.tsx) |
| `139:84935` | Betting Report preview sheet (each kind previews in its own colour) | [ReportPreviewModal.tsx](src/features/reports/ReportPreviewModal.tsx) |
| `139:87983`, `139:86357`, `139:86682`, `139:86961` | Franchise settings — General, Limits, Commission, Notifications | [SettingsPage.tsx](src/features/settings/SettingsPage.tsx) |
| `139:87602`, `139:88300`, `139:89165`, `139:89594` | Franchise profile — My Profile, Change Password, Activity, Login History | [ProfilePage.tsx](src/features/profile/ProfilePage.tsx) |
| `139:88659` | Profile wallet activity — balance, totals, recent transactions | [ProfilePage.tsx](src/features/profile/ProfilePage.tsx) |
| `139:90076` | Contact Support — channels, ID reminder, support hours | [ContactSupportPage.tsx](src/features/support/ContactSupportPage.tsx) |
| `139:90645` | Super agent dashboard — stats, charts, monitors, ledgers | [DashboardView.tsx](src/features/dashboard/DashboardView.tsx) |
| `139:93495`, `139:94992` | Super agent user directory + Add New User dialog | [PeopleListPage.tsx](src/features/users/PeopleListPage.tsx) |
| `139:94168`, `139:95797`, `139:96677`, `139:97484`, `139:98252`, `139:99091` | Super agent user drawer — all six tabs (the owning agent reads in green) | [UserDrawer.tsx](src/features/users/UserDrawer.tsx) |
| `139:99918`, `139:100595` | Super agent's agent directory + Create Agent dialog | [AgentPage.tsx](src/features/agents/AgentPage.tsx) |
| `139:101363`, `139:102223`, `139:103067`, `139:103870`, `139:104707`, `139:105544` | Super agent's agent drawer — all six tabs | [AgentDrawer.tsx](src/features/agents/AgentDrawer.tsx) |
| `139:106438`, `139:107060` | Super agent wallet — partner payments, quick actions, Manual Credit dialog | [WalletPage.tsx](src/features/wallet/WalletPage.tsx) |
| `139:107746` | Super agent transactions — stats, six filter tabs, ledger | [TransactionsPage.tsx](src/features/transactions/TransactionsPage.tsx) |
| `139:108420` | Super agent commission — breakdown + distribution ring | [CommissionPage.tsx](src/features/commission/CommissionPage.tsx) |
| `139:108941`, `139:109507` | Super agent reports + Financial Report preview sheet | [ReportsPage.tsx](src/features/reports/ReportsPage.tsx) |
| `139:110237`, `139:110554`, `139:110879`, `139:111158`, `139:111437` | Super agent settings — General, Limits, Commission, Notifications | [SettingsPage.tsx](src/features/settings/SettingsPage.tsx) |
| `139:111772` | Super agent profile — Change Password (the panel signs itself in yellow) | [ProfilePage.tsx](src/features/profile/ProfilePage.tsx) |
| `139:112131`, `139:112637`, `139:113066`, `139:113548` | Super agent profile — Wallet Activity (its own figures), Activity, Login History, Devices | [ProfilePage.tsx](src/features/profile/ProfilePage.tsx) |
| `139:113915` | Profile preferences — eight notification and display toggles | [ProfilePage.tsx](src/features/profile/ProfilePage.tsx) |
| `139:114287` | Super agent Contact Support (Call Support gains a Call Now action) | [ContactSupportPage.tsx](src/features/support/ContactSupportPage.tsx) |
| `139:114739` | Agent dashboard — its own screen: my-book stats, user overview, 7-day commission | [AgentDashboard.tsx](src/features/dashboard/AgentDashboard.tsx) |
| `147:115519`, `147:116167` | Agent user directory + Add New User dialog | [PeopleListPage.tsx](src/features/users/PeopleListPage.tsx) |
| `147:116947`, `147:117746`, `147:118601`, `147:119383`, `147:120947`, `147:121690`, `147:122433` | Agent user drawer — Overview, Bets, Transactions, KYC, Devices | [UserDrawer.tsx](src/features/users/UserDrawer.tsx) |
| `147:123235` | Agent wallet — partner payments, quick actions, ledger tabs | [WalletPage.tsx](src/features/wallet/WalletPage.tsx) |
| `147:123850` | Agent transactions — stats, six filter tabs, ledger | [TransactionsPage.tsx](src/features/transactions/TransactionsPage.tsx) |
| `147:124517` | Agent commission — breakdown + distribution ring | [CommissionPage.tsx](src/features/commission/CommissionPage.tsx) |
| `147:125031` | Agent reports — six kinds + custom report builder | [ReportsPage.tsx](src/features/reports/ReportsPage.tsx) |

Every nav destination in every panel now has a screen — [PanelSection.tsx](src/features/panel/PanelSection.tsx)
maps all 22 segments to a component. Its placeholder branch stays as the landing spot for
whatever gets added to `ROLES` next.

## Demo logins

The "Quick Demo Login" chips fill these in for you.

| Role | User name | Password | Panel |
| --- | --- | --- | --- |
| Super Admin | `mithu8178` | `superadmin@123` | `/super-admin` |
| Franchise | `franchise01` | `franchise@123` | `/franchise` |
| Super Agent | `superagent01` | `superagent@123` | `/super-agent` |
| Agent | `agent01` | `agent@123` | `/agent` |

## How the four roles are wired

Everything role-specific lives in **one file**: [src/config/roles.ts](src/config/roles.ts).
A role declares its label, icon, operator, demo credentials, base path, who it manages, its
downline segment and its nav entries — and that single declaration drives:

- the Quick Demo Login grid and the `Sign In as …` button on the login screen,
- the router (`/super-admin`, `/franchise`, … and every child route),
- the access guard (a signed-in Agent cannot open `/franchise`),
- the sidebar rail, the identity chip, the topbar title and breadcrumb,
- which segments show the people list, and what the downline table is called.

There is no per-role component, page or route file. Adding a fifth role is a new entry in `ROLES`
plus its figures in the two data modules.

## Structure

```
src/
  styles/          tokens.css (every colour, radius and type step from Figma) + global.css
  lib/             cx (class joiner) + format (₹ / count formatting)
  components/
    icons/         73 glyphs generated from the Figma SVG exports via one createIcon() factory
    charts/        AreaChart, BarChart, DonutChart — plain SVG, no chart library
    ui/            Badge, BrandMark, Button, Card, Checkbox, DataTable, Dot, Drawer, IconButton,
                   MetricTile, Modal, Pagination, PillTabs, ProgressBar, SearchInput, SectionCard,
                   SectionLabel, SelectField, StatCard, Switch, Tabs, TextAreaField, TextField
  config/          app.ts (product copy) + roles.ts (the four roles)
  features/
    auth/          AuthProvider, session context, LoginPage, RoleSelector
    dashboard/     DashboardView + widgets/ (chart, monitor and ledger panels) + dashboardData
    users/         PeopleListPage, AddUserModal, UserDrawer + usersData
    franchises/    FranchisePage, CreateFranchiseModal, FranchiseDrawer, SuperAgentDrawer,
                   NetworkRows (shared list/summary rows) + franchisesData
    superAgents/   SuperAgentPage, CreateSuperAgentModal + superAgentsData
    agents/        AgentPage, CreateAgentModal, AgentDrawer + agentsData
    wallet/        WalletPage, PaymentsTab, WalletActionModal, NewPaymentModal + walletData
    transactions/  TransactionsPage + transactionsData
    betting/       BettingPage, MatchDrawer + bettingData
    events/        EventsPage, EventDrawer + eventsData
    markets/       MarketsPage, MarketFormModal + marketsData
    risk/          RiskPage + riskData
    commission/    CommissionPage + commissionData
    partnership/   PartnershipPage, PartnerFormModal, PartnerDrawer + partnershipData
    reports/       ReportsPage, ReportPreviewModal + reportsData
    analytics/     AnalyticsPage + analyticsData
    cms/           CmsPage, AnnouncementModal + cmsData
    notifications/ NotificationsPage + notificationsData
    security/      SecurityPage + securityData
    settings/      SettingsPage + settingsData
    profile/       ProfilePage + profileData
    support/       SupportTicketsPage, TicketDrawer + supportData,
                   ContactSupportPage + contactSupportData
    permissions/   PermissionsPage + permissionsData
    panel/         PanelSection — maps a nav entry to its view
  layouts/
    PanelLayout/   Sidebar, Topbar, StatusBar — one shell for all four panels
  routes/          AppRoutes — routes generated from ROLES
```

Rules that keep the code duplicate-free:

- **No raw hex in components.** Colours, radii and type steps come from `tokens.css`.
- **One component per idea.** Variants are props (`<Button variant="primary" />`,
  `<Tabs variant="underline" />`, `<DataTable size="sm" />`), never copies.
- **One icon factory.** Glyph geometry is verbatim from the Figma exports; only the stroke colour
  is `currentColor`, so the same component serves idle / active / on-gradient states.
- **One component per pattern.** `PeopleListPage` backs the Users list, `PillTabs` the wallet and
  transaction filters, `NetworkRows` every downline list, `SuperAgentDrawer` both entry points, and
  `WalletActionModal` all four manual wallet operations.
- **Data is separate from views.** The `*Data.ts` module in each feature is the only place with
  figures — swap them for API calls without touching a component. Each panel sees the slice of the
  platform it owns, so the Super Admin numbers from Figma are scaled down the hierarchy rather than
  duplicated per role.

## Charts

The Figma frames embed Recharts renders. Those are reproduced as small SVG components
(`components/charts/`) driven by real data rather than pasted as exported images, so they respond
to the role's figures and to the Revenue / Wallet / Commission tab switch. Icons, by contrast, are
the exported Figma assets.
