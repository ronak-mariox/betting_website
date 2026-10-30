import { apiRequest } from '../api';

/** Matches backend `TICKET_STATUSES` / `TICKET_PRIORITIES` — see backend/src/constants/admin.js. */
export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TicketUserRef = { _id: string; name?: string; username: string; role?: string };

export type TicketMessage = {
  author: TicketUserRef | string | null;
  fromSupport: boolean;
  body: string;
  at: string;
};

export type ApiTicket = {
  _id: string;
  subject: string;
  category: string;
  raisedBy: TicketUserRef | string;
  role: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTeam: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
};

/** A staff account's own tickets (the support desk endpoints above are the admin's). */
export const myTicketsApi = {
  list: (accessToken: string) => apiRequest<{ tickets: ApiTicket[] }>('/support/my-tickets', { accessToken }),

  raise: (payload: { subject: string; category: string; priority: TicketPriority; body: string }, accessToken: string) =>
    apiRequest<{ ticket: ApiTicket }>('/support/my-tickets', { method: 'POST', body: payload, accessToken }),

  get: (id: string, accessToken: string) =>
    apiRequest<{ ticket: ApiTicket }>(`/support/my-tickets/${id}`, { accessToken }),

  reply: (id: string, body: string, accessToken: string) =>
    apiRequest<{ ticket: ApiTicket }>(`/support/my-tickets/${id}/messages`, {
      method: 'POST',
      body: { body },
      accessToken,
    }),
};

export const supportApi = {
  list: (accessToken: string) => apiRequest<{ tickets: ApiTicket[] }>('/support/tickets', { accessToken }),

  get: (id: string, accessToken: string) =>
    apiRequest<{ ticket: ApiTicket }>(`/support/tickets/${id}`, { accessToken }),

  updateStatus: (id: string, status: TicketStatus, accessToken: string) =>
    apiRequest<{ ticket: ApiTicket }>(`/support/tickets/${id}/status`, {
      method: 'PATCH',
      body: { status },
      accessToken,
    }),

  reply: (id: string, body: string, accessToken: string) =>
    apiRequest<{ ticket: ApiTicket }>(`/support/tickets/${id}/messages`, {
      method: 'POST',
      body: { body },
      accessToken,
    }),
};
