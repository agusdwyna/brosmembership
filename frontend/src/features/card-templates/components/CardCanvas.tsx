import { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Text, Transformer, Group } from 'react-konva';
import type Konva from 'konva';
import type { CardTemplateElement, ElementType } from '../types';

// Card dimensions (credit card size scaled up for editing)
export const CARD_WIDTH = 400;
export const CARD_HEIGHT = 250;

interface CardCanvasProps {
  backgroundImage: string | null;
  elements: CardTemplateElement[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, x: number, y: number, width: number, height: number) => void;
}

// Element-type legend colors — kept inside the DESIGN.md palette (brand + neutrals)
const ELEMENT_COLORS: Record<ElementType, string> = {
  MEMBER_NAME: '#B82230',
  MEMBER_NUMBER: '#8E1A25',
  MEMBERSHIP_NAME: '#53627C',
  EXPIRY_DATE: '#3A3F52',
  QR_CODE: '#8DA2B5',
};

const ELEMENT_LABELS: Record<ElementType, string> = {
  MEMBER_NAME: 'Member Name',
  MEMBER_NUMBER: 'Member Number',
  MEMBERSHIP_NAME: 'Membership',
  EXPIRY_DATE: 'Expiry Date',
  QR_CODE: 'QR Code',
};

function BackgroundImage({ src }: { src: string }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  if (!image) return null;
  return <KonvaImage image={image} width={CARD_WIDTH} height={CARD_HEIGHT} />;
}

export function CardCanvas({
  backgroundImage,
  elements,
  selectedId,
  onSelect,
  onMove,
  onResize,
}: CardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Update transformer when selection changes
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return;
    const stage = stageRef.current;
    const selectedNode = selectedId ? stage.findOne(`#${selectedId}`) : null;
    trRef.current.nodes(selectedNode ? [selectedNode] : []);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedId, elements]);

  // Handle drag end
  const handleDragEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
      onMove(id, Math.round(e.target.x()), Math.round(e.target.y()));
    },
    [onMove],
  );

  // Handle transform end (resize)
  const handleTransformEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      // Reset scale and apply to size
      node.scaleX(1);
      node.scaleY(1);

      const MIN_SIZE = 30;
      const newWidth = Math.round(Math.max(MIN_SIZE, node.width() * scaleX));
      const newHeight = Math.round(Math.max(MIN_SIZE, node.height() * scaleY));

      onResize(id, Math.round(node.x()), Math.round(node.y()), newWidth, newHeight);
    },
    [onResize],
  );

  return (
    <div className="border-2 border-dashed border-border rounded-sm p-4 bg-bg inline-block">
      <div className="text-xs text-muted mb-2">
        {CARD_WIDTH} × {CARD_HEIGHT} px (skala editor)
      </div>
      <Stage
        ref={stageRef}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        className="rounded-sm shadow-sm"
        style={{ background: '#fff' }}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            onSelect(null);
          }
        }}
      >
        <Layer>
          {/* Background */}
          {backgroundImage ? (
            <BackgroundImage src={backgroundImage} />
          ) : (
            <Rect
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              fill="#F8F9FB"
              stroke="#EDF1F2"
              strokeWidth={1}
            />
          )}

          {/* Elements */}
          {elements.map((el, idx) => (
            <Group
              key={el.id || idx}
              id={el.id || `el-${idx}`}
              x={el.x}
              y={el.y}
              draggable
              onClick={() => onSelect(el.id || `el-${idx}`)}
              onTap={() => onSelect(el.id || `el-${idx}`)}
              onDragEnd={(e) => handleDragEnd(el.id || `el-${idx}`, e)}
              onTransformEnd={(e) => handleTransformEnd(el.id || `el-${idx}`, e)}
            >
              <Rect
                width={el.width}
                height={el.height}
                fill={ELEMENT_COLORS[el.type] + '20'}
                stroke={ELEMENT_COLORS[el.type]}
                strokeWidth={selectedId === (el.id || `el-${idx}`) ? 2 : 1}
                cornerRadius={4}
              />
              <Text
                text={ELEMENT_LABELS[el.type]}
                fontSize={11}
                fill={ELEMENT_COLORS[el.type]}
                fontStyle="bold"
                width={el.width}
                height={el.height}
                align="center"
                verticalAlign="middle"
              />
            </Group>
          ))}

          {/* Transformer */}
          <Transformer
            ref={trRef}
            rotateEnabled={false}
            borderStroke="#B82230"
            anchorFill="#B82230"
            anchorStroke="#B82230"
            anchorSize={8}
            anchorCornerRadius={2}
            limitStrokeScale={true}
            boundBoxFunc={(oldBox, newBox) => {
              // Prevent elements from becoming too small
              if (newBox.width < 30 || newBox.height < 30) return oldBox;
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}
