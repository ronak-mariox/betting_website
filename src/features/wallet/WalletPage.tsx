import { useAuth } from '../auth/authContext';
import { LiveWallet } from './LiveWallet';

/**
 * Wallet console — node 112:2359 (requests) and 117:34376 (payments). Every
 * role gets live data scoped to its own network; admin-only tools appear for
 * super-admin.
 */
export function WalletPage() {
  const { user } = useAuth();
  return <LiveWallet adminTools={user?.roleId === 'super-admin'} />;
}
