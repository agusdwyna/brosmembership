import { api } from '@/lib/api';
import type { ListResponse } from '@/lib/list';
import type {
  CardTemplate,
  CreateCardTemplateInput,
  UpdateCardTemplateInput,
  SideType,
} from './types';

export const cardTemplatesApi = {
  list: () => api.get<ListResponse<CardTemplate>>('/card-templates'),
  getById: (id: string) => api.get<{ data: CardTemplate }>(`/card-templates/${id}`),
  create: (input: CreateCardTemplateInput) =>
    api.post<{ data: CardTemplate }>('/card-templates', input),
  update: (id: string, input: UpdateCardTemplateInput) =>
    api.put<{ data: CardTemplate }>(`/card-templates/${id}`, input),
  deactivate: (id: string) => api.post(`/card-templates/${id}/deactivate`),
  activate: (id: string) => api.post(`/card-templates/${id}/activate`),
  uploadDesign: (id: string, side: SideType, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post<{ data: CardTemplate }>(
      `/card-templates/${id}/sides/${side}/upload`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
  },
};
