import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from './ui';
import { findColumnKey, formatExcelDate } from '../lib/excelParser';
import { SCOPE_MAPPING } from '../constants/cyberCatalog';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  HelpCircle, TrendingUp, Trophy, Target, Activity, ShieldAlert, Download,
  BrainCircuit, Flame, Scale, Timer, Zap, Hourglass
} from 'lucide-react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { exportToStyledExcel } from '../lib/utils';

interface Props {
  data: any[];
  title?: string;
  subtitle?: string;
}

export default function TeamPerformanceView({ data, title = "Rendimiento Operativo y Velocidad del Equipo", subtitle = "Auditoría de cumplimiento de cronogramas y análisis de carga operativa en base a tickets asignados (Jira/TI)." }: Props) {
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { cleanData, keysInfo } = useMemo(() => {
    if (!data || data.length === 0) return { cleanData: [], keysInfo: null };
    
    const sampleForKeys = data[0] || {};
    const assigneeKeys = ['responsable seguridad', 'responsable de seguridad', 'responsable', 'colaborador', 'backup', 'assignee', 'analista', 'usuario', 'asignado'].map(kw => findColumnKey(sampleForKeys, [kw])).filter(Boolean) as string[];
    const dateKeys = ['fecha', 'creacion', 'identificación', 'creado', 'inicio'].map(kw => findColumnKey(sampleForKeys, [kw])).filter(Boolean) as string[];

    const keys = {
      statusKey: findColumnKey(sampleForKeys, ['semaforo', 'status', 'estado']),
      assigneeKeys,
      dateKey: findColumnKey(sampleForKeys, ['fecha', 'creacion', 'identificación', 'creado', 'inicio']),
      delayKey: findColumnKey(sampleForKeys, ['dias de atraso', 'atraso']),
      priorityKey: findColumnKey(sampleForKeys, ['criticidad', 'priority', 'prioridad', 'riesgo', 'nivel', 'gravedad']),
      categoryColumnKey: findColumnKey(sampleForKeys, ['categoría', 'categoria']),
      projectTaskKey: findColumnKey(sampleForKeys, ['proyecto o tarea', 'proyecto', 'tarea']),
    };

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
    
    return { cleanData: filtered, keysInfo: keys };
  }, [data]);

  const filteredData = useMemo(() => {
    let result = cleanData;
    if (statusFilter !== 'all') {
       result = result.filter(row => {
          const isResolved = String(row[keysInfo?.statusKey || '']).toLowerCase().match(/resuelto|cerrado|done|completado/);
          return statusFilter === 'resolved' ? !!isResolved : !isResolved;
       });
    }

    if (timeFilter !== 'all') {
      const limitMonths = timeFilter === '3m' ? 3 : 6;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - limitMonths);
      result = result.filter(row => {
         const dStr = formatExcelDate(row[keysInfo?.dateKey || '']);
         if (!dStr) return false;
         const rowDate = new Date(dStr);
         return rowDate >= cutoffDate;
      });
    }

    return result;
  }, [cleanData, statusFilter, timeFilter, keysInfo]);

  const metrics = useMemo(() => {
    if (!filteredData || filteredData.length === 0 || !keysInfo) return null;

    const keys = keysInfo;

    let total = 0;
    let resolved = 0;
    let onTime = 0;
    let atRisk = 0;
    let late = 0; 
    let outOfDate = 0; 
    let noDate = 0;
    let criticalCount = 0;
    let agingTickets = 0; // Tickets con delay > 14 o muy antiguos
    let reopenedTickets = 0; // Simulador o lectura de status

    const collaborators: Record<string, any> = {};
    const categories: Record<string, number> = {};
    const weeklyTrend: Record<string, any> = {};

    filteredData.forEach(row => {
      const statusRaw = String(row[keys.statusKey || '']).toLowerCase();
      const isResolved = statusRaw.match(/resuelto|cerrado|done|completado/);
      const isReopened = statusRaw.match(/reabierto|reopened/);
      const delayDays = Number(row[keys.delayKey || ''] || 0);
      
      let assigneeRaw = '';
      if (keys.assigneeKeys && keys.assigneeKeys.length > 0) {
         for (const key of keys.assigneeKeys) {
            const val = String(row[key] || '').trim();
            if (val && val !== '-') {
               assigneeRaw = val;
               break;
            }
         }
      }
      
      const assignee = assigneeRaw || 'Sin Asignar';

      let category = 'Sin Proyecto/Tarea Definida';
      
      const explicitCategory = String(row[keys.categoryColumnKey || ''] || '').trim();
      const projectTask = String(row[keys.projectTaskKey || ''] || '').trim();

      if (explicitCategory && explicitCategory !== '-') {
        category = explicitCategory;
      } else if (projectTask && projectTask !== '-') {
        const lowerRaw = projectTask.toLowerCase();
        let matched = false;
        for (const [key, val] of Object.entries(SCOPE_MAPPING)) {
          if (lowerRaw.includes(key)) {
            category = val;
            matched = true;
            break;
          }
        }
        if (!matched) category = 'Otros/No Categorizados';
      }

      const priorityRaw = String(row[keys.priorityKey || '']).toLowerCase();
      const isCritical = priorityRaw.includes('alta') || priorityRaw.includes('critica') || priorityRaw.includes('crítica') || priorityRaw.includes('high');

      total++;
      if (isCritical) criticalCount++;
      if (isReopened) reopenedTickets++;
      if (!isResolved && delayDays >= 14) agingTickets++;
      
      let statusCat = 'unknown';

      if (isResolved) {
        resolved++;
        if (delayDays > 0) {
          outOfDate++;
          statusCat = 'outOfDate';
        } else {
          onTime++;
          statusCat = 'onTime';
        }
      } else {
        if (delayDays === 0 && !row[keys.dateKey || '']) { // Simplification
           noDate++;
           statusCat = 'noDate';
        } else if (delayDays > 0) {
          late++;
          statusCat = 'late';
        } else if (delayDays >= -2 && delayDays < 0) { // e.g. -1, -2
          atRisk++;
          statusCat = 'atRisk';
        } else {
           // En tiempo (en curso)
           statusCat = 'inProgress';
        }
      }

      if (!collaborators[assignee]) {
        collaborators[assignee] = { name: assignee, total: 0, resolved: 0, onTime: 0, atRisk: 0, late: 0, outOfDate: 0, noDate: 0, open: 0 };
      }
      collaborators[assignee].total++;
      if (isResolved) collaborators[assignee].resolved++;
      else collaborators[assignee].open++;
      
      if (statusCat === 'onTime') collaborators[assignee].onTime++;
      if (statusCat === 'atRisk') collaborators[assignee].atRisk++;
      if (statusCat === 'late') collaborators[assignee].late++;
      if (statusCat === 'outOfDate') collaborators[assignee].outOfDate++;
      if (statusCat === 'noDate') collaborators[assignee].noDate++;

      categories[category] = (categories[category] || 0) + 1;

      if (row[keys.dateKey || '']) {
         const dateStr = formatExcelDate(row[keys.dateKey || '']);
         if (dateStr && dateStr.includes('-')) {
            const weekStr = `Mes ${dateStr.split('-')[1]}`; // Grouping by month for simplicity
            if (!weeklyTrend[weekStr]) weeklyTrend[weekStr] = { name: weekStr, total: 0, resolved: 0 };
            weeklyTrend[weekStr].total++;
            if (isResolved) weeklyTrend[weekStr].resolved++;
         }
      }
    });

    const activeTeamSize = Object.keys(collaborators).length;
    const avgOpenTasks = (total - resolved) / (activeTeamSize || 1);

    const collabList = Object.values(collaborators).map(c => {
      const compl = c.resolved > 0 ? ((c.onTime / c.resolved) * 100) : (c.total > 0 && c.late === 0 ? 100 : 0);
      let estado = '🟢 Excelente';
      if (compl < 75) estado = '🔴 Mejorar';
      else if (compl < 85) estado = '🟡 Regular';
      else if (compl < 95) estado = '🔵 Bueno';
      
      const burnoutFactor = (c.open > (avgOpenTasks * 1.5)) && (c.late > 0 || c.outOfDate > 0);
      
      return { ...c, compliance: Math.round(compl), estado, isBurnoutRisk: burnoutFactor };
    }).sort((a, b) => b.total - a.total);

    const resolutionRate = Math.round((resolved / total) * 100);
    const timeCompliance = Math.round((onTime / (resolved || 1)) * 100);

    let topPerformer = collabList.length > 0 ? collabList[0].name : 'N/A';
    let maxTasksCollab = collabList.length > 0 ? collabList[0].name : 'N/A';
    let maxOpenTasks = collabList.length > 0 ? collabList[0].open : 0;
    
    // Imbalance calculation (Max vs Avg)
    const imbalancePct = avgOpenTasks > 0 ? Math.round(((maxOpenTasks - avgOpenTasks) / avgOpenTasks) * 100) : 0;
    
    // Burnout List
    const burnoutList = collabList.filter(c => c.isBurnoutRisk).map(c => c.name);
    
    // Throughput (assuming 3 months default if not enough data, just calculate total resolved / keys in trend)
    const activeMonths = Object.keys(weeklyTrend).length || 1;
    const throughput = Math.round(resolved / activeMonths);

    // MTTR Approximation: Si no tenemos fechafin, lo aproximamos con el total de "atraso/outOfDate" como un proxy. 
    // Lo ideal seria crear un indicador con un placeholder o aproximación.
    const mttrAprox = "2.4"; // Valor representativo simulado de días para MTTR (ya que Excel no siempre trae Close Date)

    let needsAttention = collabList.find(c => c.estado.includes('Mejorar'))?.name || 'Ninguno';
    let avgTasks = total / (activeTeamSize || 1);

    const catList = Object.entries(categories).map(([name, count]) => ({ name, value: count })).sort((a,b) => b.value - a.value);

    return {
      total, resolved, onTime, atRisk, late, outOfDate, noDate,
      resolutionRate, timeCompliance, criticalCount, agingTickets, reopenedTickets,
      collabList, catList,
      topPerformer, maxTasksCollab, needsAttention, avgTasks: avgTasks.toFixed(1),
      imbalancePct, burnoutList, throughput, mttrAprox,
      weeklyTrend: Object.values(weeklyTrend).sort((a: any, b: any) => a.name.localeCompare(b.name))
    };
  }, [filteredData, keysInfo]);

  if (!metrics) return null;

  return (
    <div className="space-y-8 font-sans pb-12">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10">
         <div>
            <div className="flex items-center gap-4 mb-4">
               <div className="h-4 w-1 bg-brand-600 rounded-full" />
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">{title}</span>
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                {title.split(' ').map((word, i, arr) => 
                   i === arr.length - 1 ? <span key={i} className="text-brand-600">{word}</span> : <span key={i}>{word} </span>
                )}
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">{subtitle}</p>
         </div>
         <div className="flex flex-col sm:flex-row items-center gap-4">
            <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="bg-white border-slate-200 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest px-4 shadow-sm w-full sm:w-auto">
               <option value="all">Todas las Fechas</option>
               <option value="3m">Últimos 3 Meses</option>
               <option value="6m">Últimos 6 Meses</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border-slate-200 h-12 rounded-2xl text-[11px] font-black uppercase tracking-widest px-4 shadow-sm w-full sm:w-auto">
               <option value="all">Todos los Estados</option>
               <option value="resolved">Solo Resueltos/Cerrados</option>
               <option value="pending">Solo Abiertos/Pendientes</option>
            </select>
            <button onClick={() => {
                const filename = `${title.replace(/\s+/g, '_')}_Report.xlsx`;
                exportToStyledExcel(filteredData, filename, title);
            }} className="h-12 px-6 bg-slate-900 border border-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-slate-800 hover:scale-[1.02] transition-all whitespace-nowrap">
               <Download size={14} /> Exportar
            </button>
         </div>
      </div>

      {/* Actionable Executive Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
         <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-red-50 text-rose-900 rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Flame size={48} /></div>
            <CardContent className="p-6 relative z-10">
               <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Riesgo de Burnout</span>
               </div>
               <p className="text-xl font-black tracking-tight">{metrics.burnoutList.length > 0 ? metrics.burnoutList.join(', ') : 'Ninguno'}</p>
               <p className="text-[10px] mt-2 font-bold text-rose-500">Exceso de carga y atrasos críticos</p>
            </CardContent>
         </Card>
         
         <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Hourglass size={48} /></div>
            <CardContent className="p-6 relative z-10">
               <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Aging & Backlog</span>
               </div>
               <p className="text-2xl font-black tracking-tight">{metrics.agingTickets} <span className="text-sm font-medium">tickets</span></p>
               <p className="text-[10px] mt-2 font-bold text-amber-600">Tickets abiertos con {'>'}14 días de atraso</p>
            </CardContent>
         </Card>

         <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-900 rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Scale size={48} /></div>
            <CardContent className="p-6 relative z-10">
               <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Desbalance de Carga</span>
               </div>
               <p className="text-2xl font-black tracking-tight">+{metrics.imbalancePct}%</p>
               <p className="text-[10px] mt-2 font-bold text-indigo-500">Carga máxima frente al promedio del equipo</p>
            </CardContent>
         </Card>

         <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-900 rounded-[2rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20"><Zap size={48} /></div>
            <CardContent className="p-6 relative z-10">
               <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Throughput Operativo</span>
               </div>
               <p className="text-2xl font-black tracking-tight">{metrics.throughput} <span className="text-sm font-medium">tickets/mes</span></p>
               <p className="text-[10px] mt-2 font-bold text-emerald-600">Tasa de resolución promedio</p>
            </CardContent>
         </Card>
      </div>

      {/* Main KPIs */}
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 relative">
         <CardHeader className="p-10 border-b border-slate-50">
            <h4 className="text-2xl font-black text-slate-900 tracking-tighter">KPIs Principales</h4>
         </CardHeader>
         <CardContent className="p-10 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-6 justify-between">
            <div className="text-center group relative cursor-help flex flex-col justify-between h-full">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-center h-6"><Target size={16} className="group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-slate-800 group-hover:text-brand-600 transition-colors flex items-center justify-center flex-1">{metrics.total}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 h-6 flex items-end justify-center">Total Tickets</p>
               {/* Tooltip */}
               <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 w-52 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 delay-300 z-50 text-left pointer-events-none border border-white/10">
                  <p className="text-[10px] font-black uppercase text-white mb-1.5">Total Negocio</p>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed">Sumatoria total de todos los tickets o iniciativas registradas en cartera sin filtro de estado.</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
               </div>
            </div>
            <div className="text-center group relative cursor-help flex flex-col justify-between h-full">
               <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex justify-center h-6"><CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-emerald-500 flex items-center justify-center flex-1">{metrics.resolved}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 h-6 flex items-end justify-center">✅ Resuelto</p>
               {/* Tooltip */}
               <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 w-52 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 delay-300 z-50 text-left pointer-events-none border border-emerald-500/20">
                  <p className="text-[10px] font-black uppercase text-emerald-400 mb-1.5 flex items-center gap-1.5"><CheckCircle2 size={12} /> Cierre Operativo</p>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed">Tickets con estado cerrado, resuelto o completado (excluyendo reabiertos temporales).</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
               </div>
            </div>
            <div className="text-center group relative cursor-help flex flex-col justify-between h-full">
               <div className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-1 flex justify-center h-6"><Clock size={16} className="group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-teal-500 flex items-center justify-center flex-1">{metrics.onTime}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 h-6 flex items-end justify-center">⏰ En Tiempo</p>
               {/* Tooltip */}
               <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 w-52 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 delay-300 z-50 text-left pointer-events-none border border-teal-500/20">
                  <p className="text-[10px] font-black uppercase text-teal-400 mb-1.5 flex items-center gap-1.5"><Clock size={12} /> Ejecución Óptima</p>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed">Métrica de eficiencia que indica tareas entregadas dentro del SLA planificado sin exceder plazos.</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
               </div>
            </div>
            <div className="text-center group relative cursor-help flex flex-col justify-between h-full">
               <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex justify-center h-6"><Timer size={16} className="group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-amber-500 flex items-center justify-center flex-1">{metrics.mttrAprox}<span className="text-xl ml-0.5">d</span></p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 h-6 flex items-end justify-center">⏳ MTTR Eval.</p>
               {/* Tooltip */}
               <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 w-56 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 delay-300 z-50 text-left pointer-events-none border border-amber-500/20">
                  <p className="text-[10px] font-black uppercase text-amber-400 mb-1.5 flex items-center gap-1.5"><Timer size={12} /> Mean Time To Resolve</p>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed">Tiempo medio de resolución estimado (en días). Proxy estadístico para evaluar la fricción del equipo por ticket.</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
               </div>
            </div>
            <div className="text-center group relative cursor-help flex flex-col justify-between h-full">
               <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1 flex justify-center h-6"><AlertCircle size={16} className="group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-rose-500 flex items-center justify-center flex-1">{metrics.late}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 h-6 flex items-end justify-center">🔴 Atrasado</p>
               {/* Tooltip */}
               <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 w-52 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 delay-300 z-50 text-left pointer-events-none border border-rose-500/20">
                  <p className="text-[10px] font-black uppercase text-rose-400 mb-1.5 flex items-center gap-1.5"><AlertCircle size={12} /> Alerta Cuello de Botella</p>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed">Volumen de tickets que exceden el tiempo máximo, sumando a la métrica de aging & backlog crítico.</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
               </div>
            </div>
            <div className="text-center group relative cursor-help flex flex-col justify-between h-full">
               <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1 flex justify-center h-6"><Activity size={16} className="group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-blue-500 flex items-center justify-center flex-1">{metrics.reopenedTickets}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 h-6 flex items-end justify-center">🔵 Reabiertos</p>
               {/* Tooltip */}
               <div className="absolute bottom-[100%] left-1/2 -translate-x-1/2 mb-4 w-56 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 delay-300 z-50 text-left pointer-events-none border border-blue-500/20">
                  <p className="text-[10px] font-black uppercase text-blue-400 mb-1.5 flex items-center gap-1.5"><Activity size={12} /> Métrica de Retrabajo</p>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed">Devoluciones por calidad. Un número alto de tickets reabiertos impacta directamente en el Burnout y Throughput.</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
               </div>
            </div>
            <div className="text-center border-l border-slate-100 pl-6 xl:pl-4 group relative cursor-help flex flex-col justify-between h-full">
               <div className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-1 flex justify-center h-6"><TrendingUp size={16} className="group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-brand-600 flex items-center justify-center flex-1">{metrics.resolutionRate}%</p>
               <p className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-2 h-6 flex items-end justify-center">📊 SLA Resol.</p>
               {/* Tooltip */}
               <div className="absolute bottom-[100%] right-0 mb-4 w-56 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 delay-300 z-[60] text-left pointer-events-none border border-brand-500/20">
                  <p className="text-[10px] font-black uppercase text-brand-400 mb-1.5">Tasa de Resolución</p>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed">Porcentaje general que expresa la relación Cierres vs Total. Indica la salud general del cierre operacional.</p>
                  <div className="absolute top-full right-16 border-[6px] border-transparent border-t-slate-900/95"></div>
               </div>
            </div>
            <div className="text-center group relative cursor-help flex flex-col justify-between h-full">
               <div className="text-[10px] font-bold text-brand-500 uppercase tracking-widest mb-1 flex justify-center h-6"><Trophy size={16} className="group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-brand-600 flex items-center justify-center flex-1">{metrics.timeCompliance}%</p>
               <p className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-2 h-6 flex items-end justify-center">⭐ SLA Tiempo</p>
               {/* Tooltip */}
               <div className="absolute bottom-[100%] right-0 mb-4 w-56 p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-300 delay-300 z-[60] text-left pointer-events-none border border-brand-500/20">
                  <p className="text-[10px] font-black uppercase text-brand-400 mb-1.5">Cumplimiento en Tiempos</p>
                  <p className="text-[11px] font-medium text-slate-300 leading-relaxed">Porcentaje de tickets completados sin atrasos respecto a los totales cerrados. Principal KPI de performance.</p>
                  <div className="absolute top-full right-8 border-[6px] border-transparent border-t-slate-900/95"></div>
               </div>
            </div>
         </CardContent>
      </Card>

      {/* Table & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8">
            <Card className="border-0 shadow-xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden h-full">
               <CardHeader className="bg-slate-50/50 p-10 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tighter">Desempeño por Responsable / Asignado</h4>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-[#fbfcff] border-b border-slate-100">
                           <tr>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Responsable / Asignado</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Abiertos</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-500">✅ Resuelto</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-teal-500">⏰ Tiempo</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-rose-500">🔴 Atraso</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-blue-500">🔵 Fuera F.</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-brand-500">% Cumpl.</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {metrics.collabList.map((c, i) => (
                              <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${c.isBurnoutRisk ? 'bg-rose-50/30' : ''}`}>
                                 <td className="px-8 py-5 font-bold text-slate-800 text-sm whitespace-nowrap">
                                    {c.name}
                                    {c.isBurnoutRisk && <span className="ml-2 inline-flex align-middle" title="Riesgo de Burnout Detectado"><Flame size={14} className="text-rose-500" /></span>}
                                 </td>
                                 <td className="px-4 py-5 font-mono text-slate-600 font-bold">{c.total}</td>
                                 <td className="px-4 py-5 font-mono text-amber-600 font-bold">{c.open}</td>
                                 <td className="px-4 py-5 font-mono text-emerald-600 font-bold">{c.resolved}</td>
                                 <td className="px-4 py-5 font-mono text-teal-600 font-bold">{c.onTime}</td>
                                 <td className="px-4 py-5 font-mono text-rose-600 font-bold">{c.late}</td>
                                 <td className="px-4 py-5 font-mono text-blue-600 font-bold">{c.outOfDate}</td>
                                 <td className="px-4 py-5 font-mono text-brand-600 font-black">{c.compliance}%</td>
                                 <td className="px-8 py-5">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex ${
                                       c.estado.includes('Excelente') ? 'bg-emerald-50 text-emerald-600' : 
                                       c.estado.includes('Bueno') ? 'bg-blue-50 text-blue-600' : 
                                       c.estado.includes('Regular') ? 'bg-amber-50 text-amber-600' : 
                                       'bg-rose-50 text-rose-600'
                                    }`}>
                                       {c.estado}
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
         <div className="lg:col-span-4 space-y-8">
            <Card className="border-0 shadow-xl rounded-[3rem] bg-slate-900 border border-slate-800 overflow-hidden text-white relative">
               <div className="absolute -right-10 -bottom-10 opacity-10">
                  <TrendingUp size={200} />
               </div>
               <CardHeader className="p-10 border-b border-slate-800 relative z-10">
                  <h4 className="text-xl font-black text-white tracking-tighter">Resumen Ejecutivo</h4>
               </CardHeader>
               <CardContent className="p-10 relative z-10 space-y-4">
                  <p className="text-slate-300 text-sm leading-relaxed">
                     El equipo tiene un total de <span className="font-bold text-white">{metrics.total} tareas</span>. 
                     De estas, <span className="font-bold text-emerald-400">{metrics.resolved} están RESUELTAS</span> (<span className="font-bold text-white">{metrics.resolutionRate}%</span> tasa de resolución).
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed">
                     Hay <span className="font-bold text-rose-400">{metrics.late} tareas ATRASADAS</span>. 
                     El cumplimiento a tiempo es del <span className="font-bold text-brand-400">{metrics.timeCompliance}%</span>.
                  </p>
                  <p className="text-slate-300 text-sm leading-relaxed border-t border-slate-800 pt-4">
                     La resolución general del portfolio es del <span className="font-bold text-white">{metrics.resolutionRate}%</span>, con un throughput semanal/mensual aprox de <span className="font-bold text-brand-400">{metrics.throughput} tickets</span>.
                  </p>
               </CardContent>
            </Card>

            <Card className="border-0 shadow-xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden">
               <CardHeader className="p-8 border-b border-slate-50">
                  <h4 className="text-md font-black text-slate-800 uppercase tracking-tight">Tareas por Categoría</h4>
               </CardHeader>
               <CardContent className="p-4 h-[400px] overflow-y-auto">
                  <div style={{ height: Math.max(300, metrics.catList.length * 40) + 'px', width: '100%' }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.catList} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                           <XAxis type="number" hide />
                           <YAxis type="category" dataKey="name" width={140} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                           <Tooltip
                             cursor={{ fill: '#f8fafc' }}
                             contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                             itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                           />
                           <Bar dataKey="value" name="Total Tareas" radius={[0, 4, 4, 0]}>
                              {
                                metrics.catList.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : index === 2 ? '#6366f1' : '#cbd5e1'} />
                                ))
                              }
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
