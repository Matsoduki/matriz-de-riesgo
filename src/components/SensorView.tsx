import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Modal, Button } from './ui';
import { findColumnKey, formatExcelDate } from '../lib/excelParser';
import { exportToStyledExcel } from '../lib/utils';
import { Search, Activity, Database, Radio, CheckCircle, Clock, Filter, AlertCircle, Layout, Download, List, FileSearch, ShieldAlert, Zap, ShieldCheck, Cpu, Network, Radar } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#0ea5e9', '#38bdf8', '#7dd3fc'];
import { DetailsModal } from './DetailsModal';
import { EnterpriseTable } from './EnterpriseTable';
import {
  BarChart,
  Bar,
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
  const [showDetails, setShowDetails] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const cleanData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sample = data[0] || {};
    const idKey = findColumnKey(sample, ['numero', 'id', 'ticket']);
    
    return data.filter(row => {
      const idVal = String(row[idKey || 'Numero'] || '').trim();
      // Only filter out rows where the ID is explicitly "Total" or empty, but be more careful
      if (!idVal || idVal.toLowerCase() === 'total' || idVal.toLowerCase() === 'numero') return false;
      
      // Only filter out rows if they look like header/footer noise, but don't check the entire row string for keywords that might be valid data
      const isHeaderNoise = ['parámetros', 'jornada', 'indicadores'].some(kw => 
        idVal.toLowerCase().includes(kw)
      );
      if (isHeaderNoise) return false;
      
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
        (statusFilter === 'closed' && (statusVal.includes('clos') || statusVal.includes('cerrado') || statusVal.includes('resuelto') || statusVal.includes('done') || statusVal.includes('completado'))) ||
        (statusFilter === 'open' && !(statusVal.includes('clos') || statusVal.includes('cerrado') || statusVal.includes('resuelto') || statusVal.includes('done') || statusVal.includes('completado')));
      return matchesSearch && matchesStatus;
    });

    const closed = filtered.filter(t => {
      const s = String(t[statusKey || 'Status'] || '').toLowerCase();
      return s.includes('clos') || s.includes('cerrado') || s.includes('resuelto') || s.includes('done') || s.includes('completado');
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

    // Grouping by Analyst for a better business view
    const topAnalysts = Object.entries(analystMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return {
      total: filtered.length,
      closed,
      open: filtered.length - closed,
      slaCompliance: filtered.length > 0 ? (withinSla / filtered.length) * 100 : 0,
      avgResolution: avgResolution.toFixed(2),
      analystLoad,
      statusDistribution,
      topAnalysts,
      statusKey: statusKey || 'Status',
      slaKey: slaKey || 'SLA Status',
      idKey: idKey || 'Numero'
    };
  }, [cleanData, searchTerm, statusFilter]);

  const globalCounts = useMemo(() => {
    let closedCount = 0;
    let openCount = 0;
    let totalCount = 0;

    cleanData.forEach(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchesSearch) {
        totalCount++;
        const statusVal = String(row[metrics?.statusKey || 'Status'] || '').toLowerCase();
        const isClosed = statusVal.includes('clos') || statusVal.includes('cerrado') || statusVal.includes('resuelto') || statusVal.includes('done') || statusVal.includes('completado');
        if (isClosed) closedCount++;
        else openCount++;
      }
    });
    return { all: totalCount, closed: closedCount, open: openCount };
  }, [cleanData, searchTerm, metrics]);

  const allFilteredData = useMemo(() => {
    return cleanData.filter(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const statusVal = String(row[metrics?.statusKey || 'Status'] || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'closed' && (statusVal.includes('clos') || statusVal.includes('cerrado') || statusVal.includes('resuelto') || statusVal.includes('done') || statusVal.includes('completado'))) ||
        (statusFilter === 'open' && !(statusVal.includes('clos') || statusVal.includes('cerrado') || statusVal.includes('resuelto') || statusVal.includes('done') || statusVal.includes('completado')));

      return matchesSearch && matchesStatus;
    });
  }, [cleanData, searchTerm, statusFilter, metrics]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allFilteredData.slice(start, start + pageSize);
  }, [allFilteredData, currentPage]);

  const displayColumnsData = useMemo(() => {
    if (cleanData.length === 0) return [];
    
    const sample = cleanData[0];
    const keys = Object.keys(sample).filter(k => {
      if (k.startsWith('__EMPTY')) return false;
      const lower = k.toLowerCase().trim();
      return lower !== 'año' && lower !== 'mes' && lower !== 'semana' && lower !== 'día';
    });

    return keys.map(key => ({
      key,
      label: key,
      sortable: true,
      type: (key.toLowerCase().includes('status') || key.toLowerCase().includes('estado')) ? 'badge' as const : 'text' as const,
      statusConfig: (key.toLowerCase().includes('status') || key.toLowerCase().includes('estado')) ? {
        'closed': { label: 'Cerrado', color: '#059669', bg: '#ecfdf5', text: '#065f46' },
        'open': { label: 'Abierto', color: '#2563eb', bg: '#eff6ff', text: '#1e40af' },
        'resuelto': { label: 'Resuelto', color: '#059669', bg: '#ecfdf5', text: '#065f46' },
        'abierto': { label: 'Abierto', color: '#2563eb', bg: '#eff6ff', text: '#1e40af' },
        'pendiente': { label: 'Pendiente', color: '#d97706', bg: '#fffbeb', text: '#92400e' },
      } : undefined,
      render: (val: any) => {
        let displayVal = val;
        if (key.toLowerCase().includes('fecha')) displayVal = formatExcelDate(val);
        return <span className={key.toLowerCase().includes('numero') || key.toLowerCase().includes('id') ? 'font-mono' : ''}>{String(displayVal || '')}</span>;
      }
    }));
  }, [cleanData]);

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
               <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Análisis Operativo</h3>
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

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all';

  return (
    <div className="space-y-10">
      {/* Historical Context Header & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
         <Card className="lg:col-span-3 border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white group">
            <CardHeader className="p-8 border-b border-slate-50 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                   <div className="p-4 bg-slate-50 text-slate-900 rounded-3xl group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                      <Activity size={24} />
                   </div>
                   <div>
                      <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Distribución de Carga por Analista</CardTitle>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Resumen de asignaciones y tickets gestionados por el equipo técnico</p>
                   </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 h-[350px] bg-white">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={metrics.topAnalysts} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill="#0f172a" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    />
                 </BarChart>
               </ResponsiveContainer>
            </CardContent>
         </Card>

         <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">Resumen de Gestión</CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-2 space-y-8">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 text-center">Estado de Soporte</p>
                  <p className="text-xs text-slate-600 leading-relaxed font-semibold text-center">
                    Rendimiento global dentro de los parámetros de SLA corporativo.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros Totales</span>
                     <span className="text-2xl font-black text-slate-900">{metrics?.total}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tasa Resolución</span>
                     <span className="text-2xl font-black text-emerald-600">{metrics.total > 0 ? ((metrics.closed / metrics.total) * 100).toFixed(1) : 0}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
         </Card>
      </div>

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

      {/* Main Grid Section */}
      <div className="space-y-6 pt-4 border-t border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6">
           <div className="flex items-center gap-5">
              <div className="h-14 w-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                 <Radio size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Explorador de Sensores</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Auditoría de tickets y telemetría</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input 
                  placeholder="Buscar ticket..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 bg-white border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                />
             </div>
             <Button 
               onClick={() => setShowDetails(true)} 
               variant="premium"
               size="sm"
               className="rounded-2xl h-12 px-8"
             >
                <FileSearch size={14} className="mr-2" /> Reporte Auditoría
             </Button>
           </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-3 p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 min-w-[200px]">
              <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><Filter size={14} /></div>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border-0 bg-transparent text-[10px] font-black uppercase tracking-widest focus:ring-0">
                 <option value="all">Todos los Estados</option>
                 <option value="closed">Cerrados / Resueltos</option>
                 <option value="open">Pendientes / Abiertos</option>
              </Select>
           </div>

           {hasActiveFilters && (
             <Button 
               variant="ghost" 
               size="sm" 
               className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600"
               onClick={resetFilters}
             >
                Limpiar
             </Button>
           )}
        </div>

        <EnterpriseTable 
          data={allFilteredData}
          columns={displayColumnsData}
          onRowClick={(row) => setSelectedRow(row)}
          hideHeader={true}
          onExport={(data) => {
            const appliedFilters = {
              'Estado': statusFilter === 'all' ? 'Todos los Estados' : (statusFilter === 'open' ? 'Abiertos' : 'Cerrados / Resueltos')
            };
            exportToStyledExcel(data, `Reporte_Sensores.xlsx`, 'Reporte de Sensores', appliedFilters);
          }}
        />

      {/* Advanced Sensor Insight - Centered Floating Engine */}
      <AnimatePresence>
        {selectedRow && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRow(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] transition-all cursor-cross"
            />
            
            <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8 z-[101] pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-slate-100 pointer-events-auto"
              >
                <div className="relative h-64 bg-slate-900 flex-shrink-0 overflow-hidden">
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.25),transparent)]" />
                    <motion.div 
                      animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3], x: [0, 20, 0] }}
                      transition={{ duration: 15, repeat: Infinity }}
                      className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2], x: [0, -30, 0] }}
                      transition={{ duration: 12, repeat: Infinity, delay: 1 }}
                      className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-600/20 rounded-full blur-[80px]" 
                    />
                  </div>
                  
                  <div className="absolute top-10 left-10 right-10 flex justify-between items-start">
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                           <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                              <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">
                                 {metrics.idKey ? String(selectedRow[metrics.idKey] || 'SENSOR-ID') : 'TELEMETRÍA TÉCNICA'}
                              </span>
                           </div>
                           <div className="px-3 py-1 bg-indigo-500/20 backdrop-blur-md rounded-full border border-indigo-500/30">
                              <span className="text-[9px] font-black text-indigo-200 uppercase tracking-[0.3em]">
                                Registro Verificado
                              </span>
                           </div>
                        </div>
                     </div>
                     <button 
                       onClick={() => setSelectedRow(null)}
                       className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-95 group"
                     >
                       <Zap size={20} className="group-hover:rotate-12 transition-transform" />
                     </button>
                  </div>

                  <div className="absolute bottom-10 left-10 right-10">
                    <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-tight line-clamp-2 uppercase">
                      {findColumnKey(selectedRow, ['asunto', 'resumen', 'summary', 'descripción']) ? 
                        String(selectedRow[findColumnKey(selectedRow, ['asunto', 'resumen', 'summary', 'descripción'])!] || 'Evento de Sensor') : 
                        'Sin Descripción Operativa'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-6 mt-6">
                       <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)] ${
                            String(selectedRow[metrics.statusKey]).toLowerCase().match(/cerrado|done|resuelto/) ? 'bg-emerald-400' : 'bg-amber-400'
                          }`} />
                          <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                             {String(selectedRow[metrics.statusKey]) || 'ESTADO N/A'}
                          </span>
                       </div>
                       <div className="h-4 w-px bg-white/10 hidden sm:block" />
                       <div className="flex items-center gap-2">
                          <ShieldAlert size={14} className="text-brand-400" />
                          <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                             {selectedRow[metrics.slaKey] || 'SLA Estándar'}
                          </span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-12 bg-[#fafaff] scrollbar-hide">
                  <section>
                     <div className="flex items-center gap-4 mb-8">
                        <div className="h-1 w-10 bg-indigo-500 rounded-full" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Métricas Operativas</h4>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { label: 'MTTR Acumulado', val: `${selectedRow['Días Resolución'] || '0'} Días`, desc: 'Ciclo de vida', color: 'emerald', icon: Clock },
                          { label: 'Asignación', val: String(selectedRow['Analista'] || 'Sin Asignar').toUpperCase(), desc: 'Responsable', color: 'indigo', icon: Target }
                        ].map((stat, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-xl transition-all"
                          >
                             <div className={`p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform`}>
                                <stat.icon size={20} />
                             </div>
                             <div>
                                <span className="text-[18px] font-black text-slate-800 leading-none block mb-1">{stat.val}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
                             </div>
                          </motion.div>
                        ))}
                     </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-2 rounded-xl bg-slate-900 text-white">
                          <Cpu size={16} />
                       </div>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Capa Técnica & Telemetría</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {Object.entries(selectedRow)
                         .filter(([key, value]) => 
                            !['numero', 'status', 'sla', 'id', 'fecha', 'analista', 'días resolución', 'asunto', 'resumen', 'summary', 'descripción'].some(exc => key.toLowerCase().includes(exc)) &&
                            value && String(value).trim() !== '-' && !key.startsWith('__EMPTY')
                         ).map(([key, value]) => (
                            <div key={key} className="p-5 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{key}</span>
                               <span className="text-[12px] font-bold text-slate-700 leading-relaxed font-mono">{String(value)}</span>
                            </div>
                         ))}
                    </div>
                  </section>
                </div>

                <div className="p-10 bg-white border-t border-slate-100 flex items-center justify-between bg-gradient-to-l from-white to-slate-50">
                   <div className="flex items-center gap-10">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center p-2 text-slate-400">
                            <FileSearch size={20} />
                         </div>
                         <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block leading-none mb-1">Capa de Datos</span>
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Registro de Telemetría</span>
                         </div>
                      </div>
                   </div>
                   <button 
                     onClick={() => setSelectedRow(null)}
                     className="px-12 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:shadow-2xl transition-all active:scale-95 flex items-center gap-3 group"
                   >
                      <List size={16} className="group-hover:-translate-x-1 transition-transform" />
                      Cerrar Registro
                   </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
