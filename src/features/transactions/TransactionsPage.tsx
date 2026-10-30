import { LiveTransactions } from './LiveTransactions';

/** Transaction ledger — node 112:3084. The backend scopes it to the viewer's own network. */
export function TransactionsPage() {
  return <LiveTransactions />;
}
