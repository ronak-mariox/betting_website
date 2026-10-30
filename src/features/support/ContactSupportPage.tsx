import type { CSSProperties } from 'react';
import { SectionCard } from '../../components/ui/SectionCard/SectionCard';
import { useAppConfig } from '../../lib/appConfigContext';
import { SUPPORT_INTRO, supportChannels } from './contactSupportData';
import styles from './ContactSupportPage.module.css';

/**
 * Contact Support — node 139:90076. The panels below the fold reach a person
 * directly, so this is a different screen from the ticket queue at
 * SupportTicketsPage; the staff navs point here. Staff no longer raise
 * tickets — those are a player ↔ Super Admin channel.
 */
export function ContactSupportPage() {
  const { support } = useAppConfig();
  const channels = supportChannels(support);
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <span className={styles.introTile} aria-hidden="true">
          {SUPPORT_INTRO.emoji}
        </span>
        <h2 className={styles.introTitle}>{SUPPORT_INTRO.title}</h2>
        <p className={styles.introSubtitle}>{SUPPORT_INTRO.subtitle}</p>
      </header>

      {channels.length === 0 ? (
        <p className={styles.noticeBody}>
          Support contacts haven’t been set up yet — please reach your upline or the platform admin directly.
        </p>
      ) : null}

      <div className={styles.channels}>
        {channels.map((channel) => (
          <article
            key={channel.title}
            className={styles.channel}
            style={{ '--channel-rgb': channel.rgb } as CSSProperties}
          >
            <div className={styles.channelHead}>
              <span className={styles.channelTile} aria-hidden="true">
                {channel.emoji}
              </span>
              <div className={styles.channelText}>
                <p className={styles.channelTitle}>{channel.title}</p>
                <p className={styles.channelHandle}>{channel.handle}</p>
              </div>
            </div>
            <p className={styles.channelNote}>{channel.note}</p>
            {channel.action && channel.href ? (
              <a
                className={styles.channelLink}
                href={channel.href}
                target={channel.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
              >
                {channel.action}
              </a>
            ) : null}
          </article>
        ))}
      </div>


      <aside className={styles.notice}>
        <span className={styles.noticeEmoji} aria-hidden="true">
          ℹ️
        </span>
        <div>
          <p className={styles.noticeTitle}>Before contacting support</p>
          <p className={styles.noticeBody}>
            Please keep your <strong>Agent ID / Super Agent ID</strong> and the{' '}
            <strong>relevant User ID or Transaction ID</strong> ready. This helps our team resolve
            your query faster.
          </p>
        </div>
      </aside>

      {support.hours ? (
        <SectionCard title="Support Hours" size="md">
          <div className={styles.hours}>
            <div className={styles.window}>
              <div className={styles.windowText}>
                <p className={styles.windowDay}>Open</p>
                <p className={styles.windowHours}>{support.hours}</p>
              </div>
              <span className={styles.windowDot} aria-hidden="true" />
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
