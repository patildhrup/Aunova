import React, { useState, useCallback, useEffect } from 'react';
import {
  Play, Pause, RotateCcw, ChevronRight, LayoutDashboard,
  Database, ActivitySquare, BarChart2, Info, Cpu, Wifi, WifiOff
} from 'lucide-react';
import { UploadPanel } from '@/components/UploadPanel';
import { DataTable } from '@/components/DataTable';
import { PipelineView, type StageState } from '@/components/PipelineView';
import { DiffView } from '@/components/DiffView';
import { Scorecard } from '@/components/Scorecard';
import {
  runPipeline, evaluateBatch, getHealth,
  type InputRow, type EnrichedRow, type EvaluationMetrics, type HealthStatus
} from '@/api/client';
import { cn } from '@/lib/utils';

type Tab = 'data' | 'pipeline' | 'results' | 'scorecard';

const INIT_STAGE_STATE: StageState = {
  brand: 'pending', classify: 'pending', extract: 'pending',
  describe: 'pending', score: 'pending',
};

const NAV_ITEMS = [
  { id: 'data' as Tab, label: 'Data', icon: Database },
  { id: 'pipeline' as Tab, label: 'Pipeline', icon: ActivitySquare },
  { id: 'results' as Tab, label: 'Results', icon: LayoutDashboard },
  { id: 'scorecard' as Tab, label: 'Scorecard', icon: BarChart2 },
];

export const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('data');
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
      // Animate stages sequentially
      const stages: (keyof StageState)[] = ['brand', 'classify', 'extract', 'describe'];
      for (const stage of stages) {
        setStageState(s => ({ ...s, [stage]: 'running' }));
        await delay(300); // Let animation register
      }

      // Reset to running only brand while API call goes out
      setStageState({
        brand: 'running', classify: 'pending', extract: 'pending',
        describe: 'pending', score: 'pending',
      });

      const result = await runPipeline(selected);

      // Animate completion stage by stage
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

      // Merge enriched results back into the full enrichedRows array
      const enriched = [...enrichedRows];
      let ri = 0;
      for (const idx of selectedIndices) {
        enriched[idx] = result.results[ri++];
      }
      setEnrichedRows(enriched);

      if (focusedRowIdx === null && result.results.length > 0) {
        const firstIdx = Array.from(selectedIndices)[0];
        setFocusedRowIdx(firstIdx);
      }

      // Auto-evaluate
      try {
        const m = await evaluateBatch(result.results);
        setMetrics(m);
      } catch {
        // Evaluation might fail if ground truth doesn't match — that's ok
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

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center glow-brand">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight">
              Unilog <span className="gradient-text">Product Intelligence</span>
            </h1>
            <p className="text-xs text-gray-500">AI-powered catalog enrichment pipeline</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Backend status */}
          <div className="flex items-center gap-1.5 text-xs">
            {healthError ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Backend offline</span>
              </>
            ) : health ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-accent-400" />
                <span className="text-accent-400">
                  {health.sample_input_rows} rows · {health.manufacturer_count} brands
                </span>
              </>
            ) : (
              <span className="text-gray-600 animate-pulse">Connecting…</span>
            )}
          </div>

          {/* Actions */}
          {rows.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={reset}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 transition-colors"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={runSelectedPipeline}
                disabled={isRunning || selectedIndices.size === 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                  isRunning || selectedIndices.size === 0
                    ? 'bg-brand-700/30 text-brand-500/50 cursor-not-allowed'
                    : 'bg-brand-500 text-white hover:bg-brand-400 glow-brand active:scale-95'
                )}
              >
                {isRunning ? (
                  <><Pause className="w-4 h-4" /> Processing…</>
                ) : (
                  <><Play className="w-4 h-4" /> Run Pipeline ({selectedIndices.size})</>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="border-b border-white/8 px-6 flex items-center gap-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200',
              tab === id
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'results' && hasResults && (
              <span className="ml-1 w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
            )}
            {id === 'scorecard' && metrics && (
              <span className="ml-1 text-xs bg-brand-500/20 text-brand-300 px-1.5 rounded-full">
                {metrics.overall_accuracy_pct?.toFixed(0) || '?'}%
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">

        {/* Data tab */}
        {tab === 'data' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-brand-400" />
                <h2 className="text-sm font-semibold text-gray-200">Load Product Data</h2>
              </div>
              <UploadPanel onRowsLoaded={handleRowsLoaded} />
            </div>

            {rows.length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-brand-400" />
                    <h2 className="text-sm font-semibold text-gray-200">
                      {rows.length} rows loaded
                    </h2>
                  </div>
                  {selectedIndices.size > 0 && (
                    <button
                      onClick={runSelectedPipeline}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-400 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Run on {selectedIndices.size} selected
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <DataTable
                  rows={rows}
                  enrichedRows={enrichedRows}
                  selectedIndices={selectedIndices}
                  onSelectionChange={setSelectedIndices}
                  onRowClick={(i) => setFocusedRowIdx(i)}
                />
                <p className="text-xs text-gray-600 mt-3 text-center">
                  Select up to 20 rows · Click to focus · Then click "Run Pipeline"
                </p>
              </div>
            )}

            {rows.length === 0 && (
              <div className="glass-card p-10 text-center">
                <Info className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Load a CSV or use the built-in sample dataset to get started.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pipeline tab */}
        {tab === 'pipeline' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                <ActivitySquare className="w-4 h-4 text-brand-400" />
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
                    Make sure the backend is running: <code className="font-mono">uvicorn app.main:app --reload</code>
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
                  <p className="text-sm text-gray-500">
                    Select a row from the Data tab to preview it here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results tab */}
        {tab === 'results' && (
          <div className="max-w-5xl mx-auto space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-brand-400" />
              Enriched Results
            </h2>
            {hasResults ? (
              <>
                <DataTable
                  rows={rows}
                  enrichedRows={enrichedRows}
                  selectedIndices={selectedIndices}
                  onSelectionChange={setSelectedIndices}
                  onRowClick={(i) => {
                    setFocusedRowIdx(i);
                    setTab('pipeline');
                  }}
                />
                <p className="text-xs text-gray-600 text-center">
                  Click any row to see the full diff view in the Pipeline tab.
                </p>
              </>
            ) : (
              <div className="glass-card p-12 text-center">
                <ActivitySquare className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                <p className="text-sm text-gray-500">No enriched results yet.</p>
                <p className="text-xs text-gray-600 mt-1">
                  Go to Data tab, select rows, and run the pipeline.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Scorecard tab */}
        {tab === 'scorecard' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-brand-400" />
              Accuracy Scorecard
            </h2>
            {metrics ? (
              <Scorecard metrics={metrics} />
            ) : (
              <div className="glass-card p-12 text-center">
                <BarChart2 className="w-10 h-10 text-gray-700 mx-auto mb-4" />
                <p className="text-sm text-gray-500">
                  Run the pipeline to generate accuracy metrics.
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Results are automatically scored against the ground truth CSV.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
