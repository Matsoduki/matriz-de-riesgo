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
  List,
  FileSearch
} from 'lucide-react';
import { DetailsModal } from './DetailsModal';
import { AnimatePresence, motion } from 'motion/react';
import { EnterpriseTable } from './EnterpriseTable';

interface Props {
  data: any[];
  title: string;
  isOverview?: boolean;
  maxYear?: number;
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

export default function JiraView({ data, title, isOverview = false, maxYear }: Props) {
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
      // Very basic filtering to keep almost everything that isn't a known Excel noise row
      const values = Object.values(row).map(v => String(v).toLowerCase());
      
      // Keep everything unless it's an obviously empty row or a header/summary with "(varios elementos)"
      const isHeaderNoise = (values.includes('varios elementos') || values.includes('todas')) && Object.keys(row).length < 5;
      if (isHeaderNoise) return false;

      // EXPLICIT FILTER: Limit to entries <= maxYear if provided
      if (maxYear) {
        const dateKeys = Object.keys(row).filter(key => 
          key.toLowerCase().includes('fecha') || 
          key.toLowerCase().includes('date') || 
          key.toLowerCase().includes('creado') ||
          key.toLowerCase() === 'año' ||
          key.toLowerCase() === 'year'
        );

        for (const key of dateKeys) {
          const val = row[key];
          if (!val) continue;

          if (key.toLowerCase() === 'año' || key.toLowerCase() === 'year') {
            if (parseInt(String(val)) > maxYear) return false;
          }

          const isoDate = getISOFromExcelDate(val);
          if (isoDate) {
            const year = parseInt(isoDate.split('-')[0]);
            if (year > maxYear) return false;
          }
        }
      }
      
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
    const assigneeKeysRaw = ['responsable seguridad', 'responsable de seguridad', 'responsable', 'backup', 'assignee', 'asignado', 'colaborador'].map(kw => findColumnKey(sample, [kw])).filter(Boolean) as string[];
    const assigneeKeys = Array.from(new Set(assigneeKeysRaw));
    const providerKey = findColumnKey(sample, ['proveedor', 'vendor', 'empresa externa', 'partner', 'consultora']);
    const dateKey = findColumnKey(sample, ['fecha inicio', 'mes inicio', 'creado en', 'fecha', 'created', 'creación', 'creacion']);
    const resolutionDateKey = findColumnKey(sample, ['fecha resolución', 'fecha resolucion', 'resolved', 'resolución', 'fecha fin', 'fin', 'completed date', 'resolved date']);
    const idKey = findColumnKey(sample, ['nro.', 'numero', 'id', 'ticket']);
    const commitmentDateKey = findColumnKey(sample, ['fecha de compromiso', 'commitment', 'compromiso', 'vencimiento']);

    const filtered = cleanData.filter(row => {
      const matchesSearch = Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
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
    const timelineCount: Record<string, { created: number, resolved: number }> = {};
    const providerStats: Record<string, { total: number, resolved: number, delayed: number, critical: number }> = {};

    filtered.forEach(row => {
      const priority = String(row[priorityKey || ''] || row['Prioridad'] || row['Criticidad'] || '').toLowerCase().trim();
      const isCritical = [
        'alta', 'critica', 'crítica', 'high', 'importante', 'urgente', '1', 'muy alta', 'very high', 'p1', 'p0', 'critical', 'critico', 'crítico'
      ].some(term => priority.includes(term)) && !priority.includes('no critico') && !priority.includes('no crítico');

      const sVal = String(row[statusKey || ''] || '').toLowerCase();
      const isResolved = sVal.includes('done') || sVal.includes('cerrado') || sVal.includes('resuelto') || sVal.includes('closed') || sVal.includes('completado');

      // Provider logic
      if (providerKey && row[providerKey]) {
        const prov = String(row[providerKey]).trim();
        if (prov && prov !== '-') {
          if (!providerStats[prov]) providerStats[prov] = { total: 0, resolved: 0, delayed: 0, critical: 0 };
          providerStats[prov].total++;
          
          const isDelayed = sVal.includes('atrasado') || sVal.includes('atrasada');
          
          if (isResolved) providerStats[prov].resolved++;
          if (isDelayed) providerStats[prov].delayed++;
          if (isCritical) providerStats[prov].critical++;
        }
      }

      if (statusKey && row[statusKey]) {
        const status = String(row[statusKey]).trim();
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

      // Timeline logic (Creation)
      if (dateKey && row[dateKey]) {
        let dateStr = getISOFromExcelDate(row[dateKey]).substring(0, 7);
        if (dateStr.match(/^\d{4}-\d{2}/)) {
           if (!timelineCount[dateStr]) timelineCount[dateStr] = { created: 0, resolved: 0 };
           timelineCount[dateStr].created++;
        }
      }

      // Timeline logic (Resolution)
      if (isResolved) {
        let rDateVal = row[resolutionDateKey || ''] || row[dateKey || '']; // Fallback to creation date if resolution date is missing but it's resolved
        if (rDateVal) {
          let dateStr = getISOFromExcelDate(rDateVal).substring(0, 7);
          if (dateStr.match(/^\d{4}-\d{2}/)) {
             if (!timelineCount[dateStr]) timelineCount[dateStr] = { created: 0, resolved: 0 };
             timelineCount[dateStr].resolved++;
          }
        }
      }
    });

    const statusChartData = Object.entries(statusCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const priorityChartData = Object.entries(priorityCount).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const timelineData = Object.entries(timelineCount).map(([date, stats]) => ({ 
      date, 
      count: stats.created,
      resolved: stats.resolved 
    })).sort((a, b) => a.date.localeCompare(b.date));

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
    return Array.from(new Set(Object.keys(cleanData[0])));
  }, [cleanData]);

  const displayColumnsData = useMemo(() => {
    return displayColumns.map(key => ({
      key,
      label: key,
      sortable: true,
      type: (key.toLowerCase() === 'semaforo' || key.toLowerCase() === 'status' || key.toLowerCase() === 'estado') ? 'badge' as const : 'text' as const,
      render: (val: any) => {
        let displayVal = val;
        if (key.toLowerCase().includes('fecha')) displayVal = formatExcelDate(val);
        return <span className={key.toLowerCase().includes('id') || key.toLowerCase().includes('key') ? 'font-mono' : ''}>{String(displayVal || '')}</span>;
      }
    }));
  }, [displayColumns]);

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
                  <div className="grid grid-cols-2 gap-x-10 gap-y-6 w-full mt-10 px-10 pb-4">
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

          {/* Historical Productivity Analysis Section */}
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white group">
              <CardHeader className="p-8 border-b border-slate-50 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                     <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl group-hover:scale-110 transition-transform duration-500">
                        <Clock size={24} />
                     </div>
                     <div>
                        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Cronología Operativa</CardTitle>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Análisis de flujo operativo</p>
                     </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 h-[400px] bg-[#fdfdff]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.timelineData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 800, fill: '#64748b', textTransform: 'uppercase'}} 
                      dy={15}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)', padding: '20px' }}
                      labelStyle={{ color: '#0f172a', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.1em' }}
                      cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      height={36}
                      content={({ payload }) => (
                        <div className="flex gap-6 justify-end items-center -mt-4 mb-4">
                          {payload?.map((entry: any, index: number) => (
                            <div key={`item-${index}`} className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">{entry.value === 'count' ? 'Nuevas Entradas' : 'Entregas Consolidadas'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#6366f1" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorCreated)" 
                      animationDuration={2000}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#10b981" 
                      strokeWidth={4} 
                      fillOpacity={1} 
                      fill="url(#colorResolved)" 
                      animationDuration={2000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

      {!isOverview && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200"><List size={20} /></div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Explorador de Portfolio</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auditoría granular de iniciativas y estados</p>
                </div>
             </div>
             
             <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                   <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                   <Input 
                     placeholder="Buscar en la grilla..." 
                     className="pl-11 bg-white border-slate-200 rounded-xl h-11 text-xs"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-48 h-11 rounded-xl bg-white border-slate-200 text-xs font-bold"
                >
                  <option value="all">Todos los Estados ({cleanData.length})</option>
                  {filterOptions.statuses.map(s => (
                    <option key={s} value={s}>
                      {s} ({filterOptions.counts.statuses[s] || 0})
                    </option>
                  ))}
                </Select>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full sm:w-48 h-11 rounded-xl bg-white border-slate-200 text-xs font-bold"
                >
                  <option value="all">Todas las Criticidades ({cleanData.length})</option>
                  {filterOptions.priorities.map(p => (
                    <option key={p} value={p}>
                      {p} ({filterOptions.counts.priorities[p] || 0})
                    </option>
                  ))}
                </Select>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="rounded-xl h-11 border-slate-200 text-slate-600 px-5 flex items-center gap-2 hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    const appliedFilters = {
                      'Estado': statusFilter === 'all' ? 'Todos los Estados' : statusFilter,
                      'Criticidad/Prioridad': priorityFilter === 'all' ? 'Todas las Criticidades' : priorityFilter
                    };
                    exportToStyledExcel(allFilteredData, `Reporte_Portfolio_Proyectos_Filtrado.xlsx`, title || 'Reporte de Proyectos', appliedFilters);
                  }}
                >
                   <Download size={16} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Exportar</span>
                </Button>
             </div>
          </div>

          <EnterpriseTable 
            data={allFilteredData}
            columns={displayColumnsData}
            onRowClick={(row) => setSelectedRow(row)}
            hideHeader={true}
          />
        </div>
      )}


      {/* Advanced Project Insight - Centered Floating Engine */}
      <AnimatePresence>
        {selectedRow && (
          <>
            {/* High-Performance Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRow(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] transition-all cursor-cross"
            />
            
            {/* Centered Modal Content */}
            <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8 z-[101] pointer-events-none">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-slate-100 pointer-events-auto"
              >
                {/* Visual Identity Header */}
                <div className="relative h-64 bg-slate-900 flex-shrink-0 overflow-hidden">
                  <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.25),transparent)]" />
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.1, 1], 
                        opacity: [0.3, 0.4, 0.3],
                        x: [0, 20, 0] 
                      }}
                      transition={{ duration: 15, repeat: Infinity }}
                      className="absolute -top-20 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" 
                    />
                    <motion.div 
                      animate={{ 
                        scale: [1, 1.2, 1], 
                        opacity: [0.2, 0.3, 0.2],
                        x: [0, -30, 0] 
                      }}
                      transition={{ duration: 12, repeat: Infinity, delay: 1 }}
                      className="absolute -bottom-20 -right-20 w-80 h-80 bg-brand-600/20 rounded-full blur-[80px]" 
                    />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                  </div>
                  
                  <div className="absolute top-10 left-10 right-10 flex justify-between items-start">
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                           <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                              <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">
                                 {metrics.idKey ? String(selectedRow[metrics.idKey] || 'TICKET-ID') : 'INICIATIVA ESTRATÉGICA'}
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
                      {findColumnKey(selectedRow, ['proyecto o tarea', 'summary', 'descripción', 'asunto']) ? 
                        String(selectedRow[findColumnKey(selectedRow, ['proyecto o tarea', 'summary', 'descripción', 'asunto'])!] || 'Tarea sin nombre') : 
                        'Sin Descripción Operativa'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-6 mt-6">
                       <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)] ${
                            String(selectedRow[metrics.statusKey || '']).toLowerCase().match(/done|resuelto/) ? 'bg-emerald-400' : 'bg-amber-400 shadow-amber-400/50'
                          }`} />
                          <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                             {metrics.statusKey ? String(selectedRow[metrics.statusKey] || 'N/A') : 'Estado N/A'}
                          </span>
                       </div>
                       <div className="h-4 w-px bg-white/10 hidden sm:block" />
                       <div className="flex items-center gap-2">
                          <ShieldAlert size={14} className="text-brand-400" />
                          <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                             Prioridad {metrics.priorityKey ? String(selectedRow[metrics.priorityKey] || 'Media') : 'Estándar'}
                          </span>
                       </div>
                       <div className="h-4 w-px bg-white/10 hidden sm:block" />
                       <div className="flex items-center gap-2">
                          <Network size={14} className="text-indigo-400" />
                          <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                             {metrics.providerChartData.length > 0 ? 'Multivendedor' : 'Nodo Interno'}
                          </span>
                       </div>
                    </div>
                  </div>
                </div>

                {/* Main Insight Scroll Engine */}
                <div className="flex-1 overflow-y-auto p-10 space-y-12 bg-[#fafaff] scrollbar-hide">
                  
                  {/* Executive Intelligence Grid */}
                  <section>
                     <div className="flex items-center gap-4 mb-8">
                        <div className="h-1 w-10 bg-indigo-500 rounded-full" />
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Métricas de Impacto</h4>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                          { label: 'Índice de Salud', val: String(selectedRow[metrics.statusKey || '']).toLowerCase().match(/done|resuelto/) ? '100%' : '32%', desc: 'Progreso real', color: 'emerald', icon: Activity },
                          { label: 'Prioridad Estratégica', val: String(selectedRow[metrics.priorityKey || '']).toUpperCase() || 'NORMAL', desc: 'Escalafón técnico', color: 'indigo', icon: Target }
                        ].map((stat, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:shadow-xl transition-all"
                          >
                             <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
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

                  {/* Data Clusters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {[
                    {
                      title: 'Línea de Tiempo',
                      icon: Clock,
                      color: 'indigo',
                      fields: Array.from(new Set(Object.keys(selectedRow).filter(k => k.toLowerCase().includes('fecha') || k.toLowerCase().includes('date') || k.toLowerCase().includes('creado'))))
                    },
                    {
                      title: 'Propiedad & Gobierno',
                      icon: Target,
                      color: 'emerald',
                      fields: Array.from(new Set(metrics.assigneeKeys.concat(findColumnKey(selectedRow, ['proveedor', 'vendor']) || []).filter(Boolean)))
                    }
                  ].map((block, idx) => {
                    const items = (block.fields as string[]).filter(f => selectedRow[f] && String(selectedRow[f]).trim() !== '-' && !f.startsWith('__EMPTY'));
                    if (items.length === 0) return null;

                    return (
                      <motion.section 
                        key={idx}
                        className="space-y-6"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-${block.color}-50 text-${block.color}-600`}>
                             <block.icon size={16} />
                          </div>
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{block.title}</h4>
                        </div>
                        
                        <div className="space-y-3">
                          {items.map(field => (
                            <div key={field} className="flex flex-col bg-white p-5 rounded-2xl border border-slate-100 hover:border-indigo-100/50 shadow-sm transition-all group/item">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover/item:text-indigo-500 transition-colors">{field}</span>
                               <div className="text-[14px] font-bold text-slate-800">
                                  {field.toLowerCase().includes('fecha') ? formatExcelDate(selectedRow[field]) : String(selectedRow[field])}
                               </div>
                            </div>
                          ))}
                        </div>
                      </motion.section>
                    );
                  })}
                  </div>

                  {/* Technical Deep Dive - Full Width */}
                  <section>
                    <div className="flex items-center gap-3 mb-8">
                       <div className="p-2 rounded-xl bg-slate-900 text-white">
                          <Cpu size={16} />
                       </div>
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Capa Técnica & Atributos</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                       {Array.from(new Set(Object.keys(selectedRow).filter(k => 
                          !k.toLowerCase().includes('fecha') && 
                          !metrics.assigneeKeys.includes(k) && 
                          !k.toLowerCase().includes('asunto') && 
                          !k.toLowerCase().includes('summary') && 
                          !k.toLowerCase().includes('descrip') &&
                          !k.startsWith('__EMPTY')
                       ))).map(field => {
                          const val = selectedRow[field];
                          if (!val || String(val).trim() === '-' || String(val).trim() === '') return null;
                          return (
                            <div key={field} className="p-5 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">{field}</span>
                               <span className="text-[12px] font-bold text-slate-700 leading-relaxed font-mono">{String(val)}</span>
                            </div>
                          );
                       })}
                    </div>
                  </section>
                </div>

                {/* Modal Global Footer */}
                <div className="p-10 bg-white border-t border-slate-100 flex items-center justify-between bg-gradient-to-l from-white to-slate-50">
                   <div className="flex items-center gap-10">
                      <div className="flex items-center gap-3">
                         <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center p-2 text-slate-400">
                            <FileSearch size={20} />
                         </div>
                         <div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block leading-none mb-1">Capa de Datos</span>
                            <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Registro Consolidado</span>
                         </div>
                      </div>
                   </div>
                   <button 
                     onClick={() => setSelectedRow(null)}
                     className="px-12 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:shadow-2xl transition-all active:scale-95 flex items-center gap-3 group"
                   >
                      <List size={16} className="group-hover:-translate-x-1 transition-transform" />
                      Cerrar Insight
                   </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

        </>
      )}
    </div>
  );
}
