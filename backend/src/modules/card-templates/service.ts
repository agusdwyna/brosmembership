import { prisma } from '../../config/database';
import type { CreateCardTemplateInput, UpdateCardTemplateInput } from './schema';
import { LIST_LIMIT } from '../../lib/query';

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
              create: s.elements.map((el) => ({
                type: el.type,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                fontSize: el.fontSize,
                fontWeight: el.fontWeight,
                alignment: el.alignment,
              })),
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

    // Update sides: delete existing and recreate
    if (sides) {
      await prisma.cardTemplateSide.deleteMany({ where: { cardTemplateId: id } });
    }

    return prisma.cardTemplate.update({
      where: { id },
      data: {
        ...data,
        ...(sides && {
          sides: {
            create: sides.map((s) => ({
              side: s.side,
              designUrl: s.designUrl,
              elements: {
                create: s.elements.map((el) => ({
                  type: el.type,
                  x: el.x,
                  y: el.y,
                  width: el.width,
                  height: el.height,
                  fontSize: el.fontSize,
                  fontWeight: el.fontWeight,
                  alignment: el.alignment,
                })),
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

    // Upsert the side
    await prisma.cardTemplateSide.upsert({
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
    });

    return this.getById(templateId);
  }
}

export const cardTemplateService = new CardTemplateService();
