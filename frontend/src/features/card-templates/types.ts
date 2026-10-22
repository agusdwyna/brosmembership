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
  // The API returns `null` for unset columns (Prisma), not `undefined`.
  fontSize?: number | null;
  fontWeight?: 'normal' | 'bold' | null;
  alignment?: 'left' | 'center' | 'right' | null;
}

export interface CardTemplateSide {
  id: string;
  side: SideType;
  designUrl?: string | null;
  elements: CardTemplateElement[];
}

export interface CardTemplate {
  id: string;
  name: string;
  status: string;
  /** Design revision; bumped when the layout changes, not on rename. */
  version: number;
  sides: CardTemplateSide[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardTemplateInput {
  name: string;
  sides: {
    side: SideType;
    // Sent back as `null` when a loaded side has no background image.
    designUrl?: string | null;
    elements: Omit<CardTemplateElement, 'id'>[];
  }[];
}

export interface UpdateCardTemplateInput extends Partial<CreateCardTemplateInput> {}
