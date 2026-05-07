import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to export a JSON array to styled Excel (.xlsx) via ExcelJS
export async function exportToStyledExcel(data: any[], filename: string, title?: string) {
  if (!data || !data.length) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Reporte Riesgo');

  const headers = Object.keys(data[0]).filter(k => !k.startsWith('__EMPTY'));

  // Calculate dynamic column widths
  const columns = headers.map(header => {
    let maxLength = header.length;
    data.forEach(row => {
      const cellValue = row[header];
      const length = cellValue !== null && cellValue !== undefined ? String(cellValue).length : 0;
      if (length > maxLength) {
        maxLength = length;
      }
    });

    // Provide some padding, cap at max 60, min 14 width
    const width = Math.max(14, Math.min(maxLength + 4, 60));

    return {
      header: header.toUpperCase(),
      key: header,
      width: width,
    };
  });

  worksheet.columns = columns;

  let startRow = 1;

  if (title) {
    // Add title row
    worksheet.spliceRows(1, 0, []);
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = title;
    titleRow.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0F172A' } };
    titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.mergeCells(1, 1, 1, headers.length > 2 ? Math.min(6, headers.length) : headers.length);
    titleRow.height = 40;
    
    // Add a spacer row
    worksheet.spliceRows(2, 0, []);
    worksheet.getRow(2).height = 10;
    startRow = 3;
  }

  // Style Header Row
  const headerRow = worksheet.getRow(startRow);
  headerRow.height = 25;
  headerRow.eachCell((cell, colNumber) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }, // Slate 900
    };
    cell.font = {
      name: 'Arial',
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 11,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF334155' } },
      left: { style: 'thin', color: { argb: 'FF334155' } },
      bottom: { style: 'thin', color: { argb: 'FF334155' } },
      right: { style: 'thin', color: { argb: 'FF334155' } }
    };
  });

  // Add Data with Styles
  data.forEach((rowData, index) => {
    const row = worksheet.addRow(headers.map(header => {
      const val = rowData[header];
      // Format purely as string if it isn't null/undefined, to prevent auto-conversion bugs, unless it's obviously a number
      return val !== null && val !== undefined ? String(val) : '';
    }));
    
    const isEven = index % 2 === 0;
    
    row.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' } // Very slight zebra stripe
      };
      
      const width = columns[colNumber - 1].width || 15;
      const isLongText = typeof cell.value === 'string' && cell.value.length > width * 1.5;
       
      cell.font = {
        name: 'Inter', // Try Inter, fallback Arial
        size: 10,
        color: { argb: 'FF334155' }
      };
      
      cell.alignment = { 
         vertical: isLongText ? 'top' : 'middle', 
         horizontal: 'left',
         wrapText: isLongText
      };
      
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        left: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
        right: { style: 'hair', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Export buffer and save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const finalFilename = filename.replace(/\.xls(x)?$/, '') + '.xlsx';
  saveAs(blob, finalFilename);
}
