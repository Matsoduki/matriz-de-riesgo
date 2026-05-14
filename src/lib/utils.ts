import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to export an element to PDF or Image
export async function exportToVisual(elementId: string, filename: string, format: 'pdf' | 'png' = 'png') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const finalName = `${filename.replace(/\.(png|pdf)$/, '')} - ${timestamp}`;

  try {
    console.log(`Generating ${format.toUpperCase()}...`);

    const dataUrl = await toPng(element, {
      quality: 1,
      cacheBust: true,
      backgroundColor: '#f8fafc',
      style: {
        padding: '24px',
        borderRadius: '0px'
      },
      // Filter out elements that might break the rendering
      filter: (node) => {
        const exclusionClasses = ['export-exclude'];
        return !exclusionClasses.some(cls => node instanceof HTMLElement && node.classList.contains(cls));
      }
    });
    
    if (format === 'png') {
      saveAs(dataUrl, `${finalName}.png`);
    } else {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4',
        hotfixes: ['px_scaling']
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const pdfBlob = pdf.output('blob');
      saveAs(pdfBlob, `${finalName}.pdf`);
    }
    
    console.log(`${format.toUpperCase()} exported successfully`);
  } catch (error) {
    console.error(`Error exporting to ${format}:`, error);
    // Fallback: try simple window.print if it's PDF
    if (format === 'pdf') {
       alert('Hubo un error generando el PDF complejo. Intentaremos abrir el diálogo de impresión del sistema.');
       window.print();
    }
  }
}

// Keep exportToPdf for compatibility but point it to the new robust version
export async function exportToPdf(elementId: string, filename: string) {
  return exportToVisual(elementId, filename, 'pdf');
}

// Utility to export multiple sheets to a structured PDF document
export async function exportStructuredPdf(
  sheets: { name: string; data: any[]; title?: string; appliedFilters?: Record<string, string> }[],
  filename: string
) {
  if (!sheets || !sheets.length) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  sheets.forEach((sheet, index) => {
    if (index > 0) doc.addPage();

    const { data, title, appliedFilters } = sheet;
    if (!data || !data.length) return;

    let currentY = 20;

    // Title
    if (title) {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text(title, 14, currentY);
      currentY += 10;
    }

    // Filters
    if (appliedFilters && Object.keys(appliedFilters).length > 0) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text('Filtros Aplicados:', 14, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      Object.entries(appliedFilters).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 18, currentY);
        currentY += 5;
      });
      currentY += 5;
    }

    // Table
    const headers = Object.keys(data[0]).filter(k => !k.startsWith('__EMPTY'));
    const body = data.map(row => headers.map(header => String(row[header] ?? '')));

    autoTable(doc, {
      startY: currentY,
      head: [headers.map(h => h.toUpperCase())],
      body: body,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { top: 20, left: 14, right: 14, bottom: 20 },
      didDrawPage: (data) => {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate 400
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.text(`Página ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
      }
    });
  });

  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const finalFilename = `${filename.replace(/\.pdf$/, '')} - ${timestamp}.pdf`;
  doc.save(finalFilename);
}

// Utility to export multiple JSON arrays to styled Excel (.xlsx) via ExcelJS
export async function exportMultiSheetExcel(
  sheets: { name: string; data: any[]; title?: string; appliedFilters?: Record<string, string> }[],
  filename: string
) {
  if (!sheets || !sheets.length) return;

  const workbook = new ExcelJS.Workbook();

  for (const sheetConfig of sheets) {
    const { name, data, title, appliedFilters } = sheetConfig;
    if (!data || !data.length) continue;

    const worksheet = workbook.addWorksheet(name);
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
      const width = Math.max(14, Math.min(maxLength + 4, 60));
      return { header: header.toUpperCase(), key: header, width: width };
    });

    worksheet.columns = columns;
    let startRow = 1;

    if (title) {
      worksheet.spliceRows(1, 0, []);
      const titleRow = worksheet.getRow(1);
      titleRow.getCell(1).value = title;
      titleRow.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF0F172A' } };
      titleRow.alignment = { vertical: 'middle', horizontal: 'left' };
      worksheet.mergeCells(1, 1, 1, Math.max(1, headers.length > 2 ? Math.min(6, headers.length) : headers.length));
      titleRow.height = 40;
      startRow = 2;
    }

    if (appliedFilters && Object.keys(appliedFilters).length > 0) {
      const filterKeys = Object.keys(appliedFilters);
      worksheet.spliceRows(startRow, 0, []);
      const subtitleRow = worksheet.getRow(startRow);
      subtitleRow.getCell(1).value = 'Filtros Aplicados:';
      subtitleRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF475569' } };
      startRow++;

      filterKeys.forEach((key) => {
        worksheet.spliceRows(startRow, 0, []);
        const filterRow = worksheet.getRow(startRow);
        filterRow.getCell(1).value = `${key}:`;
        filterRow.getCell(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF64748B' } };
        filterRow.getCell(2).value = appliedFilters[key];
        filterRow.getCell(2).font = { name: 'Arial', size: 11, color: { argb: 'FF0F172A' } };
        startRow++;
      });
    }

    worksheet.spliceRows(startRow, 0, []);
    worksheet.getRow(startRow).height = 10;
    startRow++;

    const headerRow = worksheet.getRow(startRow);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } }
      };
    });

    data.forEach((rowData, index) => {
      const row = worksheet.addRow(headers.map(header => {
        const val = rowData[header];
        return val !== null && val !== undefined ? String(val) : '';
      }));
      const isEven = index % 2 === 0;
      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' } };
        const width = columns[colNumber - 1].width || 15;
        const isLongText = typeof cell.value === 'string' && cell.value.length > width * 1.5;
        cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
        cell.alignment = { vertical: isLongText ? 'top' : 'middle', horizontal: 'left', wrapText: isLongText };
        cell.border = {
          top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          left: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
          right: { style: 'hair', color: { argb: 'FFE2E8F0' } }
        };
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const finalFilename = `${filename.replace(/\.xls(x)?$/, '')} - ${timestamp}.xlsx`;
  saveAs(blob, finalFilename);
}

// Utility to export a JSON array to styled Excel (.xlsx) via ExcelJS
export async function exportToStyledExcel(data: any[], filename: string, title?: string, appliedFilters?: Record<string, string>) {
  return exportMultiSheetExcel([{ name: 'Reporte', data, title, appliedFilters }], filename);
}
