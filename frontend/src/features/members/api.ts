import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type {
  Member,
  CreateMemberInput,
  UpdateMemberInput,
  ImportRowDraft,
  ImportResult,
} from './types';

export const membersApi = {
  /** `deleted: true` lists soft-deleted members (the "Terhapus" filter). */
  list: (search?: string, deleted = false) =>
    api.get<ListResponse<Member>>('/members', {
      params: { search, deleted: deleted || undefined },
    }),

  getById: (id: string) => api.get<{ data: Member }>(`/members/${id}`),

  create: (input: CreateMemberInput) => api.post<{ data: Member }>('/members', input),

  update: (id: string, input: UpdateMemberInput) =>
    api.put<{ data: Member }>(`/members/${id}`, input),

  deactivate: (id: string) => api.post<{ data: Member }>(`/members/${id}/deactivate`),

  activate: (id: string) => api.post<{ data: Member }>(`/members/${id}/activate`),

  /** Soft delete: hidden from lists and the scanner, history preserved. */
  remove: (id: string) => api.delete<{ data: Member }>(`/members/${id}`),

  restore: (id: string) => api.post<{ data: Member }>(`/members/${id}/restore`),

  /**
   * Bulk create from the Excel/CSV preview. The API keeps every valid row and
   * reports the failures, so the response is `{ created, failed }` rather than
   * a list of members.
   */
  importMany: (rows: ImportRowDraft[]) =>
    api.post<{ data: ImportResult }>('/members/import', { rows }),
};
