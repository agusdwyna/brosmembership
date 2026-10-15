import { AlertTriangle } from 'lucide-react';
import type { ListMeta } from '@/lib/list';

/**
 * Shown when a list hit the server-side row cap, so operators know the table is
 * truncated (and should narrow their search) rather than trusting a partial set
 * as complete.
 */
export function ListCapNotice({ meta }: { meta?: ListMeta }) {
  if (!meta?.capped) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-warning bg-warning/8 border-b border-warning/15">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span>
        Menampilkan {meta.limit} data pertama. Persempit pencarian untuk melihat data lainnya.
      </span>
    </div>
  );
}
