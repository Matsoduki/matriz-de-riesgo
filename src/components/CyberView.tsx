import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Input, Select, Modal, Button } from './ui';
import { findColumnKey, formatExcelDate } from '../lib/excelParser';
import { exportToStyledExcel } from '../lib/utils';
import { Search, ShieldAlert, ShieldCheck, Shield, Lock, AlertOctagon, Activity, Layout, LogOut, Target, ArrowUpRight, AlertCircle, Info, ChevronRight, XCircle, Zap, Globe, Gauge, Download, Clock, Calendar, Users } from 'lucide-react';
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
  Line,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CYBER_SLA_POLICIES, 
  SCOPE_MAPPING, 
  AMBITO_GROUPS, 
  PriorityLevel 
} from '../constants/cyberCatalog';

interface Props {
  data: any[];
  title: string;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9'];

const PRIORITIES_COLORS: Record<string, string> = {
  'alta': '#ef4444',
  'high': '#ef4444',
  'critico': '#b91c1c',
  'crítico': '#b91c1c',
  'critica': '#b91c1c',
  'crítica': '#b91c1c',
  'media': '#f59e0b',
  'medium': '#f59e0b',
  'medio': '#f59e0b',
  'baja': '#3b82f6',
  'low': '#3b82f6',
  'bajo': '#3b82f6',
};

const STATUS_COLORS: Record<string, string> = {
  'Resuelto': '#22c55e',
  'Abierto': '#3b82f6',
  'En curso': '#eab308',
  'En progreso': '#eab308',
  'Atrasado': '#ef4444',
  'RESUELTO': '#22c55e',
  'ATRASADO': '#ef4444',
  'EN CURSO': '#eab308',
};

const displayDate = (val: any) => {
  const formatted = formatExcelDate(val);
  if (!formatted || !formatted.includes('-')) return formatted;
  const [y, m, d] = formatted.split('-');
  return `${d}/${m}/${y}`;
};

export const isCriticalPriority = (val: any) => {
  const p = String(val || '').toLowerCase().trim();
  if (p === '' || p === '-') return false;
  
  const matchesCritical = [
    'alta', 'critica', 'crítica', 'high', 'critico', 'crítico', 'p1', 'urgente', 'importante', 'criticó'
  ].some(term => p.includes(term));
  
  const isExcluded = [
    'no critico', 'no crítico', 'no criticó', 'no-critico', 'no-crítico', 'no-criticó', 'no critica', 'no crítica', 'no-crítica', 'no-critica'
  ].some(term => p.includes(term)) || (p.split(/\s+/).includes('no'));

  return matchesCritical && !isExcluded;
};

export default function CyberView({ data, title }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [prestadorFilter, setPrestadorFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [responsableFilter, setResponsableFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const cleanData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const sampleForKeys = data[0] || {};
    const assigneeKeys = ['responsable seguridad', 'responsable de seguridad', 'responsable', 'colaborador', 'backup', 'assignee', 'analista', 'usuario', 'asignado'].map(kw => findColumnKey(sampleForKeys, [kw])).filter(Boolean) as string[];
    const dateKeys = ['fecha', 'creacion', 'identificación', 'creado', 'inicio'].map(kw => findColumnKey(sampleForKeys, [kw])).filter(Boolean) as string[];

    const filtered = data.filter(row => {
      const values = Object.values(row).map(v => String(v).toLowerCase().trim());
      if (values.includes('varios elementos') || values.includes('todas')) return false;
      
      let hasAssignee = false;
      for (const key of assigneeKeys) {
        const val = String(row[key] || '').trim();
        if (val && val !== '-') {
          hasAssignee = true;
          break;
        }
      }

      let hasDate = false;
      for (const key of dateKeys) {
        const val = String(row[key] || '').trim();
        if (val && val !== '-') {
          hasDate = true;
          break;
        }
      }

      if (!hasAssignee || !hasDate) return false;

      return true;
    });

    return filtered;
  }, [data]);

  const keys = useMemo(() => {
    if (cleanData.length === 0) return null;
    const sample = cleanData[0];
    return {
      statusKey: findColumnKey(sample, ['semaforo', 'status', 'estado']),
      priorityKey: findColumnKey(sample, ['criticidad', 'priority', 'prioridad', 'riesgo', 'nivel', 'gravedad']),
      assigneeKeys: ['responsable seguridad', 'responsable de seguridad', 'responsable', 'colaborador', 'backup', 'assignee', 'analista', 'usuario', 'asignado'].map(kw => findColumnKey(sample, [kw])).filter(Boolean) as string[],
      prestadorKey: findColumnKey(sample, ['prestador', 'proveedor', 'vendor', 'partner', 'empresa']),
      categoryKey: findColumnKey(sample, ['categoría', 'categoria', 'category', 'ámbito', 'ambito']),
      projectKey: findColumnKey(sample, ['proyecto', 'tarea']),
      gapKey: findColumnKey(sample, ['gaps', 'gap']),
      vulnKey: findColumnKey(sample, ['vulnerabilidades', 'vulnerabilidad']),
      mitigationKey: findColumnKey(sample, ['plan de mitigación', 'mitigacion', 'plan']),
      idKey: findColumnKey(sample, ['nro.', 'numero', 'id']),
      dateKey: findColumnKey(sample, ['fecha', 'creacion', 'identificación'])
    };
  }, [cleanData]);

  const filteredData = useMemo(() => {
    let result = cleanData;

    if (searchTerm) {
      result = result.filter(row => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (prestadorFilter !== 'all' && keys?.prestadorKey) {
      result = result.filter(row => String(row[keys.prestadorKey]) === prestadorFilter);
    }

    if (priorityFilter !== 'all' && keys?.priorityKey) {
      result = result.filter(row => String(row[keys.priorityKey]) === priorityFilter);
    }

    if (responsableFilter !== 'all' && keys?.assigneeKeys && keys.assigneeKeys.length > 0) {
      result = result.filter(row => {
         let resp = 'S/A';
         for (const key of keys.assigneeKeys) {
            const val = String(row[key] || '').trim();
            if (val && val !== '-' && val.toLowerCase() !== 'sin asignar') {
               resp = val;
               break;
            }
         }
         return resp === responsableFilter;
      });
    }

    if (statusFilter !== 'all' && keys?.statusKey) {
      result = result.filter(row => String(row[keys.statusKey] || 'No Definido') === statusFilter);
    }

    if (slaFilter !== 'all') {
      result = result.filter(row => {
        const priorityRaw = String(row[keys?.priorityKey || ''] || '').trim();
        const priorityLower = priorityRaw.toLowerCase();
        const isCritical = isCriticalPriority(priorityRaw);
        let policyLevel: PriorityLevel = 'Bajo';
        if (isCritical) policyLevel = 'Crítico';
        else if (priorityLower.includes('alta')) policyLevel = 'Alto';
        else if (priorityLower.includes('media') || priorityLower.includes('medium')) policyLevel = 'Medio';

        const policy = CYBER_SLA_POLICIES[policyLevel];
        const isExternal = String(row[keys?.prestadorKey || '']).toLowerCase() !== 'interno' && String(row[keys?.prestadorKey || '']) !== '-';
        const threshold = isExternal ? policy.external : policy.internal;
        const delayDays = Number(row['Dias de atraso'] || row['Atraso'] || 0);
        const isOffPolicy = delayDays > threshold;

        return slaFilter === 'Atrasado' ? isOffPolicy : !isOffPolicy;
      });
    }

    if (categoryFilter !== 'all') {
      result = result.filter(row => {
        let cat = 'Sin Categoría Definida';
        if (keys?.categoryKey && row[keys.categoryKey]) {
            cat = String(row[keys.categoryKey]).trim();
        } else {
            const projectTaskRaw = String(row[keys?.projectKey || 'PROYECTO O TAREA'] || row['Proyecto'] || row['Tarea'] || '').trim();
            if (projectTaskRaw !== '-' && projectTaskRaw !== '') {
               const lowerRaw = projectTaskRaw.toLowerCase();
               for (const [key, val] of Object.entries(SCOPE_MAPPING)) {
                   if (lowerRaw.includes(key)) {
                      cat = val;
                      break;
                   }
               }
            }
        }
        return cat === categoryFilter;
      });
    }
    
    if (projectFilter !== 'all') {
      result = result.filter(row => {
        let proj = String(row[keys?.projectKey || 'PROYECTO O TAREA'] || row['Proyecto'] || row['Tarea'] || '').trim();
        if (!proj || proj === '-') proj = 'Sin Proyecto Definido';
        return proj === projectFilter;
      });
    }

    return result;
  }, [cleanData, searchTerm, prestadorFilter, priorityFilter, responsableFilter, statusFilter, slaFilter, categoryFilter, projectFilter, keys]);

  const metrics = useMemo(() => {
    const initialState = { 
      total: 0, activeGaps: 0, totalDelayed: 0, weightedRiskScore: 0,
      monthlyTrends: [], cumulativeTrends: [], vendorImpact: [], healthScore: 100, coverage: 0, criticalDensity: 0, mttc: 0,
      prestadores: [], priorities: [], responsables: [], statuses: [], slas: [], strategics: [], ambitos: [],
      responsableCounts: {}, prestadorCount: {}, priorityCount: {}, statusCount: {}, slaCount: {}, strategicCount: {}, ambitoCount: {},
      governanceGaps: 0, strategicChartData: [], ambitoChartData: [],
      ...keys
    };

    if (!filteredData || filteredData.length === 0) return initialState;

    const { statusKey, priorityKey, assigneeKeys, prestadorKey, dateKey } = keys!;
    
    let activeGaps = 0;
    let totalDelayed = 0;
    let weightedRiskScore = 0;
    let governanceGaps = 0;
    
    const prestadorCount: Record<string, number> = {};
    const priorityCount: Record<string, number> = {};
    const responsableCount: Record<string, number> = {};
    const statusCount: Record<string, number> = {};
    const slaCount: Record<string, number> = { 'En Tiempo': 0, 'Atrasado': 0 };
    const strategicCount: Record<string, number> = {};
    const ambitoCount: Record<string, number> = {};
    const timelineMap: Record<string, number> = {};
    
    const strategicCategories: Record<string, { total: number, critical: number, delayed: number }> = {};
    const ambitoImpact: Record<string, { total: number, critical: number }> = {};

    filteredData.forEach(row => {
      const priorityRaw = String(row[priorityKey || ''] || '').trim();
      const priorityLower = priorityRaw.toLowerCase();
      const isCritical = isCriticalPriority(priorityRaw);

      let isOffPolicy = false;
      const delayDays = Number(row['Dias de atraso'] || row['Atraso'] || 0);
      
      let policyLevel: PriorityLevel = 'Bajo';
      if (isCritical) policyLevel = 'Crítico';
      else if (priorityLower.includes('alta')) policyLevel = 'Alto';
      else if (priorityLower.includes('media') || priorityLower.includes('medium')) policyLevel = 'Medio';

      const policy = CYBER_SLA_POLICIES[policyLevel];
      const isExternal = String(row[prestadorKey || '']).toLowerCase() !== 'interno' && String(row[prestadorKey || '']) !== '-';
      
      const threshold = isExternal ? policy.external : policy.internal;
      if (delayDays > threshold) {
        isOffPolicy = true;
        totalDelayed++;
      }

      let strategicCategory = 'Sin Categoría Definida';
      if (keys?.categoryKey && row[keys.categoryKey]) {
          strategicCategory = String(row[keys.categoryKey]).trim() || 'Sin Categoría Definida';
      } else {
          const projectTaskRaw = String(row[keys?.projectKey || 'PROYECTO O TAREA'] || row['Proyecto'] || row['Tarea'] || '').trim();
          if (projectTaskRaw !== '-' && projectTaskRaw !== '') {
             const lowerRaw = projectTaskRaw.toLowerCase();
             let matched = false;
             for (const [key, val] of Object.entries(SCOPE_MAPPING)) {
                 if (lowerRaw.includes(key)) {
                    strategicCategory = val;
                    matched = true;
                    break;
                 }
             }
             if (!matched) strategicCategory = 'Otros/No Categorizados';
          }
      }
      
      if (strategicCategory === 'Otros/No Categorizados' || strategicCategory === 'Sin Categoría Definida') governanceGaps++;
      
      if (!strategicCategories[strategicCategory]) {
        strategicCategories[strategicCategory] = { total: 0, critical: 0, delayed: 0 };
      }
      strategicCategories[strategicCategory].total++;
      if (isCritical) strategicCategories[strategicCategory].critical++;
      if (isOffPolicy) strategicCategories[strategicCategory].delayed++;

      let ambitoGroup = String(row[keys?.projectKey || 'PROYECTO O TAREA'] || row['Proyecto'] || row['Tarea'] || '').trim();
      if (!ambitoGroup || ambitoGroup === '-') ambitoGroup = 'Sin Proyecto Definido';
      
      if (!ambitoImpact[ambitoGroup]) ambitoImpact[ambitoGroup] = { total: 0, critical: 0 };
      ambitoImpact[ambitoGroup].total++;
      if (isCritical) ambitoImpact[ambitoGroup].critical++;

      if (isCritical) weightedRiskScore += 3;
      else if (priorityLower.includes('media')) weightedRiskScore += 2;
      else weightedRiskScore += 1;

      if (priorityKey && row[priorityKey]) {
        priorityCount[priorityRaw.toUpperCase()] = (priorityCount[priorityRaw.toUpperCase()] || 0) + 1;
      }

      if (dateKey && row[dateKey]) {
        const d = formatExcelDate(row[dateKey]);
        if (d && d.includes('-')) {
          const parts = d.split('-'); 
          const monthYear = `${parts[1]}/${parts[0]}`; 
          timelineMap[monthYear] = (timelineMap[monthYear] || 0) + 1;
        }
      }

      if (assigneeKeys && assigneeKeys.length > 0) {
        let resp = '';
        for (const key of assigneeKeys) {
           const val = String(row[key] || '').trim();
           if (val && val !== '-') {
              resp = val;
              break;
           }
        }
        if (resp) {
          responsableCount[resp] = (responsableCount[resp] || 0) + 1;
        }
      }

      if (statusKey && row[statusKey]) {
        const estado = String(row[statusKey]);
        statusCount[estado] = (statusCount[estado] || 0) + 1;
      }
      slaCount[isOffPolicy ? 'Atrasado' : 'En Tiempo']++;
      strategicCount[strategicCategory] = (strategicCount[strategicCategory] || 0) + 1;
      ambitoCount[ambitoGroup] = (ambitoCount[ambitoGroup] || 0) + 1;

      if (prestadorKey && row[prestadorKey]) {
        const prestador = String(row[prestadorKey]);
        if (prestador && prestador.toLowerCase() !== 'no aplica' && prestador !== '-') {
          prestadorCount[prestador] = (prestadorCount[prestador] || 0) + 1;
        }
      }

      if (statusKey && row[statusKey]) {
        const status = String(row[statusKey]).toLowerCase();
        if (!status.includes('resuelto') && !status.includes('cerrado') && !status.includes('done')) {
          activeGaps++;
        }
      }
    });

    const strategicChartData = Object.entries(strategicCategories).map(([name, stats]) => ({
      name,
      ...stats,
      compliance: Math.round(((stats.total - stats.delayed) / stats.total) * 100)
    })).sort((a, b) => b.critical - a.critical);

    const ambitoChartData = Object.entries(ambitoImpact).map(([name, stats]) => ({
      name,
      total: stats.total,
      critical: stats.critical,
      riskRatio: Math.round((stats.critical / stats.total) * 100)
    })).sort((a,b) => b.critical - a.critical);

    const chiVal = Math.round(100 - (activeGaps / (filteredData.length || 1) * 20) - (totalDelayed / (filteredData.length || 1) * 80));
    const coverage = Math.round(((filteredData.length - governanceGaps) / (filteredData.length || 1)) * 100);
    const criticalDensity = Math.round((filteredData.filter(r => isCriticalPriority(r[priorityKey])).length / (filteredData.length || 1)) * 100);
    
    const mttc = Math.round(filteredData.reduce((acc, r) => acc + (Number(r['Dias de atraso'] || 0)), 0) / (filteredData.length || 1));

    const monthlyTrends = Object.entries(filteredData.reduce((acc: Record<string, any>, row) => {
      const fieldVal = row[dateKey || ''];
      let month = 'Sin Fecha';
      if (fieldVal) {
        const d = formatExcelDate(fieldVal);
        if (d && d.match(/^\d{4}-\d{2}/)) {
          month = d.substring(0, 7);
        }
      }
      
      if (!acc[month]) acc[month] = { count: 0, critical: 0, resolved: 0 };
      acc[month].count += 1;
      if (isCriticalPriority(row[priorityKey])) {
         acc[month].critical += 1;
      }
      const status = String(row[statusKey || '']).toLowerCase();
      if (status.includes('resuelto') || status.includes('cerrado') || status.includes('completado') || status.includes('done') || status.includes('mitigado')) {
         acc[month].resolved += 1;
      }

      return acc;
    }, {}))
      .map(([month, stats]: [string, any]) => ({ 
         month, 
         count: stats.count, 
         critical: stats.critical, 
         resolved: stats.resolved 
      }))
      .sort((a, b) => {
         if (a.month === 'Sin Fecha') return -1;
         if (b.month === 'Sin Fecha') return 1;
         return a.month.localeCompare(b.month);
      });

    // Make it cumulative so it reaches 141 and isn't flat
    let cumCount = 0;
    let cumCritical = 0;
    let cumResolved = 0;
    const cumulativeTrends = monthlyTrends.map(item => {
      cumCount += item.count;
      cumCritical += item.critical;
      cumResolved += item.resolved;
      return {
        month: item.month,
        count: cumCount,
        critical: cumCritical,
        resolved: cumResolved,
        newThisMonth: item.count
      };
    });

    const vendorImpact = Object.entries(filteredData.reduce((acc: Record<string, { total: number, critical: number }>, row) => {
      const vendorRaw = row[prestadorKey || ''] || row['Prestador'] || row['Proveedor'] || row['Vendor'] || 'Interno';
      const vendor = String(vendorRaw).trim();
      if (vendor === '-' || !vendor || vendor.toLowerCase() === 'no aplica') return acc;
      if (!acc[vendor]) acc[vendor] = { total: 0, critical: 0 };
      acc[vendor].total++;
      
      if (isCriticalPriority(row[priorityKey || ''])) acc[vendor].critical++;
      return acc;
    }, {}))
      .map(([name, stats]: [string, any]) => ({ name, total: stats.total, critical: stats.critical }))
      .sort((a, b) => b.critical - a.critical || b.total - a.total);

    return { 
      total: filteredData.length, activeGaps, totalDelayed, weightedRiskScore, governanceGaps, 
      monthlyTrends, cumulativeTrends, vendorImpact, strategicChartData, ambitoChartData, chiVal, coverage, criticalDensity, mttc,
      healthScore: chiVal, prestadores: Object.keys(prestadorCount), priorities: Object.keys(priorityCount),
      responsables: Object.keys(responsableCount).sort(), responsableCounts: responsableCount,
      prestadorCount: prestadorCount, priorityCount: priorityCount,
      statuses: Object.keys(statusCount).sort(), statusCount,
      slas: ['En Tiempo', 'Atrasado'], slaCount,
      strategics: Object.keys(strategicCount).sort(), strategicCount,
      ambitos: Object.keys(ambitoCount).sort(), ambitoCount,
      ...keys
    };
  }, [filteredData, keys]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const [trendViewType, setTrendViewType] = useState<'cumulative' | 'monthly'>('cumulative');
  const [trendTimeFilter, setTrendTimeFilter] = useState<'all' | '6m' | '3m'>('all');
  const [showValueHub, setShowValueHub] = useState(false);

  const vendorDetailData = useMemo(() => {
    if (!selectedVendor) return [];
    return filteredData.filter(row => {
      const vendorRaw = row[keys?.prestadorKey || ''] || row['Prestador'] || row['Proveedor'] || row['Vendor'] || 'Interno';
      return String(vendorRaw).trim() === selectedVendor;
    });
  }, [selectedVendor, filteredData, keys]);

  const trendChartData = useMemo(() => {
    let sourceData = trendViewType === 'cumulative' ? metrics.cumulativeTrends : metrics.monthlyTrends;
    let sorted = [...(sourceData || [])];
    if (trendTimeFilter !== 'all') {
      const limit = trendTimeFilter === '3m' ? 3 : 6;
      const dateItems = sorted.filter(s => s.month !== 'Sin Fecha');
      sorted = dateItems.slice(-limit);
    }
    return sorted.length > 0 ? sorted : [{ month: 'N/A', count: 0, critical: 0, resolved: 0, newThisMonth: 0 }];
  }, [metrics.monthlyTrends, metrics.cumulativeTrends, trendViewType, trendTimeFilter]);

  const valueInsights = [
    { title: "Integridad de Defensa", desc: "Mide la salud general de las operaciones. Penaliza la acumulación de incidentes y castiga fuertemente las tareas fuera de SLA.", impact: `Score actual: ${metrics.chiVal}%`, icon: ShieldCheck, color: "text-emerald-400" },
    { title: "Gobernanza de Activos", desc: "Porcentaje de higiene: mide qué porción de los registros logró ser vinculada exitosamente a un proyecto o dominio estratégico.", impact: `Mapeado: ${metrics.coverage}%`, icon: Globe, color: "text-brand-400" },
    { title: "Densidad Exposición", desc: "Qué proporción de toda tu base de observaciones o brechas está marcada con severidad o prioridad crítica.", impact: `Gravedad: ${metrics.criticalDensity}%`, icon: AlertCircle, color: "text-rose-400" },
    { title: "MTTC Remediation", desc: "Mean Time To Close: muestra el promedio general de días de atraso a lo largo de toda la cartera de acción.", impact: `Retraso medio: ${metrics.mttc} días`, icon: Activity, color: "text-amber-400" }
  ];

  const displayColumns = useMemo(() => {
    if (!cleanData || cleanData.length === 0) return [];
    return Object.keys(cleanData[0]).filter(k => {
      if (k.startsWith('__EMPTY')) return false;
      const lower = k.toLowerCase().trim();
      return lower !== 'año' && lower !== 'mes' && lower !== 'semana' && lower !== 'día' && lower !== '(varios elementos)' && lower !== '(todas)';
    });
  }, [cleanData]);

  if (!cleanData || cleanData.length === 0) return null;

  return (
    <div className="space-y-8 pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
         <div>
            <div className="flex items-center gap-4 mb-4">
               <div className="h-4 w-1 bg-brand-600 rounded-full" />
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">Risk Management Ecosystem</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Mando & Control <span className="text-brand-600">Ciberseguridad</span></h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">Visualización táctica de KPIs y resiliencia corporativa.</p>
         </div>
         <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <button onClick={() => {
                exportToStyledExcel(filteredData, 'Reporte_Mando_Y_Control_Filtrado.xlsx', 'Reporte Consolidado Ciberseguridad');
            }} className="flex items-center gap-4 px-6 py-4 bg-white text-slate-800 rounded-[2rem] shadow-xl hover:bg-slate-50 transition-all border border-slate-200 group">
               <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500 group-hover:scale-110 transition-transform"><Download size={18} /></div>
               <div className="text-left hidden sm:block">
                  <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-slate-400">Descargar</div>
                  <div className="text-sm font-black tracking-tight">Exportar Vista</div>
               </div>
            </button>
            <button onClick={() => setShowValueHub(!showValueHub)} className="flex items-center gap-4 px-8 py-4 bg-slate-900 text-white rounded-[2rem] shadow-2xl hover:bg-slate-800 transition-all group border border-white/10 ring-8 ring-slate-100">
               <div className="p-2 bg-brand-500/20 rounded-xl text-brand-400 group-hover:scale-110 transition-transform"><Target size={18} /></div>
               <div className="text-left">
                  <div className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-slate-400">Diccionario de Datos</div>
                  <div className="text-base font-black tracking-tight flex items-center gap-2">Definición de KPIs <ChevronRight size={16} className={`transition-transform duration-500 ${showValueHub ? 'rotate-90' : ''}`} /></div>
               </div>
            </button>
         </div>
      </div>

      <AnimatePresence>
        {showValueHub && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-8 bg-slate-900 rounded-[2.5rem] border border-white/5 shadow-2xl relative">
              <button onClick={() => setShowValueHub(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><XCircle size={20} /></button>
              {valueInsights.map((insight, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-xl bg-white/5 ${insight.color}`}><insight.icon size={18} /></div>
                     <h5 className="text-xs font-black text-white uppercase tracking-tight">{insight.title}</h5>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{insight.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-2xl bg-[#0F1115] text-white rounded-[2.5rem] border border-white/5">
          <CardContent className="p-8">
            <div className="flex items-center gap-2 mb-8">
               <div className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
               <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Nivel de Integridad de Defensa</p>
            </div>
            <h3 className="text-7xl font-black tracking-tighter leading-none mb-6 text-white">
              {metrics.chiVal}<span className="text-3xl text-white/50 ml-1">%</span>
            </h3>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
               <motion.div initial={{ width: 0 }} animate={{ width: `${metrics.chiVal}%` }} transition={{ duration: 2 }} className="h-full bg-brand-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            </div>
          </CardContent>
        </Card>

        {[
          { label: 'Gob. de Activos', val: metrics.coverage, icon: Globe, color: 'brand' },
          { label: 'Densidad Exposición', val: metrics.criticalDensity, icon: AlertCircle, color: 'rose' },
          { label: 'MTTC Remediation', val: metrics.mttc, icon: Activity, color: 'amber', suffix: 'días' }
        ].map((kpi, idx) => (
          <Card key={idx} className="border-0 shadow-xl bg-white rounded-[2.5rem] border border-slate-100 p-10">
            <div className="flex justify-between items-start mb-10">
               <div>
                  <div className={`flex items-center gap-2 mb-1`}>
                    <div className={`h-1 w-4 bg-${kpi.color}-500 rounded-full`} />
                    <p className={`text-${kpi.color}-500 text-[10px] font-black uppercase tracking-[0.2em]`}>{kpi.label}</p>
                  </div>
                  <h4 className="text-md font-black text-slate-800 uppercase tracking-tighter">{kpi.label}</h4>
               </div>
               <div className={`p-4 rounded-xl bg-${kpi.color}-50 text-${kpi.color}-600`}><kpi.icon size={20} /></div>
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-5xl font-black text-slate-900 tracking-tighter font-mono">{kpi.val}{!kpi.suffix && '%'}</span>
               {kpi.suffix && <span className="text-xs font-black text-slate-400 uppercase">{kpi.suffix}</span>}
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Historical Trends */}
        <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden relative break-inside-avoid flex flex-col h-[500px]">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02]" />
            <CardHeader className="p-10 md:p-14 border-b border-slate-50 relative z-10 shrink-0">
               <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-500 mb-3 flex items-center gap-2">
                        <Gauge size={14} /> Evolución Continua
                     </p>
                     <h4 className="text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase">Tendencia Histórica</h4>
                     <p className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">
                        Volumen de incidentes e identificaciones en el tiempo
                     </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                     <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100/50">
                        <button onClick={() => setTrendViewType('cumulative')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${trendViewType === 'cumulative' ? 'bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Acumulado</button>
                        <button onClick={() => setTrendViewType('monthly')} className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${trendViewType === 'monthly' ? 'bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>Mensual</button>
                     </div>
                     <select value={trendTimeFilter} onChange={(e) => setTrendTimeFilter(e.target.value as any)} className="bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer">
                        <option value="all">Todo Histórico</option>
                        <option value="6m">Últimos 6 Meses</option>
                        <option value="3m">Últimos 3 Meses</option>
                     </select>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-10 md:p-14 relative z-10 bg-slate-50/50 flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800, textAnchor: 'middle' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                      dx={-10}
                    />
                    <Tooltip
                      cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                      content={({ active, payload, label }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/90 backdrop-blur-xl border border-slate-100 rounded-3xl p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{label}</p>
                               <div className="space-y-3 relative z-10">
                                  {trendViewType === 'cumulative' && (
                                  <div className="flex items-center justify-between gap-8 bg-slate-50 p-2 rounded-xl -mx-2 mb-2">
                                     <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/30 animate-pulse" />
                                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Nuevos (Mes)</span>
                                     </div>
                                     <span className="text-sm font-black text-indigo-700 font-mono">+{payload.find((p: any) => p.dataKey === 'count' || p.dataKey === 'newThisMonth')?.payload?.newThisMonth || 0}</span>
                                  </div>
                                  )}
                                  <div className="flex items-center justify-between gap-8">
                                     <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-slate-300" />
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{trendViewType === 'cumulative' ? 'Total Acumulado' : 'Total (Mes)'}</span>
                                     </div>
                                     <span className="text-sm font-black text-slate-800 font-mono">{payload.find((p: any) => p.dataKey === 'count')?.value || 0}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-8">
                                     <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30" />
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Resueltos</span>
                                     </div>
                                     <span className="text-sm font-black text-emerald-600 font-mono">{payload.find((p: any) => p.dataKey === 'resolved')?.value || 0}</span>
                                  </div>
                                  <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-100 to-transparent my-1" />
                                  <div className="flex items-center justify-between gap-8">
                                     <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-rose-500 shadow-lg shadow-rose-500/30 animate-pulse" />
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alta Criticidad</span>
                                     </div>
                                     <span className="text-sm font-black text-rose-600 font-mono">{payload.find((p: any) => p.dataKey === 'critical')?.value || 0}</span>
                                  </div>
                               </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {trendViewType === 'cumulative' && (
                       <Bar 
                         dataKey="newThisMonth" 
                         fill="#e2e8f0" 
                         radius={[4, 4, 0, 0]} 
                         barSize={20}
                       />
                    )}
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      name="Total"
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fill="url(#colorTotal)"
                      activeDot={{ r: 4, strokeWidth: 0, fill: '#94a3b8', stroke: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="resolved" 
                      name="Resueltos"
                      stroke="#10b981" 
                      strokeWidth={3}
                      fill="url(#colorResolved)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981', stroke: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="critical" 
                      name="Críticos"
                      stroke="#f43f5e" 
                      strokeWidth={3}
                      fill="url(#colorCritical)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#f43f5e', stroke: '#fff' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden relative break-inside-avoid flex flex-col h-[500px]">
             <CardHeader className="border-b border-slate-50 p-10 md:p-14 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 shrink-0">
                <div>
                   <div className="flex items-center gap-3 mb-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
                      <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Concentración de Riesgo</div>
                   </div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none uppercase">Riesgo por Socio</h3>
                  <div className="text-[10px] font-black text-slate-400 uppercase mt-2 tracking-widest">Criticidad por entidad externa</div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-rose-50 rounded-2xl text-rose-500 border border-rose-100/50">
                      <ShieldAlert size={20} />
                   </div>
                </div>
             </CardHeader>
             <CardContent className="p-0 overflow-y-auto flex-1 min-h-0">
                <div className="divide-y divide-slate-100">
                   {metrics.vendorImpact.slice(0, 8).map((item: any, i: number) => (
                     <div key={i} className="px-10 py-6 flex items-center justify-between group hover:bg-slate-50/50 transition-all cursor-pointer relative overflow-hidden" onClick={() => setSelectedVendor(item.name)}>
                       <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out" />
                       
                       <div className="flex flex-col w-40 shrink-0">
                         <span className="text-[11px] font-black text-slate-900 truncate uppercase tracking-tight group-hover:text-brand-600 transition-colors mb-2">{item.name}</span>
                         <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.total} ACT.</span>
                         </div>
                       </div>

                       <div className="flex-1 px-4 min-w-0">
                          <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                             <div className="absolute inset-0 bg-gradient-to-r from-slate-200/20 to-transparent" />
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${item.total > 0 ? (item.critical / item.total) * 100 : 0}%` }}
                               transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                               className={`h-full relative rounded-full ${
                                 item.critical > 0 
                                 ? 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.3)]' 
                                 : 'bg-gradient-to-r from-brand-500 to-brand-400'
                               }`}
                             />
                          </div>
                       </div>

                       <div className="w-28 text-right shrink-0">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${item.critical > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}>
                             <span className="text-[9px] font-black uppercase tracking-widest">{item.critical} CRIT</span>
                             <div className={`h-1.5 w-1.5 rounded-sm ${item.critical > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          </div>
                       </div>
                     </div>
                   ))}
                </div>
             </CardContent>
          </Card>
      </div>



      {/* Main Log */}
      <Card className="border-0 shadow-xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-12">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
            <div className="space-y-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Tactical Integrity Log</span>
               <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">Gobernanza de Operaciones</h3>
               <p className="text-sm text-slate-500 font-medium max-w-xl">Auditoría centralizada de activos de ciberseguridad y estados de cumplimiento normativo.</p>
            </div>
            <div className="flex flex-col gap-4 w-full xl:w-auto mt-6 xl:mt-0">
              <div className="relative w-full">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Filtrar por nodo, responsable o entidad..." className="pl-14 bg-white border-slate-200 h-14 rounded-2xl text-sm font-semibold shadow-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-3 w-full justify-end max-w-4xl">
                <Select value={prestadorFilter} onChange={(e) => setPrestadorFilter(e.target.value)} className="bg-white border-slate-200 h-10 lg:h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 shadow-sm w-[48%] md:w-auto flex-1 min-w-[120px]">
                  <option value="all">Socio ({metrics.total})</option>
                  {metrics.prestadores.map((v: any) => <option key={v} value={v}>{v} ({metrics.prestadorCount[v]})</option>)}
                </Select>
                <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="bg-white border-slate-200 h-10 lg:h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 shadow-sm w-[48%] md:w-auto flex-1 min-w-[120px]">
                  <option value="all">Criticidad</option>
                  {metrics.priorities.map((p: any) => <option key={p} value={p}>{p} ({metrics.priorityCount[p]})</option>)}
                </Select>
                <Select value={responsableFilter} onChange={(e) => setResponsableFilter(e.target.value)} className="bg-white border-slate-200 h-10 lg:h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 shadow-sm w-[48%] md:w-auto flex-1 min-w-[120px]">
                  <option value="all">Resp.</option>
                  {metrics.responsables.map((r: any) => <option key={r} value={r}>{r} ({metrics.responsableCounts[r]})</option>)}
                </Select>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border-slate-200 h-10 lg:h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 shadow-sm w-[48%] md:w-auto flex-1 min-w-[120px]">
                  <option value="all">Estado</option>
                  {metrics.statuses.map((s: any) => <option key={s} value={s}>{s} ({metrics.statusCount[s]})</option>)}
                </Select>
                <Select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} className="bg-white border-slate-200 h-10 lg:h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 shadow-sm w-[48%] md:w-auto flex-1 min-w-[120px]">
                  <option value="all">SLA</option>
                  {metrics.slas.map((s: any) => <option key={s} value={s}>{s} ({metrics.slaCount[s]})</option>)}
                </Select>
                <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-white border-slate-200 h-10 lg:h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 shadow-sm w-[48%] md:w-auto flex-1 min-w-[120px]">
                  <option value="all">Categoría</option>
                  {metrics.strategics.map((s: any) => <option key={s} value={s}>{s} ({metrics.strategicCount[s]})</option>)}
                </Select>
                <Select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="bg-white border-slate-200 h-10 lg:h-12 rounded-xl text-[10px] font-black uppercase tracking-widest px-4 shadow-sm w-full md:w-auto flex-1 md:min-w-[160px] max-w-full">
                  <option value="all">Proyecto / Tarea</option>
                  {metrics.ambitos.map((a: any) => <option key={a} value={a}>{a} ({metrics.ambitoCount[a]})</option>)}
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#fbfcff] border-b border-slate-100">
                <tr>
                  {displayColumns.map(key => (
                    <th key={key} scope="col" className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 whitespace-nowrap border-r border-slate-100 last:border-0 font-sans">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((row, i) => (
                  <tr key={i} className="group hover:bg-slate-50 transition-all duration-300 cursor-pointer" onClick={() => setSelectedRow(row)}>
                    {displayColumns.map((key) => {
                       const isSemaforo = key.toLowerCase() === 'semaforo' || key.toLowerCase() === 'status' || key.toLowerCase() === 'estado';
                       const isPriority = key.toLowerCase().includes('criticid') || key.toLowerCase().includes('prioridad');
                       let val = row[key];
                       if (key.toLowerCase().includes('fecha')) val = displayDate(val);
                       val = val !== undefined && val !== null ? String(val) : '';
                       return (
                         <td key={`${i}-${key}`} className="px-10 py-8 max-w-[400px] truncate border-r border-slate-50 last:border-0">
                           {isSemaforo ? (
                              <div className="inline-flex items-center px-5 py-2.5 rounded-2xl border" style={{ backgroundColor: `${STATUS_COLORS[String(val).trim()] || '#64748b'}10`, color: STATUS_COLORS[String(val).trim()] || '#475569', borderColor: `${STATUS_COLORS[String(val).trim()] || '#cbd5e1'}40` }}>
                                <div className="w-2 h-2 rounded-full mr-4" style={{ backgroundColor: STATUS_COLORS[String(val).trim()] || '#64748b' }}></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{String(val)}</span>
                              </div>
                           ) : isPriority ? (
                              <span className="text-[11px] font-black uppercase tracking-[0.05em] flex items-center gap-4">
                                 <div className="w-2 h-5 rounded-full" style={{ backgroundColor: PRIORITIES_COLORS[String(val).toLowerCase().trim()] || '#cbd5e1' }} />
                                 {String(val)}
                              </span>
                           ) : <span className="text-xs font-bold text-slate-800 font-mono tracking-tight leading-none whitespace-nowrap">{val || '-'}</span>}
                         </td>
                       );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-12 bg-slate-50/50 flex justify-between items-center">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{paginatedData.length} <span className="text-slate-400">/ {filteredData.length} Entradas</span></p>
            <div className="flex gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-12 px-6 border border-slate-200 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20">Anterior</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-12 px-6 border border-slate-200 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20">Siguiente</button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={!!selectedVendor} onClose={() => setSelectedVendor(null)} title={`Desglose de Riesgo: ${selectedVendor}`}>
        {selectedVendor && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 md:p-10 rounded-3xl text-white relative overflow-hidden">
               {/* Background accents */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
               <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-brand-500/10 rounded-full blur-2xl translate-y-1/2" />
               
               <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                       <Shield className="text-indigo-400" size={16} />
                       <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.25em]">Análisis de Socio Estratégico</p>
                    </div>
                    <h3 className="text-3xl font-black tracking-tighter text-white drop-shadow-sm">{selectedVendor}</h3>
                  </div>
                  
                  <div className="flex bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl p-4 gap-8">
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Layout size={12}/> Total</p>
                       <p className="text-3xl font-black text-white">{vendorDetailData.length}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><AlertOctagon size={12}/> Críticos</p>
                       <p className="text-3xl font-black text-red-500">{vendorDetailData.filter(r => isCriticalPriority(r[keys?.priorityKey || ''])).length}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><LogOut size={12}/> Atrasados</p>
                       <p className="text-3xl font-black text-amber-400">{vendorDetailData.filter(r => Number(r['Dias de atraso'] || 0) > 0).length}</p>
                    </div>
                  </div>
               </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
               {vendorDetailData.map((row, idx) => (
                 <div key={idx} className="p-5 rounded-[1.25rem] bg-slate-50 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between group hover:border-indigo-300 transition-all cursor-pointer" onClick={() => setSelectedRow(row)}>
                    <div className="flex-1 pr-8 mb-4 sm:mb-0">
                       <p className="text-xs font-black text-slate-800 uppercase tracking-tight mb-2 line-clamp-1 group-hover:text-indigo-700 transition-colors">{row[keys?.gapKey || 'GAP'] || row[keys?.vulnKey || 'Vulnerabilidades'] || 'Hallazgo'}</p>
                       <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-600">
                             {row[keys?.statusKey || 'Status']}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                             <Target size={12}/> {
                                (() => {
                                   if (!keys?.assigneeKeys) return 'S/A';
                                   for (const key of keys.assigneeKeys) {
                                      const val = String(row[key] || '').trim();
                                      if (val && val !== '-') return val;
                                   }
                                   return 'S/A';
                                })()
                             }
                          </span>
                       </div>
                    </div>
                    <div className="text-right sm:w-32 flex flex-col items-start sm:items-end gap-2">
                       <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 shadow-sm ${isCriticalPriority(row[keys?.priorityKey || '']) ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-slate-600 border border-slate-200'}`}>
                          {isCriticalPriority(row[keys?.priorityKey || '']) && <div className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"/>}
                          {row[keys?.priorityKey || '']}
                       </div>
                       {Number(row['Dias de atraso'] || 0) > 0 && (
                          <span className="text-[9px] font-bold text-red-600 tracking-widest uppercase">
                             +{row['Dias de atraso']} Días Atraso
                          </span>
                       )}
                    </div>
                 </div>
               ))}
            </div>
            
            <div className="pt-4 flex gap-4">
               <Button className="flex-1 h-14 rounded-2xl bg-slate-900 border-2 border-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg" onClick={() => setSelectedVendor(null)}>Cerrar Análisis</Button>
               <Button className="h-14 px-6 rounded-2xl bg-indigo-50 border-2 border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-colors font-black text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-sm" onClick={() => exportToStyledExcel(vendorDetailData, `Riesgo_${selectedVendor}.xlsx`, `Reporte de Riesgo: ${selectedVendor}`)}>
                  <Download size={18} /> Exportar Excel
               </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!selectedRow} onClose={() => setSelectedRow(null)} title={selectedRow ? `Caso de Inteligencia Cibernética: ${metrics?.idKey && selectedRow[metrics.idKey] ? selectedRow[metrics.idKey] : 'DETALLE'}` : 'Detalle del Caso'}>
        {selectedRow && (
          <div className="space-y-6">
            <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-20"><ShieldAlert size={120} /></div>
               <p className="text-brand-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 relative z-10 flex items-center gap-2"><Activity size={14} /> Detalle de Incidencia / GAP</p>
               <h3 className="text-3xl font-black mb-6 tracking-tighter leading-tight relative z-10 text-white w-3/4">{selectedRow[metrics.gapKey || 'GAP'] || selectedRow[metrics.vulnKey || 'Vulnerabilidades'] || selectedRow['PROYECTO O TAREA'] || selectedRow['Proyecto'] || selectedRow['Tarea'] || 'Nodo de Riesgo No Definido'}</h3>
               <div className="flex flex-wrap gap-2 relative z-10">
                  <div className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-xl text-[10px] font-black uppercase border border-indigo-500/30 backdrop-blur-sm">ID: {metrics?.idKey && selectedRow[metrics.idKey] ? selectedRow[metrics.idKey] : 'N/A'}</div>
                  <div className="px-4 py-2 bg-rose-500/20 text-rose-300 rounded-xl text-[10px] font-black uppercase border border-rose-500/30 backdrop-blur-sm">Criticidad: {selectedRow[metrics.priorityKey || ''] || selectedRow['Criticidad'] || selectedRow['Prioridad'] || 'No definida'}</div>
                  <div className="px-4 py-2 bg-emerald-500/20 text-emerald-300 rounded-xl text-[10px] font-black uppercase border border-emerald-500/30 backdrop-blur-sm">Status: {selectedRow[metrics.statusKey || ''] || selectedRow['Semaforo'] || selectedRow['Estado'] || selectedRow['Status'] || 'No definido'}</div>
                  <div className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-xl text-[10px] font-black uppercase border border-blue-500/30 backdrop-blur-sm">Atraso: {selectedRow['Dias de atraso'] || selectedRow['Atraso'] || '0'} días</div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Users size={14}/> Responsable</p>
                  <p className="text-sm font-black text-slate-800 break-words">{selectedRow['Responsable Seguridad'] || selectedRow['Responsable de Seguridad'] || selectedRow['Responsable'] || selectedRow['Asignado'] || selectedRow['Colaborador'] || 'No asignado'}</p>
               </div>
               <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Target size={14}/> Ámbito</p>
                  <p className="text-sm font-black text-slate-800 break-words">{selectedRow['Ambito'] || selectedRow['Ámbitos relacionados'] || selectedRow['Categoria'] || selectedRow['Categoría'] || 'No definido'}</p>
               </div>
               <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Clock size={14}/> Inicio</p>
                  <p className="text-sm font-black text-slate-800 break-words">{selectedRow['Fecha Identificación'] || selectedRow['Fecha creacion'] || selectedRow['Creado'] || selectedRow['Inicio'] || 'Sin fecha'}</p>
               </div>
               <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Calendar size={14}/> Vencimiento</p>
                  <p className="text-sm font-black text-slate-800 break-words">{selectedRow['Fecha de Cierre (Plan de Accion)'] || selectedRow['Fecha Vencimiento'] || selectedRow['Vencimiento'] || 'Sin fecha'}</p>
               </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
               <h4 className="text-sm font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2"><Activity size={18} className="text-brand-500" /> Detalles Operacionales</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Proyecto / Tarea</p>
                   <p className="text-sm font-bold text-slate-700">{selectedRow['PROYECTO O TAREA'] || selectedRow['Proyecto'] || selectedRow['Tarea'] || 'N/A'}</p>
                 </div>
                 <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Prestador / Proveedor</p>
                   <p className="text-sm font-bold text-slate-700">{selectedRow['Prestador'] || selectedRow['Proveedor'] || selectedRow['Vendor'] || 'Interno'}</p>
                 </div>
                 <div className="md:col-span-2">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comentarios / Mitigación</p>
                   <p className="text-sm font-medium text-slate-600 bg-white p-4 rounded-xl border border-slate-100 whitespace-pre-wrap">
                      {selectedRow['Comentarios'] || selectedRow['Plan de Acción'] || selectedRow['Mitigación'] || selectedRow['Observaciones'] || selectedRow['Descripción'] || 'No hay comentarios registrados.'}
                   </p>
                 </div>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
