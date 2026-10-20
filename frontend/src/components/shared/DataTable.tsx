import { cn } from '@/lib/cn';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  getRowId?: (row: T) => string;
  pageSize?: number;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyTitle = 'Tidak ada data',
  emptyDescription,
  emptyAction,
  onRowClick,
  getRowId,
  pageSize: initialPageSize = 20,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const prevDataLengthRef = useRef(data.length);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Reset to page 1 when data changes (during render, not in effect)
  if (prevDataLengthRef.current !== data.length) {
    prevDataLengthRef.current = data.length;
    if (page !== 1) setPage(1);
  }

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const handleToggleRow = (rowId: string) => {
    if (!onSelectionChange) return;
    const next = selectedSet.has(rowId)
      ? selectedIds.filter((id) => id !== rowId)
      : [...selectedIds, rowId];
    onSelectionChange(next);
  };

  const handleToggleAll = () => {
    if (!onSelectionChange || !getRowId) return;
    const pageIds = paginatedData.map((row) => getRowId(row));
    const allSelected = pageIds.every((id) => selectedSet.has(id));
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const newIds = [...new Set([...selectedIds, ...pageIds])];
      onSelectionChange(newIds);
    }
  };

  const pageIds = getRowId ? paginatedData.map((row) => getRowId(row)) : [];
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));
  const somePageSelected = pageIds.some((id) => selectedSet.has(id));

  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <div className="w-4 h-4 bg-bg rounded animate-pulse" />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left px-4 py-2.5 text-[12px] font-medium text-muted tracking-wide',
                    col.width,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                {selectable && (
                  <td className="px-4 py-3.5">
                    <div className="w-4 h-4 bg-bg rounded animate-pulse" />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div className="h-4 bg-bg rounded-[4px] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = somePageSelected && !allPageSelected;
                    }}
                    onChange={handleToggleAll}
                    className="w-4 h-4 rounded border-border text-brand focus:ring-brand/20 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left px-4 py-2.5 text-[12px] font-medium text-muted tracking-wide',
                    col.width,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => {
              const rowId = getRowId?.(row) || String(idx);
              const isSelected = selectedSet.has(rowId);
              return (
                <tr
                  key={rowId}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-bg/60 transition-colors',
                    onRowClick && !selectable && 'cursor-pointer',
                    isSelected && 'bg-brand/5',
                  )}
                  onClick={() => {
                    if (!selectable) onRowClick?.(row);
                  }}
                >
                  {selectable && (
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(rowId)}
                        className="w-4 h-4 rounded border-border text-brand focus:ring-brand/20 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3.5 text-foreground', col.className)}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-muted">Baris per halaman</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-7 px-2 rounded-[4px] border border-border bg-surface text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
          </select>
        </div>
        {totalPages > 1 && (
          <>
            <span className="text-[12px] text-muted">
              Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.length)} dari{' '}
              {data.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {totalPages > 5 && <span className="text-[12px] text-muted px-1">...</span>}
              {totalPages > 5 && (
                <Button
                  variant={page === totalPages ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
