export type ElementType =
  'MEMBER_NAME' | 'MEMBER_NUMBER' | 'MEMBERSHIP_NAME' | 'EXPIRY_DATE' | 'QR_CODE';
export type SideType = 'FRONT' | 'BACK';

export interface CardTemplateElement {
  id?: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  alignment?: 'left' | 'center' | 'right';
}

export interface CardTemplateSide {
  id: string;
  side: SideType;
  designUrl?: string;
  elements: CardTemplateElement[];
}

export interface CardTemplate {
  id: string;
  name: string;
  status: string;
  sides: CardTemplateSide[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardTemplateInput {
  name: string;
  sides: {
    side: SideType;
    designUrl?: string;
    elements: Omit<CardTemplateElement, 'id'>[];
  }[];
}

export interface UpdateCardTemplateInput extends Partial<CreateCardTemplateInput> {}
