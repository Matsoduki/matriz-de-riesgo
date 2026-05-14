import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface DashboardData {
  jira2025: any[];
  jira2026: any[];
  sensor: any[];
  mandoYControl: any[];
  metadata?: {
    rowCount: number;
    processedAt: string;
    dataQuality: {
      missingResponsibles: number;
      criticalUnmapped: number;
    };
  };
}

export const parseExcelFile = async (file: File): Promise<DashboardData> => {
  return new Promise((resolve, reject) => {
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    if (isCsv) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // If it's a CSV, we assume it's primarily SENSOR data, 
          // as Jira reports are often multi-tab Excels.
          resolve({
            jira2025: [],
            jira2026: [],
            sensor: results.data,
            mandoYControl: []
          });
        },
        error: (err) => reject(err)
      });
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("No data found in file.");
        
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Helper to find sheet (case-insensitive and partial match)
        const getSheet = (nameToFind: string) => {
          const normalizedTarget = nameToFind.toLowerCase().replace(/\s+/g, '');
          
          // 1. Try to find exact match (normalized)
          let sheetName = workbook.SheetNames.find(s => 
            s.toLowerCase().replace(/\s+/g, '') === normalizedTarget
          );

          // 2. If looking for 'sensr', explicitly avoid sheets containing 'kpi'
          if (!sheetName && normalizedTarget === 'sensr') {
            sheetName = workbook.SheetNames.find(s => {
              const n = s.toLowerCase();
              return n.includes('sensr') && !n.includes('kpi');
            });
          }

          // 3. Fallback to general includes if not found
          if (!sheetName) {
            sheetName = workbook.SheetNames.find(s => 
              s.toLowerCase().replace(/\s+/g, '').includes(normalizedTarget)
            );
          }
          
          if (!sheetName) return [];
          const sheet = workbook.Sheets[sheetName];
          
          // Enhanced header detection for 'sensr' sheet
          if (nameToFind.toLowerCase().includes('sensr') || nameToFind.toLowerCase().includes('sensor')) {
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];
            let headerRowIndex = -1;
            
            // Search for a row that has keywords like 'Numero', 'Creado', 'Analista'
            for (let i = 0; i < Math.min(rows.length, 50); i++) {
              const row = rows[i];
              if (!row || !Array.isArray(row)) continue;
              const rowText = row.map(cell => String(cell).toLowerCase().trim()).join(' ');
              if (rowText.includes('numero') && (rowText.includes('creado') || rowText.includes('analista'))) {
                headerRowIndex = i;
                break;
              }
            }

            if (headerRowIndex !== -1) {
              const rawData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: "" }) as any[];
              // Filter out summary rows or empty rows
              return rawData.filter(row => {
                const id = String(row['Numero'] || row['numero'] || '').trim();
                if (!id || id.toLowerCase().includes('total') || id.toLowerCase() === 'numero') return false;
                return true;
              });
            }
          }
          
          return XLSX.utils.sheet_to_json(sheet, { defval: "" });
        };

        const rejected: any[] = [];
        const processSheet = (data: any[]) => {
          return data.filter(row => {
            // Check if any value has real information
            return Object.values(row).some(v => {
              const str = String(v || "").trim();
              return str !== "" && str !== "-" && str.toLowerCase() !== "n/a" && str !== ".";
            });
          });
        };

        const jira2025 = processSheet(getSheet('jira2025'));
        const jira2026 = processSheet(getSheet('jira2026'));
        let sensor = processSheet(getSheet('sensr'));
        if (sensor.length === 0) sensor = processSheet(getSheet('sensor'));

        let mandoYControl = processSheet(getSheet('mando'));
        if (mandoYControl.length === 0) mandoYControl = processSheet(getSheet('ciberseguridad'));

        resolve({
          jira2025,
          jira2026,
          sensor,
          mandoYControl,
          metadata: {
            rowCount: jira2025.length + jira2026.length + sensor.length + mandoYControl.length,
            processedAt: new Date().toISOString(),
            dataQuality: {
              missingResponsibles: [...jira2025, ...jira2026, ...sensor, ...mandoYControl].filter(r => !r['Responsable'] && !r['Asignado']).length,
              criticalUnmapped: 0 
            }
          }
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

export const isResolvedStatus = (status: any): boolean => {
  const s = String(status || "").toLowerCase().trim();
  return [
    "resuelto", "cerrado", "completado", "done", "closed", 
    "mitigado", "ok", "terminado", "finalizado", "término", "termino", "atendido", "exitoso",
    "atendida", "finalizada", "resuelta", "cerrada"
  ].some(term => s.includes(term));
};

export const getWeekNumber = (d: Date): number => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

export const getISOWeek = (dateVal: any): string => {
  const iso = getISOFromExcelDate(dateVal);
  if (!iso) return "S/F";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "S/F";
  const week = getWeekNumber(d);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const getWeekLabel = (dateVal: any): string => {
  const iso = getISOFromExcelDate(dateVal);
  if (!iso) return "S/F";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "S/F";
  
  const week = getWeekNumber(d);
  const startOfWeek = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  startOfWeek.setDate(diff);
  
  const formatter = new Intl.DateTimeFormat('es-AR', { month: 'short', day: 'numeric' });
  const yearSuffix = startOfWeek.getFullYear().toString().slice(-2);
  return `W${week} (${formatter.format(startOfWeek)} '${yearSuffix})`;
};

/**
 * Normalizes Lead Time (MTTR) into executive-friendly ranges to reduce cognitive load.
 */
export const normalizeMTTRDisplay = (days: number): string => {
  if (days <= 0) return "Inmediato";
  if (days < 1) {
    const hours = Math.round(days * 24);
    return hours === 0 ? "Inmediato" : `${hours}h`;
  }
  if (days <= 7) return `${Math.round(days)}d`;
  if (days <= 14) return "1-2 sem";
  if (days <= 30) return "2-4 sem";
  return "+1 mes";
};

// Generic helper to find a column name dynamically
export const findColumnKey = (row: any, keywords: string[]): string | undefined => {
  if (!row) return undefined;
  const keys = Object.keys(row);
  
  const normalize = (str: string) => str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[._\-]/g, ' ')
    .replace(/\s+/g, ' ').trim();

  // 1. Exact match priority
  for (const kw of keywords) {
    const normalKw = normalize(kw);
    for (const key of keys) {
      if (normalize(key) === normalKw) return key;
    }
  }

  // 2. Partial match
  for (const kw of keywords) {
    const normalKw = normalize(kw);
    for (const key of keys) {
      if (normalize(key).includes(normalKw)) return key;
    }
  }
  
  return undefined;
};

export const formatExcelDate = (value: any): string => {
  if (value === undefined || value === null || value === '') return '';
  
  let numVal: number | null = null;
  if (typeof value === 'number') {
    numVal = value;
  } else if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
    numVal = parseFloat(value);
  }

  if (numVal !== null && numVal > 30000 && numVal < 60000) {
    // Excel date numeric (days since epoch) - reasonable range check for years ~1982 to ~2063
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + numVal * 86400000);
    if (!isNaN(date.getTime())) {
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      return `${d}/${m}/${y}`;
    }
  }
  
  const strVal = String(value).trim();
  // If it's already in YYYY-MM-DD, convert to DD/MM/YYYY
  if (strVal.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parts = strVal.substring(0, 10).split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  // If it's something like MM/DD/YYYY or similar, it's probably already fine or we leave it
  return strVal;
};

// Helper for logical sorting/filtering which needs ISO format
export const getISOFromExcelDate = (value: any): string => {
  if (value === undefined || value === null || value === '') return '';
  
  let numVal: number | null = null;
  if (typeof value === 'number') {
    numVal = value;
  } else if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
    numVal = parseFloat(value);
  }

  if (numVal !== null && numVal > 30000 && numVal < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + numVal * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().substring(0, 10);
    }
  }
  
  const strVal = String(value).trim();
  if (strVal.match(/^\d{4}-\d{2}-\d{2}/)) {
    return strVal.substring(0, 10);
  }
  
  // Handle DD/MM/YYYY or D/M/YYYY
  const parts = strVal.split(/[\/\-]/);
  if (parts.length >= 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2].split(/[ T]/)[0]; // strip time if present
    
    // If year is first (YYYY/MM/DD)
    if (day.length === 4) {
      year = parts[0];
      day = parts[2].split(/[ T]/)[0];
    } else if (year.length === 2) {
      year = "20" + year;
    }

    if (year.length === 4 && parseInt(month) >= 1 && parseInt(month) <= 12 && parseInt(day) >= 1 && parseInt(day) <= 31) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Attempt standard Date parsing
  const d = new Date(strVal);
  if (!isNaN(d.getTime())) {
    return d.toISOString().substring(0, 10);
  }
  
  return strVal;
};

/**
 * Normalizes a time series by filling in missing months or weeks with zero values.
 * This ensures "periodicals" (periodic data) are continuous and correctly visualized.
 */
export const normalizeContinuousSeries = (
  data: any[], 
  key: string, 
  type: 'month' | 'week' = 'month',
  fillKeys: string[] = ['count', 'resolved', 'critical']
) => {
  if (data.length === 0) return data;

  const sorted = [...data].sort((a, b) => a[key].localeCompare(b[key]));
  const first = sorted[0][key];
  const last = sorted[sorted.length - 1][key];

  if (first === "Sin Fecha" || last === "Sin Fecha") return data;

  const result = [];
  let current = first;

  const getNext = (val: string) => {
    if (type === 'month') {
      const [y, m] = val.split('-').map(Number);
      const d = new Date(y, m, 1);
      return d.toISOString().substring(0, 7);
    } else {
      // Simplistic week increment for WXX-YYYY
      const [y, w] = val.split('-W').map(Number);
      if (w >= 52) return `${y + 1}-W01`;
      return `${y}-W${String(w + 1).padStart(2, '0')}`;
    }
  };

  while (current <= last) {
    const existing = sorted.find(d => d[key] === current);
    if (existing) {
      result.push(existing);
    } else {
      const placeholder: any = { [key]: current };
      fillKeys.forEach(fk => placeholder[fk] = 0);
      result.push(placeholder);
    }
    current = getNext(current);
    if (result.length > 100) break; // Safety break
  }

  return result;
};
