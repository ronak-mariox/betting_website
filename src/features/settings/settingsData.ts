export const SETTINGS_TABS = [
  'General',
  'Limits',
  'Commission',
  'Payment Details',
  'Notifications',
  'Brand',
  'API Keys',
] as const;

/** Commission share bars top out at this rate. */
export const COMMISSION_CEILING = 20;

export type FieldOption = { value: string; label: string };

/**
 * One editable field of a live settings section — `key` is the property
 * stored in that section on the backend. A blank number means "no limit".
 */
export type SectionField = {
  key: string;
  label: string;
  type: 'number' | 'text' | 'password' | 'select';
  options?: readonly FieldOption[];
  /** Grey hint under the label's input. */
  placeholder?: string;
};

const num = (key: string, label: string, placeholder?: string): SectionField => ({ key, label, type: 'number', placeholder });
const text = (key: string, label: string, placeholder?: string): SectionField => ({ key, label, type: 'text', placeholder });
const secret = (key: string, label: string): SectionField => ({
  key,
  label,
  type: 'password',
  placeholder: 'Leave as is to keep the saved one',
});
const select = (key: string, label: string, options: readonly FieldOption[]): SectionField => ({
  key,
  label,
  type: 'select',
  options,
});

/** Matches the backend's CURRENCIES (settings.service.js). */
const CURRENCY_OPTIONS: FieldOption[] = [
  { value: 'INR', label: 'INR — Indian Rupee (₹)' },
  { value: 'USD', label: 'USD — US Dollar ($)' },
  { value: 'EUR', label: 'EUR — Euro (€)' },
  { value: 'GBP', label: 'GBP — British Pound (£)' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'BDT', label: 'BDT — Bangladeshi Taka (৳)' },
  { value: 'PKR', label: 'PKR — Pakistani Rupee' },
  { value: 'NPR', label: 'NPR — Nepalese Rupee' },
  { value: 'LKR', label: 'LKR — Sri Lankan Rupee' },
];

const TIMEZONE_OPTIONS: FieldOption[] = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Dhaka',
  'Asia/Karachi',
  'Asia/Kathmandu',
  'Asia/Colombo',
  'Asia/Singapore',
  'Europe/London',
  'UTC',
].map((tz) => ({ value: tz, label: tz }));

const SMS_PROVIDER_OPTIONS: FieldOption[] = [
  { value: '', label: 'Off — no SMS' },
  { value: 'Fast2SMS', label: 'Fast2SMS (India)' },
  { value: 'Twilio', label: 'Twilio (API Key = SID:TOKEN)' },
];

/**
 * Field layout for each backend settings section (super-admin live view).
 * `commissionRates` only holds the referral bonus now: session / match
 * commission is set on each account by its upline.
 */
export const SECTION_FIELDS = {
  general: [
    text('platformName', 'Platform Name'),
    select('currency', 'Currency', CURRENCY_OPTIONS),
    select('timezone', 'Timezone (what "today" means)', TIMEZONE_OPTIONS),
    text('supportEmail', 'Support Email', 'support@yourdomain.com'),
    text('supportPhone', 'Support Phone', '+91 98765 43210'),
    text('supportWhatsapp', 'Support WhatsApp', '+91 98765 43210'),
    text('supportTelegram', 'Support Telegram', '@yoursupport'),
    text('supportHours', 'Support Hours', 'Mon–Sun, 9 AM – 11 PM'),
    text('appLink', 'App Download Link (in referral shares)', 'https://…'),
  ],
  walletRules: [
    num('minDeposit', 'Min Deposit (₹)'),
    num('maxDeposit', 'Max Deposit (₹)'),
    num('minWithdrawal', 'Min Withdrawal (₹)'),
    num('maxWithdrawal', 'Max Withdrawal / Day (₹)'),
    num('reservePercent', 'Wallet Reserve % (always stays)', 'e.g. 10 = 10% of the balance always stays, only 90% can be withdrawn · blank = 0'),
    num('processingHours', 'Withdrawal Processing Time (hours)', 'Shown to players on Withdraw'),
  ],
  bettingLimits: [
    num('minBet', 'Min Bet Amount (₹)'),
    num('maxBet', 'Max Bet Amount (₹)'),
    num('maxDailyLoss', 'Max Daily Loss per User (₹)', 'Blank = no limit'),
    num('maxOpenBets', 'Max Open Bets per User', 'Blank = no limit'),
  ],
  exposureLimits: [
    num('maxMarketExposure', 'Max Market Exposure (₹)', 'Blank = no limit'),
    num('maxMatchExposure', 'Max Match Exposure (₹)', 'Blank = no limit'),
    num('maxAgentExposure', 'Max Agent Exposure (₹)', "For agents without their own"),
    num('maxUserExposure', 'Max User Exposure (₹)', 'Blank = no limit'),
    num('autoSuspendPercent', 'Auto-Suspend Threshold (%)', '% of the cap — market suspends'),
    num('warningPercent', 'Warning Threshold (%)', '% of the cap — admins alerted'),
  ],
  commissionRates: [num('referral', 'User Referral Bonus (% of first deposit)')],
  smtp: [
    text('host', 'SMTP Host'),
    num('port', 'SMTP Port'),
    text('user', 'SMTP User'),
    secret('pass', 'SMTP Password'),
    text('fromEmail', 'From Email'),
    text('fromName', 'From Name'),
  ],
  sms: [
    select('provider', 'SMS Provider', SMS_PROVIDER_OPTIONS),
    secret('apiKey', 'API Key'),
    text('senderId', 'Sender ID', 'Twilio: the sending number'),
    num('otpValidityMinutes', 'OTP Validity (minutes)', 'Password reset codes; default 10'),
  ],
  brand: [
    text('brandName', 'Brand Name'),
    text('tagline', 'Tagline'),
    text('logoUrl', 'Logo URL'),
  ],
} as const satisfies Record<string, SectionField[]>;

export const BRAND_COLOR_FIELDS: SectionField[] = [
  text('primaryColor', 'Primary Color'),
  text('accentColor', 'Accent Color'),
  text('backgroundColor', 'Background'),
  text('successColor', 'Success Color'),
];
