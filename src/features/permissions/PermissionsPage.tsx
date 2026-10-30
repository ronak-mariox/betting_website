import { Loader } from '../../components/ui/Loader/Loader';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { CheckCircleIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Meter } from '../../components/ui/ProgressBar/ProgressBar';
import { Switch } from '../../components/ui/Switch/Switch';
import { ApiRequestError } from '../../lib/api';
import type { PermissionGroup } from '../../lib/api';
import { permissionsApi } from '../../lib/api/permissions';
import type { PermissionMatrix } from '../../lib/api/permissions';
import { cx } from '../../lib/cx';
import { useAuth } from '../auth/authContext';
import { GROUP_EMOJI, LEGEND, ROLES } from './permissionsData';
import type { Grant, RoleKey } from './permissionsData';
import styles from './PermissionsPage.module.css';

/** Grants keyed by "groupKey.permissionKey", per role. */
type GrantMap = Record<string, Grant>;
type Drafts = Record<RoleKey, GrantMap>;

const cellKey = (groupKey: string, permissionKey: string) => `${groupKey}.${permissionKey}`;

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

function toGrantMap(groups: PermissionGroup[]): GrantMap {
  const map: GrantMap = {};
  groups.forEach((group) =>
    group.permissions.forEach((permission) => {
      map[cellKey(group.key, permission.key)] = permission.grant;
    }),
  );
  return map;
}

const toDrafts = (matrix: PermissionMatrix): Drafts => ({
  superAgent: toGrantMap(matrix.superAgent),
  agent: toGrantMap(matrix.agent),
  franchise: toGrantMap(matrix.franchise),
});

/** Cells whose draft differs from what the server holds. */
function changedCells(saved: Drafts, drafts: Drafts) {
  return ROLES.flatMap(({ key: roleKey }) =>
    Object.entries(drafts[roleKey])
      .filter(([cell, grant]) => saved[roleKey][cell] !== grant)
      .map(([cell, grant]) => {
        const [groupKey, permissionKey] = cell.split('.');
        return { roleKey, groupKey, permissionKey, grant };
      }),
  );
}

/** Role permission matrix — node 112:12758. Reads and saves the live matrix (/api/permissions). */
export function PermissionsPage() {
  const { accessToken } = useAuth();
  const [role, setRole] = useState<RoleKey>('superAgent');
  /** Group/permission structure, the same for every role. */
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [saved, setSaved] = useState<Drafts | null>(null);
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const { roles } = await permissionsApi.matrix(accessToken);
      setGroups(roles.superAgent);
      setSaved(toDrafts(roles));
      setDrafts(toDrafts(roles));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const changes = useMemo(() => (saved && drafts ? changedCells(saved, drafts) : []), [saved, drafts]);
  const dirty = changes.length > 0;
  const grants: GrantMap = drafts?.[role] ?? {};
  const totalPermissions = groups.reduce((sum, group) => sum + group.permissions.length, 0);

  const enabledCount = (map: GrantMap) => Object.values(map).filter((grant) => grant.includes('E')).length;

  const setCell = (cell: string, next: Grant) => {
    setDrafts((current) => (current ? { ...current, [role]: { ...current[role], [cell]: next } } : current));
    setNotice(null);
  };

  const toggle = (cell: string, flag: 'E' | 'V' | 'X') => {
    const value = grants[cell] ?? '';
    // Turning the master off clears view and edit with it.
    if (flag === 'E') setCell(cell, value.includes('E') ? '' : 'EV');
    else setCell(cell, value.includes(flag) ? value.replace(flag, '') : `${value}${flag}`);
  };

  const toggleGroup = (group: PermissionGroup, allOn: boolean) => {
    setDrafts((current) => {
      if (!current) return current;
      const next = { ...current[role] };
      group.permissions.forEach((permission) => {
        next[cellKey(group.key, permission.key)] = allOn ? '' : 'EV';
      });
      return { ...current, [role]: next };
    });
    setNotice(null);
  };

  /** The API takes one cell per call, so each change is sent in turn, then the matrix is reloaded. */
  const save = async () => {
    if (!accessToken || !dirty) return;
    setSaving(true);
    setError(null);
    let done = 0;
    try {
      for (const change of changes) {
        // eslint-disable-next-line no-await-in-loop
        await permissionsApi.setGrant(accessToken, change.roleKey, change.groupKey, change.permissionKey, change.grant);
        done += 1;
      }
      setNotice(`Saved ${done} permission change${done === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(`${errorMessage(err)} (${done} of ${changes.length} changes saved)`);
    } finally {
      setSaving(false);
      await load();
    }
  };

  const active = ROLES.find((item) => item.key === role)!;

  if (loading && !drafts) return <Loader block label="Loading permissions…" />;
  if (!drafts) return <p className={cx(styles.status, styles.statusError)}>{error}</p>;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Role Permissions</h1>
          <p className={styles.subtitle}>
            Configure what each role can view and edit across the platform
          </p>
        </div>
        <Button
          variant="primary"
          size="xs"
          disabled={!dirty || saving}
          icon={<CheckCircleIcon size={12.992} />}
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : dirty ? `Save Changes (${changes.length})` : 'Save Changes'}
        </Button>
      </div>

      {error ? <p className={cx(styles.status, styles.statusError)} role="alert">{error}</p> : null}
      {notice ? <p className={cx(styles.status, styles.statusOk)} role="status">{notice}</p> : null}

      <div className={styles.roles}>
        {ROLES.map((item) => {
          const shown = enabledCount(drafts[item.key]);
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={item.key === role}
              className={cx(styles.role, item.key === role && styles.roleActive)}
              style={{ '--role-rgb': item.rgb } as CSSProperties}
              onClick={() => setRole(item.key)}
            >
              <span className={styles.roleHead}>
                <span className={styles.roleEmoji} aria-hidden="true">
                  {item.emoji}
                </span>
                <span className={styles.roleText}>
                  <span className={styles.roleName}>{item.name}</span>
                  <span className={styles.roleDescription}>{item.description}</span>
                </span>
              </span>
              <Meter
                className={styles.roleMeter}
                label={`${item.name} permissions`}
                percent={totalPermissions ? (shown / totalPermissions) * 100 : 0}
                fill="rgb(var(--role-rgb))"
                height={3.997}
              />
              <span className={styles.roleCount}>
                {shown} / {totalPermissions} permissions enabled
              </span>
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendTitle}>Legend:</span>
        {LEGEND.map((item) => (
          <span key={item.term} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: `rgb(${item.rgb})` }} />
            <span className={styles.legendTerm}>{item.term}</span>
            <span className={styles.legendText}>{item.description}</span>
          </span>
        ))}
      </div>

      {groups.map((group) => {
        const cells = group.permissions.map((permission) => cellKey(group.key, permission.key));
        const allOn = cells.every((cell) => (grants[cell] ?? '').includes('E'));
        const groupEnabled = cells.filter((cell) => (grants[cell] ?? '').includes('E')).length;
        return (
          <section
            key={group.key}
            className={styles.group}
            style={{ '--role-rgb': active.rgb } as CSSProperties}
          >
            <header className={styles.groupHead}>
              <div className={styles.groupTitle}>
                <span className={styles.groupEmoji} aria-hidden="true">
                  {GROUP_EMOJI[group.key] ?? '•'}
                </span>
                <div>
                  <p className={styles.groupName}>{group.name}</p>
                  <p className={styles.groupCount}>
                    {groupEnabled} of {group.permissions.length} enabled
                  </p>
                </div>
              </div>
              <div className={styles.allToggle}>
                <span className={styles.allLabel}>All On/Off</span>
                <Switch
                  className={styles.switch}
                  checked={allOn}
                  onChange={() => toggleGroup(group, allOn)}
                  label={`Toggle all ${group.name} permissions`}
                  size="sm"
                />
              </div>
            </header>

            <div className={cx(styles.row, styles.columns)}>
              <span>Permission</span>
              <span className={styles.center}>Enable</span>
              <span className={styles.center}>View</span>
              <span className={styles.center}>Edit</span>
            </div>

            {group.permissions.map((permission) => {
              const cell = cellKey(group.key, permission.key);
              const value = grants[cell] ?? '';
              const enabled = value.includes('E');
              return (
                <div
                  key={permission.key}
                  className={cx(styles.row, styles.permission, !enabled && styles.rowOff)}
                >
                  <div>
                    <p className={styles.permissionName}>{permission.name}</p>
                    <p className={styles.permissionDescription}>{permission.description}</p>
                  </div>
                  <div className={styles.cell}>
                    <Switch
                      className={styles.switch}
                      checked={enabled}
                      onChange={() => toggle(cell, 'E')}
                      label={`Enable ${permission.name}`}
                      size="sm"
                    />
                  </div>
                  <div className={styles.cell}>
                    <Switch
                      className={styles.switch}
                      checked={value.includes('V')}
                      onChange={() => toggle(cell, 'V')}
                      label={`View ${permission.name}`}
                      size="xs"
                    />
                  </div>
                  <div className={styles.cell}>
                    <Switch
                      className={styles.switch}
                      checked={value.includes('X')}
                      onChange={() => toggle(cell, 'X')}
                      label={`Edit ${permission.name}`}
                      size="xs"
                    />
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
