import { describe, it, expect } from 'vitest';
import { updateCardTemplateSchema } from '../schema';

/**
 * The editor sends back the sides/elements it loaded from the API. Prisma
 * returns `null` for unset nullable columns, so a plain rename of a template
 * whose side has no background image (or whose element has no font settings)
 * must still validate — it used to fail with "Validasi gagal".
 */
const savedTemplateAsSentByTheEditor = {
  name: 'Bros Gold Card (renamed)',
  sides: [
    {
      side: 'FRONT',
      designUrl: '/uploads/front.png',
      elements: [
        {
          type: 'MEMBER_NAME',
          x: 20,
          y: 120,
          width: 260,
          height: 30,
          fontSize: 16,
          fontWeight: 'bold',
          alignment: 'left',
        },
      ],
    },
    {
      side: 'BACK',
      designUrl: null,
      elements: [
        {
          type: 'QR_CODE',
          x: 160,
          y: 20,
          width: 80,
          height: 80,
          fontSize: null,
          fontWeight: null,
          alignment: null,
        },
      ],
    },
  ],
};

describe('updateCardTemplateSchema', () => {
  it('accepts a rename that echoes nulls for unset columns', () => {
    const result = updateCardTemplateSchema.safeParse(savedTemplateAsSentByTheEditor);
    expect(result.success).toBe(true);
  });

  it('accepts a name-only update', () => {
    const result = updateCardTemplateSchema.safeParse({ name: 'Renamed' });
    expect(result.success).toBe(true);
  });

  it('still rejects an unknown element type', () => {
    const result = updateCardTemplateSchema.safeParse({
      sides: [{ side: 'FRONT', elements: [{ type: 'UNKNOWN', x: 0, y: 0, width: 1, height: 1 }] }],
    });
    expect(result.success).toBe(false);
  });

  it('still rejects a name shorter than 2 characters', () => {
    const result = updateCardTemplateSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });
});
