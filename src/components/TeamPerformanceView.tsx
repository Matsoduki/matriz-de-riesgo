import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Activity, Download, List, Flame, Target, CheckCircle2, Clock, Timer, AlertCircle, Trophy, Medal, Award, Rocket, ShieldAlert, BrainCircuit, XCircle, Users, Zap, Hourglass, Scale, GitCompare, BarChart3, Presentation, ArrowRight, User, FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { exportToStyledExcel, exportMultiSheetExcel, exportStructuredPdf } from '../lib/utils';
import { DetailsModal } from './DetailsModal';
import { Card, CardHeader, CardContent } from './ui';
import { isCriticalPriority } from './CyberView';
import { isResolvedStatus, normalizeMTTRDisplay } from '../lib/excelParser';

// Modular Components
import { TeamMetricsCards } from './TeamMetricsCards';
import { PerformanceRadar } from './PerformanceRadar';
import { TeamHallOfFame } from './TeamHallOfFame';
import { IndividualDeepDiveModal } from './IndividualDeepDiveModal';
import { AnalyticalBreakdownPanel, MetricType } from './AnalyticalBreakdownPanel';
import { VSPerformanceAnalytics } from './VSPerformanceAnalytics';
import { TeamOperationalAnalytics } from './TeamOperationalAnalytics';

interface Props {
  data: any[];
  title?: string;
  subtitle?: string;
}

type TabType = 'performance' | 'vs_analytics' | 'intelligence';

export default function TeamPerformanceView({ data, title = "Desempeño de Equipo", subtitle = "Centro de mando operativo de clase mundial." }: Props) {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('performance');
  
  const [activeMetric, setActiveMetric] = useState<MetricType | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

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

    // Load Balance Calculation: Higher score = more even distribution
    const tasksPerAssignee = Object.values(collaborators).map(c => c.total);
    const mean = total / activeTeamSize;
    const variance = tasksPerAssignee.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / activeTeamSize;
    const stdDev = Math.sqrt(variance);
    const loadBalance = Math.max(0, Math.min(100, Math.round((1 - (stdDev / (mean || 1))) * 100)));

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
      { subject: 'Efficiency', A: avgEfficiency, fullMark: 100 },
      { subject: 'Load Balance', A: loadBalance, fullMark: 100 },
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

  const handleExport = async () => {
    if (!filteredData.length || !metrics) return;
    
    const filters = {
      Periodo: "Actual",
      Miembros: metrics.teamSize.toString()
    };

    const sheets = [];

    // Sheet 1: Squad DNA (High level KPIs)
    const kpiData = metrics.radarData.map((r: any) => ({
      Métrica: r.subject,
      Valor: `${r.A}%`,
      Estado: r.A > 85 ? 'Óptimo' : r.A > 70 ? 'Estable' : 'Bajo Observación'
    }));
    
    sheets.push({
      name: 'ADN Operativo Squad',
      data: kpiData,
      title: `KPIs Estratégicos del Squad - ${title}`,
      appliedFilters: filters
    });

    // Sheet 2: Member Ranking
    const rankingData = metrics.collabList.map((c: any) => ({
      Nombre: c.name,
      'Efficiency Score': Math.round(c.efficiencyScore),
      'Total Tickets': c.total,
      'Resueltos': c.resolved,
      'Compliance SLA %': `${Math.round(c.compliance)}%`,
      'MTTR (Horas)': c.rawMttr.toFixed(2),
      'Estado': c.estado
    })).sort((a: any, b: any) => b['Efficiency Score'] - a['Efficiency Score']);

    sheets.push({
      name: 'Ranking de Eficiencia',
      data: rankingData,
      title: 'Auditoría Individual de Miembros'
    });

    // Sheet 3: Raw Data
    sheets.push({
      name: 'Data Operativa',
      data: filteredData,
      title: 'Detalle Completo de Tickets'
    });
    
    await exportMultiSheetExcel(
      sheets,
      `Reporte_Audit_Squad_${new Date().toISOString().split('T')[0]}`
    );
  };

  const handlePdfExport = async () => {
    if (!filteredData.length || !metrics) return;
    setIsExporting('pdf');
    try {
      const filters = {
        Periodo: "Actual",
        Miembros: metrics.teamSize.toString(),
        Filtro_Prioridad: priorityFilter,
        Filtro_Asignado: assigneeFilter
      };

      const sheets = [];

      // Sheet 1: ADN (KPIs)
      sheets.push({
        name: 'KPIs Estratégicos',
        data: metrics.radarData.map((r: any) => ({
          Métrica: r.subject,
          Valor: `${r.A}%`,
          Referencia: '100%'
        })),
        title: `KPIs ESTRATÉGICOS: ${title}`,
        appliedFilters: filters
      });

      // Sheet 2: Rankings
      sheets.push({
        name: 'Ranking de Eficiencia',
        data: metrics.collabList.map((c: any) => ({
          Nombre: c.name,
          Efficiency: c.efficiencyScore,
          Total: c.total,
          Resueltos: c.resolved,
          Compliance: `${c.compliance}%`,
          MTTR: c.mttrDisplay,
          Estado: c.estado
        })),
        title: 'RANKING OPERATIVO DE MIEMBROS'
      });

      await exportStructuredPdf(
        sheets,
        `Resumen_Auditoria_${title.replace(/\s+/g, '_')}`
      );
    } finally {
      setIsExporting(null);
    }
  };

  if (!metrics) return null;

  return (
    <div id="full-audit-board" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-slate-900 animate-pulse shadow-[0_0_12px_rgba(15,23,42,0.5)]" />
             <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Auditoría Operativa & Análisis Estratégico</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tight leading-[0.8]">{title}<span className="text-brand-600">.</span></h2>
          <p className="text-lg font-bold text-slate-500 max-w-2xl leading-relaxed">{subtitle}</p>
        </div>
        
        <div className="flex flex-wrap gap-3 export-exclude">
           <button 
              onClick={handleExport}
              className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95 border border-slate-800"
           >
              <Download size={14} /> Matrix Excel
           </button>
           <button 
              onClick={handlePdfExport}
              disabled={!!isExporting}
              className={`flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl border border-slate-200 active:scale-95 ${isExporting ? 'opacity-50' : ''}`}
           >
              {isExporting === 'pdf' ? (
                <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              {isExporting === 'pdf' ? 'Generando PDF...' : 'Reporte Resumen PDF'}
           </button>
        </div>
      </div>

      {/* Advanced Navigation Tabs */}
      <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-[2.5rem] w-fit shadow-inner border border-slate-200/50 export-exclude">
        {[
          { id: 'performance', icon: <Activity size={16} />, label: 'Resumen Operativo' },
          { id: 'vs_analytics', icon: <GitCompare size={16} />, label: 'VS Analytics' },
          { id: 'intelligence', icon: <Presentation size={16} />, label: 'Estrategia Operativa' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id as TabType)}
            className={`flex items-center gap-3 px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all ${
              currentTab === tab.id 
                ? 'bg-white text-brand-600 shadow-xl' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {currentTab === 'performance' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
          
          <TeamMetricsCards 
            metrics={metrics as any} 
            onCardClick={(type: MetricType) => setActiveMetric(type)}
          />

          <TeamHallOfFame performers={metrics.topThree} onSelect={setSelectedMember} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
             <div className="lg:col-span-4 space-y-6">
                <PerformanceRadar 
                  data={metrics.radarData} 
                  dataKeyA="A"
                  nameA="Squad"
                  title="ADN Operativo del Squad"
                />
             </div>

             <div className="lg:col-span-8">
                <Card className="border-0 shadow-2xl rounded-[3.5rem] bg-white border border-slate-100 overflow-hidden h-full">
                   <CardHeader className="bg-slate-50/30 p-12 border-b border-slate-100 flex justify-between items-center">
                      <div className="space-y-1 text-left">
                        <p className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Benchmarking</p>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tighter">Comparativa Operativa</h4>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-4 py-2 rounded-full">Auditoría Individual</span>
                      </div>
                   </CardHeader>
                   <CardContent className="p-0">
                      <div className="overflow-x-auto text-left">
                         <table className="w-full">
                            <thead className="bg-[#fbfcff] border-b border-slate-50">
                               <tr>
                                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Responsable</th>
                                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-center text-slate-400">Score Eff.</th>
                                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-center text-slate-400">MTTR (d)</th>
                                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-emerald-500">Resuelto</th>
                                  <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-brand-500">% Cumpl.</th>
                                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Estado</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                               {metrics.collabList.map((c, i) => (
                                  <tr 
                                     key={i} 
                                     className="hover:bg-slate-50/50 transition-all cursor-pointer group"
                                     onClick={() => setSelectedMember(c)}
                                  >
                                     <td className="px-10 py-6 font-bold text-slate-800 text-sm">
                                        <div className="flex items-center gap-4">
                                           <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${String(c.name).includes('Promedio') ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-600'}`}>
                                              {String(c.name).charAt(0)}
                                           </div>
                                           <span className="group-hover:text-brand-600 transition-colors uppercase tracking-tight">{c.name}</span>
                                           {c.isBurnoutRisk && <Flame size={14} className="text-rose-500 animate-pulse" />}
                                        </div>
                                     </td>
                                     <td className="px-6 py-6 font-mono text-slate-600 font-bold">{c.total}</td>
                                     <td className="px-6 py-6 text-center">
                                        <span className="text-sm font-black text-brand-600">{c.efficiencyScore}</span>
                                     </td>
                                     <td className="px-6 py-6 text-center font-mono text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{c.mttrDisplay}</td>
                                     <td className="px-6 py-6 font-mono text-emerald-600 font-bold">{c.resolved}</td>
                                     <td className="px-6 py-6 font-mono text-brand-600 font-black">{c.compliance}%</td>
                                     <td className="px-10 py-6 text-right">
                                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                                           c.estado.includes('Elite') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                           c.estado.includes('Óptimo') ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                           'bg-rose-50 text-rose-600 border-rose-100'
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <Card 
                onClick={() => setActiveMetric('burnout')}
                className="border-0 shadow-2xl bg-white border border-rose-100 text-rose-900 rounded-[2.5rem] p-10 cursor-pointer hover:scale-105 transition-all group relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform"><Flame size={100} /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Flame size={18} /></div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Riesgo Burnout</span>
                </div>
                <div className="text-left relative z-10">
                    <p className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{metrics.burnoutList.length || 0}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest">
                       Analizar Factores <ArrowRight size={12} />
                    </div>
                </div>
             </Card>
             
             <Card 
                onClick={() => setActiveMetric('aging')}
                className="border-0 shadow-2xl bg-white border border-amber-100 text-amber-900 rounded-[2.5rem] p-10 cursor-pointer hover:scale-105 transition-all group relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform"><Hourglass size={100} /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Hourglass size={18} /></div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Aging Tickets</span>
                </div>
                <div className="text-left relative z-10">
                    <p className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{metrics.agingTickets}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                        Diagnosis <ArrowRight size={12} />
                    </div>
                </div>
             </Card>

             <Card 
                onClick={() => setActiveMetric('imbalance')}
                className="border-0 shadow-2xl bg-white border border-indigo-100 text-indigo-900 rounded-[2.5rem] p-10 cursor-pointer hover:scale-105 transition-all group relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform"><Scale size={100} /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Scale size={18} /></div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Backlog Balance</span>
                </div>
                <div className="text-left relative z-10">
                    <p className="text-4xl font-black text-slate-900 tracking-tighter mb-2">+{metrics.imbalancePct}%</p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                       Equidad <ArrowRight size={12} />
                    </div>
                </div>
             </Card>

             <Card 
                onClick={() => setActiveMetric('throughput')}
                className="border-0 shadow-2xl bg-white border border-emerald-100 text-emerald-900 rounded-[2.5rem] p-10 cursor-pointer hover:scale-105 transition-all group relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform"><Zap size={100} /></div>
                <div className="flex items-center gap-3 mb-6 relative z-10">
                   <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Zap size={18} /></div>
                   <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Throughput</span>
                </div>
                <div className="text-left relative z-10">
                    <p className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{metrics.throughput}</p>
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                       Velocidad <ArrowRight size={12} />
                    </div>
                </div>
             </Card>
          </div>
        </motion.div>
      )}

      {currentTab === 'vs_analytics' && (
        <VSPerformanceAnalytics metrics={metrics} allData={filteredData} keysInfo={keysInfo} />
      )}

      {currentTab === 'intelligence' && (
        <TeamOperationalAnalytics metrics={metrics} />
      )}

      <AnalyticalBreakdownPanel 
        isOpen={!!activeMetric}
        onClose={() => setActiveMetric(null)}
        metricType={activeMetric}
        metrics={metrics}
        data={filteredData}
      />

      <IndividualDeepDiveModal 
        member={selectedMember} 
        onClose={() => setSelectedMember(null)} 
      />

      <DetailsModal isOpen={showDetails} onClose={() => setShowDetails(false)} data={filteredData} title={title} />
    </div>
  );
}
