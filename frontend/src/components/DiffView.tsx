import React from 'react';
import { type InputRow, type EnrichedRow } from '@/api/client';
import { cn } from '@/lib/utils';

interface DiffViewProps {
  inputRow: InputRow;
  enrichedRow: EnrichedRow;
}

interface Field {
  label: string;
  input?: string;
  output?: string;
  mono?: boolean;
  highlight?: boolean;
}

const FieldRow = ({ label, input, output, mono, highlight }: Field) => {
  const changed = input !== output && output;
  return (
    <tr className={cn('border-b border-white/5', highlight && 'bg-brand-500/[0.03]')}>
      <td className="py-2.5 pr-3 align-top">
        <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{label}</span>
      </td>
      <td className="py-2.5 pr-3 align-top max-w-xs">
        {input ? (
          <span className={cn(
            'text-xs leading-relaxed',
            mono ? 'font-mono text-gray-400' : 'text-gray-400'
          )}>
            {input}
          </span>
        ) : (
          <span className="text-xs text-gray-700">—</span>
        )}
      </td>
      <td className="py-2.5 align-top max-w-sm">
        {output ? (
          <span className={cn(
            'text-xs leading-relaxed',
            mono ? 'font-mono' : '',
            changed ? 'text-emerald-300' : 'text-gray-400'
          )}>
            {output}
          </span>
        ) : (
          <span className="text-xs text-gray-700">—</span>
        )}
        {changed && (
          <span className="ml-2 text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">
            enriched
          </span>
        )}
      </td>
    </tr>
  );
};

export const DiffView: React.FC<DiffViewProps> = ({ inputRow, enrichedRow }) => {
  const attrs = enrichedRow.attributes || [];
  const descCompliance = enrichedRow.desc_compliance || {};

  const fields: Field[] = [
    { label: 'MPN', input: inputRow.Mfg_Part_Num, output: enrichedRow.Mfg_Part_Num, mono: true },
    { label: 'Manufacturer (raw)', input: inputRow.Part_Manuf, output: enrichedRow.Part_Manuf },
    { label: 'MANUFACTURER_NAME', output: enrichedRow.MANUFACTURER_NAME, highlight: true },
    { label: 'BRAND_NAME', output: enrichedRow.BRAND_NAME, highlight: true },
    { label: 'Match Score', output: enrichedRow.match_score !== undefined ? `${enrichedRow.match_score?.toFixed(1)}% (${enrichedRow.match_method})` : undefined },
    { label: 'Dept', output: enrichedRow.Dept, highlight: true },
    { label: 'Class', output: enrichedRow.Class },
    { label: 'Fine', output: enrichedRow.Fine },
    { label: 'Classpath', output: enrichedRow.Classpath, highlight: true },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="grid grid-cols-3 gap-3 px-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        <span>Field</span>
        <span>Input (Raw)</span>
        <span className="text-emerald-400">Output (Enriched)</span>
      </div>

      {/* Identity + Brand */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-2 border-b border-white/5 bg-surface-700/40">
          <span className="text-xs font-semibold text-brand-300 uppercase tracking-wider">
            Identity & Brand
          </span>
        </div>
        <div className="px-4 overflow-x-auto">
          <table className="w-full">
            <tbody>
              {fields.map((f) => (
                <FieldRow key={f.label} {...f} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attributes */}
      {attrs.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 bg-surface-700/40">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
              Extracted Attributes ({attrs.length})
            </span>
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {attrs.map((a, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/[0.02] rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500 min-w-0 flex-shrink-0">{a.label}:</span>
                  <span className="text-xs text-emerald-300 font-medium">
                    {a.value}{a.uom ? ` ${a.uom}` : ''}
                  </span>
                </div>
              ))}
            </div>
            {(enrichedRow.unmapped_values?.length ?? 0) > 0 && (
              <div className="mt-2 text-xs text-amber-400">
                ⚠ Unmapped: {enrichedRow.unmapped_values?.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Descriptions */}
      {(enrichedRow.INVOICE_DESC || enrichedRow.MOBILE_DESC || enrichedRow.SHORT_DESC) && (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-2 border-b border-white/5 bg-surface-700/40">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Generated Descriptions
            </span>
          </div>
          <div className="px-4 py-3 space-y-3">
            {([
              ['INVOICE_DESC', 'Invoice (≤40 chars)', 'font-mono text-amber-300', 40],
              ['MOBILE_DESC', 'Mobile (60–80 chars)', 'text-gray-200', 80],
              ['SHORT_DESC', 'Short Title', 'text-gray-200', 120],
              ['LONG_DESC1', 'Long Description', 'text-gray-300 text-xs', 500],
              ['MARKETING_DESCRIPTION', 'Marketing', 'text-blue-300 italic', 600],
            ] as [keyof EnrichedRow, string, string, number][]).map(([key, label, cls, maxLen]) => {
              const val = enrichedRow[key] as string | undefined;
              if (!val) return null;
              const compliance = descCompliance[key as string];
              const isOver = val.length > maxLen;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className={cn(
                      'text-xs font-mono',
                      isOver ? 'text-red-400' : 'text-gray-600'
                    )}>
                      {val.length}/{maxLen}
                      {compliance?.compliant ? (
                        <span className="ml-1 text-emerald-400">✓</span>
                      ) : (
                        <span className="ml-1 text-red-400">✗</span>
                      )}
                    </span>
                  </div>
                  <p className={cn('text-xs leading-relaxed break-words', cls)}>{val}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review flags */}
      {(enrichedRow.review_reasons?.length ?? 0) > 0 && (
        <div className="glass-card border-orange-500/20 px-4 py-3">
          <p className="text-xs font-semibold text-orange-300 mb-2">⚠ Review Reasons</p>
          <ul className="space-y-1">
            {enrichedRow.review_reasons?.map((r, i) => (
              <li key={i} className="text-xs text-orange-400/80">• {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
