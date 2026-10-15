export interface MembershipType {
  id: string;
  code: string;
  name: string;
  description?: string;
  duration: number;
  status: string;
  defaultCardTemplateId?: string;
  defaultCardTemplate?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipTypeInput {
  code: string;
  name: string;
  description?: string;
  duration: number;
  status?: string;
  defaultCardTemplateId?: string;
}

export interface UpdateMembershipTypeInput extends Partial<CreateMembershipTypeInput> {}
