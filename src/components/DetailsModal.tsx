import React, { useMemo, useState } from 'react';
import { X, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportToStyledExcel } from '../lib/utils';
import { Input, Button } from './ui';
import { formatExcelDate } from '../lib/excelParser';
import { CyberRowDetailModal } from './CyberRowDetailModal';
import { isCriticalPriority } from './CyberView';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  keysInfo?: any; // To do dynamic logic per view
  filename?: string;
  appliedFilters?: Record<string, string>;
}

export function DetailsModal({ isOpen, onClose, title, data, filename = "Detalles.xlsx", appliedFilters }: DetailsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const pageSize = 50;

  // Simple debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const displayData = useMemo(() => {
    if (!debouncedSearch) return data;
    return data.filter(row => 
      Object.values(row).some(val => String(val).toLowerCase().includes(debouncedSearch.toLowerCase()))
    );
  }, [data, debouncedSearch]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return displayData.slice(start, start + pageSize);
  }, [displayData, currentPage, pageSize]);

  const totalPages = Math.ceil(displayData.length / pageSize);

  const columns = useMemo(() => {
    if (displayData.length === 0) return [];
    return Array.from(new Set(Object.keys(displayData[0]).filter(k => !k.startsWith('__EMPTY'))));
  }, [displayData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 lg:p-10 font-sans">
      <div 
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-[1400px] h-full max-h-[90vh] flex flex-col flex-1 transform transition-all border border-slate-100"
        role="dialog"
      >
        <div className="flex items-center justify-between p-6 lg:p-8 border-b border-slate-100 bg-slate-50/50 rounded-t-[2rem]">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Mostrando {displayData.length} registros</p>
          </div>
          <div className="flex items-center gap-4">
             <Button
                onClick={() => exportToStyledExcel(displayData, filename, title, appliedFilters)}
                className="bg-brand-600 text-white rounded-xl shadow-lg border-brand-700 hover:bg-brand-700 font-bold px-4 h-11 transition-all flex items-center gap-2"
             >
                <Download size={18} /> Exportar Excel
             </Button>
            <button 
              onClick={onClose}
              className="rounded-full p-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-sm focus:outline-none"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
           <div className="relative max-w-md w-full">
             <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en todos los campos..."
                className="pl-9 pr-8 h-11 bg-slate-50 border-slate-200 rounded-xl w-full text-sm font-medium shadow-inner focus:bg-white transition-all"
             />
             {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={14} />
                </button>
             )}
           </div>
           
           {appliedFilters && Object.keys(appliedFilters).length > 0 && (
             <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full md:max-w-2xl no-scrollbar">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Filtros Activos:</span>
                {Object.entries(appliedFilters).map(([key, value]) => (
                  <div key={key} className="px-3 py-1 bg-brand-50 border border-brand-100 rounded-full text-[10px] font-bold text-brand-700 whitespace-nowrap">
                    <span className="opacity-50 mr-1">{key}:</span> {value}
                  </div>
                ))}
             </div>
           )}
        </div>

        <div className="flex-1 overflow-auto bg-slate-50 p-0 lg:p-6 relative custom-scrollbar">
           <div className="inline-block min-w-full align-middle bg-white lg:rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
             <div className="flex-1 overflow-auto relative custom-scrollbar">
               <table className="min-w-full divide-y divide-slate-200 text-left border-separate border-spacing-0">
                 <thead className="sticky top-0 z-20">
                   <tr className="bg-[#fbfcff] shadow-sm">
                     {columns.map(col => (
                       <th key={col} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap border-b border-slate-200 bg-[#fbfcff]">
                         {col}
                       </th>
                     ))}
                   </tr>
                 </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedData.map((row, i) => (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedRow(row)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      {columns.map(col => {
                         let val = row[col];
                         const colLower = col.toLowerCase();
                         if (colLower.includes('fecha') || colLower.includes('inicio') || colLower.includes('fin') || colLower.includes('creado') || colLower.includes('commitment')) {
                           val = formatExcelDate(val);
                         }
                         return (
                           <td key={col} className="px-4 py-3 text-sm font-medium text-slate-700 max-w-xs truncate group-hover:text-brand-600" title={val !== null && val !== undefined ? String(val) : ''}>
                            {val !== null && val !== undefined ? String(val) : '-'}
                           </td>
                         );
                      })}
                    </tr>
                  ))}
                 {paginatedData.length === 0 && (
                   <tr>
                     <td colSpan={columns.length || 1} className="px-4 py-10 text-center text-slate-500 font-medium">
                       Ningún resultado coincide con la búsqueda
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-[2rem]">
             <span className="text-sm font-medium text-slate-500">
               Página <strong className="text-slate-800">{currentPage}</strong> de <strong className="text-slate-800">{totalPages}</strong>
             </span>
             <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-xl font-bold">
                 <ChevronLeft size={16} className="mr-1" /> Anterior
               </Button>
               <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-xl font-bold">
                 Siguiente <ChevronRight size={16} className="ml-1" />
               </Button>
             </div>
          </div>
        )}
      </div>

      <CyberRowDetailModal
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        row={selectedRow}
        metrics={{ priorityKey: 'Criticidad', statusKey: 'SEMAFORO' }}
        isCriticalPriority={isCriticalPriority}
        displayDate={(d) => d || 'S/D'}
      />
    </div>
  </div>
);
}
