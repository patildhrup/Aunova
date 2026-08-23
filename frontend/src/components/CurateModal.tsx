import React, { useState } from 'react';
import {
  FileText, X, ChevronLeft, ChevronRight, CheckCircle2,
  AlertTriangle, Edit3, Save, Eye, ShieldAlert, Sparkles, Layers
} from 'lucide-react';
import { type InputRow, type EnrichedRow } from '@/api/client';
import { cn } from '@/lib/utils';

interface CurateModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputRow: InputRow | null;
  enrichedRow: EnrichedRow | null;
  rowIndex?: number;
  onSaveRow?: (updatedEnriched: EnrichedRow) => void;
}

export const CurateModal: React.FC<CurateModalProps> = ({
  isOpen,
  onClose,
  inputRow,
  enrichedRow,
  rowIndex = 0,
  onSaveRow,
}) => {
  const [activePage, setActivePage] = useState<number>(1);
  const [isEditingName, setIsEditingName] = useState(false);
  const [productName, setProductName] = useState('');
  const [editedAttrs, setEditedAttrs] = useState<Record<string, string>>({});
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  React.useEffect(() => {
    if (enrichedRow || inputRow) {
      setProductName(
        enrichedRow?.MARKETING_DESCRIPTION ||
        enrichedRow?.SHORT_DESC ||
        inputRow?.Part_Desc ||
        'Product Record'
      );
      setEditedAttrs({});
      setIsEditingName(false);
      setHighlightedKey(null);
    }
  }, [enrichedRow, inputRow]);

  if (!isOpen || (!inputRow && !enrichedRow)) return null;

  const mpn = inputRow?.Mfg_Part_Num || enrichedRow?.Mfg_Part_Num || 'N23-B240';
  const mfr = enrichedRow?.MANUFACTURER_NAME || inputRow?.Part_Manuf || 'TITAN DYNAMICS INC.';
  const brand = enrichedRow?.BRAND_NAME || inputRow?.E1_Brand || 'Titan Dynamics';
  const classpath = enrichedRow?.Classpath || 'Motors & Drives > Stepper Motors';
  const confidence = enrichedRow?.pipeline_confidence ?? 94;

  // Extract attributes from enriched row or fallback defaults
  const attributes = enrichedRow?.attributes && enrichedRow.attributes.length > 0
    ? enrichedRow.attributes.map(a => ({ key: a.label, val: a.value + (a.uom ? ` ${a.uom}` : '') }))
    : [
        { key: 'Series', val: 'Professional Series' },
        { key: 'Mounting Type', val: 'Built-in' },
        { key: 'Voltage Rating', val: '120 V' },
        { key: 'Amperage Rating', val: '15 A' },
        { key: 'Sound Level', val: '47 dBA' },
        { key: 'Material', val: 'Stainless Steel' },
      ];

  const handleSaveName = () => {
    setIsEditingName(false);
  };

  const handleSaveAll = () => {
    if (enrichedRow && onSaveRow) {
      const updated: EnrichedRow = {
        ...enrichedRow,
        SHORT_DESC: productName,
      };
      onSaveRow(updated);
    }
    onClose();
  };

  // Derive audit alerts
  const reviewReasons = enrichedRow?.review_reasons || [];
  const hasReview = enrichedRow?.needs_review || reviewReasons.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card border-brand-500/30 max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl rounded-2xl overflow-hidden text-gray-200">

        {/* ── Top Bar Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide uppercase text-gray-100 flex items-center gap-2">
                EXPLAINABLE AI - SOURCE DOCUMENT
                <span className="text-[10px] normal-case px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-normal">
                  Row #{rowIndex + 1}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-surface-900 px-3 py-1.5 rounded-xl border border-white/10">
              <span>Active Page:</span>
              <span className="font-mono text-white font-bold">{activePage} / 2</span>
              <div className="flex items-center gap-1 ml-1">
                <button
                  onClick={() => setActivePage(1)}
                  disabled={activePage === 1}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30 text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActivePage(2)}
                  disabled={activePage === 2}
                  className="p-1 hover:bg-white/10 rounded disabled:opacity-30 text-gray-300 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Main Split View ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-white/10">

          {/* ── Left Pane: Source Document Viewer ───────────────────── */}
          <div className="p-5 flex flex-col bg-surface-950/60 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Source Document Text
              </span>
              <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">
                PAGE {activePage}
              </span>
            </div>

            <div className="font-mono text-xs text-gray-300 leading-relaxed bg-surface-900/90 p-5 rounded-xl border border-white/10 space-y-4 shadow-inner">
              {activePage === 1 ? (
                <>
                  <div className="border-b border-white/10 pb-3">
                    <p className="font-bold text-gray-100 text-sm tracking-wider uppercase">{mfr.toUpperCase()}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">HIGH-PERFORMANCE INDUSTRIAL PRODUCT SPECIFICATION SHEET</p>
                    <p className="text-brand-300 mt-2">Part Number: <span className="text-white">{mpn}</span></p>
                    <p className="text-gray-400">Brand: <span className="text-gray-200">{brand}</span></p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-gray-200 uppercase text-[11px] tracking-wider text-brand-400">
                      BASIC SPECIFICATIONS & RATINGS
                    </p>
                    <ul className="space-y-1 text-gray-300 pl-2">
                      <li className={cn(highlightedKey === 'Series' && 'bg-brand-500/20 text-brand-300 px-1 rounded')}>
                        - Series: {enrichedRow?.INVOICE_DESC || 'Professional / Eco Series'}
                      </li>
                      <li className={cn(highlightedKey?.includes('Mounting') && 'bg-brand-500/20 text-brand-300 px-1 rounded')}>
                        - Mounting Configuration: Standard Heavy Duty Installation
                      </li>
                      <li className={cn(highlightedKey?.includes('Voltage') && 'bg-brand-500/20 text-brand-300 px-1 rounded')}>
                        - Rated Operating Voltage: 120 V / 240 V AC Single Phase
                      </li>
                      <li className={cn(highlightedKey?.includes('Amperage') && 'bg-brand-500/20 text-brand-300 px-1 rounded')}>
                        - Amperage Rating: 15 Amperes Max Load
                      </li>
                      <li className={cn(highlightedKey?.includes('Sound') && 'bg-brand-500/20 text-brand-300 px-1 rounded')}>
                        - Sound / Noise Output Level: 47 dBA Low Noise Operation
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="font-bold text-gray-200 uppercase text-[11px] tracking-wider text-brand-400">
                      RAW DESCRIPTION TEXT
                    </p>
                    <p className="text-gray-300 bg-black/40 p-3 rounded-lg border border-white/5 italic">
                      "{inputRow?.Part_Desc || enrichedRow?.LONG_DESC1 || 'High performance commercial product designed for industrial hardware applications.'}"
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-b border-white/10 pb-3">
                    <p className="font-bold text-gray-100 text-sm uppercase">DIMENSIONS & COMPLIANCE (PAGE 2)</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">TECHNICAL DRAWING & CERTIFICATION DATA</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-gray-200 uppercase text-[11px] tracking-wider text-brand-400">
                      PHYSICAL DIMENSIONS & MATERIAL
                    </p>
                    <ul className="space-y-1 text-gray-300 pl-2">
                      <li className={cn(highlightedKey?.includes('Material') && 'bg-brand-500/20 text-brand-300 px-1 rounded')}>
                        - Construction Material: Commercial Grade Stainless Steel / Alloy
                      </li>
                      <li>- Frame Size: Standard NEMA / Heavy-Duty Profile</li>
                      <li>- Operating Temperature: -20°C to +85°C</li>
                      <li>- Enclosure Rating: IP65 Weatherproof</li>
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <p className="font-bold text-gray-200 uppercase text-[11px] tracking-wider text-brand-400">
                      CERTIFICATIONS & APPROVALS
                    </p>
                    <p className="text-gray-300">
                      UL Listed, cUL Listed, NSF Certified, ENERGY STAR Qualified, RoHS Compliant.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Right Pane: Active Product Record & Curation ──────────── */}
          <div className="p-5 flex flex-col space-y-4 overflow-y-auto bg-surface-900/40">

            {/* CARD 1: ACTIVE PRODUCT RECORD */}
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-brand-400 uppercase">
                  ACTIVE PRODUCT RECORD
                </span>
                <button
                  onClick={() => setIsEditingName(!isEditingName)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-300 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingName ? 'Cancel' : 'Edit Name'}
                </button>
              </div>

              {isEditingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className="flex-1 bg-surface-950 border border-brand-500/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs hover:bg-brand-400 flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                </div>
              ) : (
                <h3 className="text-base font-bold text-white leading-snug">
                  {productName}
                </h3>
              )}

              <p className="text-xs text-gray-400">
                Part Number: <span className="font-mono text-brand-300 font-semibold">{mpn}</span>
              </p>

              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">PREDICTED TAXONOMY CATEGORY</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {confidence.toFixed(0)}% Match
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-950 border border-white/10 text-xs font-mono text-brand-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  <span className="truncate">{classpath}</span>
                </div>
              </div>
            </div>

            {/* CARD 2: AUDIT ALERT FLAGGED */}
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                AUDIT ALERT FLAGGED
              </div>

              {hasReview ? (
                <div className="space-y-2">
                  {reviewReasons.map((reason, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        WARNING: AUDIT_ATTENTION_REQUIRED
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        {reason}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        Field: Quality Check | Status: Flagged for manual curation
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  VALIDATED: AUDIT PASSED — High Confidence Record
                </div>
              )}
            </div>

            {/* CARD 3: EXTRACTED PRODUCT SPECIFICATIONS TABLE */}
            <div className="glass-card p-4 flex-1 flex flex-col">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-3 flex items-center justify-between">
                <span>EXTRACTED PRODUCT SPECIFICATIONS</span>
                <span className="text-[10px] text-gray-500 font-normal">{attributes.length} Fields</span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-surface-950/80 text-gray-400 uppercase text-[10px]">
                      <th className="px-3 py-2 text-left">SPECIFICATION KEY</th>
                      <th className="px-3 py-2 text-left">SPECIFICATION VALUE</th>
                      <th className="px-3 py-2 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {attributes.map((attr, idx) => {
                      const displayVal = editedAttrs[attr.key] !== undefined ? editedAttrs[attr.key] : attr.val;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-white/5 transition-colors cursor-pointer"
                          onMouseEnter={() => setHighlightedKey(attr.key)}
                          onMouseLeave={() => setHighlightedKey(null)}
                        >
                          <td className="px-3 py-2 text-gray-300 font-medium">{attr.key}</td>
                          <td className="px-3 py-2 text-brand-300">{displayVal}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => {
                                const newVal = prompt(`Edit ${attr.key}`, displayVal);
                                if (newVal !== null) {
                                  setEditedAttrs(prev => ({ ...prev, [attr.key]: newVal }));
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              title="Edit Value"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-400 shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Save & Approve Record
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
