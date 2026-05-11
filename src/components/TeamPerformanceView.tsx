import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Activity, Download, List, Flame, Target, CheckCircle2, Clock, Timer, AlertCircle, Trophy, Medal, Award, Rocket, ShieldAlert, BrainCircuit, XCircle, Users, Zap, Hourglass, Scale
} from 'lucide-react';
import { motion } from 'motion/react';
import { exportToStyledExcel } from '../lib/utils';
import { DetailsModal } from './DetailsModal';
import { Card, CardHeader, CardContent } from './ui';
import { isCriticalPriority } from './CyberView';
import { isResolvedStatus, normalizeMTTRDisplay } from '../lib/excelParser';

// Modular Components
import { TeamMetricsCards } from './TeamMetricsCards';
import { PerformanceRadar } from './PerformanceRadar';
import { TeamHallOfFame } from './TeamHallOfFame';
import { IndividualDeepDiveModal } from './IndividualDeepDiveModal';

interface Props {
  data: any[];
  title?: string;
  subtitle?: string;
}

export default function TeamPerformanceView({ data, title = "Desempeño de Equipo", subtitle = "Centro de mando operativo de clase mundial." }: Props) {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const { cleanData, keysInfo } = useMemo(() => {
    if (!data || data.length === 0) return { cleanData: [], keysInfo: null };
    
    const sample = data[0];
    const keys = Object.keys(sample);

    const findKey = (candidates: string[]) => 
      keys.find(k => candidates.some(c => k.toLowerCase().includes(c.toLowerCase()))) || candidates[0];

    return {
      cleanData: data,
      keysInfo: {
        assignee: findKey(['Responsable', 'Asignado', 'Owner', 'usuario', 'Analista', 'Técnico', 'Soporte', 'Gestor', 'Coordinador']),
        status: findKey(['Estado', 'Status', 'Semaforo', 'Status Final']),
        priority: findKey(['Criticidad', 'Prioridad', 'Priority', 'Severidad']),
        delay: findKey(['Dias de atraso', 'Atraso', 'Delay', 'Vencimiento'])
      }
    };
  }, [data]);

  const filteredData = useMemo(() => {
    if (!keysInfo) return [];
    return cleanData.filter(row => {
      const pMatch = priorityFilter === 'all' || String(row[keysInfo.priority]).toLowerCase() === priorityFilter;
      const aMatch = assigneeFilter === 'all' || String(row[keysInfo.assignee]) === assigneeFilter;
      return pMatch && aMatch;
    });
  }, [cleanData, priorityFilter, assigneeFilter, keysInfo]);

  const metrics = useMemo(() => {
    if (!filteredData.length || !keysInfo) return null;

    const collaborators: Record<string, any> = {};
    let total = 0;
    let resolved = 0;
    let onTime = 0;
    let atRisk = 0;
    let late = 0;
    let outOfDate = 0;
    let criticalCount = 0;
    let agingTickets = 0;

    filteredData.forEach(row => {
      total++;
      const assignee = String(row[keysInfo.assignee] || 'Sin Asignar');
      const status = String(row[keysInfo.status] || '').toLowerCase();
      const priority = String(row[keysInfo.priority] || '').toLowerCase();
      const delayValue = parseInt(row[keysInfo.delay]) || 0;

      if (!collaborators[assignee]) {
        collaborators[assignee] = { 
          name: assignee, total: 0, resolved: 0, onTime: 0, 
          atRisk: 0, late: 0, outOfDate: 0, open: 0, isBurnoutRisk: false,
          totalResolutionDays: 0, slaViolations: 0, criticalHandled: 0
        };
      }

      collaborators[assignee].total++;
      
      const isResolved = isResolvedStatus(status);
      const isCritical = isCriticalPriority(priority);

      if (isCritical) {
        criticalCount++;
        collaborators[assignee].criticalHandled++;
      }
      
      if (delayValue > 15) agingTickets++;

      if (isResolved) {
        resolved++;
        collaborators[assignee].resolved++;
        collaborators[assignee].totalResolutionDays += Math.max(0, delayValue);
        if (delayValue <= 0) {
          onTime++;
          collaborators[assignee].onTime++;
        } else if (delayValue <= 5) {
          atRisk++;
          collaborators[assignee].atRisk++;
        } else {
          late++;
          collaborators[assignee].late++;
          collaborators[assignee].slaViolations++;
        }
      } else {
        collaborators[assignee].open++;
        collaborators[assignee].totalResolutionDays += Math.max(0, delayValue); // Accumulate delay for open items too for MTTR estimation
        if (delayValue > 0) {
          outOfDate++;
          collaborators[assignee].outOfDate++;
        }
      }
    });

    const activeTeamSize = Object.keys(collaborators).length || 1;
    const avgTasksValue = total / activeTeamSize;
    const avgOpenTasks = (total - resolved) / activeTeamSize;

    const collabList = Object.values(collaborators).map(c => {
      const compl = c.resolved > 0 ? ((c.onTime / c.resolved) * 100) : (c.total > 0 && c.late === 0 ? 100 : 0);
      
      // Algorithm: Efficiency Score (Enterprise Enhanced 3.0)
      // Normalizes by workload spread to avoid high-volume bias
      const volumeRatio = c.total / (avgTasksValue || 1);
      const normalizeVolume = Math.min(1.2, volumeRatio); // Reward high volume up to 120% of avg
      
      const speedScore = compl / 100;
      
      // Complexity Factor: Handling critical tickets adds value
      const avgCritical = criticalCount / activeTeamSize;
      const complexityScore = Math.min(1.2, (c.criticalHandled || 0) / (avgCritical || 1));

      // Formula: (40% SLA Speed + 30% Volume + 30% Complexity)
      const efficiencyScore = Math.min(100, Math.round(
        (speedScore * 40) + (normalizeVolume * 30) + (complexityScore * 30)
      ));

      let estado = '🟢 Elite';
      if (efficiencyScore < 50) estado = '🔴 Crítico';
      else if (efficiencyScore < 70) estado = '🟡 En Riesgo';
      else if (efficiencyScore < 85) estado = '🔵 Óptimo';
      
      // Predictive Burnout Probability
      const backlogRatio = c.open / (avgOpenTasks || 1);
      const agingEffect = (c.outOfDate + c.late) / (c.open || 1);
      const riskProbability = (backlogRatio * 0.6) + (agingEffect * 0.4);
      const burnoutFactor = riskProbability > 1.5;
      
      // Lead Time / MTTR Normalization
      const rawMttr = c.total > 0 ? c.totalResolutionDays / c.total : 0;
      
      return { 
        ...c, 
        compliance: Math.round(compl), 
        efficiencyScore,
        rawMttr,
        mttrDisplay: normalizeMTTRDisplay(rawMttr),
        estado, 
        isBurnoutRisk: burnoutFactor 
      };
    }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);

    const resolutionRate = Math.round((resolved / total) * 100);
    const timeCompliance = Math.round((onTime / (resolved || 1)) * 100);
    const avgEfficiency = Math.round(collabList.reduce((acc, c) => acc + c.efficiencyScore, 0) / (activeTeamSize || 1));
    const avgMTTR = collabList.length > 0 ? (collabList.reduce((acc, c) => acc + c.rawMttr, 0) / activeTeamSize) : 0;

    const radarData = [
      { subject: 'SLA Speed', A: timeCompliance, fullMark: 100 },
      { subject: 'Resolution', A: resolutionRate, fullMark: 100 },
      { subject: 'Load Balance', A: Math.max(0, 100 - Math.abs(100 - (total / (activeTeamSize * 15)) * 100)), fullMark: 100 },
      { subject: 'Agility', A: Math.max(0, 100 - Math.round((late / (total || 1)) * 100)), fullMark: 100 },
      { subject: 'Complexity', A: Math.min(100, Math.round((criticalCount / (total || 1)) * 500)), fullMark: 100 },
    ];

    const maxOpenTasks = collabList.length > 0 ? Math.max(...collabList.map(c => c.open)) : 0;
    const imbalancePct = avgOpenTasks > 0 ? Math.round(((maxOpenTasks - avgOpenTasks) / avgOpenTasks) * 100) : 0;

    return {
      total, resolved, onTime, late, criticalCount, agingTickets,
      collabList, avgEfficiency,
      burnoutRiskCount: collabList.filter(c => c.isBurnoutRisk).length,
      topThree: collabList.slice(0, 3),
      throughput: (resolved / 4).toFixed(1),
      radarData,
      teamSize: activeTeamSize,
      imbalancePct,
      burnoutList: collabList.filter(c => c.isBurnoutRisk).map(c => c.name),
      resolutionRate,
      timeCompliance,
      avgMTTRDisplay: normalizeMTTRDisplay(avgMTTR)
    };
  }, [filteredData, keysInfo]);

  if (!metrics) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center gap-3">
             <div className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Resource Optimization Hub</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">{title}</h2>
          <p className="text-slate-500 font-medium text-sm leading-relaxed">{subtitle}</p>
        </div>
        
        <div className="flex gap-3">
           <button 
              onClick={() => exportToStyledExcel(filteredData, 'Performace_Operativa.xlsx', title)}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
           >
              <Download size={14} /> Exportar Auditoría
           </button>
        </div>
      </div>

      <TeamMetricsCards metrics={metrics as any} />

      <TeamHallOfFame performers={metrics.topThree} onSelect={setSelectedMember} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-4">
            <PerformanceRadar data={metrics.radarData} />
         </div>

         <div className="lg:col-span-8">
            <Card className="border-0 shadow-xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden h-full">
               <CardHeader className="bg-slate-50/50 p-10 border-b border-slate-100 flex justify-between items-center">
                  <h4 className="text-2xl font-black text-slate-900 tracking-tighter">Comparativa Operativa</h4>
                  <div className="flex items-center gap-4">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Auditoría Individual</span>
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead className="bg-[#fbfcff] border-b border-slate-50">
                           <tr>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Responsable</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-400">Score Eff.</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-center text-slate-400">MTTR (d)</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-500">Resuelto</th>
                              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-brand-500">% Cumpl.</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {metrics.collabList.map((c, i) => (
                              <tr 
                                 key={i} 
                                 className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                                 onClick={() => setSelectedMember(c)}
                              >
                                 <td className="px-8 py-5 font-bold text-slate-800 text-sm">
                                    <div className="flex items-center gap-3">
                                       <span className="group-hover:text-brand-600 transition-colors">{c.name}</span>
                                       {c.isBurnoutRisk && <Flame size={14} className="text-rose-500 animate-pulse" />}
                                    </div>
                                 </td>
                                 <td className="px-4 py-5 font-mono text-slate-600 font-bold">{c.total}</td>
                                 <td className="px-4 py-5 text-center">
                                    <span className="text-sm font-black text-brand-600">{c.efficiencyScore}</span>
                                 </td>
                                 <td className="px-4 py-5 text-center font-mono text-[10px] font-bold text-slate-500">{c.mttrDisplay}</td>
                                 <td className="px-4 py-5 font-mono text-emerald-600 font-bold">{c.resolved}</td>
                                 <td className="px-4 py-5 font-mono text-brand-600 font-black">{c.compliance}%</td>
                                 <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                       c.estado.includes('Elite') ? 'bg-emerald-50 text-emerald-600' : 
                                       c.estado.includes('Óptimo') ? 'bg-blue-50 text-blue-600' : 
                                       'bg-rose-50 text-rose-600'
                                    }`}>
                                       {c.estado}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </CardContent>
            </Card>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="border-0 shadow-lg bg-rose-50 text-rose-900 rounded-[2rem] p-6">
            <div className="flex items-center gap-3 mb-2">
               <Flame size={16} className="text-rose-600" />
               <span className="text-[10px] font-black uppercase tracking-widest">Riesgo Burnout</span>
            </div>
            <p className="text-xl font-black">{metrics.burnoutList.length || 0} Miembros</p>
            <p className="text-[10px] font-medium opacity-70 mt-1">Carga crítica acumulada</p>
         </Card>
         <Card className="border-0 shadow-lg bg-amber-50 text-amber-900 rounded-[2rem] p-6">
            <div className="flex items-center gap-3 mb-2">
               <Hourglass size={16} className="text-amber-600" />
               <span className="text-[10px] font-black uppercase tracking-widest">Aging Tickets</span>
            </div>
            <p className="text-xl font-black">{metrics.agingTickets} Items</p>
            <p className="text-[10px] font-medium opacity-70 mt-1">Backlog {'>'}15 días</p>
         </Card>
         <Card className="border-0 shadow-lg bg-indigo-50 text-indigo-900 rounded-[2rem] p-6">
            <div className="flex items-center gap-3 mb-2">
               <Scale size={16} className="text-indigo-600" />
               <span className="text-[10px] font-black uppercase tracking-widest">Desbalance</span>
            </div>
            <p className="text-xl font-black">+{metrics.imbalancePct}%</p>
            <p className="text-[10px] font-medium opacity-70 mt-1">Vs promedio capacidad</p>
         </Card>
         <Card className="border-0 shadow-lg bg-emerald-50 text-emerald-900 rounded-[2rem] p-6">
            <div className="flex items-center gap-3 mb-2">
               <Zap size={16} className="text-emerald-600" />
               <span className="text-[10px] font-black uppercase tracking-widest">Throughput</span>
            </div>
            <p className="text-xl font-black">{metrics.throughput}</p>
            <p className="text-[10px] font-medium opacity-70 mt-1">Tickets/Mes promedio</p>
         </Card>
      </div>

      <IndividualDeepDiveModal 
        member={selectedMember} 
        onClose={() => setSelectedMember(null)} 
      />

      <DetailsModal isOpen={showDetails} onClose={() => setShowDetails(false)} data={filteredData} title={title} />
    </div>
  );
}
