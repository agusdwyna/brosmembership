import { cn } from '@/lib/cn';

type Variant = 'onDark' | 'onLight';
type Size = 'sm' | 'md';

interface BrandLogosProps {
  /**
   * Background the lockup sits on.
   * `onDark` = maroon sidebar → the dark BROS wordmark gets a neutral white chip
   * so it stays legible; `onLight` = light page → logos sit on the page as-is.
   */
  variant?: Variant;
  size?: Size;
  className?: string;
}

// BROS wordmark (134×50, dark teal + gold) and RSIA emblem (512×512, green + gold).
// Both are transparent PNGs in `public/images/`.
const SIZES: Record<
  Size,
  { bros: string; rsia: string; chip: string; gap: string; divider: string; dividerH: string }
> = {
  sm: { bros: 'h-6', rsia: 'h-6', chip: 'p-1', gap: 'gap-2.5', divider: 'pl-2.5', dividerH: 'h-6' },
  md: { bros: 'h-9', rsia: 'h-9', chip: 'p-1.5', gap: 'gap-3', divider: 'pl-3', dividerH: 'h-9' },
};

export function BrandLogos({ variant = 'onDark', size = 'sm', className }: BrandLogosProps) {
  const s = SIZES[size];
  const brosImg = (
    <img src="/images/logo.png" alt="Bali Royal Hospital" className={cn('w-auto', s.bros)} />
  );

  return (
    <div className={cn('flex items-center', s.gap, className)}>
      {variant === 'onDark' ? (
        <span className={cn('inline-flex items-center rounded-[4px] bg-white', s.chip)}>
          {brosImg}
        </span>
      ) : (
        brosImg
      )}

      {/* Divider only when both marks are visible (hidden below sm on the login lockup). */}
      <span
        aria-hidden
        className={cn(
          'hidden sm:block border-l',
          s.dividerH,
          s.divider,
          variant === 'onDark' ? 'border-white/20' : 'border-border',
        )}
      />

      <img
        src="/images/logo-rsia.png"
        alt="RSIA Bali Royal"
        className={cn('hidden sm:block w-auto', s.rsia)}
      />
    </div>
  );
}
