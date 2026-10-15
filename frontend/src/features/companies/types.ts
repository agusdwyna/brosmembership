export interface Company {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number };
}

export interface CreateCompanyInput {
  code: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: string;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {}
