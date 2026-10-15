import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

type TooltipSide = 'top' | 'bottom';

interface TooltipProps {
  content: React.ReactNode;
  side?: TooltipSide;
  children: React.ReactElement;
}

/**
 * Renders via portal with fixed positioning so it is never clipped by the
 * `overflow-x-auto` wrapper around tables.
 */
export function Tooltip({ content, side = 'top', children }: TooltipProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const hide = useCallback(() => setCoords(null), []);

  const show = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: side === 'top' ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, [side]);

  useEffect(() => {
    if (!coords) return;
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [coords, hide]);

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {coords &&
        createPortal(
          <span
            role="tooltip"
            style={{ top: coords.top, left: coords.left }}
            className={cn(
              'fixed z-[60] -translate-x-1/2 px-2 py-1 rounded-[4px] whitespace-nowrap',
              'bg-foreground text-white text-[11px] font-medium',
              'pointer-events-none shadow-sm',
              side === 'top' ? '-translate-y-full' : 'translate-y-0',
            )}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
