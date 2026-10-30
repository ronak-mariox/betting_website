import { Button } from '../../components/ui/Button/Button';
import { CheckCircleIcon } from '../../components/icons';
import { ROLES } from '../../config/roles';
import type { RoleId } from '../../config/roles';
import styles from './RoleSelector.module.css';

export type RoleSelectorProps = {
  value: RoleId;
  onChange: (roleId: RoleId) => void;
};

/** The "Quick Demo Login" grid — one chip per entry in ROLES. */
export function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <div className={styles.grid} role="group" aria-label="Quick demo login">
      {ROLES.map((role) => {
        const Icon = role.icon;
        const selected = role.id === value;

        return (
          <Button
            key={role.id}
            variant={selected ? 'selected' : 'subtle'}
            aria-pressed={selected}
            title={role.description}
            icon={<Icon size={15.996} />}
            trailingIcon={selected ? <CheckCircleIcon size={12} /> : undefined}
            onClick={() => onChange(role.id)}
          >
            {role.label}
          </Button>
        );
      })}
    </div>
  );
}
