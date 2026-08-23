import React, { useState } from 'react';
import { ChevronRight, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import { type InputRow, type EnrichedRow } from '@/api/client';
import { cn, truncate, confidenceBadge, confidenceLabel } from '@/lib/utils';

interface DataTableProps {
  rows: InputRow[];
  enrichedRows?: EnrichedRow[];
  selectedIndices: Set<number>;
  onSelectionChange: (indices: Set<number>) => void;
  onRowClick?: (index: number) => void;
  maxSelect?: number;
}

export const DataTable: React.FC<DataTableProps> = ({
  rows,
  enrichedRows,
  selectedIndices,
  onSelectionChange,
  onRowClick,
  maxSelect = 20,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const filteredIndices = rows.reduce<number[]>((acc, row, i) => {
    const q = search.toLowerCase();
    const match =
      !q ||
      (row.Mfg_Part_Num?.toLowerCase().includes(q)) ||
      (row.Part_Desc?.toLowerCase().includes(q)) ||
      (row.Part_Manuf?.toLowerCase().includes(q));
    if (match) acc.push(i);
    return acc;
  }, []);

  const pageIndices = filteredIndices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredIndices.length / PAGE_SIZE);

  const toggleRow = (i: number) => {
    const next = new Set(selectedIndices);
    if (next.has(i)) {
      next.delete(i);
    } else if (next.size < maxSelect) {
      next.add(i);
    }
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (pageIndices.every(i => selectedIndices.has(i))) {
      const next = new Set(selectedIndices);
      pageIndices.forEach(i => next.delete(i));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIndices);
      pageIndices.forEach(i => {
        if (next.size < maxSelect) next.add(i);
      });
      onSelectionChange(next);
    }
  };

  const allPageSelected = pageIndices.length > 0 && pageIndices.every(i => selectedIndices.has(i));

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by MPN, description, manufacturer…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-surface-700 border border-white/10 rounded-xl text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50 transition-colors"
          />
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {selectedIndices.size}/{maxSelect} selected
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-surface-700/50">
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">MPN</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Manufacturer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Confidence</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageIndices.map((rowIdx) => {
              const row = rows[rowIdx];
              const enriched = enrichedRows?.[rowIdx];
              const isSelected = selectedIndices.has(rowIdx);
              const conf = enriched?.pipeline_confidence;
              const needsReview = enriched?.needs_review;

              return (
                <tr
                  key={rowIdx}
                  className={cn(
                    'group transition-all duration-150 cursor-pointer',
                    isSelected
                      ? 'bg-brand-500/10 hover:bg-brand-500/15'
                      : 'hover:bg-white/[0.02]'
                  )}
                  onClick={() => {
                    toggleRow(rowIdx);
                    onRowClick?.(rowIdx);
                  }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-brand-300">
                      {truncate(row.Mfg_Part_Num || '—', 20)}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-gray-300 text-xs leading-relaxed">
                      {truncate(row.Part_Desc || '—', 60)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-400">
                      {truncate(row.Part_Manuf || '—', 25)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {enriched ? (
                      needsReview ? (
                        <span className="badge-review inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Review
                        </span>
                      ) : (
                        <span className="badge-ok inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          OK
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-600">Pending</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {conf !== undefined ? (
                      <span className={cn('text-xs font-mono px-2 py-0.5 rounded-full', confidenceBadge(conf))}>
                        {confidenceLabel(conf)} {conf.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-400 transition-colors" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-500">
            {filteredIndices.length} rows {search ? 'filtered' : 'total'}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-xs rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <span className="text-xs text-gray-500 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-xs rounded-lg bg-surface-700 text-gray-300 hover:bg-surface-600 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
