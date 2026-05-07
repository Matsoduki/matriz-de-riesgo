import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from './ui';
import { findColumnKey, formatExcelDate } from '../lib/excelParser';
import { SCOPE_MAPPING } from '../constants/cyberCatalog';
import { 
  Users, CheckCircle2, Clock, AlertTriangle, AlertCircle, 
  HelpCircle, TrendingUp, Trophy, Target, Activity, ShieldAlert, Download
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

    const collaborators: Record<string, any> = {};
    const categories: Record<string, number> = {};
    const weeklyTrend: Record<string, any> = {};

    filteredData.forEach(row => {
      const isResolved = String(row[keys.statusKey || '']).toLowerCase().match(/resuelto|cerrado|done|completado/);
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
        collaborators[assignee] = { name: assignee, total: 0, resolved: 0, onTime: 0, atRisk: 0, late: 0, outOfDate: 0, noDate: 0 };
      }
      collaborators[assignee].total++;
      if (isResolved) collaborators[assignee].resolved++;
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

    const collabList = Object.values(collaborators).map(c => {
      // Calculates based on the CSV logic you provided
      const compl = c.resolved > 0 ? ((c.onTime / c.resolved) * 100) : (c.total > 0 && c.late === 0 ? 100 : 0);
      let estado = '🟢 Excelente';
      if (compl < 70 || c.late > 0) estado = '🔴 Mejorar';
      else if (compl < 90) estado = '🟡 Bueno';
      return { ...c, compliance: Math.round(compl), estado };
    }).sort((a, b) => b.total - a.total);

    const resolutionRate = Math.round((resolved / total) * 100);
    const timeCompliance = Math.round((onTime / (resolved || 1)) * 100);

    let topPerformer = collabList.length > 0 ? collabList[0].name : 'N/A';
    let maxTasksCollab = collabList.length > 0 ? collabList[0].name : 'N/A';
    let needsAttention = collabList.find(c => c.estado.includes('Mejorar'))?.name || 'Ninguno';
    let avgTasks = total / (Object.keys(collaborators).length || 1);

    const catList = Object.entries(categories).map(([name, count]) => ({ name, value: count })).sort((a,b) => b.value - a.value);

    return {
      total, resolved, onTime, atRisk, late, outOfDate, noDate,
      resolutionRate, timeCompliance, criticalCount,
      collabList, catList,
      topPerformer, maxTasksCollab, needsAttention, avgTasks: avgTasks.toFixed(1),
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

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
         <Card className="border-0 shadow-lg bg-emerald-50 text-emerald-900 rounded-[2rem]">
            <CardContent className="p-6">
               <div className="flex items-center gap-3 mb-2">
                  <Trophy size={16} className="text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Top Performer</span>
               </div>
               <p className="text-lg font-black tracking-tight">{metrics.topPerformer}</p>
            </CardContent>
         </Card>
         <Card className="border-0 shadow-lg bg-brand-50 text-brand-900 rounded-[2rem]">
            <CardContent className="p-6">
               <div className="flex items-center gap-3 mb-2">
                  <Activity size={16} className="text-brand-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-600">Más Tareas</span>
               </div>
               <p className="text-lg font-black tracking-tight">{metrics.maxTasksCollab}</p>
            </CardContent>
         </Card>
         <Card className="border-0 shadow-lg bg-rose-50 text-rose-900 rounded-[2rem]">
            <CardContent className="p-6">
               <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle size={16} className="text-rose-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Atención Sugerida</span>
               </div>
               <p className="text-lg font-black tracking-tight">{metrics.needsAttention}</p>
            </CardContent>
         </Card>
         <Card className="border-0 shadow-lg bg-amber-50 text-amber-900 rounded-[2rem]">
            <CardContent className="p-6">
               <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert size={16} className="text-amber-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Tareas Críticas / Atrasadas</span>
               </div>
               <p className="text-lg font-black tracking-tight">{metrics.criticalCount + metrics.late}</p>
            </CardContent>
         </Card>
         <Card className="border-0 shadow-lg bg-slate-100 text-slate-800 rounded-[2rem]">
            <CardContent className="p-6">
               <div className="flex items-center gap-3 mb-2">
                  <Users size={16} className="text-slate-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prom. Tareas/Persona</span>
               </div>
               <p className="text-lg font-black tracking-tight">{metrics.avgTasks}</p>
            </CardContent>
         </Card>
      </div>

      {/* Main KPIs */}
      <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden relative">
         <CardHeader className="p-10 border-b border-slate-50">
            <h4 className="text-2xl font-black text-slate-900 tracking-tighter">KPIs Principales</h4>
         </CardHeader>
         <CardContent className="p-10 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-6 justify-between">
            <div className="text-center group">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex justify-center"><Target size={16} className="mb-2 group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-slate-800 group-hover:text-brand-600 transition-colors">{metrics.total}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Total</p>
            </div>
            <div className="text-center group">
               <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1 flex justify-center"><CheckCircle2 size={16} className="mb-2 group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-emerald-500">{metrics.resolved}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">✅ Resuelto</p>
            </div>
            <div className="text-center group">
               <div className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-1 flex justify-center"><Clock size={16} className="mb-2 group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-teal-500">{metrics.onTime}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">⏰ En Tiempo</p>
            </div>
            <div className="text-center group">
               <div className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex justify-center"><AlertTriangle size={16} className="mb-2 group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-amber-500">{metrics.atRisk}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">⚠️ En Riesgo</p>
            </div>
            <div className="text-center group">
               <div className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1 flex justify-center"><AlertCircle size={16} className="mb-2 group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-rose-500">{metrics.late}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">🔴 Atrasado</p>
            </div>
            <div className="text-center group">
               <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1 flex justify-center"><Clock size={16} className="mb-2 group-hover:scale-110 transition-transform" /></div>
               <p className="text-4xl font-black text-blue-500">{metrics.outOfDate}</p>
               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">🔵 Fuera Fecha</p>
            </div>
            <div className="text-center border-l border-slate-100 pl-6 xl:pl-4 group">
               <p className="text-4xl font-black text-brand-600">{metrics.resolutionRate}%</p>
               <p className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-2">📊 Tasa Resol.</p>
            </div>
            <div className="text-center group">
               <p className="text-4xl font-black text-brand-600">{metrics.timeCompliance}%</p>
               <p className="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-2">⭐ Cumplimiento</p>
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
                              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-8 py-5 font-bold text-slate-800 text-sm whitespace-nowrap">{c.name}</td>
                                 <td className="px-4 py-5 font-mono text-slate-600 font-bold">{c.total}</td>
                                 <td className="px-4 py-5 font-mono text-emerald-600 font-bold">{c.resolved}</td>
                                 <td className="px-4 py-5 font-mono text-teal-600 font-bold">{c.onTime}</td>
                                 <td className="px-4 py-5 font-mono text-rose-600 font-bold">{c.late}</td>
                                 <td className="px-4 py-5 font-mono text-blue-600 font-bold">{c.outOfDate}</td>
                                 <td className="px-4 py-5 font-mono text-brand-600 font-black">{c.compliance}%</td>
                                 <td className="px-8 py-5">
                                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex ${c.estado.includes('Excelente') ? 'bg-emerald-50 text-emerald-600' : c.estado.includes('Bueno') ? 'bg-brand-50 text-brand-600' : 'bg-rose-50 text-rose-600'}`}>
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
                     El mejor desempeño corresponde a <span className="font-bold text-emerald-400">{metrics.topPerformer}</span>.
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
