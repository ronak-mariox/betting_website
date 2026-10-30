import { Loader } from '../../components/ui/Loader/Loader';
import { usePermissions } from '../auth/usePermissions';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { CheckCircleIcon } from '../../components/icons';
import { Badge } from '../../components/ui/Badge/Badge';
import { Button } from '../../components/ui/Button/Button';
import { DataTable } from '../../components/ui/DataTable/DataTable';
import type { Column } from '../../components/ui/DataTable/DataTable';
import { TextField } from '../../components/ui/TextField/TextField';
import { Switch } from '../../components/ui/Switch/Switch';
import type { RoleDefinition } from '../../config/roles';
import { useAuth } from '../auth/authContext';
import { ApiRequestError, authApi } from '../../lib/api';
import type { ApiUser } from '../../lib/api';
import { resizeImageToDataUri } from '../../lib/image';
import { cx } from '../../lib/cx';
import { networkApi } from '../../lib/api/network';
import type { DetailActivity, MyProfile } from '../../lib/api/network';
import { formatIp, formatRelativeTime, platformTimeZone } from '../../lib/format';
import { describeUserAgent, formatDate } from '../users/usersData';
import { TransferHistory } from '../wallet/TransferHistory';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { setDisplayPrefs, useDisplayPrefs } from '../../lib/panelPrefs';
import type { PanelLanguage, PanelTheme } from '../../lib/panelPrefs';
import {
  NOTIFICATION_PREFERENCES,
  PASSWORD_HINT,
  getProfileIdentity,
  getProfileTabs,
  splitName,
} from './profileData';
import styles from './ProfilePage.module.css';

/** Account profile — node 112:11449 plus its six other tab states. */
export function ProfilePage({ role }: { role: RoleDefinition }) {
  const { accessToken, setTokens, setDisplayName } = useAuth();
  const { can } = usePermissions();
  // Staff follow the Permissions page: Edit Profile (edit), Change Password (edit), Wallet Balance (view).
  const canEditProfile = can('accountSettings', 'editProfile', 'X');
  const tabs = getProfileTabs(role).filter(
    (item) => item.label !== 'Change Password' || can('accountSettings', 'changePassword', 'X'),
  );
  const [tab, setTab] = useState<string>(tabs[0].label);
  const [overview, setOverview] = useState<MyProfile | null>(null);
  const [overviewVersion, setOverviewVersion] = useState(0);

  // Real stats, activity, sign-ins, sessions and wallet for the signed-in account.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    networkApi
      .myProfile(accessToken)
      .then((res) => {
        if (!cancelled) setOverview(res);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken, overviewVersion]);
  const reloadOverview = () => setOverviewVersion((v) => v + 1);

  const quickStats = [
    { label: 'Total Actions', value: overview ? overview.stats.totalActions.toLocaleString('en-IN') : '…' },
    { label: 'Login Sessions', value: overview ? overview.stats.loginCount.toLocaleString('en-IN') : '…' },
    {
      label: 'Last Login',
      value: overview ? (overview.stats.lastLoginAt ? formatRelativeTime(overview.stats.lastLoginAt) : 'Never') : '…',
    },
    { label: 'Member Since', value: overview ? formatDate(overview.stats.memberSince) : '…' },
  ];

  // The live signed-in account — every role (super-admin, franchise, super-agent,
  // agent) shares this same page, so it's fetched rather than derived from `role`.
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    authApi
      .me(accessToken)
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch(() => {
        // The identity card falls back to the role's mock identity below.
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const fallback = getProfileIdentity(role);
  // Only what the account really holds: no made-up email for one that has none.
  const displayName = user ? user.name || user.username : fallback.name;
  const displayEmail = user ? user.email || `@${user.username}` : '';

  return (
    <div className={styles.page}>
      <aside className={styles.rail}>
        <section className={styles.card}>
          <div className={styles.identity}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className={styles.avatarImage} />
            ) : (
              <span className={styles.avatar}>{displayName.slice(0, 1)}</span>
            )}
            <p className={styles.name}>{displayName}</p>
            <p className={styles.email}>{displayEmail}</p>
            <div className={styles.identityMeta}>
              <Badge tone={role.accent}>{fallback.role}</Badge>
              <span className={styles.presence}>
                <span className={styles.presenceDot} aria-hidden="true" />
                {fallback.presence}
              </span>
            </div>
            <ChangePhotoButton accessToken={accessToken} disabled={!user || !canEditProfile} onUpdated={setUser} />
          </div>
        </section>

        <section className={styles.card}>
          <p className={styles.cardTitle}>Quick Stats</p>
          <dl className={styles.quickStats}>
            {quickStats.map((stat) => (
              <div key={stat.label} className={styles.quickStat}>
                <dt className={styles.quickLabel}>{stat.label}</dt>
                <dd className={styles.quickValue}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <nav className={styles.nav} aria-label="Profile sections">
          {tabs.map((item) => (
            <button
              key={item.label}
              type="button"
              aria-current={item.label === tab ? 'page' : undefined}
              className={cx(styles.navItem, item.label === tab && styles.navActive)}
              onClick={() => setTab(item.label)}
            >
              <item.icon size={13.993} />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className={styles.body}>
        {tab === 'My Profile' ? (
          <EditProfileTab
            key={user?._id ?? 'pending'}
            role={role}
            user={user}
            accessToken={accessToken}
            canEdit={canEditProfile}
            onSaved={(saved) => {
              setUser(saved);
              setDisplayName(saved.name);
            }}
          />
        ) : null}
        {tab === 'Change Password' ? (
          <ChangePasswordTab accessToken={accessToken} onChanged={setTokens} />
        ) : null}
        {tab === 'Activity' ? (
          <ActivityTab
            lastLoginAt={overview ? overview.stats.lastLoginAt : undefined}
            logins={overview?.logins ?? null}
            showTransfers={role.id === 'super-admin' || can('finance', 'walletBalance', 'V')}
          />
        ) : null}
        {tab === 'Devices' ? (
          <DevicesTab overview={overview} accessToken={accessToken} onChanged={reloadOverview} />
        ) : null}
        {tab === 'Preferences' ? (
          <PreferencesTab
            key={overview ? 'loaded' : 'pending'}
            saved={overview?.preferences ?? {}}
            accessToken={accessToken}
            canEdit={canEditProfile}
          />
        ) : null}
      </div>
    </div>
  );
}

function TabCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.card}>
      <p className={styles.tabTitle}>{title}</p>
      <p className={styles.tabSubtitle}>{subtitle}</p>
      {children}
    </section>
  );
}

/** The avatar's "Change Photo" action — resizes the picked file and saves it immediately. */
function ChangePhotoButton({
  accessToken,
  disabled,
  onUpdated,
}: {
  accessToken: string | null;
  disabled: boolean;
  onUpdated: (user: ApiUser) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = '';
    if (!file || !accessToken) return;

    setPending(true);
    setError(null);
    try {
      const avatar = await resizeImageToDataUri(file);
      const result = await authApi.updateProfile(accessToken, { avatar });
      onUpdated(result.user);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not update your photo.');
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className={styles.hiddenInput}
        onChange={handleChange}
      />
      <Button
        className={styles.changePhoto}
        size="xs"
        block
        disabled={disabled || pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? 'Uploading…' : 'Change Photo'}
      </Button>
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

function EditProfileTab({
  role,
  user,
  accessToken,
  canEdit = true,
  onSaved,
}: {
  role: RoleDefinition;
  user: ApiUser | null;
  accessToken: string | null;
  /** Edit Profile (edit) on the Permissions page. */
  canEdit?: boolean;
  onSaved: (user: ApiUser) => void;
}) {
  const fallback = getProfileIdentity(role);
  const [savedFirst, savedLast] = user ? splitName(user.name) : [fallback.first, fallback.last];

  const [firstName, setFirstName] = useState(savedFirst);
  const [lastName, setLastName] = useState(savedLast);
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!accessToken) return;
    setPending(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await authApi.updateProfile(accessToken, {
        name: `${firstName} ${lastName}`.trim(),
        email,
        phone,
        city,
      });
      onSaved(result.user);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <TabCard title="Edit Profile" subtitle="Update your personal information">
      <div className={styles.grid}>
        <TextField label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <TextField label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextField label="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}
      {success ? <p className={styles.formSuccess}>Profile updated.</p> : null}
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="sm"
          icon={<CheckCircleIcon size={13.993} />}
          disabled={pending || !accessToken || !user || !canEdit}
          title={canEdit ? undefined : 'Aapke role ko profile edit karne ki permission nahi hai.'}
          onClick={handleSave}
        >
          {pending ? 'Saving…' : 'Save Profile'}
        </Button>
      </div>
    </TabCard>
  );
}

/** Wallet Activity tab — node 139:88659, from the account's own wallet and its network's ledger. */
function ChangePasswordTab({
  accessToken,
  onChanged,
}: {
  accessToken: string | null;
  onChanged: (accessToken: string, refreshToken: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);
    if (!accessToken) return;
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setPending(true);
    try {
      // Changing the password revokes every previously issued token
      // (including this session's own), so the fresh pair below has to
      // replace it or the very next authenticated request would 401.
      const result = await authApi.changePassword(accessToken, { currentPassword, newPassword });
      onChanged(result.accessToken, result.refreshToken);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <TabCard title="Change Password" subtitle="Use a strong, unique password for your account">
      <div className={styles.stack}>
        <TextField
          label="Current Password"
          type="password"
          name="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <TextField
          label="New Password"
          type="password"
          name="new-password"
          autoComplete="new-password"
          placeholder="Min. 6 characters"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <TextField
          label="Confirm New Password"
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          placeholder="Repeat new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}
        {success ? <p className={styles.formSuccess}>Password updated.</p> : null}
        <p className={styles.hint}>{PASSWORD_HINT}</p>
      </div>
      <div className={styles.actions}>
        <Button
          variant="primary"
          size="sm"
          icon={<CheckCircleIcon size={13.993} />}
          disabled={pending || !accessToken || !currentPassword || newPassword.length < 6}
          onClick={handleSubmit}
        >
          {pending ? 'Updating…' : 'Update Password'}
        </Button>
      </div>
    </TabCard>
  );
}

/**
 * Activity: when this account last signed in, its sign-in history and its
 * fund transfers. The full record of money and commission changes lives in
 * the ledger (Transactions) and the audit history.
 */
function ActivityTab({
  lastLoginAt,
  logins,
  showTransfers,
}: {
  lastLoginAt: string | null | undefined;
  logins: DetailActivity[] | null;
  showTransfers: boolean;
}) {
  const lastLogin = logins?.find((entry) => entry.status !== 'failed');
  return (
    <div className={styles.stack}>
      <TabCard title="Last Login" subtitle="Your most recent sign-in">
        <p className={styles.strong}>
          {lastLoginAt === undefined
            ? <Loader />
            : lastLoginAt
              ? new Date(lastLoginAt).toLocaleString('en-IN', { timeZone: platformTimeZone() })
              : 'Never'}
        </p>
        {lastLogin ? (
          <p className={styles.muted}>
            {describeUserAgent(lastLogin.userAgent).name}
            {lastLogin.ip ? ` · ${formatIp(lastLogin.ip)}` : ''}
          </p>
        ) : null}
      </TabCard>
      <LoginHistoryTab logins={logins} />
      {showTransfers ? (
        <TabCard title="Fund Transfer History" subtitle="Transfers you sent and received, including failed or cancelled ones">
          <div className={styles.table}>
            <TransferHistory />
          </div>
        </TabCard>
      ) : null}
    </div>
  );
}

function LoginHistoryTab({ logins }: { logins: DetailActivity[] | null }) {
  const columns: Column<DetailActivity>[] = [
    {
      key: 'when',
      header: 'Date & Time',
      render: (row) => <span className={styles.strong}>{new Date(row.createdAt).toLocaleString('en-IN', { timeZone: platformTimeZone() })}</span>,
    },
    { key: 'ip', header: 'IP Address', render: (row) => <span className={styles.mono}>{formatIp(row.ip) || '—'}</span> },
    {
      key: 'device',
      header: 'Browser / OS',
      render: (row) => <span className={styles.muted}>{describeUserAgent(row.userAgent).name}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge tone={row.status === 'failed' ? 'danger' : 'success'}>{row.status === 'failed' ? 'Failed' : 'Success'}</Badge>
      ),
    },
  ];

  return (
    <TabCard title="Login History" subtitle="All sign-in events for your account">
      <div className={styles.table}>
        <DataTable
          columns={columns}
          rows={logins ?? []}
          rowKey={(row) => row._id}
          rowClassName={(row) => (row.status === 'failed' ? styles.rowFailed : undefined)}
          size="md"
          emptyMessage={logins === null ? <Loader block /> : 'No sign-in events recorded.'}
        />
      </div>
    </TabCard>
  );
}

function DevicesTab({
  overview,
  accessToken,
  onChanged,
}: {
  overview: MyProfile | null;
  accessToken: string | null;
  onChanged: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sessions = overview?.sessions ?? [];
  // The newest session from this browser is the one in use right now.
  const currentId = sessions.find((session) => session.userAgent === overview?.currentUserAgent)?._id;
  const current = sessions.find((session) => session._id === currentId);
  // The sign-in before this one: where the account was last used from.
  const previousLogin = overview?.logins.filter((entry) => entry.status !== 'failed')[1];

  const remove = async (id: string) => {
    if (!accessToken) return;
    setPendingId(id);
    setError(null);
    try {
      await networkApi.revokeSession(id, accessToken);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to remove this device.');
    } finally {
      setPendingId(null);
    }
  };

  const logoutOthers = async () => {
    if (!accessToken) return;
    setPendingId('others');
    setError(null);
    setMessage(null);
    try {
      const { revoked } = await authApi.revokeOtherSessions(accessToken);
      setMessage(revoked ? `Signed out of ${revoked} other session${revoked === 1 ? '' : 's'}.` : 'No other sessions were signed in.');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to sign out other sessions.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className={styles.stack}>
      <TabCard title="Current Device" subtitle="The device you are using now">
        {overview === null ? (
          <p className={styles.deviceMeta}><Loader /></p>
        ) : (
          <article className={styles.device}>
            <div className={styles.deviceMain}>
              <p className={styles.deviceName}>
                {describeUserAgent(overview.currentUserAgent).name}
                <Badge tone="success">Current</Badge>
              </p>
              <p className={styles.deviceMeta}>
                {current ? `Signed in ${formatRelativeTime(current.createdAt)}` : 'This browser'}
                {current?.ip ? ` · ${formatIp(current.ip)}` : ''}
              </p>
            </div>
          </article>
        )}
      </TabCard>

      <TabCard title="Last Login Device" subtitle="Where this account signed in before this session">
        {overview === null ? (
          <p className={styles.deviceMeta}><Loader /></p>
        ) : previousLogin ? (
          <p className={styles.deviceMeta}>
            {describeUserAgent(previousLogin.userAgent).name}
            {previousLogin.ip ? ` · ${formatIp(previousLogin.ip)}` : ''} ·{' '}
            {new Date(previousLogin.createdAt).toLocaleString('en-IN', { timeZone: platformTimeZone() })}
          </p>
        ) : (
          <p className={styles.deviceMeta}>No earlier sign-in recorded.</p>
        )}
      </TabCard>

      <TabCard title="Active Sessions" subtitle="Devices currently signed in to your account">
        <div className={styles.stack}>
          {error ? <p className={styles.deviceMeta}>{error}</p> : null}
          {message ? <p className={styles.deviceMeta}>{message}</p> : null}
          {sessions.map((session) => {
            const isCurrent = session._id === currentId;
            return (
              <article key={session._id} className={styles.device}>
                <div className={styles.deviceMain}>
                  <p className={styles.deviceName}>
                    {describeUserAgent(session.userAgent).name}
                    {isCurrent ? <Badge tone="success">Current</Badge> : null}
                  </p>
                  <p className={styles.deviceMeta}>
                    Last used: {formatRelativeTime(session.updatedAt)}
                    {session.ip ? ` · ${formatIp(session.ip)}` : ''}
                  </p>
                </div>
                {isCurrent ? null : (
                  <Button className={styles.remove} size="xs" disabled={pendingId !== null} onClick={() => remove(session._id)}>
                    {pendingId === session._id ? 'Removing…' : 'Logout'}
                  </Button>
                )}
              </article>
            );
          })}
          <div className={styles.actions}>
            <Button
              variant="primary"
              size="sm"
              disabled={pendingId !== null || sessions.filter((session) => session._id !== currentId).length === 0}
              onClick={logoutOthers}
            >
              {pendingId === 'others' ? 'Signing out…' : 'Logout from Other Sessions'}
            </Button>
          </div>
        </div>
      </TabCard>
    </div>
  );
}

/**
 * Preferences — saved on this account only: menu language, light / dark
 * theme and which panel notifications it receives.
 */
function PreferencesTab({
  saved,
  accessToken,
  canEdit = true,
}: {
  saved: Record<string, boolean | string>;
  accessToken: string | null;
  canEdit?: boolean;
}) {
  const display = useDisplayPrefs();
  const [language, setLanguage] = useState<PanelLanguage>(saved.language === 'hi' ? 'hi' : saved.language === 'en' ? 'en' : display.language);
  const [theme, setTheme] = useState<PanelTheme>(saved.theme === 'light' ? 'light' : saved.theme === 'dark' ? 'dark' : display.theme);
  const [notify, setNotify] = useState(() =>
    Object.fromEntries(NOTIFICATION_PREFERENCES.map((item) => [item.key, saved[item.key] !== false])),
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!accessToken) return;
    setPending(true);
    setMessage(null);
    try {
      await authApi.updateProfile(accessToken, { preferences: { ...notify, language, theme } });
      setDisplayPrefs({ language, theme });
      setMessage('Preferences saved.');
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'Unable to save preferences.');
    } finally {
      setPending(false);
    }
  };

  return (
    <TabCard title="Preferences" subtitle="Language, theme and notifications for your account">
      <ul className={styles.prefs}>
        <li className={styles.pref}>
          <span className={styles.prefLabel}>Language</span>
          <SelectField
            label="Language"
            options={['English', 'हिन्दी (Hindi)']}
            value={language === 'hi' ? 'हिन्दी (Hindi)' : 'English'}
            onChange={(event) => setLanguage(event.target.value === 'English' ? 'en' : 'hi')}
          />
        </li>
        <li className={styles.pref}>
          <span className={styles.prefLabel}>Light mode</span>
          <Switch checked={theme === 'light'} label="Light mode" onChange={(checked) => setTheme(checked ? 'light' : 'dark')} />
        </li>
        {NOTIFICATION_PREFERENCES.map((item) => (
          <li key={item.key} className={styles.pref}>
            <span className={styles.prefLabel}>{item.label}</span>
            <Switch
              checked={notify[item.key]}
              label={item.label}
              onChange={(checked) => setNotify((all) => ({ ...all, [item.key]: checked }))}
            />
          </li>
        ))}
      </ul>
      {message ? <p className={styles.prefLabel}>{message}</p> : null}
      {canEdit ? null : <p className={styles.prefLabel}>Aapke role ko profile edit karne ki permission nahi hai.</p>}
      <div className={styles.actions}>
        <Button variant="primary" size="sm" disabled={pending || !canEdit} icon={<CheckCircleIcon size={13.993} />} onClick={save}>
          {pending ? 'Saving…' : 'Save Preferences'}
        </Button>
      </div>
    </TabCard>
  );
}
