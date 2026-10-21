import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cardTemplatesApi } from './api';
import type {
  CardTemplate,
  CardTemplateElement,
  CardTemplateSide,
  ElementType,
  SideType,
} from './types';
import { CardCanvas, CARD_WIDTH, CARD_HEIGHT } from './components/CardCanvas';
import { ComponentPalette } from './components/ComponentPalette';
import { PropertyEditor } from './components/PropertyEditor';
import { TemplatePreviewModal } from './components/TemplatePreviewModal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/Badge';
import { toast } from '@/components/ui/toast-store';
import { getErrorMessage } from '@/lib/error';
import { Upload, Save, Eye } from 'lucide-react';

let nextId = 1;
function genId() {
  return `el-${Date.now()}-${nextId++}`;
}

function makeEmptySide(side: SideType): CardTemplateSide {
  return { id: genId(), side, designUrl: undefined, elements: [] };
}

export function CardTemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [sides, setSides] = useState<CardTemplateSide[]>([
    makeEmptySide('FRONT'),
    makeEmptySide('BACK'),
  ]);
  const [activeSide, setActiveSide] = useState<SideType>('FRONT');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [templateDbId, setTemplateDbId] = useState<string | null>(isNew ? null : id || null);
  const [templateStatus, setTemplateStatus] = useState('ACTIVE');
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'activate' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Load existing template
  useEffect(() => {
    if (isNew || !id) return;
    cardTemplatesApi
      .getById(id)
      .then((res) => {
        const t = res.data.data;
        setName(t.name);
        setTemplateDbId(t.id);
        setTemplateStatus(t.status || 'ACTIVE');

        if (t.sides.length > 0) {
          setSides(
            t.sides.map((s) => ({
              ...s,
              elements: s.elements.map((el) => ({ ...el, id: el.id || genId() })),
            })),
          );
        }
      })
      .catch(() => {
        toast.error('Gagal memuat template');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, isNew]);

  // Get current active side data
  const currentSide = sides.find((s) => s.side === activeSide) || sides[0];

  const updateCurrentSide = useCallback(
    (updater: (side: CardTemplateSide) => CardTemplateSide) => {
      setSides((prev) => prev.map((s) => (s.side === activeSide ? updater(s) : s)));
    },
    [activeSide],
  );

  // Add element from palette
  const handleAddElement = useCallback(
    (type: ElementType) => {
      const defaults: Record<ElementType, { w: number; h: number }> = {
        MEMBER_NAME: { w: 260, h: 30 },
        MEMBER_NUMBER: { w: 260, h: 20 },
        MEMBERSHIP_NAME: { w: 260, h: 20 },
        EXPIRY_DATE: { w: 260, h: 20 },
        QR_CODE: { w: 80, h: 80 },
      };

      const { w, h } = defaults[type];
      const newEl: CardTemplateElement = {
        id: genId(),
        type,
        x: Math.round((CARD_WIDTH - w) / 2),
        y: Math.round((CARD_HEIGHT - h) / 2),
        width: w,
        height: h,
        fontSize: 12,
        fontWeight: 'normal',
        alignment: 'left',
      };

      updateCurrentSide((s) => ({
        ...s,
        elements: [...s.elements, newEl],
      }));
      setSelectedId(newEl.id!);
    },
    [updateCurrentSide],
  );

  // Move element (after drag)
  const handleMove = useCallback(
    (id: string, x: number, y: number) => {
      updateCurrentSide((s) => ({
        ...s,
        elements: s.elements.map((el) => (el.id === id ? { ...el, x, y } : el)),
      }));
    },
    [updateCurrentSide],
  );

  // Resize element (after transform)
  const handleResize = useCallback(
    (id: string, x: number, y: number, width: number, height: number) => {
      updateCurrentSide((s) => ({
        ...s,
        elements: s.elements.map((el) => (el.id === id ? { ...el, x, y, width, height } : el)),
      }));
    },
    [updateCurrentSide],
  );

  // Update element from property editor
  const handlePropertyChange = useCallback(
    (updated: CardTemplateElement) => {
      updateCurrentSide((s) => ({
        ...s,
        elements: s.elements.map((el) => (el.id === updated.id ? updated : el)),
      }));
    },
    [updateCurrentSide],
  );

  // Delete selected element
  const handleDelete = useCallback(() => {
    if (!selectedId) return;
    updateCurrentSide((s) => ({
      ...s,
      elements: s.elements.filter((el) => el.id !== selectedId),
    }));
    setSelectedId(null);
  }, [selectedId, updateCurrentSide]);

  // Upload background image for current side
  const handleUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.png,.jpg,.jpeg,.svg';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // If template doesn't exist yet, create it first
        let tId = templateDbId;
        if (!tId) {
          const res = await cardTemplatesApi.create({ name: name || 'Untitled', sides: [] });
          tId = res.data.data.id;
          setTemplateDbId(tId);
          navigate(`/card-templates/${tId}/edit`, { replace: true });
        }

        const res = await cardTemplatesApi.uploadDesign(tId!, activeSide, file);
        const updated = res.data.data;
        const updatedSide = updated.sides.find((s) => s.side === activeSide);
        if (updatedSide) {
          updateCurrentSide((s) => ({ ...s, designUrl: updatedSide.designUrl }));
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Gagal mengunggah desain'));
      }
    };
    input.click();
  };

  // Deactivate / Activate
  const handleToggleStatus = async () => {
    if (!templateDbId || !confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'deactivate') {
        await cardTemplatesApi.deactivate(templateDbId);
        setTemplateStatus('INACTIVE');
        toast.success('Template deactivated');
      } else {
        await cardTemplatesApi.activate(templateDbId);
        setTemplateStatus('ACTIVE');
        toast.success('Template diaktifkan');
      }
    } catch {
      toast.error('Gagal mengubah status template');
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // Save template
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: name || 'Untitled',
        sides: sides.map((s) => ({
          side: s.side,
          designUrl: s.designUrl,
          elements: s.elements.map(({ id: _elId, ...rest }) => rest),
        })),
      };

      if (isNew && !templateDbId) {
        const res = await cardTemplatesApi.create(payload);
        setTemplateDbId(res.data.data.id);
        navigate(`/card-templates/${res.data.data.id}/edit`, { replace: true });
      } else if (templateDbId) {
        await cardTemplatesApi.update(templateDbId, payload);
      }
      toast.success('Template disimpan');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Gagal menyimpan template'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="animate-pulse h-40 bg-surface rounded-sm" />;

  const bgImage = currentSide.designUrl || null;

  /**
   * Preview the editor's live state, not the saved template: operators need to
   * see a moved/resized element before committing, and the unsaved element ids
   * (`el-…`) are stripped by the preview mapper.
   */
  const previewTemplate: CardTemplate = {
    id: templateDbId ?? 'preview',
    name: name || 'Untitled',
    status: templateStatus,
    sides,
    createdAt: '',
    updatedAt: '',
  };

  return (
    <div>
      <PageHeader
        title={isNew ? 'Buat Template Baru' : 'Edit Template'}
        description="Upload gambar depan & belakang, lalu drag komponen dynamic ke posisi yang diinginkan"
        backTo="/card-templates"
        action={
          <div className="flex gap-2 items-center">
            {!isNew && <StatusBadge status={templateStatus} />}
            {!isNew && (
              <>
                {templateStatus === 'ACTIVE' ? (
                  <Button variant="danger" size="sm" onClick={() => setConfirmAction('deactivate')}>
                    Nonaktifkan
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmAction('activate')}
                  >
                    Aktifkan
                  </Button>
                )}
              </>
            )}
            <Button variant="secondary" onClick={() => setPreviewOpen(true)}>
              <Eye className="w-4 h-4" /> Pratinjau
            </Button>
            <Button variant="secondary" onClick={() => navigate('/card-templates')}>
              Batal
            </Button>
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4" /> Simpan
            </Button>
          </div>
        }
      />

      {/* Template Name + Side Selector */}
      <Card className="mb-6">
        <CardContent className="flex items-end gap-6">
          <div className="flex-1">
            <Input
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bros Gold Card"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-foreground mb-1.5">
              Editing Side
            </label>
            <div className="flex rounded-[4px] border border-border overflow-hidden">
              {(['FRONT', 'BACK'] as SideType[]).map((side) => (
                <button
                  key={side}
                  onClick={() => {
                    setActiveSide(side);
                    setSelectedId(null);
                  }}
                  className={`px-5 py-2 text-[13px] font-medium transition-colors ${
                    activeSide === side
                      ? 'bg-brand text-white'
                      : 'bg-surface text-secondary hover:text-foreground'
                  }`}
                >
                  {side === 'FRONT' ? 'Front' : 'Back'}
                </button>
              ))}
            </div>
          </div>
          <Button variant="secondary" onClick={handleUpload}>
            <Upload className="w-4 h-4" /> Upload {activeSide === 'FRONT' ? 'Front' : 'Back'} Image
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Palette */}
        <div className="col-span-2 space-y-4">
          <ComponentPalette onAdd={handleAddElement} />
        </div>

        {/* Center: Canvas */}
        <div className="col-span-7">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h3>Canvas — {activeSide === 'FRONT' ? 'Front' : 'Back'}</h3>
              <span className="text-[12px] text-muted">{currentSide.elements.length} elements</span>
            </CardHeader>
            <CardContent className="flex justify-center">
              <CardCanvas
                backgroundImage={bgImage}
                elements={currentSide.elements}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onMove={handleMove}
                onResize={handleResize}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Properties */}
        <div className="col-span-3">
          <PropertyEditor
            element={currentSide.elements.find((el) => el.id === selectedId) || null}
            onChange={handlePropertyChange}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleToggleStatus}
        title={confirmAction === 'deactivate' ? 'Nonaktifkan Template' : 'Aktifkan Template'}
        description={
          confirmAction === 'deactivate'
            ? 'This template will be marked as inactive and cannot be used for new cards.'
            : 'This template will be reactivated and can be used for new cards again.'
        }
        confirmLabel={confirmAction === 'deactivate' ? 'Nonaktifkan' : 'Aktifkan'}
        variant={confirmAction === 'deactivate' ? 'danger' : 'primary'}
        loading={actionLoading}
      />

      {previewOpen && (
        <TemplatePreviewModal
          template={previewTemplate}
          initialSide={activeSide}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}
