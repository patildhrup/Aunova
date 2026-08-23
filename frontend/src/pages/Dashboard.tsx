import React, { useState, useCallback, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, ChevronRight,
  Database, ActivitySquare, LayoutDashboard, BarChart2,
  Info, Wifi, WifiOff
} from 'lucide-react';
import DashboardLayout, { type DashTab } from '@/components/DashboardLayout';
import { UploadPanel } from '@/components/UploadPanel';
import { DataTable } from '@/components/DataTable';
import { PipelineView, type StageState } from '@/components/PipelineView';
import { DiffView } from '@/components/DiffView';
import { Scorecard } from '@/components/Scorecard';
import {
  runPipeline, evaluateBatch, getHealth,
  type InputRow, type EnrichedRow, type EvaluationMetrics, type HealthStatus,
} from '@/api/client';
import { cn } from '@/lib/utils';

const INIT_STAGE_STATE: StageState = {
  brand: 'pending', classify: 'pending', extract: 'pending',
  describe: 'pending', score: 'pending',
};

export const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<DashTab>('data');
  const [rows, setRows] = useState<InputRow[]>([]);
  const [enrichedRows, setEnrichedRows] = useState<EnrichedRow[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [focusedRowIdx, setFocusedRowIdx] = useState<number | null>(null);
  const [stageState, setStageState] = useState<StageState>(INIT_STAGE_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);

  // Health check on mount
  useEffect(() => {
    getHealth()
      .then(h => setHealth(h))
      .catch(() => setHealthError(true));
  }, []);

  const handleRowsLoaded = useCallback((loaded: InputRow[]) => {
    setRows(loaded);
    setEnrichedRows([]);
    setSelectedIndices(new Set());
    setFocusedRowIdx(null);
    setStageState(INIT_STAGE_STATE);
    setMetrics(null);
    setPipelineError(null);
  }, []);

  const runSelectedPipeline = async () => {
    const selected = Array.from(selectedIndices).map(i => rows[i]);
    if (!selected.length) return;

    setIsRunning(true);
    setPipelineError(null);
    setStageState(INIT_STAGE_STATE);
    setTab('pipeline');

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      setStageState({
        brand: 'running', classify: 'pending', extract: 'pending',
        describe: 'pending', score: 'pending',
      });

      const result = await runPipeline(selected);

      const stagesRun = result.stages_run;
      for (const stageRun of stagesRun) {
        const key = stageRun === 'brand_resolution' ? 'brand'
          : stageRun === 'classification' ? 'classify'
          : stageRun === 'attribute_extraction' ? 'extract'
          : stageRun === 'description_generation' ? 'describe'
          : null;
        if (key) {
          setStageState(s => ({ ...s, [key]: 'done' }));
          await delay(200);
        }
      }

      setStageState(s => ({ ...s, score: 'running' }));
      await delay(400);
      setStageState(s => ({ ...s, score: 'done' }));

      const enriched = [...enrichedRows];
      let ri = 0;
      for (const idx of selectedIndices) {
        enriched[idx] = result.results[ri++];
      }
      setEnrichedRows(enriched);

      if (focusedRowIdx === null && result.results.length > 0) {
        setFocusedRowIdx(Array.from(selectedIndices)[0]);
      }

      try {
        const m = await evaluateBatch(result.results);
        setMetrics(m);
      } catch {
        // Evaluation might fail — not critical
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPipelineError(msg);
      setStageState(s => {
        const running = Object.entries(s).find(([, v]) => v === 'running')?.[0];
        if (running) return { ...s, [running]: 'error' };
        return s;
      });
    } finally {
      setIsRunning(false);
    }
  };

  const reset = () => {
    setEnrichedRows([]);
    setSelectedIndices(new Set());
    setFocusedRowIdx(null);
    setStageState(INIT_STAGE_STATE);
    setMetrics(null);
    setPipelineError(null);
  };

  const focusedInput = focusedRowIdx !== null ? rows[focusedRowIdx] : null;
  const focusedEnriched = focusedRowIdx !== null ? enrichedRows[focusedRowIdx] : null;
  const hasResults = enrichedRows.some(Boolean);

  /* ── Top-bar action buttons passed into layout ── */
  const topBarExtra = (
    <div className="flex items-center gap-2">
      {/* Backend health */}
      <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        {healthError ? (
          <><WifiOff size={13} className="text-red-400" /><span className="text-red-400">Offline</span></>
        ) : health ? (
          <><Wifi size={13} className="text-accent-400" /><span className="text-accent-400">{health.sample_input_rows} rows · {health.manufacturer_count} brands</span></>
        ) : (
          <span className="text-gray-600 animate-pulse">Connecting…</span>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <button
            onClick={reset}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 transition-colors border border-white/[0.06]"
            title="Reset pipeline"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={runSelectedPipeline}
            disabled={isRunning || selectedIndices.size === 0}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
              isRunning || selectedIndices.size === 0
                ? 'bg-brand-700/30 text-brand-500/50 cursor-not-allowed'
                : 'bg-brand-500 text-white hover:bg-brand-400 glow-brand active:scale-95'
            )}
          >
            {isRunning ? (
              <><Pause size={13} />Processing…</>
            ) : (
              <><Play size={13} />Run ({selectedIndices.size})</>
            )}
          </button>
        </>
      )}
    </div>
  );

  return (
    <DashboardLayout
      tab={tab}
      onTabChange={setTab}
      hasResults={hasResults}
      metricsScore={metrics?.overall_accuracy_pct ?? null}
      topBarExtra={topBarExtra}
    >

      {/* ══════════════ DATA TAB ══════════════ */}
      {tab === 'data' && (
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={15} className="text-brand-400" />
              <h2 className="text-sm font-semibold text-gray-200">Load Product Data</h2>
            </div>
            <UploadPanel onRowsLoaded={handleRowsLoaded} />
          </div>

          {rows.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database size={15} className="text-brand-400" />
                  <h2 className="text-sm font-semibold text-gray-200">
                    {rows.length} rows loaded
                  </h2>
                </div>
                {selectedIndices.size > 0 && (
                  <button
                    onClick={runSelectedPipeline}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-400 transition-colors"
                  >
                    <Play size={11} />
                    Run on {selectedIndices.size} selected
                    <ChevronRight size={11} />
                  </button>
                )}
              </div>
              <DataTable
                rows={rows}
                enrichedRows={enrichedRows}
                selectedIndices={selectedIndices}
                onSelectionChange={setSelectedIndices}
                onRowClick={i => setFocusedRowIdx(i)}
              />
              <p className="text-xs text-gray-600 mt-3 text-center">
                Select up to 20 rows · Click to focus · Then click "Run Pipeline"
              </p>
            </div>
          )}

          {rows.length === 0 && (
            <div className="glass-card p-10 text-center">
              <Info size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Load a CSV or use the built-in sample dataset to get started.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ PIPELINE TAB ══════════════ */}
      {tab === 'pipeline' && (
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <ActivitySquare size={15} className="text-brand-400" />
              Pipeline Stages
            </h2>
            <PipelineView
              stageState={stageState}
              enrichedRow={focusedEnriched || undefined}
              totalRows={selectedIndices.size}
              processedRows={hasResults ? selectedIndices.size : undefined}
            />
            {pipelineError && (
              <div className="glass-card mt-3 px-4 py-3 border-red-500/20">
                <p className="text-xs text-red-400">⚠ {pipelineError}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Make sure backend is running:{' '}
                  <code className="font-mono">uvicorn app.main:app --reload</code>
                </p>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              Row Preview
              {focusedRowIdx !== null && (
                <span className="ml-2 text-xs text-gray-600">#{focusedRowIdx + 1}</span>
              )}
            </h2>
            {focusedInput && focusedEnriched ? (
              <DiffView inputRow={focusedInput} enrichedRow={focusedEnriched} />
            ) : focusedInput ? (
              <div className="glass-card p-5 text-center">
                <p className="text-sm text-gray-500">Run pipeline to see enriched output</p>
                <p className="text-xs text-gray-600 mt-1">MPN: {focusedInput.Mfg_Part_Num}</p>
              </div>
            ) : (
              <div className="glass-card p-5 text-center">
                <p className="text-sm text-gray-500">Select a row from the Data tab to preview.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ RESULTS TAB ══════════════ */}
      {tab === 'results' && (
        <div className="max-w-5xl mx-auto space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <LayoutDashboard size={15} className="text-brand-400" />
            Enriched Results
          </h2>
          {hasResults ? (
            <>
              <DataTable
                rows={rows}
                enrichedRows={enrichedRows}
                selectedIndices={selectedIndices}
                onSelectionChange={setSelectedIndices}
                onRowClick={i => { setFocusedRowIdx(i); setTab('pipeline'); }}
              />
              <p className="text-xs text-gray-600 text-center">
                Click any row to see the full diff view in the Pipeline tab.
              </p>
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <ActivitySquare size={40} className="text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-500">No enriched results yet.</p>
              <p className="text-xs text-gray-600 mt-1">
                Go to Data tab, select rows, and run the pipeline.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ SCORECARD TAB ══════════════ */}
      {tab === 'scorecard' && (
        <div className="max-w-4xl mx-auto space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <BarChart2 size={15} className="text-brand-400" />
            Accuracy Scorecard
          </h2>
          {metrics ? (
            <Scorecard metrics={metrics} />
          ) : (
            <div className="glass-card p-12 text-center">
              <BarChart2 size={40} className="text-gray-700 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Run the pipeline to generate accuracy metrics.</p>
              <p className="text-xs text-gray-600 mt-1">
                Results are automatically scored against the ground truth CSV.
              </p>
            </div>
          )}
        </div>
      )}

    </DashboardLayout>
  );
};
