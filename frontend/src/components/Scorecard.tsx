import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { type EvaluationMetrics } from '@/api/client';
import { formatPct, cn } from '@/lib/utils';
import {
  Target, CheckSquare, Type, AlertTriangle, BarChart2, TrendingUp
} from 'lucide-react';

interface ScorecardProps {
  metrics: EvaluationMetrics;
}

const MetricCard = ({
  label, value, subtitle, icon: Icon, color = 'brand', delay = 0
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
  delay?: number;
}) => {
  const numRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const parsed = parseFloat(value.replace('%', '').replace('—', '0'));
    if (isNaN(parsed)) return;
    const el = numRef.current;
    if (!el) return;

    const obj = { val: 0 };
    gsap.to(obj, {
      val: parsed,
      duration: 1.4,
      delay,
      ease: 'power3.out',
      onUpdate: () => {
        el.textContent = value.includes('%')
          ? `${obj.val.toFixed(1)}%`
          : obj.val.toFixed(0);
      },
    });
  }, [value, delay]);

  const colorMap: Record<string, string> = {
    brand: '#6172f2',
    accent: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    purple: '#8b5cf6',
    blue: '#3b82f6',
  };
  const c = colorMap[color] || colorMap.brand;

  return (
    <div className="glass-card-hover p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: c + '20' }}
        >
          <Icon className="w-5 h-5" style={{ color: c }} />
        </div>
      </div>
      <div>
        <span
          ref={numRef}
          className="text-3xl font-bold tabular-nums"
          style={{ color: c }}
        >
          {value}
        </span>
        <p className="text-sm font-medium text-gray-300 mt-1">{label}</p>
        {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

const BarRow = ({
  label, pct, color = '#6172f2', delay = 0
}: {
  label: string; pct: number; color?: string; delay?: number;
}) => {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    gsap.fromTo(barRef.current,
      { width: '0%' },
      { width: `${Math.min(100, pct)}%`, duration: 1, delay, ease: 'power2.out' }
    );
  }, [pct, delay]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-40 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-surface-600 rounded-full overflow-hidden">
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: 0 }}
        />
      </div>
      <span className="text-xs font-mono text-gray-300 w-12 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
};

export const Scorecard: React.FC<ScorecardProps> = ({ metrics }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current.querySelectorAll('.glass-card, .glass-card-hover'),
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' }
    );
  }, [metrics]);

  if (metrics.error) {
    return (
      <div className="glass-card p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <p className="text-sm text-amber-300 font-medium">{metrics.error}</p>
        {metrics.message && <p className="text-xs text-gray-500 mt-2">{metrics.message}</p>}
      </div>
    );
  }

  const charCompliance = metrics.char_compliance_by_field || {};
  const perField = metrics.per_field_accuracy || {};

  const fieldColors: Record<string, string> = {
    MANUFACTURER_NAME: '#6172f2',
    BRAND_NAME: '#8b5cf6',
    Classpath: '#ec4899',
    INVOICE_DESC: '#f59e0b',
    MOBILE_DESC: '#10b981',
    SHORT_DESC: '#3b82f6',
    LONG_DESC1: '#06b6d4',
    MARKETING_DESCRIPTION: '#f97316',
  };

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Info strip */}
      <div className="glass-card px-5 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-400">
          Scored <span className="text-white font-semibold">{metrics.rows_scored}</span> rows
          {metrics.unmatched ? ` · ${metrics.unmatched} unmatched` : ''}
        </span>
        {metrics.review_flag_count !== undefined && (
          <span className="badge-review inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            {metrics.review_flag_count} rows need review
          </span>
        )}
      </div>

      {/* Top metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Overall Accuracy"
          value={formatPct(metrics.overall_accuracy_pct)}
          subtitle="vs ground truth"
          icon={Target}
          color="brand"
          delay={0}
        />
        <MetricCard
          label="LOV Compliance"
          value={formatPct(metrics.lov_compliance_pct)}
          subtitle="attribute values in LOV"
          icon={CheckSquare}
          color="accent"
          delay={0.1}
        />
        <MetricCard
          label="Char-Limit Compliance"
          value={formatPct(
            Object.values(charCompliance).reduce((a, b) => a + b, 0) /
              Math.max(1, Object.values(charCompliance).length)
          )}
          subtitle="avg across all desc types"
          icon={Type}
          color="amber"
          delay={0.2}
        />
        <MetricCard
          label="Invoice CAPS %"
          value={formatPct(metrics.invoice_caps_compliance_pct)}
          subtitle="ALL CAPS compliance"
          icon={TrendingUp}
          color="purple"
          delay={0.3}
        />
      </div>

      {/* Per-field accuracy */}
      {Object.keys(perField).length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-semibold text-gray-200">Per-Field Accuracy</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(perField).map(([field, pct], i) => (
              <BarRow
                key={field}
                label={field}
                pct={pct}
                color={fieldColors[field] || '#6172f2'}
                delay={0.4 + i * 0.05}
              />
            ))}
          </div>
        </div>
      )}

      {/* Char limit compliance */}
      {Object.keys(charCompliance).length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-gray-200">Character-Limit Compliance</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(charCompliance).map(([field, pct], i) => (
              <BarRow
                key={field}
                label={field}
                pct={pct}
                color={pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444'}
                delay={0.5 + i * 0.05}
              />
            ))}
          </div>
        </div>
      )}

      {/* Evidence note */}
      <div className="glass-card px-5 py-4 border-brand-500/20">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="text-brand-300 font-medium">Evidence methodology: </span>
          Accuracy measured via exact + normalized-match per field against the 200-item ground truth.
          LOV compliance validated post-LLM — any label/value not in the allowed list is rejected and
          retried before being flagged as <em>unmapped</em>. Character limits enforced programmatically
          (truncation at word boundary) — never trusted to the LLM.
        </p>
      </div>
    </div>
  );
};
