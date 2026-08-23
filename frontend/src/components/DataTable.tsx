import React, { useState } from 'react';
import {
  ChevronRight, AlertTriangle, CheckCircle, Search,
  Download, FileCode, Trash2, Database, Eye, Sparkles
} from 'lucide-react';
import { type InputRow, type EnrichedRow } from '@/api/client';
import { cn, truncate, confidenceBadge, confidenceLabel } from '@/lib/utils';
import { exportCSV, exportJSON } from '@/lib/exportUtils';
import { CurateModal } from '@/components/CurateModal';

interface DataTableProps {
  rows: InputRow[];
  enrichedRows?: EnrichedRow[];
  selectedIndices: Set<number>;
  onSelectionChange: (indices: Set<number>) => void;
  onRowClick?: (index: number) => void;
  onResetData?: () => void;
  maxSelect?: number;
}

export const DataTable: React.FC<DataTableProps> = ({
  rows,
  enrichedRows,
  selectedIndices,
  onSelectionChange,
  onRowClick,
  onResetData,
  maxSelect = 20,
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [curateIndex, setCurateIndex] = useState<number | null>(null);
  const PAGE_SIZE = 15;

  const enrichedCount = enrichedRows?.filter(Boolean).length || 0;
  const targetRows = enrichedRows && enrichedRows.some(Boolean) ? enrichedRows : rows;

  const handleExportCSV = () => {
    const dataToExport = enrichedRows && enrichedRows.some(Boolean) ? enrichedRows : rows;
    exportCSV(dataToExport);
  };

  const handleExportJSON = () => {
    const dataToExport = enrichedRows && enrichedRows.some(Boolean) ? enrichedRows : rows;
    exportJSON(dataToExport);
  };

  const filteredIndices = rows.reduce<number[]>((acc, row, i) => {
    const q = search.toLowerCase();
    const enriched = enrichedRows?.[i];
    const match =
      !q ||
      (row.Mfg_Part_Num?.toLowerCase().includes(q)) ||
      (row.Part_Desc?.toLowerCase().includes(q)) ||
      (row.Part_Manuf?.toLowerCase().includes(q)) ||
      (enriched?.MANUFACTURER_NAME?.toLowerCase().includes(q)) ||
      (enriched?.Classpath?.toLowerCase().includes(q));
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
    <div className="flex flex-col gap-4">

      {/* ── Top Export Banner Bar (Matches Screenshot 1) ─────────────── */}
      <div className="glass-card p-3.5 flex flex-wrap items-center justify-between gap-3 border-brand-500/20">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center">
            <Database size={14} className="text-brand-400" />
          </div>
          <span>
            {enrichedCount > 0
              ? `${enrichedCount} Products Extracted & Enriched`
              : `${rows.length} Products Loaded`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-500/20 active:scale-95"
          >
            <Download size={13} />
            Export CSV Sheet
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-surface-700 hover:bg-surface-600 border border-white/10 text-gray-200 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <FileCode size={13} />
            Export JSON Payload
          </button>

          {onResetData && (
            <button
              onClick={onResetData}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-white/5 transition-colors"
              title="Clear Data"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search by MPN, description, manufacturer, taxonomy…"
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
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">ACTIONS</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">PART NUMBER</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">PRODUCT NAME / DESC</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">STATUS</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">TAXONOMY CATEGORY</th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">CONFIDENCE</th>
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
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(rowIdx)}
                      className="w-4 h-4 rounded accent-brand-500 cursor-pointer"
                    />
                  </td>

                  {/* CURATE Action Button (Screenshot 1) */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setCurateIndex(rowIdx)}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20 hover:border-sky-500/50 transition-all uppercase tracking-wider"
                    >
                      <Eye size={12} />
                      CURATE
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-brand-300 font-semibold">
                      {truncate(row.Mfg_Part_Num || enriched?.Mfg_Part_Num || '—', 20)}
                    </span>
                  </td>

                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-gray-200 text-xs font-medium leading-relaxed">
                      {truncate(enriched?.SHORT_DESC || row.Part_Desc || '—', 55)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {enriched ? (
                      needsReview ? (
                        <span className="badge-review inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          REVIEW
                        </span>
                      ) : (
                        <span className="badge-ok inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold">
                          <CheckCircle className="w-3 h-3" />
                          VALID
                        </span>
                      )
                    ) : (
                      <span className="text-xs text-gray-500 font-mono">PENDING</span>
                    )}
                  </td>

                  <td className="px-4 py-3 max-w-xs">
                    <span className="text-xs text-gray-400 font-mono truncate block">
                      {truncate(enriched?.Classpath || '—', 35)}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    {conf !== undefined ? (
                      <span className={cn('text-xs font-mono font-bold px-2 py-0.5 rounded-full', confidenceBadge(conf))}>
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

      {/* Explainable AI & Curate Modal */}
      {curateIndex !== null && (
        <CurateModal
          isOpen={curateIndex !== null}
          onClose={() => setCurateIndex(null)}
          inputRow={rows[curateIndex] || null}
          enrichedRow={enrichedRows?.[curateIndex] || null}
          rowIndex={curateIndex}
        />
      )}
    </div>
  );
};
