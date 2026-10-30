import { useBranding } from '../../lib/brandingContext';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '../../components/ui/BrandMark/BrandMark';
import { Button } from '../../components/ui/Button/Button';
import { Card } from '../../components/ui/Card/Card';
import { SectionLabel } from '../../components/ui/SectionLabel/SectionLabel';
import { TextField } from '../../components/ui/TextField/TextField';
import { HashIcon, KeyIcon, LockIcon, MailIcon, SendIcon } from '../../components/icons';
import { authApi } from '../../lib/api';
import styles from './LoginPage.module.css';

type Step = 'request' | 'reset';

/** State LoginPage reads after a successful reset, to greet the user and pre-fill their username. */
export type ResetDoneState = { resetUsername: string; notice: string };

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Something went wrong');

export function ForgotPasswordPage() {
  const { name: brandName, tagline, legal } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const initialUsername = (location.state as { username?: string } | null)?.username ?? '';

  const [step, setStep] = useState<Step>('request');
  const [username, setUsername] = useState(initialUsername);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sendCode = async () => {
    if (!username.trim()) {
      setError('Enter your username');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { message } = await authApi.forgotPassword(username.trim());
      setNotice(message);
      setStep('reset');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const handleRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendCode();
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setPending(true);
    setError(null);
    try {
      const { message } = await authApi.resetPassword({
        username: username.trim(),
        code: code.trim(),
        newPassword,
      });
      const state: ResetDoneState = { resetUsername: username.trim().toLowerCase(), notice: message };
      navigate('/login', { replace: true, state });
    } catch (err) {
      setError(errorMessage(err));
      setPending(false);
    }
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
          <SectionLabel>Reset Password</SectionLabel>
          <p className={styles.hint}>
            {step === 'request'
              ? 'Enter your username and we will send a 6-digit code to the email / mobile number on your account.'
              : `Enter the code sent for "${username.trim()}" and choose a new password.`}
          </p>

          {step === 'request' ? (
            <form className={styles.form} onSubmit={handleRequest} noValidate>
              <TextField
                label="User Name"
                icon={<MailIcon />}
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />

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
                icon={<SendIcon size={15.996} />}
              >
                {pending ? 'Sending…' : 'Send Reset Code'}
              </Button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={handleReset} noValidate>
              {notice ? (
                <p className={styles.notice} role="status">
                  {notice}
                </p>
              ) : null}

              <TextField
                label="Reset Code"
                icon={<HashIcon />}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
              <TextField
                label="New Password"
                icon={<LockIcon />}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <TextField
                label="Confirm New Password"
                icon={<LockIcon />}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />

              <div className={styles.options}>
                <Button variant="link" onClick={() => void sendCode()} disabled={pending}>
                  Resend code
                </Button>
                <Button
                  variant="link"
                  onClick={() => {
                    setStep('request');
                    setNotice(null);
                    setError(null);
                  }}
                >
                  Change username
                </Button>
              </div>

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
                icon={<KeyIcon size={15.996} />}
              >
                {pending ? 'Updating…' : 'Reset Password'}
              </Button>
            </form>
          )}

          <div className={styles.backRow}>
            <Button variant="link" onClick={() => navigate('/login')}>
              Back to sign in
            </Button>
          </div>
        </Card>

        <p className={styles.footer}>{legal}</p>
      </div>
    </div>
  );
}
