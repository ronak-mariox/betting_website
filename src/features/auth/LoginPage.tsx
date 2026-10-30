import { useBranding } from '../../lib/brandingContext';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../components/ui/BrandMark/BrandMark';
import { Button } from '../../components/ui/Button/Button';
import { Card } from '../../components/ui/Card/Card';
import { Checkbox } from '../../components/ui/Checkbox/Checkbox';
import { SectionLabel } from '../../components/ui/SectionLabel/SectionLabel';
import { TextField } from '../../components/ui/TextField/TextField';
import { LockIcon, LoginIcon, MailIcon } from '../../components/icons';
import { ROLES, getRole } from '../../config/roles';
import type { RoleId } from '../../config/roles';
import { useAuth } from './authContext';
import { RoleSelector } from './RoleSelector';
import type { ResetDoneState } from './ForgotPasswordPage';
import styles from './LoginPage.module.css';

const DEFAULT_ROLE = ROLES[0];

export function LoginPage() {
  const { name: brandName, tagline, legal } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  // Set by ForgotPasswordPage after a successful reset.
  const resetDone = location.state as ResetDoneState | null;

  const [roleId, setRoleId] = useState<RoleId>(DEFAULT_ROLE.id);
  const [username, setUsername] = useState(resetDone?.resetUsername ?? DEFAULT_ROLE.demo.username);
  const [password, setPassword] = useState(resetDone ? '' : DEFAULT_ROLE.demo.password);
  const [notice, setNotice] = useState<string | null>(resetDone?.notice ?? null);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const role = getRole(roleId);

  /** Picking a role swaps in that panel's demo credentials (dev server only; otherwise keeps what was typed). */
  const selectRole = (nextRoleId: RoleId) => {
    const nextRole = getRole(nextRoleId);
    setRoleId(nextRoleId);
    if (nextRole.demo.username) {
      setUsername(nextRole.demo.username);
      setPassword(nextRole.demo.password);
    }
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    const message = await signIn({ roleId, username, password, remember });
    setPending(false);

    if (message) setError(message);
    else navigate(role.basePath, { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.glow} ${styles.glowTop}`} aria-hidden="true" />
      <div className={`${styles.glow} ${styles.glowBottom}`} aria-hidden="true" />

      <div className={styles.container}>
        <header className={styles.header}>
          <BrandMark />
          <h1 className={styles.title}>{brandName}</h1>
          <p className={styles.tagline}>{tagline}</p>
        </header>

        <Card className={styles.card} elevated>
          <SectionLabel>Quick Demo Login</SectionLabel>
          <div className={styles.roles}>
            <RoleSelector value={roleId} onChange={selectRole} />
          </div>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <TextField
              label="User Name"
              icon={<MailIcon />}
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <TextField
              label="Password"
              icon={<LockIcon />}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <div className={styles.options}>
              <Checkbox
                label="Remember me"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <Button
                variant="link"
                onClick={() => navigate('/forgot-password', { state: { username: username.trim() } })}
              >
                Forgot password?
              </Button>
            </div>

            {notice && !error ? (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            ) : null}

            {error ? (
              <p className={styles.alert} role="alert">
                {error}
              </p>
            ) : null}

            <Button
              className={styles.submit}
              type="submit"
              variant="primary"
              size="md"
              block
              disabled={pending}
              icon={<LoginIcon size={15.996} />}
            >
              {pending ? 'Signing in…' : `Sign In as ${role.label}`}
            </Button>
          </form>
        </Card>

        <p className={styles.footer}>{legal}</p>
      </div>
    </div>
  );
}
