import { type EnrichedRow, type InputRow } from '@/api/client';

export const exportCSV = (rows: (EnrichedRow | InputRow)[], filename = 'aunova_enriched_products.csv') => {
  if (!rows || rows.length === 0) return;

  // Collect all unique keys from all rows
  const keySet = new Set<string>();
  rows.forEach(r => {
    Object.keys(r).forEach(k => {
      if (typeof (r as any)[k] !== 'object') {
        keySet.add(k);
      }
    });
  });

  // Standardize key order
  const priorityKeys = [
    'Mfg_Part_Num', 'Part_Desc', 'Part_Manuf',
    'MANUFACTURER_NAME', 'BRAND_NAME', 'match_score', 'confidence',
    'Dept', 'Class', 'Fine', 'Classpath', 'classify_confidence',
    'INVOICE_DESC', 'MOBILE_DESC', 'SHORT_DESC', 'LONG_DESC1', 'MARKETING_DESCRIPTION',
    'pipeline_confidence', 'needs_review'
  ];

  const allKeys = [
    ...priorityKeys.filter(k => keySet.has(k)),
    ...Array.from(keySet).filter(k => !priorityKeys.includes(k))
  ];

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = allKeys.map(escapeCSV).join(',');
  const dataRows = rows.map(row => {
    return allKeys.map(key => escapeCSV((row as any)[key])).join(',');
  });

  const csvContent = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportJSON = (rows: (EnrichedRow | InputRow)[], filename = 'aunova_enriched_products.json') => {
  if (!rows || rows.length === 0) return;

  const jsonContent = JSON.stringify(rows, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
