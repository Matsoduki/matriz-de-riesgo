import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Modal, Button } from './ui';
import { findColumnKey, formatExcelDate } from '../lib/excelParser';
import { exportToStyledExcel } from '../lib/utils';
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
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Search, AlertTriangle, CheckCircle, Clock, BarChart3, Target, Download } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  data: any[];
  title: string;
  isOverview?: boolean;
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#0ea5e9', '#38bdf8', '#7dd3fc'];
const PRIORITIES_COLORS: Record<string, string> = {
  'alta': '#ef4444',
  'high': '#ef4444',
  'critico': '#b91c1c',
  'crítico': '#b91c1c',
  'media': '#f59e0b',
  'medium': '#f59e0b',
  'baja': '#3b82f6',
  'low': '#3b82f6',
};

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#64748b',
  'In Progress': '#3b82f6',
  'Done': '#22c55e',
  'Cerrado': '#22c55e',
  'Resuelto': '#22c55e',
  'Abierto': '#3b82f6',
  'En curso': '#3b82f6',
  'En progreso': '#eab308',
  'Atrasado': '#ef4444',
  'RESUELTO': '#22c55e',
  'ATRASADO': '#ef4444',
  'EN CURSO': '#3b82f6',
};

export default function JiraView({ data, title, isOverview = false }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const cleanData = useMemo(() => {
    if (!data) return [];
    
    return data.filter(row => {
      const values = Object.values(row).map(v => String(v).toLowerCase());
      if (values.includes('varios elementos') || values.includes('todas')) return false;
      
      const validKeys = Object.keys(row).filter(k => !k.startsWith('__EMPTY') && k.trim() !== '');
      if (validKeys.length < 3) return false;
      return true;
    });
  }, [data]);

  const metrics = useMemo(() => {
    const initialState = {
      total: 0,
      activeTickets: 0,
      delayedTickets: 0,
      commitmentHealth: 0,
      overdueCommitment: 0,
      statusChartData: [],
      priorityChartData: [],
      timelineData: [],
      topProjects: [],
      statusKey: 'Status',
      priorityKey: 'Priority',
      statuses: [],
      priorities: []
    };

    if (!cleanData || cleanData.length === 0) return initialState;

    const sample = cleanData[0];
    const statusKey = findColumnKey(sample, ['semaforo', 'status', 'estado']);
    const priorityKey = findColumnKey(sample, ['criticidad', 'priority', 'prioridad']);
    const assigneeKeys = ['responsable seguridad', 'responsable de seguridad', 'responsable', 'backup', 'assignee', 'asignado', 'colaborador'].map(kw => findColumnKey(sample, [kw])).filter(Boolean) as string[];
    const providerKey = findColumnKey(sample, ['proveedor', 'vendor', 'empresa externa', 'partner', 'consultora']);
    const dateKey = findColumnKey(sample, ['fecha inicio', 'mes inicio', 'creado en', 'fecha']);
    const idKey = findColumnKey(sample, ['nro.', 'numero', 'id', 'ticket']);
    const commitmentDateKey = findColumnKey(sample, ['fecha de compromiso', 'commitment', 'compromiso', 'vencimiento']);

    const filtered = cleanData.filter(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const sVal = String(row[statusKey || ''] || '').toLowerCase();
      const pVal = String(row[priorityKey || ''] || '').toLowerCase();
      const matchesStatus = statusFilter === 'all' || String(row[statusKey || '']) === statusFilter;
      const matchesPriority = priorityFilter === 'all' || String(row[priorityKey || '']) === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
    
    let activeTickets = 0;
    let delayedTickets = 0;
    let commitmentHealth = 0;
    let overdueCommitment = 0;
    const statusCount: Record<string, number> = {};
    const priorityCount: Record<string, number> = {};
    const timelineCount: Record<string, number> = {};
    const providerStats: Record<string, { total: number, resolved: number, delayed: number, critical: number }> = {};

    filtered.forEach(row => {
      const priority = String(row[priorityKey || ''] || row['Prioridad'] || row['Criticidad'] || '').toLowerCase().trim();
      const isCritical = [
        'alta', 'critica', 'crítica', 'high', 'importante', 'urgente', '1', 'muy alta', 'very high', 'p1', 'p0', 'critical', 'critico', 'crítico'
      ].some(term => priority.includes(term)) && !priority.includes('no critico') && !priority.includes('no crítico');

      // Provider logic
      if (providerKey && row[providerKey]) {
        const prov = String(row[providerKey]).trim();
        if (prov && prov !== '-') {
          if (!providerStats[prov]) providerStats[prov] = { total: 0, resolved: 0, delayed: 0, critical: 0 };
          providerStats[prov].total++;
          
          const status = String(row[statusKey || ''] || '').toLowerCase();
          const isResolved = status.includes('done') || status.includes('cerrado') || status.includes('resuelto');
          const isDelayed = status.includes('atrasado') || status.includes('atrasada');
          
          if (isResolved) providerStats[prov].resolved++;
          if (isDelayed) providerStats[prov].delayed++;
          if (isCritical) providerStats[prov].critical++;
        }
      }

      if (statusKey && row[statusKey]) {
        const status = String(row[statusKey]);
        statusCount[status] = (statusCount[status] || 0) + 1;
        const isResolved = status.toLowerCase().includes('done') || status.toLowerCase().includes('cerrado') || status.toLowerCase().includes('resuelto');
        if (!isResolved) activeTickets++;
        if (status.toLowerCase().includes('atrasado')) delayedTickets++;

        if (commitmentDateKey && row[commitmentDateKey]) {
          const cDateStr = formatExcelDate(row[commitmentDateKey]);
          if (cDateStr) {
            const cDate = new Date(cDateStr);
            if (!isResolved && cDate < new Date()) overdueCommitment++;
            else if (!isResolved) commitmentHealth++;
          }
        }
      }
      
      if (priorityKey && row[priorityKey]) {
        const priority = String(row[priorityKey]);
        priorityCount[priority] = (priorityCount[priority] || 0) + 1;
      }

      if (dateKey && row[dateKey]) {
        let dateStr = formatExcelDate(row[dateKey]).substring(0, 7);
        if (dateStr.match(/^\d{4}-\d{2}/)) {
           timelineCount[dateStr] = (timelineCount[dateStr] || 0) + 1;
        }
      }
    });

    const statusChartData = Object.entries(statusCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const priorityChartData = Object.entries(priorityCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const timelineData = Object.entries(timelineCount).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

    const providerChartData = Object.entries(providerStats).map(([name, stats]) => ({
      name,
      total: stats.total,
      critical: stats.critical,
      efficiency: Math.round((stats.resolved / stats.total) * 100),
      risk: Math.round((stats.delayed / stats.total) * 100)
    })).sort((a, b) => b.critical - a.critical || b.total - a.total);

    const insights = [];
    if (providerChartData.length > 0) {
      const best = [...providerChartData].sort((a,b) => b.efficiency - a.efficiency)[0];
      const riskier = [...providerChartData].sort((a,b) => b.risk - a.risk)[0];
      const criticalPeak = [...providerChartData].sort((a,b) => b.critical - a.critical)[0];
      
      if (best) insights.push({ type: 'success', title: 'Líder en Entrega', text: `${best.name} mantiene un ${best.efficiency}% de efectividad.` });
      if (riskier && riskier.risk > 15) insights.push({ type: 'risk', title: 'Alerta de Retraso', text: `${riskier.name} presenta un ${riskier.risk}% de tareas fuera de plazo.` });
      if (criticalPeak && criticalPeak.critical > 3) insights.push({ type: 'risk', title: 'Concentración Crítica', text: `${criticalPeak.name} gestiona ${criticalPeak.critical} iniciativas de alta prioridad.` });
    }

    const topProjects = Object.entries(filtered.reduce((acc: Record<string, { total: number, done: number }>, row) => {
      const projectKey = findColumnKey(row, ['proyecto o tarea', 'summary', 'issue id', 'key']) || 'Other';
      const project = String(row[projectKey] || 'Other');
      if (!acc[project]) acc[project] = { total: 0, done: 0 };
      acc[project].total++;
      if (String(row[statusKey || '']).toLowerCase().match(/done|cerrado|resuelto/)) acc[project].done++;
      return acc;
    }, {}))
      .map(([name, stats]: [string, any]) => ({ name, total: stats.total, done: stats.done, completion: Math.round((stats.done / stats.total) * 100) }))
      .sort((a, b) => b.total - a.total).slice(0, 10);

    return { 
      total: filtered.length, 
      activeTickets, 
      delayedTickets,
      commitmentHealth,
      overdueCommitment,
      statusChartData, 
      priorityChartData, 
      timelineData,
      topProjects,
      providerChartData,
      insights,
      statusKey, 
      priorityKey, 
      assigneeKeys,
      idKey,
      commitmentDateKey,
      statuses: Object.keys(statusCount),
      priorities: Object.keys(priorityCount)
    };
  }, [cleanData, searchTerm, statusFilter, priorityFilter]);

  const allFilteredData = useMemo(() => {
    return cleanData.filter(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesStatus = statusFilter === 'all' || String(row[metrics?.statusKey || '']) === statusFilter;
      const matchesPriority = priorityFilter === 'all' || String(row[metrics?.priorityKey || '']) === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [cleanData, searchTerm, statusFilter, priorityFilter, metrics]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return allFilteredData.slice(start, start + pageSize);
  }, [allFilteredData, currentPage]);

  const totalPages = Math.ceil(allFilteredData.length / pageSize);

  const displayColumns = useMemo(() => {
    if (!cleanData || cleanData.length === 0) return [];
    
    return Object.keys(cleanData[0]).filter(k => {
      if (k.startsWith('__EMPTY')) return false;
      const lower = k.toLowerCase().trim();
      return lower !== 'año' && lower !== 'mes' && lower !== 'semana' && lower !== 'día' && lower !== '(varios elementos)' && lower !== '(todas)';
    });
  }, [cleanData]);

  if (!cleanData || cleanData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <p>No se encontraron datos en esta hoja.</p>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-8">
      {isOverview ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Velocidad del Portfolio</p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-indigo-600">
                  {metrics.total > 0 ? Math.round(((metrics.total - metrics.activeTickets) / metrics.total) * 100) : 0}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Throughput</span>
              </div>
            </div>
            <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Saturación de Riesgo</p>
              <div className="flex items-end gap-2 text-rose-500">
                <span className="text-3xl font-black">{metrics.delayedTickets}</span>
                <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Cuellos de Botella</span>
              </div>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCountJira" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', padding: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: '900', color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorCountJira)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <>
          {/* Executive KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Inventario Total', val: metrics.total, color: 'slate', icon: BarChart3 },
              { label: 'Pipeline Activo', val: metrics.activeTickets, color: 'blue', icon: Clock },
              { label: 'Bloqueos de Sistema', val: metrics.delayedTickets, color: 'rose', icon: AlertTriangle, status: 'Crítico' },
              { label: 'Índice Eficiencia', val: `${metrics.total > 0 ? Math.round(((metrics.total - metrics.activeTickets) / metrics.total) * 100) : 0}%`, color: 'emerald', icon: CheckCircle },
              { label: 'Salud de Compromisos', val: `${metrics.commitmentHealth || 0}`, color: metrics.overdueCommitment > 0 ? 'rose' : 'indigo', icon: Target, status: metrics.overdueCommitment > 0 ? `${metrics.overdueCommitment} Desviados` : 'Al Día' }
            ].map((kpi, idx) => (
              <Card key={idx} className={`border-0 shadow-xl shadow-slate-200/40 bg-white overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${kpi.label.includes('Compromisos') && metrics.overdueCommitment > 0 ? 'ring-2 ring-rose-500/20' : ''}`}>
                <CardContent className="p-6 relative">
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-slate-400`}>{kpi.label}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className={`text-4xl font-black tracking-tighter text-slate-800 ${kpi.label.includes('Compromisos') && metrics.overdueCommitment > 0 ? 'text-rose-600' : ''}`}>{kpi.val}</h3>
                    {kpi.status && <span className={`text-[10px] font-black px-2 py-0.5 rounded ${kpi.label.includes('Compromisos') && metrics.overdueCommitment > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'} uppercase`}>{kpi.status}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top 10 Portfolio Status */}
            <Card className="border-0 shadow-xl shadow-slate-200/40">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 border-b border-slate-50">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Impacto Top 10 Portfolio</CardTitle>
                  <p className="text-xs text-slate-400 font-medium mt-1">Distribución de estado en flujos primarios</p>
                </div>
              </CardHeader>
              <CardContent className="pt-6 px-0">
                <div className="space-y-4">
                  {metrics.topProjects.map((proj: any, i: number) => (
                    <div key={i} className="px-6 group cursor-default">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-slate-700 truncate w-2/3 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                          {proj.name}
                        </span>
                        <span className="text-[10px] font-black text-slate-400">{proj.done}/{proj.total} COMPLETE</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                          style={{ width: `${proj.completion}%` }} 
                        />
                        <div 
                          className="h-full bg-indigo-500/20 transition-all duration-1000 ease-out" 
                          style={{ width: `${100 - proj.completion}%` }} 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              {/* Distribution Heatmap */}
              <Card className="border-0 shadow-xl shadow-slate-200/40 h-full">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 text-center">Criticidad Operativa</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.priorityChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {metrics.priorityChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={PRIORITIES_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]} 
                              className="stroke-white stroke-2"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                           itemStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {metrics.priorityChartData.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITIES_COLORS[entry.name.toLowerCase()] || COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Provider Analytics & Strategic Insights */}
          {metrics.providerChartData && metrics.providerChartData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <Card className="border-0 shadow-xl shadow-slate-200/40 overflow-hidden h-full">
                  <CardHeader className="border-b border-slate-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">KPI de Proveedores Externos</CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">Eficiencia relativa y concentración de carga</p>
                      </div>
                      <Target className="text-brand-600 opacity-20" size={32} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto hide-scrollbar">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Socio Estratégico</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Críticos</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Nivel de Eficiencia</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Riesgo Retraso</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {metrics.providerChartData.slice(0, 8).map((prov: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-6 py-5">
                                <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight group-hover:text-brand-600 transition-colors">{prov.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                   <div className="h-1 w-1 rounded-full bg-slate-300" />
                                   <p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">{prov.total} Iniciativas</p>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-center">
                                <span className={`text-xs font-mono font-black ${prov.critical > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                  {prov.critical || '-'}
                                </span>
                              </td>
                              <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${prov.efficiency}%` }}
                                      transition={{ duration: 1.5, ease: "circOut" }}
                                      className="h-full bg-gradient-to-r from-brand-600 to-brand-400" 
                                    />
                                  </div>
                                  <span className="text-[10px] font-black text-brand-600 w-8 text-right font-mono">{prov.efficiency}%</span>
                                </div>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  prov.risk > 15 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                                }`}>
                                  {prov.risk}%
                                  <div className={`ml-2 h-1 w-1 rounded-full ${prov.risk > 15 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-4 space-y-6">
                 <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden group h-full">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                       <Target size={80} className="text-brand-400" />
                    </div>
                    <p className="text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">Decision Intelligence</p>
                    <div className="space-y-8">
                       {metrics.insights && metrics.insights.map((insight: any, i: number) => (
                         <div key={i} className="space-y-3 relative z-10">
                            <div className="flex items-center gap-3">
                               <div className={`p-2 rounded-lg ${insight.type === 'success' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                                  {insight.type === 'success' ? <CheckCircle className="text-emerald-400" size={16} /> : <AlertTriangle className="text-rose-400" size={16} />}
                               </div>
                               <h5 className="text-[11px] font-black text-white uppercase tracking-widest">{insight.title}</h5>
                            </div>
                            <p className="text-xs text-slate-400 font-medium leading-relaxed pl-11">{insight.text}</p>
                         </div>
                       ))}
                       {(!metrics.insights || metrics.insights.length === 0) && (
                         <p className="text-xs text-slate-500 italic">No se detectan anomalías críticas en el rendimiento por proveedor en este periodo.</p>
                       )}
                    </div>
                    <div className="mt-12 pt-8 border-t border-slate-800">
                       <button className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-900/50 flex items-center justify-center gap-2">
                          <BarChart3 size={14} />
                          Simular Escenarios 2026
                       </button>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* Productivity Timeline */}
          <Card className="border-0 shadow-xl shadow-slate-200/40">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Análisis de Tiempo & Identificación</CardTitle>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-indigo-600 rounded-sm" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Input Volume</span>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}
                      itemStyle={{ color: '#818cf8', fontSize: '12px' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorMain)" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

      {!isOverview && (
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Listado de Registros</CardTitle>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-grow sm:flex-grow-0 sm:min-w-[280px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="search"
                    placeholder="Buscar en datos..."
                    className="pl-9 bg-white border-slate-200 shadow-sm focus:ring-indigo-500 rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {metrics.statusKey && (
                  <div className="flex-1 min-w-[150px] max-w-[200px]">
                    <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-white border-slate-200 shadow-sm rounded-lg text-sm font-medium text-slate-600">
                      <option value="all">Todos los Estados</option>
                      {metrics.statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </Select>
                  </div>
                )}
                {metrics.priorityKey && (
                  <div className="flex-1 min-w-[150px] max-w-[200px]">
                    <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full bg-white border-slate-200 shadow-sm rounded-lg text-sm font-medium text-slate-600">
                      <option value="all">Todas las Criticidades</option>
                      {metrics.priorities.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </Select>
                  </div>
                )}
                <Button onClick={() => {
                   exportToStyledExcel(allFilteredData, `Reporte_Portfolio_Proyectos_Filtrado.xlsx`, title || 'Reporte de Proyectos');
                }} className="h-10 px-4 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm text-xs font-bold rounded-lg flex items-center gap-2">
                   <Download size={14} /> Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto hide-scrollbar">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {displayColumns.map(key => (
                      <th key={key} scope="col" className="px-6 py-4 font-black text-[10px] uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedData.map((row, i) => (
                    <tr 
                      key={i} 
                      className="bg-white hover:bg-brand-50/30 transition-all cursor-pointer group"
                      onClick={() => setSelectedRow(row)}
                    >
                      {displayColumns.map(key => {
                        const isSemaforo = key.toLowerCase() === 'semaforo' || key.toLowerCase() === 'status' || key.toLowerCase() === 'estado';
                        let val = row[key];
                        if (key.toLowerCase().includes('fecha')) val = formatExcelDate(val);
                        val = val !== undefined && val !== null ? String(val) : '';
                        
                        return (
                          <td key={`${i}-${key}`} className="px-6 py-4 max-w-[400px] truncate group-hover:text-slate-900 transition-colors">
                            {isSemaforo ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none" style={{ 
                                backgroundColor: `${STATUS_COLORS[String(val)] || '#64748b'}15`, 
                                color: STATUS_COLORS[String(val)] || '#475569',
                                border: `1px solid ${STATUS_COLORS[String(val)] || '#cbd5e1'}40`
                              }}>
                                <div className="w-1 h-1 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS[String(val)] || '#64748b' }}></div>
                                {String(val)}
                              </span>
                            ) : (
                              <span className={`text-[11px] font-medium text-slate-600 ${key.toLowerCase().includes('id') || key.toLowerCase().includes('key') ? 'font-mono' : ''}`}>
                                {String(val)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan={displayColumns.length} className="px-6 py-24 text-center">
                        <div className="flex flex-col items-center justify-center space-y-4 max-w-xs mx-auto">
                          <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                             <Search className="h-8 w-8" />
                          </div>
                          <p className="text-sm font-bold text-slate-900 uppercase tracking-widest">Sin Coincidencias</p>
                          <p className="text-xs text-slate-500 text-justify-custom leading-relaxed">No se encontraron registros que cumplan con los criterios de filtrado seleccionados actualmente.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-loose">
                  Mostrando {paginatedData.length} de {allFilteredData.length} registros
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Página {currentPage} de {totalPages || 1}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-20 transition-all"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                   {Array.from({ length: Math.min(5, totalPages) }, (_, i) => (
                     <button 
                       key={i+1}
                       onClick={() => setCurrentPage(i+1)}
                       className={`h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all ${currentPage === i+1 ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}
                     >
                       {i+1}
                     </button>
                   ))}
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:opacity-20 transition-all"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Row Detail Modal */}
      <Modal 
        isOpen={!!selectedRow} 
        onClose={() => setSelectedRow(null)} 
        title={selectedRow ? `Detalle de Proyecto/Tarea ${metrics.idKey && selectedRow[metrics.idKey] ? `(${selectedRow[metrics.idKey]})` : ''}` : 'Detalle'}
      >
        {selectedRow && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {Object.keys(selectedRow).filter(k => {
              if (k.startsWith('__EMPTY')) return false;
              const lower = k.toLowerCase().trim();
              return lower !== 'año' && lower !== 'mes' && lower !== 'semana' && lower !== 'día' && lower !== '(varios elementos)' && lower !== '(todas)';
            }).map((key) => {
              let val = selectedRow[key];
              if (val === undefined || val === null || String(val).trim() === '') return null;
              if (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('creado')) val = formatExcelDate(val);
              
              const isLongText = String(val).length > 60;
              const isSemaforo = key.toLowerCase() === 'semaforo' || key.toLowerCase() === 'status' || key.toLowerCase() === 'estado';
              
              return (
                <div key={key} className={`flex flex-col ${isLongText ? 'col-span-1 md:col-span-2' : ''} bg-white p-4 rounded-lg border border-slate-100 shadow-sm`}>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{key}</span>
                  {isSemaforo ? (
                     <span className="inline-flex w-fit items-center px-3 py-1 rounded-md text-sm font-medium" style={{ 
                        backgroundColor: `${STATUS_COLORS[String(val)] || '#64748b'}15`, 
                        color: STATUS_COLORS[String(val)] || '#475569',
                        border: `1px solid ${STATUS_COLORS[String(val)] || '#cbd5e1'}40`
                      }}>
                         <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: STATUS_COLORS[String(val)] || '#64748b' }}></div>
                        {String(val)}
                      </span>
                  ) : (
                    <span className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{String(val)}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Modal>
        </>
      )}
    </div>
  );
}
