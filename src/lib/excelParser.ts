import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface DashboardData {
  jira2025: any[];
  jira2026: any[];
  sensor: any[];
  mandoYControl: any[];
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

        const jira2025 = getSheet('jira2025');
        const jira2026 = getSheet('jira2026');
        let sensor = getSheet('sensr');
        if (sensor.length === 0) sensor = getSheet('sensor');

        let mandoYControl = getSheet('mando');
        if (mandoYControl.length === 0) mandoYControl = getSheet('ciberseguridad');

        resolve({
          jira2025,
          jira2026,
          sensor,
          mandoYControl
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

// Generic helper to find a column name dynamically
export const findColumnKey = (row: any, keywords: string[]): string | undefined => {
  if (!row) return undefined;
  const keys = Object.keys(row);
  
  const normalize = (str: string) => str.toLowerCase().replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Exact match priority (based on keyword order)
  for (const kw of keywords) {
    const normalKw = normalize(kw);
    for (const key of keys) {
      if (normalize(key) === normalKw) return key;
    }
  }

  // 2. Partial match priority (based on keyword order)
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
      return date.toISOString().substring(0, 10);
    }
  }
  
  const strVal = String(value).trim();
  if (strVal.match(/^\d{4}-\d{2}-\d{2}/)) {
    return strVal.substring(0, 10);
  }
  return strVal;
};
