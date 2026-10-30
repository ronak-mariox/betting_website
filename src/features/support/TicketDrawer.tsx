import { Loader } from '../../components/ui/Loader/Loader';
import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronRightIcon, SendIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Drawer } from '../../components/ui/Drawer/Drawer';
import { TextAreaField } from '../../components/ui/TextField/TextAreaField';
import { useAuth } from '../auth/authContext';
import { ApiRequestError } from '../../lib/api';
import { supportApi } from '../../lib/api/support';
import type { ApiTicket, TicketStatus } from '../../lib/api/support';
import { cx } from '../../lib/cx';
import {
  PRIORITY_RGB,
  STATUS_RGB,
  TICKET_ACTIONS,
  formatTicketDate,
  roleLabel,
  ticketCode,
  userCode,
  userName,
} from './supportData';
import styles from './TicketDrawer.module.css';

const errorMessage = (err: unknown) =>
  err instanceof ApiRequestError ? err.message : 'Unable to reach the server.';

export type TicketDrawerProps = {
  ticketId: string;
  onChanged: () => void | Promise<void>;
  onClose: () => void;
};

/** Ticket detail sheet — node 119:63200. */
export function TicketDrawer({ ticketId, onChanged, onClose }: TicketDrawerProps) {
  const { accessToken } = useAuth();
  const [ticket, setTicket] = useState<ApiTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [reply, setReply] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await supportApi.get(ticketId, accessToken);
      setTicket(res.ticket);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [accessToken, ticketId]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeStatus = async (status: TicketStatus) => {
    if (!accessToken) return;
    setPending(true);
    setError(null);
    try {
      await supportApi.updateStatus(ticketId, status, accessToken);
      await Promise.all([load(), onChanged()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const sendReply = async () => {
    if (!accessToken || !reply.trim()) return;
    setPending(true);
    setError(null);
    try {
      await supportApi.reply(ticketId, reply.trim(), accessToken);
      setReply('');
      await Promise.all([load(), onChanged()]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (!ticket) {
    return (
      <Drawer
        label="Ticket detail"
        width={620}
        headerClassName={styles.header}
        headerLayout="stack"
        onClose={onClose}
        header={<p className={styles.subject}>Support Ticket</p>}
      >
        <div className={styles.body}>
          <p className={styles.metaValue}>{error ?? <Loader block />}</p>
        </div>
      </Drawer>
    );
  }

  const code = ticketCode(ticket);
  const raisedByName = userName(ticket.raisedBy);
  const meta = [
    { label: 'Category', value: ticket.category },
    { label: 'Assigned To', value: ticket.assignedTeam || 'Unassigned' },
    { label: 'Created', value: formatTicketDate(ticket.createdAt) },
    { label: 'Last Updated', value: formatTicketDate(ticket.updatedAt) },
  ];

  return (
    <Drawer
      label={`${code} detail`}
      width={620}
      headerClassName={styles.header}
      headerLayout="stack"
      onClose={onClose}
      header={
        <div className={styles.identity}>
          <p className={styles.breadcrumb}>
            <span className={styles.crumbRoot}>Support Tickets</span>
            <ChevronRightIcon size={9.996} />
            <span>{code}</span>
          </p>
          <p className={styles.subject}>{ticket.subject}</p>
          <div className={styles.chips}>
            <span className={styles.code}>{code}</span>
            <span className={styles.chip} style={{ '--chip-rgb': PRIORITY_RGB[ticket.priority] } as CSSProperties}>
              {ticket.priority.toUpperCase()}
            </span>
            <span className={styles.chip} style={{ '--chip-rgb': STATUS_RGB[ticket.status] } as CSSProperties}>
              {ticket.status}
            </span>
          </div>
        </div>
      }
    >
      <div className={styles.body}>
        <div className={styles.meta}>
          {meta.map((cell) => (
            <div key={cell.label} className={styles.metaCell}>
              <p className={styles.metaLabel}>{cell.label}</p>
              <p className={styles.metaValue}>{cell.value}</p>
            </div>
          ))}
        </div>

        <section className={styles.panel}>
          <p className={styles.panelLabel}>Raised By</p>
          <div className={styles.raisedBy}>
            <div className={styles.person}>
              <span className={styles.personAvatar}>{raisedByName.slice(0, 1).toUpperCase()}</span>
              <div>
                <p className={styles.personName}>{raisedByName}</p>
                <p className={styles.personMeta}>
                  <span className={styles.roleChip}>{roleLabel(ticket.role)}</span>
                  <span className={styles.code}>{userCode(ticket.raisedBy)}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className={styles.actions}>
          {TICKET_ACTIONS.filter((action) => action.status !== ticket.status).map((action) => (
            <button
              key={action.label}
              type="button"
              className={styles.action}
              style={{ '--action-rgb': action.rgb } as CSSProperties}
              disabled={pending}
              onClick={() => changeStatus(action.status)}
            >
              {action.label}
            </button>
          ))}
        </div>

        {error ? <p className={styles.metaValue}>{error}</p> : null}

        <section className={styles.panel}>
          <p className={styles.panelTitle}>Conversation</p>
          <div className={styles.thread}>
            {ticket.messages.length === 0 ? <p className={styles.personMeta}>No messages yet.</p> : null}
            {ticket.messages.map((message, index) => {
              const author = message.fromSupport ? userName(message.author, 'Support') : userName(message.author, raisedByName);
              return (
                // eslint-disable-next-line react/no-array-index-key
                <article key={index} className={cx(styles.message, message.fromSupport && styles.fromSupport)}>
                  <span className={cx(styles.messageAvatar, message.fromSupport && styles.supportAvatar)}>
                    {author.slice(0, 1).toUpperCase()}
                  </span>
                  <div className={styles.messageMain}>
                    <p className={styles.messageHead}>
                      <span className={styles.messageAuthor}>{author}</span>
                      <span className={styles.messageTime}>{formatTicketDate(message.at)}</span>
                    </p>
                    <p className={cx(styles.bubble, message.fromSupport && styles.bubbleSupport)}>{message.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {ticket.status === 'Closed' ? (
          <section className={styles.panel}>
            <p className={styles.panelTitle}>Reply</p>
            <p className={styles.panelTitle}>This ticket is closed. Reopen it to reply.</p>
          </section>
        ) : (
          <section className={styles.panel}>
            <p className={styles.panelTitle}>Reply</p>
            <div className={styles.reply}>
              <TextAreaField
                className={styles.replyBox}
                label="Reply"
                aria-label="Reply"
                placeholder="Type your reply..."
                value={reply}
                onChange={(event) => setReply(event.target.value)}
              />
            </div>
            <div className={styles.replyActions}>
              <Button className={styles.clear} size="xs" disabled={pending} onClick={() => setReply('')}>
                Clear
              </Button>
              <Button
                variant="primary"
                size="xs"
                icon={<SendIcon size={12} />}
                disabled={pending || !reply.trim()}
                onClick={sendReply}
              >
                {pending ? 'Sending…' : 'Send Reply'}
              </Button>
            </div>
          </section>
        )}
      </div>
    </Drawer>
  );
}
