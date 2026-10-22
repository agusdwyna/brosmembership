import { prisma } from '../../config/database';
import type {
  CreateCardTemplateInput,
  UpdateCardTemplateInput,
  CardTemplateElementInput,
} from './schema';
import { LIST_LIMIT } from '../../lib/query';

/**
 * Element fields written to the database. Shared by create and update so a new
 * property (e.g. `color`) cannot be added to one path and forgotten in the other.
 */
const elementData = (el: CardTemplateElementInput) => ({
  type: el.type,
  x: el.x,
  y: el.y,
  width: el.width,
  height: el.height,
  fontSize: el.fontSize,
  fontWeight: el.fontWeight,
  alignment: el.alignment,
  color: el.color,
});

class CardTemplateService {
  async list() {
    return prisma.cardTemplate.findMany({
      include: {
        sides: {
          include: { elements: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: LIST_LIMIT,
    });
  }

  async getById(id: string) {
    const item = await prisma.cardTemplate.findUnique({
      where: { id },
      include: {
        sides: {
          include: { elements: true },
        },
      },
    });
    if (!item) throw Object.assign(new Error('Card template tidak ditemukan'), { status: 404 });
    return item;
  }

  async create(input: CreateCardTemplateInput) {
    const { sides, ...data } = input;

    return prisma.cardTemplate.create({
      data: {
        ...data,
        sides: {
          create: sides.map((s) => ({
            side: s.side,
            designUrl: s.designUrl,
            elements: {
              create: s.elements.map(elementData),
            },
          })),
        },
      },
      include: {
        sides: {
          include: { elements: true },
        },
      },
    });
  }

  async update(id: string, input: UpdateCardTemplateInput) {
    await this.getById(id);
    const { sides, ...data } = input;

    // Deleting the old sides and recreating them must be one unit: a failure
    // between the two used to leave the template with no layout at all.
    return prisma.$transaction(async (tx) => {
      if (sides) {
        await tx.cardTemplateSide.deleteMany({ where: { cardTemplateId: id } });
      }

      return tx.cardTemplate.update({
        where: { id },
        data: {
          ...data,
          // A layout change is a new design revision; a rename is not.
          ...(sides && { version: { increment: 1 } }),
          ...(sides && {
            sides: {
              create: sides.map((s) => ({
                side: s.side,
                designUrl: s.designUrl,
                elements: {
                  create: s.elements.map(elementData),
                },
              })),
            },
          }),
        },
        include: {
          sides: {
            include: { elements: true },
          },
        },
      });
    });
  }

  async deactivate(id: string) {
    await this.getById(id);
    return prisma.cardTemplate.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async activate(id: string) {
    await this.getById(id);
    return prisma.cardTemplate.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async updateSideDesign(templateId: string, side: string, designUrl: string) {
    await this.getById(templateId);

    // Replacing a background image changes what is printed, so it is a new
    // design revision alongside the side write.
    await prisma.$transaction([
      prisma.cardTemplateSide.upsert({
        where: {
          cardTemplateId_side: { cardTemplateId: templateId, side },
        },
        create: {
          cardTemplateId: templateId,
          side,
          designUrl,
        },
        update: {
          designUrl,
        },
      }),
      prisma.cardTemplate.update({
        where: { id: templateId },
        data: { version: { increment: 1 } },
      }),
    ]);

    return this.getById(templateId);
  }
}

export const cardTemplateService = new CardTemplateService();
