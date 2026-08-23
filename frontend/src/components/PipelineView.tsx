import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  Building2, Tag, Layers, FileText, Star,
  CheckCircle, Loader2, AlertCircle, Clock
} from 'lucide-react';
import { type EnrichedRow } from '@/api/client';
import { cn } from '@/lib/utils';

type StageStatus = 'pending' | 'running' | 'done' | 'error';

export interface StageState {
  brand: StageStatus;
  classify: StageStatus;
  extract: StageStatus;
  describe: StageStatus;
  score: StageStatus;
}

interface PipelineViewProps {
  stageState: StageState;
  enrichedRow?: EnrichedRow;
  totalRows?: number;
  processedRows?: number;
}

const STAGES = [
  {
    key: 'brand' as const,
    icon: Building2,
    label: 'Brand Resolution',
    description: 'Fuzzy match manufacturer & brand names',
    color: '#6172f2',
  },
  {
    key: 'classify' as const,
    icon: Tag,
    label: 'Classification',
    description: 'Map to Dept / Class / Fine / Classpath',
    color: '#8b5cf6',
  },
  {
    key: 'extract' as const,
    icon: Layers,
    label: 'Attribute Extraction',
    description: 'LOV-constrained structured attributes',
    color: '#ec4899',
  },
  {
    key: 'describe' as const,
    icon: FileText,
    label: 'Description Generation',
    description: 'Invoice / Mobile / Short / Long / Marketing',
    color: '#f59e0b',
  },
  {
    key: 'score' as const,
    icon: Star,
    label: 'Confidence Score',
    description: 'Per-row quality & review flags',
    color: '#10b981',
  },
];

const StatusIcon = ({ status }: { status: StageStatus }) => {
  if (status === 'done') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === 'running') return <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />;
  if (status === 'error') return <AlertCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-gray-600" />;
};

export const PipelineView: React.FC<PipelineViewProps> = ({
  stageState,
  enrichedRow,
  totalRows,
  processedRows,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevState = useRef<StageState | null>(null);

  useEffect(() => {
    if (!prevState.current) {
      prevState.current = stageState;
      return;
    }

    STAGES.forEach((stage, i) => {
      const el = stageRefs.current[i];
      if (!el) return;
      const prev = prevState.current?.[stage.key];
      const curr = stageState[stage.key];

      if (prev !== curr) {
        if (curr === 'running') {
          gsap.to(el, {
            borderColor: stage.color + '80',
            boxShadow: `0 0 0 1px ${stage.color}40, 0 4px 20px ${stage.color}20`,
            scale: 1.02,
            duration: 0.3,
            ease: 'power2.out',
          });
        } else if (curr === 'done') {
          gsap.to(el, {
            borderColor: '#10b98140',
            boxShadow: '0 0 0 1px #10b98120',
            scale: 1,
            duration: 0.4,
            ease: 'back.out(1.7)',
          });
          // Pulse flash
          gsap.fromTo(el,
            { backgroundColor: '#10b98115' },
            { backgroundColor: 'transparent', duration: 0.6, ease: 'power2.out' }
          );
        } else if (curr === 'error') {
          gsap.to(el, {
            borderColor: '#ef444440',
            boxShadow: '0 0 0 1px #ef444420',
            scale: 1,
            duration: 0.3,
          });
          gsap.fromTo(el, { x: -4 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.3)', repeat: 2 });
        } else {
          gsap.to(el, { borderColor: 'rgba(255,255,255,0.08)', boxShadow: 'none', scale: 1, duration: 0.3 });
        }
      }
    });

    prevState.current = stageState;
  }, [stageState]);

  // Animate in on mount
  useEffect(() => {
    const els = stageRefs.current.filter(Boolean);
    gsap.fromTo(
      els,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power2.out' }
    );
  }, []);

  const progress = processedRows !== undefined && totalRows
    ? Math.round((processedRows / totalRows) * 100)
    : null;

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Progress bar */}
      {progress !== null && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Processing</span>
            <span className="text-sm font-mono text-brand-300">
              {processedRows} / {totalRows} rows
            </span>
          </div>
          <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stages */}
      <div className="grid grid-cols-1 gap-2">
        {STAGES.map((stage, i) => {
          const status = stageState[stage.key];
          const Icon = stage.icon;

          return (
            <div
              key={stage.key}
              ref={el => { stageRefs.current[i] = el; }}
              className={cn(
                'glass-card p-4 flex items-center gap-4 border transition-all duration-300',
                status === 'done' && 'stage-done',
                status === 'running' && 'stage-active',
              )}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: status === 'pending' ? 'rgba(255,255,255,0.03)' : stage.color + '20',
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: status === 'pending' ? '#4b5563' : stage.color }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    status === 'done' ? 'text-emerald-300' :
                    status === 'running' ? 'text-gray-100' :
                    status === 'error' ? 'text-red-300' : 'text-gray-500'
                  )}>
                    {stage.label}
                  </span>
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    status === 'done' ? 'bg-emerald-500/20 text-emerald-400' :
                    status === 'running' ? 'bg-brand-500/20 text-brand-300 animate-pulse' :
                    status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/5 text-gray-600'
                  )}>
                    {status}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{stage.description}</p>

                {/* Stage output preview */}
                {status === 'done' && enrichedRow && (
                  <StageOutput stageKey={stage.key} row={enrichedRow} />
                )}
              </div>

              {/* Status icon */}
              <StatusIcon status={status} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const StageOutput = ({ stageKey, row }: { stageKey: string; row: EnrichedRow }) => {
  if (stageKey === 'brand') {
    return (
      <div className="mt-2 flex gap-3 flex-wrap">
        {row.MANUFACTURER_NAME && (
          <Chip label="Mfr" value={row.MANUFACTURER_NAME} />
        )}
        {row.BRAND_NAME && (
          <Chip label="Brand" value={row.BRAND_NAME} />
        )}
        {row.match_score !== undefined && (
          <Chip label="Score" value={`${row.match_score?.toFixed(0)}%`} />
        )}
      </div>
    );
  }
  if (stageKey === 'classify') {
    return (
      <div className="mt-2">
        <Chip label="Classpath" value={row.Classpath || '—'} />
      </div>
    );
  }
  if (stageKey === 'extract') {
    const attrs = row.attributes || [];
    return (
      <div className="mt-2 flex gap-1.5 flex-wrap">
        {attrs.slice(0, 4).map((a, i) => (
          <Chip key={i} label={a.label} value={`${a.value}${a.uom ? ' ' + a.uom : ''}`} />
        ))}
        {attrs.length > 4 && (
          <span className="text-xs text-gray-600">+{attrs.length - 4} more</span>
        )}
      </div>
    );
  }
  if (stageKey === 'describe') {
    return (
      <div className="mt-2 space-y-1">
        {row.INVOICE_DESC && (
          <p className="text-xs font-mono text-amber-400 truncate">INV: {row.INVOICE_DESC}</p>
        )}
        {row.MOBILE_DESC && (
          <p className="text-xs text-gray-400 truncate">MOB: {row.MOBILE_DESC}</p>
        )}
      </div>
    );
  }
  if (stageKey === 'score') {
    return (
      <div className="mt-2 flex items-center gap-3">
        <Chip
          label="Confidence"
          value={`${row.pipeline_confidence?.toFixed(0) || 0}%`}
        />
        {row.needs_review && (
          <span className="badge-review text-xs px-2 py-0.5 rounded-full">⚠ Review</span>
        )}
      </div>
    );
  }
  return null;
};

const Chip = ({ label, value }: { label: string; value: string }) => (
  <span className="inline-flex items-center gap-1 text-xs bg-white/5 px-2 py-0.5 rounded-full max-w-xs overflow-hidden">
    <span className="text-gray-500 shrink-0">{label}:</span>
    <span className="text-gray-300 truncate">{value}</span>
  </span>
);
