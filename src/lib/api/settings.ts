import { apiRequest } from '../api';

export type SettingsSection =
  | 'general'
  | 'walletRules'
  | 'bettingLimits'
  | 'exposureLimits'
  | 'commissionRates'
  | 'smtp'
  | 'sms'
  | 'brand';

export type SettingsValues = Record<string, string | number | boolean | null | undefined>;

export type ApiKeyEntry = {
  _id: string;
  name: string;
  status: string;
  latency: number;
  /** Masked server-side. */
  key: string;
};

/** Deposit QR / UPI the app's Deposit screen shows (Settings → Payment Details). */
export type PaymentDetails = {
  /** Data URI, '' when none. */
  qrImage: string;
  upiId: string;
  payeeName: string;
  note: string;
  updatedAt: string | null;
};

export type ApiSettings = Record<SettingsSection, SettingsValues> & {
  _id: string;
  apiKeys: ApiKeyEntry[];
  paymentDetails?: Partial<PaymentDetails>;
  updatedAt: string;
};

type SettingsResponse = { settings: ApiSettings };

export const settingsApi = {
  get: (accessToken: string) => apiRequest<SettingsResponse>('/settings', { accessToken }),

  /** Replaces the deposit QR / UPI details; a field left out keeps its value, `qrImage: ''` removes the QR. */
  updatePaymentDetails: (values: Partial<Omit<PaymentDetails, 'updatedAt'>>, accessToken: string) =>
    apiRequest<{ paymentDetails: PaymentDetails }>('/settings/payment-details', { method: 'PUT', body: values, accessToken }),

  /** The backend `$set`s the whole section, so always send the complete object. */
  updateSection: (section: SettingsSection, values: SettingsValues, accessToken: string) =>
    apiRequest<SettingsResponse>(`/settings/${section}`, { method: 'PATCH', body: values, accessToken }),

  addApiKey: (payload: { name: string; key: string }, accessToken: string) =>
    apiRequest<SettingsResponse>('/settings/api-keys', { method: 'POST', body: payload, accessToken }),

  updateApiKey: (id: string, updates: Partial<Pick<ApiKeyEntry, 'name' | 'status' | 'key'>>, accessToken: string) =>
    apiRequest<SettingsResponse>(`/settings/api-keys/${id}`, { method: 'PATCH', body: updates, accessToken }),

  /** Sends a test through the saved SMTP / SMS gateway; rejects with the provider's error. */
  testEmail: (to: string, accessToken: string) =>
    apiRequest<{ message: string }>('/settings/smtp/test', { method: 'POST', body: { to }, accessToken }),

  testSms: (to: string, accessToken: string) =>
    apiRequest<{ message: string }>('/settings/sms/test', { method: 'POST', body: { to }, accessToken }),

  removeApiKey: (id: string, accessToken: string) =>
    apiRequest<SettingsResponse>(`/settings/api-keys/${id}`, { method: 'DELETE', accessToken }),
};
