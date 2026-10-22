import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import type { CardTemplate } from '../types';

// The preview reuses CardPreview, so mock the QR helper it calls during mount.
vi.mock('@/lib/qr', () => ({
  generateQRDataURL: vi.fn().mockResolvedValue('data:image/png;base64,qq'),
}));

const template: CardTemplate = {
  id: 'tpl1',
  name: 'Gold',
  status: 'ACTIVE',
  version: 1,
  createdAt: '',
  updatedAt: '',
  sides: [
    {
      id: 'side1',
      side: 'FRONT',
      designUrl: null,
      elements: [
        {
          id: 'el1',
          type: 'MEMBER_NAME',
          x: 10,
          y: 10,
          width: 200,
          height: 30,
          fontSize: 16,
          fontWeight: 'bold',
          alignment: 'left',
          color: '#B82230',
        },
      ],
    },
  ],
};

describe('TemplatePreviewModal', () => {
  it('renders the element with the template color, not the default ink', () => {
    render(<TemplatePreviewModal template={template} onClose={() => {}} />);

    // CardPreview renders each element with inline styles; the colored text is
    // the element whose style carries the template's #B82230.
    const sample = screen.getByText('Budi Santoso');
    expect(sample).toHaveStyle({ color: 'rgb(184, 34, 48)' });
  });

  it('leaves the color unset when the template has none (automatic)', () => {
    const automatic: CardTemplate = {
      ...template,
      sides: [
        {
          ...template.sides[0],
          elements: [{ ...template.sides[0].elements[0], color: null }],
        },
      ],
    };

    render(<TemplatePreviewModal template={automatic} onClose={() => {}} />);

    expect(screen.getByText('Budi Santoso')).not.toHaveStyle({ color: 'rgb(184, 34, 48)' });
  });
});
