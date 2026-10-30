import { apiRequest } from '../api';

/** Matches backend `CMS_KINDS` — see backend/src/constants/admin.js. */
export type CmsKind = 'Announcement' | 'Banner' | 'Promotion' | 'Notice';

/** Matches backend `CMS_STATUSES` — see backend/src/constants/admin.js. */
export type CmsStatus = 'Draft' | 'Published' | 'Archived';

export type CmsContentItem = {
  _id: string;
  kind: CmsKind;
  status: CmsStatus;
  target: string;
  title: string;
  body: string;
  /** Banners: picture for the app's home carousel, and where a tap goes. */
  imageUrl?: string;
  link?: string;
  views: number;
  createdAt: string;
  updatedAt: string;
};

export type CmsContentDraft = {
  kind: CmsKind;
  title: string;
  body?: string;
  status?: CmsStatus;
  target?: string;
  imageUrl?: string;
  link?: string;
};

export type CmsContentUpdate = Partial<Omit<CmsContentDraft, 'kind'>>;

export const cmsApi = {
  getMarquee: (accessToken: string) => apiRequest<{ marqueeText: string }>('/cms/marquee', { accessToken }),

  setMarquee: (marqueeText: string, accessToken: string) =>
    apiRequest<{ marqueeText: string }>('/cms/marquee', {
      method: 'PATCH',
      body: { marqueeText },
      accessToken,
    }),

  list: (accessToken: string, kind?: CmsKind) =>
    apiRequest<{ items: CmsContentItem[] }>(kind ? `/cms?kind=${encodeURIComponent(kind)}` : '/cms', { accessToken }),

  create: (draft: CmsContentDraft, accessToken: string) =>
    apiRequest<{ content: CmsContentItem }>('/cms', { method: 'POST', body: draft, accessToken }),

  update: (id: string, updates: CmsContentUpdate, accessToken: string) =>
    apiRequest<{ content: CmsContentItem }>(`/cms/${id}`, { method: 'PATCH', body: updates, accessToken }),

  remove: (id: string, accessToken: string) =>
    apiRequest<{ success: boolean }>(`/cms/${id}`, { method: 'DELETE', accessToken }),
};
