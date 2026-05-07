import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Modal, Button } from './ui';
import { findColumnKey, formatExcelDate } from '../lib/excelParser';
import { exportToStyledExcel } from '../lib/utils';
import { Search, Activity, Database, Radio, CheckCircle, Clock, Filter, AlertCircle, Layout, Download } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface Props {
  data: any[];
  isOverview?: boolean;
}

export default function SensorView({ data, isOverview }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const cleanData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sample = data[0] || {};
    const idKey = findColumnKey(sample, ['numero', 'id', 'ticket']);
    
    return data.filter(row => {
      const idVal = String(row[idKey || 'Numero'] || '').trim();
      if (!idVal || idVal.toLowerCase().includes('total') || idVal.toLowerCase() === 'numero') return false;
      
      const rowStr = JSON.stringify(row).toLowerCase();
      if (rowStr.includes('parámetros') || rowStr.includes('jornada') || rowStr.includes('indicadores')) return false;
      
      return true;
    });
  }, [data]);

  const metrics = useMemo(() => {
    const initialState = {
      total: 0,
      closed: 0,
      open: 0,
      slaCompliance: 0,
      avgResolution: "0",
      analystLoad: [],
      statusDistribution: [],
      statusKey: 'Status',
      slaKey: 'SLA Status',
      idKey: 'Numero'
    };

    if (cleanData.length === 0) return initialState;

    const sample = cleanData[0];
    const idKey = findColumnKey(sample, ['numero', 'id', 'ticket']);
    const statusKey = findColumnKey(sample, ['status', 'estado']);
    const slaKey = findColumnKey(sample, ['sla', 'cumplimiento']);
    const resolutionKey = findColumnKey(sample, ['días resolución', 'dias resolucion']);

    const filtered = cleanData.filter(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const statusVal = String(row[statusKey || 'Status'] || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'closed' && (statusVal.includes('clos') || statusVal.includes('cerrado'))) ||
        (statusFilter === 'open' && !(statusVal.includes('clos') || statusVal.includes('cerrado')));
      return matchesSearch && matchesStatus;
    });

    const closed = filtered.filter(t => {
      const s = String(t[statusKey || 'Status'] || '').toLowerCase();
      return s.includes('clos') || s.includes('cerrado') || s.includes('resuelto');
    }).length;

    const withinSla = filtered.filter(t => {
      const s = String(t[slaKey || 'SLA Status'] || '').toLowerCase();
      return s.includes('dentro') || s.includes('cumple');
    }).length;

    const avgResolution = filtered.reduce((acc, t) => {
      const val = parseFloat(String(t[resolutionKey || 'Días Resolución'] || '0').replace(',', '.'));
      return acc + (isNaN(val) ? 0 : val);
    }, 0) / (filtered.length || 1);

    const analystMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    filtered.forEach(t => {
      const a = String(t['Analista'] || t['analista'] || 'Sin Asignar');
      analystMap[a] = (analystMap[a] || 0) + 1;
      
      const s = String(t[statusKey || 'Status'] || 'Unknown');
      statusMap[s] = (statusMap[s] || 0) + 1;
    });

    const analystLoad = Object.entries(analystMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const statusDistribution = Object.entries(statusMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      total: filtered.length,
      closed,
      open: filtered.length - closed,
      slaCompliance: filtered.length > 0 ? (withinSla / filtered.length) * 100 : 0,
      avgResolution: avgResolution.toFixed(2),
      analystLoad,
      statusDistribution,
      statusKey: statusKey || 'Status',
      slaKey: slaKey || 'SLA Status',
      idKey: idKey || 'Numero'
    };
  }, [cleanData, searchTerm, statusFilter]);

  const allFilteredData = useMemo(() => {
    return cleanData.filter(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const statusVal = String(row[metrics?.statusKey || 'Status'] || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'closed' && (statusVal.includes('clos') || statusVal.includes('cerrado'))) ||
        (statusFilter === 'open' && !(statusVal.includes('clos') || statusVal.includes('cerrado')));

      return matchesSearch && matchesStatus;
    });
  }, [cleanData, searchTerm, statusFilter, metrics]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allFilteredData.slice(start, start + pageSize);
  }, [allFilteredData, currentPage]);

  const totalPages = Math.ceil(allFilteredData.length / pageSize);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const getStatusBadge = (status: string) => {
    const s = String(status).toLowerCase();
    if (s.includes('open') || s.includes('abierto')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (s.includes('clos') || s.includes('cerrado') || s.includes('resuelto')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s.includes('pend') || s.includes('espera')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getSLABadge = (sla: string) => {
    const s = String(sla).toLowerCase();
    if (s.includes('fuera')) return 'bg-rose-500 text-white border-0 px-2 py-0.5 rounded text-[10px] font-black uppercase';
    if (s.includes('dentro') || s.includes('cumple')) return 'bg-emerald-500 text-white border-0 px-2 py-0.5 rounded text-[10px] font-black uppercase';
    return 'bg-slate-200 text-slate-600 border-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase';
  };

  if (cleanData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
        <Activity size={48} className="mb-4 opacity-20" />
        <p className="text-lg font-medium">No se detectaron tickets en la hoja "sensr"</p>
        <p className="text-sm">Asegúrate de que el Excel contenga una columna "Numero" y "Status".</p>
      </div>
    );
  }

  if (isOverview) {
    return (
      <Card className="border-0 shadow-2xl shadow-slate-200/40 bg-white overflow-hidden group">
        <CardContent className="p-10 relative">
          <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000">
             <Activity size={200} />
          </div>
          
          <div className="flex justify-between items-start mb-12">
            <div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Inteligencia Operativa</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Soporte Técnico & Performance del Sistema</p>
            </div>
            <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Flow</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
            <div className="relative">
              <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumplimiento de SLA Global</p>
                <span className={`text-3xl font-black ${metrics && metrics.slaCompliance < 85 ? 'text-rose-500' : 'text-slate-800'} tracking-tighter`}>
                  {metrics?.slaCompliance.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${metrics && metrics.slaCompliance < 85 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                  style={{ width: `${metrics?.slaCompliance || 0}%` }}
                />
              </div>
            </div>
            
            <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100">
               <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                  <Clock size={28} strokeWidth={2.5} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MTTR (Resolución Media)</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{metrics?.avgResolution}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Días / Ticket</span>
                  </div>
               </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Layout size={14} className="text-indigo-500" />
                 Distribución de Carga Crítica
               </h4>
               <span className="text-[10px] font-bold text-slate-400">{metrics?.total} Casos Totales</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
              {metrics?.analystLoad.slice(0, 6).map((analyst, i) => (
                <div key={i} className="group/item cursor-default">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-slate-600 group-hover/item:text-indigo-600 transition-colors uppercase tracking-tight">{analyst.name}</span>
                    <span className="text-[11px] font-black text-slate-900">{analyst.value} <span className="text-[8px] text-slate-400">TKT</span></span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-indigo-500 transition-all duration-700 group-hover/item:bg-indigo-400" 
                      style={{ width: `${(analyst.value / (metrics?.total || 1)) * 100}%` }}
                    />
                    <div className="flex-1 bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIS row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Total Tickets</p>
                <h3 className="text-3xl font-black">{metrics?.total}</h3>
              </div>
              <Activity className="text-indigo-300/50" size={32} />
            </div>
            <div className="mt-4 flex gap-3 text-[10px] font-bold uppercase tracking-tighter">
              <span className="bg-white/20 px-2 py-0.5 rounded">{metrics?.closed} Cerrados</span>
              <span className="bg-white/20 px-2 py-0.5 rounded">{metrics?.open} Abiertos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Cumplimiento SLA</p>
                <h3 className={`text-3xl font-black ${metrics && metrics.slaCompliance < 80 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {metrics?.slaCompliance.toFixed(1)}%
                </h3>
              </div>
              <CheckCircle className="text-slate-200" size={32} />
            </div>
            <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${metrics && metrics.slaCompliance < 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                style={{ width: `${metrics?.slaCompliance}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Prom. Resolución</p>
                <h3 className="text-3xl font-black text-slate-800">{metrics?.avgResolution} <span className="text-sm font-medium text-slate-400">días</span></h3>
              </div>
              <Clock className="text-slate-200" size={32} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Distribución</p>
                <div className="h-10 w-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics?.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={15}
                        outerRadius={20}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {metrics?.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <Database className="text-slate-200" size={32} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Filter size={18} className="text-indigo-500" />
              GRILLA DE TICKETS - SENSORES
            </CardTitle>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                  placeholder="Buscar ticket, analista..." 
                  className="pl-10 h-9 w-64 bg-white border-slate-200 text-sm focus:ring-0 focus:border-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 text-xs border-slate-200 bg-white"
              >
                <option value="all">Todos los estados</option>
                <option value="open">Abiertos</option>
                <option value="closed">Cerrados / Resueltos</option>
              </Select>
              <Button onClick={() => {
                   exportToStyledExcel(allFilteredData, `Reporte_Sensores_Filtrado.xlsx`, 'Reporte de Sensores');
              }} className="h-9 px-4 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm text-xs font-bold rounded-lg flex items-center gap-2">
                   <Download size={14} /> Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">Número ID</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">Estado Op</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">Responsable</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">Entidad / Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100">SLA Performance</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] border-b border-slate-100 text-right">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.map((row, i) => {
                const statusVal = String(row[metrics?.statusKey || 'Status'] || '');
                const slaVal = String(row[metrics?.slaKey || 'SLA Status'] || '');
                const resolutionVal = row['Días Resolución'] || row['días resolución'] || '0';
                
                return (
                  <tr 
                    key={i} 
                    className="group hover:bg-brand-50/30 transition-all cursor-pointer bg-white"
                    onClick={() => setSelectedRow(row)}
                  >
                    <td className="px-6 py-5">
                      <span className="text-[11px] font-mono font-black text-brand-600 group-hover:underline">
                        {row[metrics?.idKey || 'Numero']}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(statusVal)}`}>
                        <div className="w-1 h-1 rounded-full mr-2 opacity-70" />
                        {statusVal}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[11px] font-bold text-slate-700 tracking-tight">{row['Analista'] || row['analista'] || 'No Asignado'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">{row['Empresa'] || row['empresa'] || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`${getSLABadge(slaVal)} text-[9px] px-3 font-black`}>{slaVal}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <span className="text-[11px] font-mono font-black text-slate-400 group-hover:text-slate-900 transition-colors">
                        {resolutionVal} <span className="text-[8px] font-bold uppercase opacity-50 ml-0.5">días</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 max-w-xs mx-auto">
                       <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                          <Activity className="h-8 w-8" />
                       </div>
                       <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">Sin Actividad Relevante</p>
                       <p className="text-xs text-slate-500 leading-relaxed">No se encontraron tickets activos que coincidan con los parámetros de búsqueda configurados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">
                Mostrando {paginatedData.length} de {allFilteredData.length} registros
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">Página {currentPage} de {totalPages || 1}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-black border transition-all ${
                      currentPage === pageNum 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-slate-400 px-1">...</span>}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30"
              >
                Siguiente
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Detail Modal */}
      {selectedRow && (
        <Modal 
          isOpen={!!selectedRow} 
          onClose={() => setSelectedRow(null)}
          title={`Análisis Ejecutivo: Ticket ${selectedRow[metrics?.idKey || 'Numero']}`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-2">
            <div className="lg:col-span-2 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900 text-white rounded-3xl group overflow-hidden relative">
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Activity size={60} />
                     </div>
                     <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Estado de Operación</p>
                     <p className="text-2xl font-black">{String(selectedRow[metrics?.statusKey || 'Status']).toUpperCase()}</p>
                  </div>
                  <div className={`p-4 rounded-3xl border-2 ${String(selectedRow[metrics?.slaKey || 'SLA Status']).toLowerCase().includes('fuera') ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                     <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-70">Desempeño SLA</p>
                     <p className="text-2xl font-black">{selectedRow[metrics?.slaKey || 'SLA Status']}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Telemetría de Negocio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
                    {Object.entries(selectedRow)
                      .filter(([key]) => !['numero', 'status', 'sla', 'id', 'fecha'].some(exc => key.toLowerCase().includes(exc)))
                      .map(([key, value]) => (
                        <div key={key} className="flex flex-col p-4 bg-white border border-slate-100 rounded-2xl group hover:border-indigo-100 transition-colors">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{key}</span>
                          <span className="text-sm font-black text-slate-800 break-words line-clamp-2">{String(value)}</span>
                        </div>
                      ))}
                  </div>
               </div>
            </div>

            <div className="space-y-6">
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Impacto en Decisión</h4>
                  <div className="space-y-6">
                     <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Responsabilidad Directa</p>
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                              {String(selectedRow['Analista'] || 'NA').substring(0,2).toUpperCase()}
                           </div>
                           <p className="text-sm font-black text-slate-800">{selectedRow['Analista'] || 'Sin Asignar'}</p>
                        </div>
                     </div>
                     <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Ciclo de Resolución</p>
                        <p className="text-2xl font-black text-slate-800">{selectedRow['Días Resolución'] || '0'} <span className="text-xs text-slate-400 uppercase font-bold">Días Transcurridos</span></p>
                     </div>
                     <div className="pt-4">
                        <button className="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200">
                           Aprobar Escalamiento
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
