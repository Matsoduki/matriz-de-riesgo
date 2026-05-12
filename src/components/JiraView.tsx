import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Modal, Button } from './ui';
import { findColumnKey, formatExcelDate, getISOFromExcelDate } from '../lib/excelParser';
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
  Area,
  LineChart,
  Line
} from 'recharts';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  Target, 
  Download, 
  Activity, 
  ShieldAlert, 
  Zap, 
  ShieldCheck,
  Globe,
  Cpu,
  ArrowUpRight,
  ArrowDownRight,
  Radar,
  Network,
  List
} from 'lucide-react';
import { DetailsModal } from './DetailsModal';
import { motion } from 'motion/react';

interface Props {
  data: any[];
  title: string;
  isOverview?: boolean;
}

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#0ea5e9', '#38bdf8', '#7dd3fc'];
const PRIORITIES_COLORS: Record<string, string> = {
  'alta': '#e11d48', // rose-600
  'high': '#e11d48',
  'critico': '#9f1239', // rose-900 
  'crítico': '#9f1239',
  'media': '#f59e0b', // amber-500
  'medium': '#f59e0b',
  'baja': '#0ea5e9', // sky-500
  'low': '#0ea5e9',
};

const STATUS_COLORS: Record<string, string> = {
  'To Do': '#64748b',
  'In Progress': '#2563eb',
  'Done': '#059669',
  'Cerrado': '#059669',
  'Resuelto': '#059669',
  'Abierto': '#3b82f6',
  'En curso': '#3b82f6',
  'En progreso': '#f59e0b',
  'Atrasado': '#e11d48',
  'RESUELTO': '#059669',
  'ATRASADO': '#e11d48',
  'EN CURSO': '#3b82f6',
};

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#9f1239', bg: 'bg-rose-50', text: 'text-rose-700', label: 'Crítico' },
  HIGH: { color: '#e11d48', bg: 'bg-rose-50', text: 'text-rose-600', label: 'Alta' },
  MEDIUM: { color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Media' },
  LOW: { color: '#0ea5e9', bg: 'bg-sky-50', text: 'text-sky-700', label: 'Baja' },
};

const Sparkline = ({ data, color }: { data: any[], color: string }) => (
  <div className="h-6 w-12 opacity-60">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <Line 
          type="monotone" 
          dataKey="val" 
          stroke={color} 
          strokeWidth={2} 
          dot={false} 
          isAnimationActive={true}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default function JiraView({ data, title, isOverview = false }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showDetails, setShowDetails] = useState(false);
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
      efficiency: 0,
      healthStatus: 'CRITICAL',
      sparklines: {
        total: [], active: [], risk: [], health: [], milestones: []
      },
      statusChartData: [],
      priorityChartData: [],
      timelineData: [],
      topProjects: [],
      providerChartData: [],
      insights: [],
      statusKey: 'Status',
      priorityKey: 'Priority',
      assigneeKeys: [],
      idKey: 'ID',
      commitmentDateKey: undefined,
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
          const isResolved = status.includes('done') || status.includes('cerrado') || status.includes('resuelto') || status.includes('closed') || status.includes('completado');
          const isDelayed = status.includes('atrasado') || status.includes('atrasada');
          
          if (isResolved) providerStats[prov].resolved++;
          if (isDelayed) providerStats[prov].delayed++;
          if (isCritical) providerStats[prov].critical++;
        }
      }

      if (statusKey && row[statusKey]) {
        const status = String(row[statusKey]).trim();
        const isResolved = status.toLowerCase().includes('done') || status.toLowerCase().includes('cerrado') || status.toLowerCase().includes('resuelto') || status.toLowerCase().includes('closed') || status.toLowerCase().includes('completado');

        if (status && status !== "-") {
          statusCount[status] = (statusCount[status] || 0) + 1;
          if (!isResolved) activeTickets++;
          if (status.toLowerCase().includes('atrasado')) delayedTickets++;
        }

        if (commitmentDateKey && row[commitmentDateKey]) {
          const cDateStr = getISOFromExcelDate(row[commitmentDateKey]);
          if (cDateStr) {
            const cDate = new Date(cDateStr);
            if (!isResolved && cDate < new Date()) overdueCommitment++;
            else if (!isResolved) commitmentHealth++;
          }
        }
      }
      
      if (priorityKey && row[priorityKey]) {
        const priority = String(row[priorityKey]).trim();
        if (priority && priority !== "-") {
          priorityCount[priority] = (priorityCount[priority] || 0) + 1;
        } else {
          priorityCount["N/A"] = (priorityCount["N/A"] || 0) + 1;
        }
      }

      if (dateKey && row[dateKey]) {
        let dateStr = getISOFromExcelDate(row[dateKey]).substring(0, 7);
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
      if (String(row[statusKey || '']).toLowerCase().match(/done|cerrado|resuelto|closed|completado/)) acc[project].done++;
      return acc;
    }, {}))
      .map(([name, stats]: [string, any]) => ({ name, total: stats.total, done: stats.done, completion: Math.round((stats.done / stats.total) * 100) }))
      .sort((a, b) => b.total - a.total).slice(0, 10);

    // Calculate Global Health
    const efficiency = filtered.length > 0 ? Math.round(((filtered.length - activeTickets) / filtered.length) * 100) : 0;
    const healthStatus = efficiency > 75 ? 'OPTIMAL' : efficiency > 50 ? 'WARNING' : 'CRITICAL';

    const generateSparkData = (base: number) => Array.from({ length: 9 }, (_, i) => ({ val: base + Math.sin(i) * (base * 0.1) + Math.random() * (base * 0.05) }));

    const fullStatuses = new Set<string>();
    const fullPriorities = new Set<string>();

    cleanData.forEach(row => {
      if (statusKey && row[statusKey]) fullStatuses.add(String(row[statusKey]));
      if (priorityKey && row[priorityKey]) fullPriorities.add(String(row[priorityKey]));
    });

    return { 
      total: filtered.length, 
      activeTickets, 
      delayedTickets,
      commitmentHealth,
      overdueCommitment,
      efficiency,
      healthStatus,
      sparklines: {
        total: generateSparkData(filtered.length),
        active: generateSparkData(activeTickets),
        risk: generateSparkData(delayedTickets),
        health: generateSparkData(efficiency),
        milestones: generateSparkData(commitmentHealth)
      },
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
      statuses: Array.from(fullStatuses).sort(),
      priorities: Array.from(fullPriorities).sort(),
      statusCount,
      priorityCount
    };
  }, [cleanData, searchTerm, statusFilter, priorityFilter]);

  const filterOptions = useMemo(() => {
    const counts = {
      statuses: {} as Record<string, number>,
      priorities: {} as Record<string, number>,
      totalMatches: 0
    };
    
    cleanData.forEach(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!matchesSearch) return;

      const sVal = metrics?.statusKey ? String(row[metrics.statusKey] || '') : '';
      const pVal = metrics?.priorityKey ? String(row[metrics.priorityKey] || '') : '';
      
      const passStatus = statusFilter === 'all' || sVal === statusFilter;
      const passPriority = priorityFilter === 'all' || pVal === priorityFilter;

      if (passStatus && passPriority) counts.totalMatches++;

      if (passPriority && sVal) counts.statuses[sVal] = (counts.statuses[sVal] || 0) + 1;
      if (passStatus && pVal) counts.priorities[pVal] = (counts.priorities[pVal] || 0) + 1;
    });

    return {
      statuses: Object.keys(counts.statuses).filter(s => counts.statuses[s] > 0 || String(s) === statusFilter).sort(),
      priorities: Object.keys(counts.priorities).filter(p => counts.priorities[p] > 0 || String(p) === priorityFilter).sort(),
      counts
    };
  }, [cleanData, searchTerm, statusFilter, priorityFilter, metrics]);

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
      {!isOverview && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8 pb-10 border-b border-slate-100"
        >
          <div className="flex items-center gap-8">
            <div className="relative group">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                 className="absolute -inset-4 border border-dashed border-slate-200 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
               />
               <motion.div 
                 animate={{ rotate: -360 }}
                 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                 className="absolute -inset-2 border border-slate-100 rounded-full opacity-30"
               />
               <div className={`relative flex items-center justify-center h-20 w-20 rounded-full border-4 shadow-inner ${
                 metrics.healthStatus === 'OPTIMAL' ? 'border-emerald-100/50 bg-emerald-50/10' : metrics.healthStatus === 'WARNING' ? 'border-amber-100/50 bg-amber-50/10' : 'border-rose-100/50 bg-rose-50/10'
               }`}>
                 <div className={`h-14 w-14 rounded-full flex items-center justify-center relative overflow-hidden ${
                   metrics.healthStatus === 'OPTIMAL' ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : metrics.healthStatus === 'WARNING' ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.4)]'
                 }`}>
                   <Radar size={24} className="text-white relative z-10" />
                   <motion.div 
                     animate={{ y: [40, -40], opacity: [0, 1, 0] }}
                     transition={{ duration: 2, repeat: Infinity }}
                     className="absolute inset-0 bg-white/20"
                   />
                 </div>
                 <svg className="absolute -inset-1 h-22 w-22 -rotate-90">
                   <circle
                     cx="44"
                     cy="44"
                     r="42"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="3"
                     className={metrics.healthStatus === 'OPTIMAL' ? 'text-emerald-500/20' : metrics.healthStatus === 'WARNING' ? 'text-amber-500/20' : 'text-rose-500/20'}
                   />
                   <motion.circle
                     cx="44"
                     cy="44"
                     r="42"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="3"
                     strokeLinecap="round"
                     className={metrics.healthStatus === 'OPTIMAL' ? 'text-emerald-500' : metrics.healthStatus === 'WARNING' ? 'text-amber-500' : 'text-rose-500'}
                     strokeDasharray="263.89"
                     initial={{ strokeDashoffset: 263.89 }}
                     animate={{ strokeDashoffset: 263.89 - (263.89 * metrics.efficiency) / 100 }}
                     transition={{ duration: 2.5, ease: "circOut" }}
                   />
                 </svg>
               </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-900 rounded text-[8px] font-black text-white tracking-[0.2em] uppercase">
                   <ShieldCheck size={10} className="text-brand-400" />
                   Actividad Validada
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                  metrics.healthStatus === 'OPTIMAL' ? 'text-emerald-600' : metrics.healthStatus === 'WARNING' ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  Pulso Operativo General
                </span>
              </div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                {metrics.healthStatus === 'OPTIMAL' ? 'Estado Estable' : metrics.healthStatus === 'WARNING' ? 'Aviso' : 'Atención Requerida'}
              </h2>
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2 group/stat cursor-default">
                  <div className="p-1 px-2 rounded bg-slate-100 group-hover/stat:bg-indigo-50 transition-colors">
                     <CheckCircle size={10} className="text-indigo-600" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[14px] font-black text-slate-800 leading-none">{metrics.efficiency}%</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Efficiency Index</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex items-center gap-2 group/stat cursor-default">
                  <div className="p-1 px-2 rounded bg-slate-100 group-hover/stat:bg-rose-50 transition-colors">
                     <Network size={10} className="text-rose-600" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[14px] font-black text-slate-800 leading-none">{metrics.delayedTickets}</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Alertas Activas</span>
                  </div>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex items-center gap-2 group/stat cursor-default">
                  <div className="p-1 px-2 rounded bg-slate-100 group-hover/stat:bg-amber-50 transition-colors">
                     <Globe size={10} className="text-amber-600" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[14px] font-black text-slate-800 leading-none">{metrics.providerChartData.length}</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Socio-Nodos</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white p-1 rounded-3xl border border-slate-100 shadow-sm self-stretch md:self-auto">
            <div className="px-6 py-4 border-r border-slate-100 flex flex-col justify-center gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Estado de Datos</span>
              <div className="flex items-center gap-2">
                 <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                 <span className="text-[11px] font-black text-slate-700 uppercase flex items-center gap-1.5">
                    Sincronización Activa
                 </span>
              </div>
            </div>
            <div className="px-6 py-4 flex flex-col justify-center gap-1 bg-slate-50/50 rounded-2xl">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Último Registro</span>
              <span className="text-[11px] font-black text-slate-600 font-mono tracking-tighter">
                {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>
        </motion.div>
      )}

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
              { label: 'Inventario Total', val: metrics.total, trend: '+4.2%', trendDir: 'up', trendLabel: 'vs last week', icon: BarChart3, color: 'indigo', spark: metrics.sparklines.total },
              { label: 'Pipeline Activo', val: metrics.activeTickets, trend: '-2.1%', trendDir: 'down', trendLabel: 'resolution rate', icon: Clock, color: 'blue', spark: metrics.sparklines.active },
              { label: 'Bloqueos Críticos', val: metrics.delayedTickets, trend: metrics.delayedTickets > 5 ? '+12%' : '0%', trendDir: metrics.delayedTickets > 5 ? 'up' : 'neutral', trendLabel: 'risk peak', icon: AlertTriangle, color: 'rose', status: metrics.delayedTickets > 0 ? 'Urgent' : 'Secure', spark: metrics.sparklines.risk },
              { label: 'Efficiency Index', val: `${metrics.efficiency}%`, trend: '+0.5%', trendDir: 'up', trendLabel: 'velocity', icon: CheckCircle, color: 'emerald', spark: metrics.sparklines.health },
              { label: 'Commitment Health', val: `${metrics.commitmentHealth || 0}`, trend: 'Stable', trendDir: 'neutral', trendLabel: 'timeline', icon: Target, color: metrics.overdueCommitment > 0 ? 'rose' : 'indigo', status: metrics.overdueCommitment > 0 ? 'Deviation' : 'On Track', spark: metrics.sparklines.milestones }
            ].map((kpi, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative"
              >
                <div className={`h-full bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col justify-between transition-all duration-500 hover:shadow-2xl hover:border-indigo-100 relative overflow-hidden`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 -mr-12 -mt-12 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 bg-current`} style={{ color: `var(--${kpi.color}-500)` }} />
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl bg-opacity-10`} style={{ backgroundColor: `var(--${kpi.color}-500)`, color: `var(--${kpi.color}-600)` }}>
                           <kpi.icon size={14} className="opacity-80" />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{kpi.label}</p>
                      </div>
                      <Sparkline data={kpi.spark} color={kpi.color === 'rose' ? '#e11d48' : kpi.color === 'emerald' ? '#10b981' : '#4f46e5'} />
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-black tracking-tighter text-slate-800 group-hover:scale-105 transition-transform origin-left duration-500">
                        {kpi.val}
                      </h3>
                      {kpi.status && (
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border border-current opacity-70 uppercase tracking-widest bg-current bg-opacity-5`} 
                              style={{ color: kpi.status === 'Urgent' || kpi.status === 'Deviation' ? '#e11d48' : '#059669' }}>
                          {kpi.status}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                     <div className="flex items-center gap-1.5">
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black ${
                          kpi.trendDir === 'up' ? 'bg-emerald-50 text-emerald-600' : kpi.trendDir === 'down' ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {kpi.trendDir === 'up' ? <ArrowUpRight size={10} /> : kpi.trendDir === 'down' ? <ArrowDownRight size={10} /> : '•'}
                          {kpi.trend}
                        </div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{kpi.trendLabel}</span>
                     </div>
                     <div className="h-1 w-12 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '65%' }}
                          transition={{ duration: 2, delay: 1 }}
                          className="h-full bg-current opacity-30" 
                          style={{ color: `var(--${kpi.color}-500)` }} 
                        />
                     </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top 10 Portfolio Status */}
            <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-[2.5rem]">
              <CardHeader className="flex flex-row items-center justify-between pb-8 border-b border-slate-50 px-8 pt-8">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Impacto Portfolio Estratégico</CardTitle>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Distribución de throughput por nodo</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <BarChart3 size={16} className="text-slate-400" />
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-6">
                  {metrics.topProjects.map((proj: any, i: number) => (
                    <div key={i} className="group cursor-default">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 w-2/3">
                          <span className="text-[10px] font-black text-indigo-600 font-mono">0{i+1}</span>
                          <span className="text-xs font-black text-slate-800 truncate uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                            {proj.name}
                          </span>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 tracking-widest">{proj.completion}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <motion.div 
                          className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                          initial={{ width: 0 }}
                          animate={{ width: `${proj.completion}%` }}
                          transition={{ duration: 1, delay: i * 0.05 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-8">
              {/* Distribution Heatmap */}
              <Card className="border-0 shadow-xl shadow-slate-200/40 h-full rounded-[2.5rem] overflow-hidden bg-white group/crit">
                <CardHeader className="pt-10 px-10 pb-4">
                  <div className="flex items-center gap-3">
                     <div className="h-1.5 w-8 bg-brand-500 rounded-full group-hover/crit:w-12 transition-all" />
                     <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Criticidad Operativa</CardTitle>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest pl-11">Risk profiling by severity index</p>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-10 pt-0">
                  <div className="h-72 w-full relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                       <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                          className="absolute h-64 w-64 border border-dashed border-slate-100 rounded-full" 
                       />
                       <motion.div 
                          animate={{ rotate: -360 }}
                          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                          className="absolute h-56 w-56 border border-slate-50 rounded-full" 
                       />
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.priorityChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={85}
                          outerRadius={115}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {metrics.priorityChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={PRIORITIES_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]}
                              className="hover:opacity-80 transition-opacity cursor-pointer filter drop-shadow-lg"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', padding: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)' }}
                           labelStyle={{ display: 'none' }}
                           itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <span className="text-xs font-black text-slate-300 uppercase tracking-widest mb-1">Total Items</span>
                       <span className="text-4xl font-black text-slate-900 tracking-tighter">{metrics.total}</span>
                       <div className="flex items-center gap-1 mt-1">
                          <div className="h-1 w-1 rounded-full bg-brand-500 animate-ping" />
                          <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.2em]">Active</span>
                       </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-10 gap-y-6 w-full mt-10 px-8">
                    {metrics.priorityChartData.map((entry, i) => (
                      <div key={i} className="flex flex-col gap-1.5 border-l-2 pl-4 transition-all hover:pl-6 bg-slate-50/50 p-2 rounded-r-lg" style={{ borderColor: PRIORITIES_COLORS[entry.name.toLowerCase()] || COLORS[i % COLORS.length] }}>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{entry.name}</span>
                        <div className="flex items-baseline gap-2">
                           <span className="text-lg font-black text-slate-800">{entry.value}</span>
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Nodes</span>
                        </div>
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
                <Card className="border-0 shadow-xl shadow-slate-200/40 overflow-hidden h-full rounded-[2.5rem]">
                  <CardHeader className="border-b border-slate-50 p-8">
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Eficiencia Operativa por Socio</CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Cumplimiento de SLA y exposición de riesgo</p>
                      </div>
                      <div className="px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2">
                         <ShieldAlert size={14} className="text-indigo-600" />
                         <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">SLA Monitoring</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto hide-scrollbar">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                          <tr>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Socio Estratégico</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 text-center">Iniciativas</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">Performance</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 text-right">SLA Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {metrics.providerChartData.slice(0, 8).map((prov: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 transition-all group">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                   <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                      {prov.name.substring(0, 2).toUpperCase()}
                                   </div>
                                   <div>
                                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{prov.name}</p>
                                      <div className="flex items-center gap-1.5 mt-1">
                                         <span className="text-[8px] font-black text-rose-500 uppercase">{prov.critical} Críticos</span>
                                         <span className="text-[8px] text-slate-300">•</span>
                                         <span className="text-[8px] font-bold text-slate-400 uppercase">{prov.total - prov.critical} Std</span>
                                      </div>
                                   </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-center">
                                <span className="text-sm font-mono font-black text-slate-700">
                                  {prov.total}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="space-y-1.5">
                                   <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-slate-400">
                                      <span>RESOLUTION</span>
                                      <span className="text-slate-600">{prov.efficiency}%</span>
                                   </div>
                                   <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${prov.efficiency}%` }}
                                        className="h-full bg-indigo-600 rounded-full" 
                                      />
                                   </div>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] ${
                                  prov.risk > 15 ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-50' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-50'
                                }`}>
                                  {prov.risk > 15 ? 'At Risk' : 'Optimal'}
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
                 <div className="p-8 bg-[#0f172a] rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group h-full flex flex-col">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Zap size={120} className="text-brand-400" />
                    </div>
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                       <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-brand-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Resumen</p>
                       </div>
                    </div>
                    
                    <div className="space-y-6 flex-1 relative z-10 overflow-hidden">
                       <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#0f172a] to-transparent z-20 pointer-events-none" />
                       <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 hide-scrollbar">
                         {metrics.insights && metrics.insights.map((insight: any, i: number) => (
                           <motion.div 
                              key={i} 
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.5 + (i * 0.1) }}
                              className="p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 transition-all group/insight"
                           >
                              <div className="flex items-start gap-4">
                                 <div className={`mt-1 p-2 rounded-xl transition-transform group-hover/insight:scale-110 ${insight.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {insight.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                 </div>
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                       <h5 className="text-[11px] font-black text-white uppercase tracking-widest">{insight.title}</h5>
                                       <span className="text-[8px] font-bold text-slate-500 uppercase font-mono">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed opacity-80">{insight.text}</p>
                                 </div>
                              </div>
                           </motion.div>
                         ))}
                       </div>
                       <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0f172a] to-transparent z-20 pointer-events-none" />
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/5 relative z-10">
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Radar size={12} className="text-brand-400" />
                          Desviaciones / Alertas
                       </p>
                       <div className="grid grid-cols-2 gap-3">
                          {[
                             { label: 'SLA Deviation', val: metrics.delayedTickets, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                             { label: 'Critical Path', val: metrics.overdueCommitment, color: 'text-amber-400', bg: 'bg-amber-500/10' }
                          ].map((risk, idx) => (
                            <div key={idx} className={`p-4 rounded-2xl border border-white/5 flex flex-col gap-1 transition-all hover:bg-white/[0.02]`}>
                               <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{risk.label}</span>
                               <div className="flex items-baseline gap-2">
                                  <span className={`text-xl font-black ${risk.color}`}>{risk.val}</span>
                                  <span className="text-[10px] font-bold text-slate-600 uppercase">Alerts</span>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                    
                    <button className="mt-8 group w-full py-5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-95 flex items-center justify-center gap-2">
                       <BarChart3 size={14} className="group-hover:scale-110 transition-transform" />
                       Exportar Reporte
                    </button>
                 </div>
              </div>
            </div>
          )}

          {/* Productivity Timeline */}
          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="flex flex-row items-center justify-between p-8 border-b border-slate-50">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-indigo-50 rounded-2xl">
                    <Clock className="text-indigo-600" size={20} />
                 </div>
                 <div>
                    <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Cronología de Productividad</CardTitle>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Evolución del flujo operativo por periodo</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="h-2 w-2 bg-indigo-600 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Input Stream</span>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="6 6" vertical={true} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8', textTransform: 'uppercase'}} 
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', padding: '16px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: '900', fontSize: '9px', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}
                      itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: '900' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorMain)" 
                      animationDuration={2500}
                      filter="url(#glow)"
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
                      <option value="all">Todos los Estados ({filterOptions.counts.totalMatches})</option>
                      {filterOptions.statuses.map(status => (
                        <option key={status} value={status}>{status} ({filterOptions.counts.statuses[status] || 0})</option>
                      ))}
                    </Select>
                  </div>
                )}
                {metrics.priorityKey && (
                  <div className="flex-1 min-w-[150px] max-w-[200px]">
                    <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="w-full bg-white border-slate-200 shadow-sm rounded-lg text-sm font-medium text-slate-600">
                      <option value="all">Todas las Criticidades ({filterOptions.counts.totalMatches})</option>
                      {filterOptions.priorities.map(priority => (
                        <option key={priority} value={priority}>{priority} ({filterOptions.counts.priorities[priority] || 0})</option>
                      ))}
                    </Select>
                  </div>
                )}
                <Button onClick={() => setShowDetails(true)} className="h-10 px-4 bg-brand-600 border border-brand-700 text-white hover:bg-brand-700 transition-colors shadow-sm text-xs font-bold rounded-lg flex items-center gap-2">
                   <List size={14} /> Ver Detalles
                </Button>
                <Button onClick={() => {
                   const appliedFilters = {
                     'Estado': statusFilter === 'all' ? 'Todos los Estados' : statusFilter,
                     'Criticidad/Prioridad': priorityFilter === 'all' ? 'Todas las Criticidades' : priorityFilter
                   };
                   exportToStyledExcel(allFilteredData, `Reporte_Portfolio_Proyectos_Filtrado.xlsx`, title || 'Reporte de Proyectos', appliedFilters);
                }} className="h-10 px-4 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm text-xs font-bold rounded-lg flex items-center gap-2">
                   <Download size={14} /> Exportar
                </Button>
              </div>
            </div>
          </CardHeader>

          <DetailsModal 
             isOpen={showDetails} 
             onClose={() => setShowDetails(false)} 
             data={allFilteredData} 
             title={`Detalles: ${title || 'Proyectos'}`} 
             filename="Reporte_Portfolio_Full.xlsx" 
             appliedFilters={{
               'Estado': statusFilter === 'all' ? 'Todos los Estados' : statusFilter,
               'Criticidad/Prioridad': priorityFilter === 'all' ? 'Todas las Criticidades' : priorityFilter
             }}
          />

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
