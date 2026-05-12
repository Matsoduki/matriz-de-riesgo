import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  Settings2, 
  ArrowUpDown, 
  Download,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button, Input, Card } from './ui';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
  type?: 'text' | 'number' | 'date' | 'badge' | 'status';
}

interface EnterpriseTableProps {
  data: any[];
  columns: Column[];
  title?: string;
  onExport?: (data: any[]) => void;
  isLoading?: boolean;
  onRowClick?: (row: any) => void;
  hideHeader?: boolean;
}

export const EnterpriseTable: React.FC<EnterpriseTableProps> = ({ 
  data, 
  columns, 
  title, 
  onExport,
  isLoading,
  onRowClick,
  hideHeader = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchTerm) {
      result = result.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, searchTerm, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderBadge = (val: any) => {
    const s = String(val).toLowerCase();
    let style = "bg-slate-100 text-slate-700 border-slate-200";
    
    if (s.includes('done') || s.includes('resuelto') || s.includes('cerrado') || s.includes('finalizado') || s.includes('success')) {
      style = "bg-emerald-50 text-emerald-700 border-emerald-100";
    } else if (s.includes('in progress') || s.includes('progreso') || s.includes('activo') || s.includes('warning')) {
      style = "bg-amber-50 text-amber-700 border-amber-100";
    } else if (s.includes('backlog') || s.includes('to do') || s.includes('pendiente')) {
      style = "bg-slate-100 text-slate-600 border-slate-200";
    } else if (s.includes('criti') || s.includes('alta') || s.includes('error') || s.includes('fail')) {
       style = "bg-rose-50 text-rose-700 border-rose-100";
    }

    return (
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${style}`}>
        {val}
      </span>
    );
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={`h-9 w-9 rounded-lg text-[11px] font-black tracking-tighter transition-all ${
            currentPage === i 
              ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="space-y-6">
      {!hideHeader && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Búsqueda avanzada de registros..." 
              className="pl-12 bg-slate-50 border-0 rounded-2xl h-12 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-slate-200 text-slate-600 h-11 flex items-center gap-2 font-bold px-5"
              onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
            >
              {density === 'comfortable' ? <List size={16} /> : <LayoutGrid size={16} />}
              <span className="text-[10px] uppercase tracking-widest">Densidad</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-slate-200 text-slate-600 h-11 flex items-center gap-2 font-bold px-5"
              onClick={() => onExport?.(filteredData)}
            >
              <Download size={16} />
              <span className="text-[10px] uppercase tracking-widest">Exportar</span>
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {columns.map((col) => (
                  <th 
                    key={col.key} 
                    className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 select-none cursor-pointer hover:bg-slate-50 group"
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      {col.sortable !== false && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          {sortConfig?.key === col.key ? (
                            sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} className="text-slate-300" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {paginatedData.map((row, idx) => (
                  <motion.tr 
                    key={row.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`hover:bg-slate-50/50 transition-all group ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td 
                        key={col.key} 
                        className={`${density === 'comfortable' ? 'px-8 py-5' : 'px-8 py-3'} text-sm font-medium text-slate-700 transition-all`}
                      >
                        {col.render ? col.render(row[col.key], row) : (
                          col.type === 'badge' ? renderBadge(row[col.key]) : 
                          col.type === 'number' ? <span className="font-mono text-slate-500 font-bold">{row[col.key]}</span> :
                          row[col.key] || <span className="text-slate-300">-</span>
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {paginatedData.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center gap-4">
               <div className="p-6 bg-slate-50 rounded-full text-slate-300">
                  <Search size={48} />
               </div>
               <div className="space-y-1">
                 <p className="text-xl font-bold text-slate-900">No se encontraron registros</p>
                 <p className="text-sm text-slate-400">Prueba ajustando los filtros o el término de búsqueda.</p>
               </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-slate-50 bg-[#fbfcff] flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            <span className="uppercase tracking-widest">Mostrando</span>
            <select 
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500 text-slate-700"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="uppercase tracking-widest text-slate-300">de {filteredData.length} registros</span>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="rounded-xl h-9 w-9 p-0 flex items-center justify-center border-slate-200 text-slate-400 disabled:opacity-30"
            >
              <ChevronDown className="rotate-90" size={16} />
            </Button>
            
            <div className="flex items-center gap-1 mx-2">
              {renderPaginationButtons()}
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="rounded-xl h-9 w-9 p-0 flex items-center justify-center border-slate-200 text-slate-400 disabled:opacity-30"
            >
              <ChevronDown className="-rotate-90" size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
