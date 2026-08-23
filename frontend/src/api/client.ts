import axios from 'axios';

const BASE = '/api';

export const api = axios.create({
  baseURL: BASE,
  timeout: 120000,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InputRow {
  Mfg_Part_Num?: string;
  Part_Desc?: string;
  E1_Brand?: string;
  Unilog_Brand?: string;
  DIB_Brand?: string;
  Part_Manuf?: string;
}

export interface EnrichedRow extends InputRow {
  MANUFACTURER_NAME?: string;
  BRAND_NAME?: string;
  match_score?: number;
  match_method?: string;
  confidence?: number;
  Dept?: string;
  Class?: string;
  Fine?: string;
  Classpath?: string;
  classify_method?: string;
  classify_confidence?: number;
  attributes?: AttributeValue[];
  unmapped_values?: string[];
  extraction_confidence?: string;
  lov_compliance_pct?: number;
  INVOICE_DESC?: string;
  MOBILE_DESC?: string;
  SHORT_DESC?: string;
  LONG_DESC1?: string;
  MARKETING_DESCRIPTION?: string;
  desc_compliance?: Record<string, { length: number; compliant: boolean }>;
  pipeline_confidence?: number;
  needs_review?: boolean;
  review_reasons?: string[];
  generation_method?: string;
}

export interface AttributeValue {
  label: string;
  value: string;
  uom?: string;
  raw_uom?: string;
}

export interface PipelineResult {
  results: EnrichedRow[];
  stages_run: string[];
  stage_outputs: Record<string, unknown[]>;
  summary: {
    total_rows: number;
    needs_review_count: number;
    avg_confidence: number;
  };
}

export interface EvaluationMetrics {
  rows_scored: number;
  unmatched?: number;
  overall_accuracy_pct?: number;
  lov_compliance_pct?: number;
  char_compliance_by_field?: Record<string, number>;
  invoice_caps_compliance_pct?: number;
  per_field_accuracy?: Record<string, number>;
  review_flag_count?: number;
  row_details?: unknown[];
  error?: string;
  message?: string;
}

export interface HealthStatus {
  status: string;
  manufacturer_count: number;
  lov_classpaths: string[];
  ground_truth_rows: number;
  sample_input_rows: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const getHealth = (): Promise<HealthStatus> =>
  api.get('/health').then(r => r.data);

export const getSampleInput = (limit = 50): Promise<{ rows: InputRow[]; total: number }> =>
  api.get('/sample-input', { params: { limit } }).then(r => r.data);

export const runPipeline = (
  rows: InputRow[],
  stages = ['brand', 'classify', 'extract', 'describe'],
  fuzzy_threshold = 75
): Promise<PipelineResult> =>
  api.post('/pipeline/run', { rows, stages, fuzzy_threshold }).then(r => r.data);

export const evaluateBatch = (predicted_rows: EnrichedRow[]): Promise<EvaluationMetrics> =>
  api.post('/evaluate', { predicted_rows }).then(r => r.data);

export const uploadCSV = (file: File): Promise<{ rows: InputRow[]; total_in_file: number; columns: string[] }> => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/upload-csv', fd).then(r => r.data);
};

export const resolveStage = (rows: InputRow[]) =>
  api.post('/resolve-brand', { rows }).then(r => r.data);

export const classifyStage = (rows: InputRow[]) =>
  api.post('/classify', { rows }).then(r => r.data);

export const extractStage = (rows: InputRow[]) =>
  api.post('/extract', { rows }).then(r => r.data);

export const describeStage = (rows: InputRow[]) =>
  api.post('/describe', { rows }).then(r => r.data);
