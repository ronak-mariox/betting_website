import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircleIcon, UserIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { TextField } from '../../components/ui/TextField/TextField';
import { useAuth } from '../auth/authContext';
import { accountLabel, networkApi } from '../../lib/api/network';
import type { AccountRef, NetworkAccount } from '../../lib/api/network';
import styles from './AddUserModal.module.css';
import { commissionCap, commissionLabel, parseCommission } from './commissionRates';

/** Same rule as the backend: an Indian mobile, with or without +91 / spaces. */
const isMobile = (value: string) => {
  if (!/^[\d+\-\s()]+$/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(local);
};

const NO_AGENT = '— Unassigned —';

export type AddUserModalProps = {
  /** Singular noun for the record, e.g. "User". */
  title: string;
  /** The account being edited, or null to create a new one. */
  account: NetworkAccount | null;
  /** Agents the new user can be placed under. */
  agents: AccountRef[];
  /** Super-admin may leave a user unassigned; everyone else must pick an agent. */
  agentOptional: boolean;
  /** Edit only the two commission rates — the direct agent without the "Edit User" grant. */
  commissionOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
};

/** The create dialog from node 79:4484 — also used to edit an existing user. */
export function AddUserModal({
  title,
  account,
  agents,
  agentOptional,
  commissionOnly = false,
  onClose,
  onSaved,
}: AddUserModalProps) {
  const { accessToken } = useAuth();
  const isEdit = account !== null;
  const agentLabels = agents.map(accountLabel);

  const [form, setForm] = useState({
    name: account?.name ?? '',
    email: account?.email ?? '',
    phone: account?.phone ?? '',
    username: account?.username ?? '',
    password: '',
    dob: account?.dob ? account.dob.slice(0, 10) : '',
    city: account?.city ?? '',
    state: account?.state ?? '',
    agent: agents.length === 1 && !agentOptional ? agentLabels[0] : '',
    matchCommission: account?.matchCommission ? String(account.matchCommission) : '',
    sessionCommission: account?.sessionCommission ? String(account.sessionCommission) : '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  /** The player's agent — its own rates are the most the player can be given. */
  const cap = commissionCap(isEdit ? account.parent : agents[agentLabels.indexOf(form.agent)]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    const profile = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dob: form.dob || undefined,
      city: form.city.trim(),
      state: form.state.trim(),
    };

    if (commissionOnly && isEdit) {
      setPending(true);
      setError(null);
      try {
        await networkApi.update(
          account._id,
          {
            matchCommission: parseCommission('Match', form.matchCommission, cap),
            sessionCommission: parseCommission('Session', form.sessionCommission, cap),
          },
          accessToken,
        );
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to reach the server.');
      } finally {
        setPending(false);
      }
      return;
    }

    if (!profile.name) return setError('Full name is required.');
    if (profile.phone && !isMobile(profile.phone)) return setError('Enter a valid 10-digit mobile number.');
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return setError('Enter a valid email address.');

    setPending(true);
    setError(null);
    try {
      const rates = {
        matchCommission: parseCommission('Match', form.matchCommission, cap),
        sessionCommission: parseCommission('Session', form.sessionCommission, cap),
      };
      if (isEdit) {
        await networkApi.update(account._id, { ...profile, ...rates }, accessToken);
      } else {
        const username = form.username.trim().toLowerCase();
        if (!/^[a-z0-9_]{4,32}$/.test(username)) {
          throw new Error('Username must be 4–32 lowercase letters, numbers or underscores.');
        }
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
        const parent = agents[agentLabels.indexOf(form.agent)];
        if (!parent && !agentOptional) throw new Error('Choose an agent for this user.');
        await networkApi.create(
          { role: 'player', username, password: form.password, parentId: parent?._id, ...profile, ...rates },
          accessToken,
        );
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach the server.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      title={commissionOnly ? 'Set Commission' : isEdit ? `Edit ${title}` : `Add New ${title}`}
      subtitle={isEdit ? `Update ${account.name || account.username}'s details` : `Create a new platform ${title.toLowerCase()} account`}
      onClose={onClose}
    >
      <div className={styles.banner}>
        <span className={styles.avatar}>
          <UserIcon size={19.999} />
        </span>
        <div>
          <p className={styles.bannerTitle}>{isEdit ? account.username : `New ${title}`}</p>
          <p className={styles.bannerSubtitle}>Enter details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.grid}>
          {commissionOnly ? null : (
            <>
              <TextField
                label="Full Name *"
                labelCase="caps"
                placeholder="Enter full name"
                value={form.name}
                onChange={(event) => set('name')(event.target.value)}
              />
              <TextField
                label="Email Address"
                labelCase="caps"
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={(event) => set('email')(event.target.value)}
              />
              <TextField
                label="Phone Number"
                labelCase="caps"
                placeholder="+91 XXXXX XXXXX"
                value={form.phone}
                onChange={(event) => set('phone')(event.target.value)}
              />
              {isEdit ? null : (
                <>
                  <TextField
                    label="Username *"
                    labelCase="caps"
                    placeholder="e.g. rahul_92"
                    value={form.username}
                    onChange={(event) => set('username')(event.target.value)}
                  />
                  <TextField
                    label="Password *"
                    labelCase="caps"
                    type="password"
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={(event) => set('password')(event.target.value)}
                  />
                </>
              )}
              <TextField
                label="Date of Birth"
                labelCase="caps"
                type="date"
                value={form.dob}
                onChange={(event) => set('dob')(event.target.value)}
              />
              <TextField
                label="City"
                labelCase="caps"
                placeholder="Mumbai"
                value={form.city}
                onChange={(event) => set('city')(event.target.value)}
              />
              <TextField
                label="State"
                labelCase="caps"
                placeholder="Maharashtra"
                value={form.state}
                onChange={(event) => set('state')(event.target.value)}
              />
              {isEdit ? null : (
                <SelectField
                  label={agentOptional ? 'Assign Agent' : 'Assign Agent *'}
                  options={agentOptional ? [NO_AGENT, ...agentLabels] : agentLabels}
                  value={form.agent}
                  onChange={(event) => set('agent')(event.target.value)}
                />
              )}
            </>
          )}
          <TextField
            label={commissionLabel('Match', cap)}
            labelCase="caps"
            inputMode="decimal"
            placeholder="0"
            value={form.matchCommission}
            onChange={(event) => set('matchCommission')(event.target.value)}
          />
          <TextField
            label={commissionLabel('Session', cap)}
            labelCase="caps"
            inputMode="decimal"
            placeholder="0"
            value={form.sessionCommission}
            onChange={(event) => set('sessionCommission')(event.target.value)}
          />
        </div>

        {error ? <p role="alert">{error}</p> : null}

        <div className={styles.footer}>
          <Button
            className={styles.submit}
            type="submit"
            variant="primary"
            size="sm"
            disabled={pending}
            icon={<CheckCircleIcon size={13.994} />}
          >
            {pending ? 'Saving…' : isEdit ? 'Save Changes' : `Create ${title}`}
          </Button>
          <Button className={styles.cancel} variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
