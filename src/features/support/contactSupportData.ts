export type SupportChannel = {
  /** Drawn as an emoji glyph in the design, not an exported icon. */
  emoji: string;
  title: string;
  /** The number, handle or address people reach the channel on. */
  handle: string;
  note: string;
  /** rgb triplet the card, tile and action are tinted with. */
  rgb: string;
  action?: string;
  /** Where the action button goes: tel:, WhatsApp, Telegram or mailto:. */
  href?: string;
};

export type SupportWindow = { day: string; hours: string; open: boolean };

/** Contact Support — node 139:90076. */
export const SUPPORT_INTRO = {
  emoji: '🎧',
  title: 'Contact Support',
  subtitle:
    'Our dedicated support team is available to help you. Reach us through any of the channels below.',
};

type SupportContacts = { email: string; phone: string; whatsapp: string; telegram: string; hours: string };

const digits = (value: string) => value.replace(/\D/g, '');
/** 10-digit Indian numbers get the country code; anything longer is taken as already international. */
const international = (value: string) => {
  const d = digits(value);
  return d.length === 10 ? `91${d}` : d;
};

/**
 * The channels set in Platform Settings → General (support email / phone /
 * WhatsApp / Telegram). A channel the admin left blank isn't shown.
 */
export function supportChannels(support: SupportContacts): SupportChannel[] {
  const hours = support.hours || 'During support hours';
  const channels: (SupportChannel | null)[] = [
    support.phone
      ? {
          emoji: '📞',
          title: 'Call Support',
          handle: support.phone,
          note: hours,
          rgb: '34, 197, 94',
          action: 'Call Now',
          href: `tel:+${international(support.phone)}`,
        }
      : null,
    support.whatsapp
      ? {
          emoji: '💬',
          title: 'WhatsApp',
          handle: support.whatsapp,
          note: 'Chat on WhatsApp',
          rgb: '37, 211, 102',
          action: 'Open WhatsApp',
          href: `https://wa.me/${international(support.whatsapp)}`,
        }
      : null,
    support.telegram
      ? {
          emoji: '✈️',
          title: 'Telegram',
          handle: support.telegram.startsWith('@') ? support.telegram : `@${support.telegram.replace(/^https?:\/\/t\.me\//, '')}`,
          note: 'Message us on Telegram',
          rgb: '41, 182, 246',
          action: 'Open Telegram',
          href: `https://t.me/${support.telegram.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '')}`,
        }
      : null,
    support.email
      ? {
          emoji: '✉️',
          title: 'Email Support',
          handle: support.email,
          note: 'We reply by email',
          rgb: '250, 204, 21',
          action: 'Send Email',
          href: `mailto:${support.email}`,
        }
      : null,
  ];
  return channels.filter((channel): channel is SupportChannel => channel !== null);
}
