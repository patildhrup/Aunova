import React, { useCallback, useState } from 'react';
import { Upload, FileText, Zap } from 'lucide-react';
import { uploadCSV, getSampleInput, type InputRow } from '@/api/client';
import { cn } from '@/lib/utils';

interface UploadPanelProps {
  onRowsLoaded: (rows: InputRow[]) => void;
}

export const UploadPanel: React.FC<UploadPanelProps> = ({ onRowsLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setStatus(`Parsing ${file.name}…`);
    try {
      const result = await uploadCSV(file);
      setStatus(`Loaded ${result.rows.length} rows (${result.total_in_file} total in file)`);
      onRowsLoaded(result.rows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Upload failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, [onRowsLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
    else setError('Please upload a CSV file.');
  }, [handleFile]);

  const loadSample = async () => {
    setIsLoading(true);
    setError(null);
    setStatus('Loading sample dataset…');
    try {
      const result = await getSampleInput(100);
      setStatus(`Loaded ${result.rows.length} sample rows`);
      onRowsLoaded(result.rows);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Failed to load sample: ${msg}. Is the backend running?`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'glass-card border-2 border-dashed p-10 text-center cursor-pointer transition-all duration-300',
          isDragging
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01]'
            : 'border-white/10 hover:border-brand-500/50 hover:bg-white/[0.02]'
        )}
        onClick={() => document.getElementById('csv-input')?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
            isDragging ? 'bg-brand-500/30 glow-brand' : 'bg-brand-500/10'
          )}>
            <Upload className={cn('w-6 h-6', isDragging ? 'text-brand-300' : 'text-brand-400')} />
          </div>
          <div>
            <p className="text-base font-medium text-gray-200">Drop CSV file here</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <FileText className="w-3 h-3" />
            <span>Supports Mfg_Part_Num, Part_Desc, E1_Brand, Part_Manuf columns</span>
          </div>
        </div>
      </div>

      {/* OR divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-xs text-gray-600">or</span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* Load sample button */}
      <button
        onClick={loadSample}
        disabled={isLoading}
        className="w-full glass-card-hover px-5 py-3 flex items-center justify-center gap-2 text-sm font-medium text-brand-300 hover:text-brand-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Zap className="w-4 h-4" />
        {isLoading ? 'Loading…' : 'Use Built-in Sample Dataset (100 rows)'}
      </button>

      {/* Status / error */}
      {status && !error && (
        <p className="text-xs text-accent-400 text-center px-2">{status}</p>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center px-2">{error}</p>
      )}
    </div>
  );
};
