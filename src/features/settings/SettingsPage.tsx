import { Loader } from '../../components/ui/Loader/Loader';
import { useEffect, useState } from 'react';
import { TextField } from '../../components/ui/TextField/TextField';
import { useAuth } from '../auth/authContext';
import { ApiRequestError, authApi } from '../../lib/api';
import { networkApi } from '../../lib/api/network';
import type { MyProfile, NetworkAccount } from '../../lib/api/network';
import { formatRupees } from '../../lib/format';
import { LiveSettings } from './LiveSettings';
import styles from './SettingsPage.module.css';

/**
 * Platform settings — node 112:11029 plus its five other tab states, for
 * super-admin. Other roles can't change platform config, so their Settings
 * page shows their own account's commission and credit (read-only). Limits
 * and system settings stay with the Super Admin.
 */
export function SettingsPage() {
  const { user } = useAuth();
  return user?.roleId === 'super-admin' ? <LiveSettings /> : <MyAccountSettings />;
}

function MyAccountSettings() {
  const { accessToken } = useAuth();
  const [me, setMe] = useState<NetworkAccount | null>(null);
  const [limits, setLimits] = useState<MyProfile['limits'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    Promise.all([authApi.me(accessToken), networkApi.myProfile(accessToken)])
      .then(([account, profile]) => {
        if (cancelled) return;
        // /auth/me returns the full account, including the staff business fields.
        setMe(account.user as unknown as NetworkAccount);
        setLimits(profile.limits);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server.');
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  if (!me || !limits) {
    return <p className={styles.cardSubtitle}>{error ?? <Loader block />}</p>;
  }

  const money = (value: number | null, none: string) => (value === null ? none : formatRupees(value));

  // Betting / exposure limits and deposit / withdrawal rules are Super Admin controls, not shown here.
  const fields = [
    { label: 'Username', value: me.username },
    ...(me.referralCode ? [{ label: 'Referral Code', value: me.referralCode }] : []),
    { label: 'Match Commission', value: `${limits.matchCommission}% of players' net match loss` },
    { label: 'Session Commission', value: `${limits.sessionCommission}% of session stake` },
    { label: 'Commission Paid', value: 'At the end of every match' },
    { label: 'Credit Limit', value: money(limits.creditLimit, 'Not set') },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <p className={styles.cardTitle}>My Account Settings</p>
        <p className={styles.cardSubtitle}>Set by your upline or the platform admin — contact them to change these.</p>
        <div className={styles.fields}>
          {fields.map((field) => (
            <TextField key={field.label} label={field.label} value={field.value} readOnly />
          ))}
        </div>
      </section>
    </div>
  );
}
