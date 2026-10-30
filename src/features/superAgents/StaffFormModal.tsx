import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircleIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { TextField } from '../../components/ui/TextField/TextField';
import { useAuth } from '../auth/authContext';
import { accountLabel, networkApi } from '../../lib/api/network';
import type { AccountDraft, AccountRef, NetworkAccount } from '../../lib/api/network';
import styles from './CreateSuperAgentModal.module.css';
import { withCurrency } from '../../lib/format';
import { commissionCap, commissionLabel, parseCommission } from '../users/commissionRates';

type StaffRole = 'franchise' | 'super-agent' | 'agent';

const COPY: Record<StaffRole, { noun: string; subtitle: string; parent?: string }> = {
  franchise: { noun: 'Franchise', subtitle: 'Register a new franchise account' },
  'super-agent': { noun: 'Super Agent', subtitle: 'Manage super agent account', parent: 'Franchise' },
  agent: { noun: 'Agent', subtitle: 'Manage agent account', parent: 'Super Agent' },
};

const str = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

export type StaffFormModalProps = {
  role: StaffRole;
  /** The account being edited, or null to create one. */
  account: NetworkAccount | null;
  /** Accounts the new one can sit under (unused for franchises and when editing). */
  parents: AccountRef[];
  /** Edit only the two commission rates — the direct upline without the edit grant. */
  commissionOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Create / edit dialog for staff accounts — Create Franchise (101:2, 101:803),
 * Create Super Agent and Create Agent (116:26729) share one form; fields that
 * only make sense for one role are shown just for it.
 */
export function StaffFormModal({ role, account, parents, commissionOnly = false, onClose, onSaved }: StaffFormModalProps) {
  const { accessToken, user } = useAuth();
  /** Betting / exposure limits are Super Admin controls only. */
  const canSetLimits = user?.roleId === 'super-admin';
  /** Share holding is set by whoever holds the "Commission Settings" grant (the admin, by default). */
  // A company share makes the franchise a partner: Super Admin only.
  const canSetShare = canSetLimits;
  const copy = COPY[role];
  const isEdit = account !== null;
  const isFranchise = role === 'franchise';
  const parentLabels = parents.map(accountLabel);

  const [form, setForm] = useState({
    businessName: account?.businessName ?? '',
    name: account?.name ?? '',
    parent: parents.length === 1 ? parentLabels[0] : '',
    phone: account?.phone ?? '',
    state: account?.state ?? '',
    city: account?.city ?? '',
    bettingLimit: account?.bettingLimit ? str(account.bettingLimit) : '',
    maxExposure: account?.maxExposure ? str(account.maxExposure) : '',
    shareHolding: str(account?.shareHolding),
    matchCommission: account?.matchCommission ? str(account.matchCommission) : '',
    sessionCommission: account?.sessionCommission ? str(account.sessionCommission) : '',
    username: account?.username ?? '',
    password: '',
    status: 'Active',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  /** The upline this account sits under — its own rates are the most it can be given. */
  const upline = isEdit ? account.parent : parents[parentLabels.indexOf(form.parent)];
  const cap = isFranchise ? null : commissionCap(upline);

  /** '' = no limit of its own (the platform's applies). */
  const rupeeLimit = (label: string, raw: string) => {
    if (raw.trim() === '') return 0;
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0) throw new Error(`${label} must be a positive number.`);
    return value;
  };

  /** Same rule as the backend: an Indian mobile, with or without +91 / spaces. */
  const isMobile = (value: string) => {
    if (!/^[\d+\-\s()]+$/.test(value)) return false;
    const digits = value.replace(/\D/g, '');
    const local =
      digits.length === 12 && digits.startsWith('91')
        ? digits.slice(2)
        : digits.length === 11 && digits.startsWith('0')
          ? digits.slice(1)
          : digits;
    return /^[6-9]\d{9}$/.test(local);
  };

  const percent = (label: string, raw: string) => {
    if (raw.trim() === '') return null;
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0 || value > 100) throw new Error(`${label} must be between 0 and 100.`);
    return value;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;
    setError(null);
    try {
      if (commissionOnly && isEdit) {
        setPending(true);
        await networkApi.update(
          account._id,
          {
            matchCommission: parseCommission('Match', form.matchCommission, cap),
            sessionCommission: parseCommission('Session', form.sessionCommission, cap),
          },
          accessToken,
        );
        onSaved();
        return;
      }
      if (!form.name.trim()) throw new Error(isFranchise ? 'Owner name is required.' : 'Full name is required.');
      if (isFranchise && !form.businessName.trim()) throw new Error('Franchise name is required.');
      if (form.phone.trim() && !isMobile(form.phone.trim())) throw new Error('Enter a valid 10-digit mobile number.');

      const draft: AccountDraft = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        ...(canSetLimits
          ? {
              bettingLimit: rupeeLimit('Betting limit', form.bettingLimit),
              maxExposure: rupeeLimit('Max exposure', form.maxExposure),
            }
          : {}),
        matchCommission: parseCommission('Match', form.matchCommission, cap),
        sessionCommission: parseCommission('Session', form.sessionCommission, cap),
      };
      if (isFranchise) {
        draft.businessName = form.businessName.trim();
      }
      if (isFranchise && canSetShare) {
        draft.shareHolding = percent('Share holding', form.shareHolding);
      }

      setPending(true);
      if (isEdit) {
        await networkApi.update(account._id, draft, accessToken);
      } else {
        const username = form.username.trim().toLowerCase();
        if (!/^[a-z0-9_]{4,32}$/.test(username)) {
          throw new Error('Username must be 4–32 lowercase letters, numbers or underscores.');
        }
        if (form.password.length < 6) throw new Error('Password must be at least 6 characters.');
        const parent = parents[parentLabels.indexOf(form.parent)];
        if (copy.parent && !parent) throw new Error(`Choose a ${copy.parent.toLowerCase()}.`);
        await networkApi.create(
          {
            role,
            username,
            password: form.password,
            parentId: parent?._id,
            status: form.status === 'Inactive' ? 'suspended' : 'active',
            ...draft,
          },
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

  const commissionFields = (
    <>
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
    </>
  );

  const footer = (
    <>
      {error ? (
        <p role="alert" style={{ color: 'var(--color-danger)', margin: '12px 0 0', fontSize: 12 }}>
          {error}
        </p>
      ) : null}

      <div className={styles.footer}>
        <Button
          className={styles.submit}
          type="submit"
          variant="primary"
          size="sm"
          disabled={pending}
          icon={<CheckCircleIcon size={14} />}
        >
          {pending ? 'Saving…' : isEdit ? 'Save Changes' : `Create ${copy.noun}`}
        </Button>
        <Button className={styles.cancel} variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </>
  );

  if (commissionOnly && isEdit) {
    return (
      <Modal
        title="Set Commission"
        subtitle={`Rates ${account.businessName || account.name || account.username} receives from you`}
        width={420}
        onClose={onClose}
      >
        <form onSubmit={handleSubmit}>
          <div className={styles.grid}>{commissionFields}</div>
          {footer}
        </form>
      </Modal>
    );
  }

  return (
    <Modal
      title={isEdit ? `Edit ${copy.noun}` : `Create ${copy.noun}`}
      subtitle={isEdit ? `Update ${account.businessName || account.name || account.username}` : copy.subtitle}
      width={isFranchise ? 580 : 540}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className={styles.grid}>
          {isFranchise ? (
            <TextField
              label="Franchise Name *"
              labelCase="caps"
              placeholder="e.g. Mumbai Franchise"
              value={form.businessName}
              onChange={(event) => set('businessName')(event.target.value)}
            />
          ) : null}
          <TextField
            label={isFranchise ? 'Owner Name *' : 'Full Name *'}
            labelCase="caps"
            placeholder="Enter full name"
            value={form.name}
            onChange={(event) => set('name')(event.target.value)}
          />
          {!isEdit && copy.parent ? (
            <SelectField
              label={`Assign ${copy.parent} *`}
              options={parentLabels}
              placeholder={`— Select ${copy.parent} —`}
              value={form.parent}
              onChange={(event) => set('parent')(event.target.value)}
            />
          ) : null}
          <TextField
            label="Mobile Number (optional)"
            labelCase="caps"
            placeholder="+91 XXXXX XXXXX"
            value={form.phone}
            onChange={(event) => set('phone')(event.target.value)}
          />
          <TextField
            label="City"
            labelCase="caps"
            value={form.city}
            onChange={(event) => set('city')(event.target.value)}
          />
          <TextField
            label="State"
            labelCase="caps"
            value={form.state}
            onChange={(event) => set('state')(event.target.value)}
          />
          {commissionFields}
          {canSetLimits ? (
            <>
              <TextField
                label={withCurrency('Max Stake per Bet (₹)')}
                labelCase="caps"
                inputMode="numeric"
                placeholder="Platform limit"
                value={form.bettingLimit}
                onChange={(event) => set('bettingLimit')(event.target.value)}
              />
              <TextField
                label={withCurrency('Max Open Exposure (₹)')}
                labelCase="caps"
                inputMode="numeric"
                placeholder="No limit"
                value={form.maxExposure}
                onChange={(event) => set('maxExposure')(event.target.value)}
              />
            </>
          ) : null}
          {!isEdit ? (
            <>
              <TextField
                label="Username *"
                labelCase="caps"
                placeholder="e.g. mumbai_fr01"
                value={form.username}
                onChange={(event) => set('username')(event.target.value)}
              />
              <TextField
                label="Login Password *"
                labelCase="caps"
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(event) => set('password')(event.target.value)}
              />
              <SelectField
                label="Status *"
                options={['Active', 'Inactive']}
                value={form.status}
                onChange={(event) => set('status')(event.target.value)}
              />
            </>
          ) : null}
          {isFranchise && canSetShare ? (
            <TextField
              label="Company Share % (makes them a partner)"
              labelCase="caps"
              placeholder="--%"
              value={form.shareHolding}
              onChange={(event) => set('shareHolding')(event.target.value)}
            />
          ) : null}
        </div>

        {footer}
      </form>
    </Modal>
  );
}
