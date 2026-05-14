import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, Activity, Download, List, Flame, Target, CheckCircle2, Clock, Timer, AlertCircle, Trophy, Medal, Award, Rocket, ShieldAlert, BrainCircuit, XCircle, Users, Zap, Hourglass, Scale, GitCompare, BarChart3, Presentation, ArrowRight, User, FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { exportToStyledExcel, exportMultiSheetExcel, exportStructuredPdf } from '../lib/utils';
import { DetailsModal } from './DetailsModal';
import { Card, CardHeader, CardContent, PremiumCard } from './ui';
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

export default function TeamPerformanceView({ data, title = "Desempeño de Equipo", subtitle = "Centro de mando operativo." }: Props) {
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
        delay: findKey(['Dias de atraso', 'Atraso', 'Delay', 'Vencimiento']),
        dateKey: findKey(['Fecha', 'Fecha de Creación', 'Created', 'Date', 'Apertura', 'Fecha Solicitud']),
        closingDateKey: findKey(['Fecha de Cierre', 'Cierre', 'Closed Date', 'Fecha Solución', 'Finalización']),
        commitmentDateKey: findKey(['Fecha de Compromiso', 'Compromiso', 'Due Date', 'Vencimiento Estimado']),
        category: findKey(['ÁMBITO', 'Categoría', 'Clasificación', 'Tipo', 'Area', 'Ambito', 'Modulo']),
        impact: findKey(['Impacto', 'Impact']),
        urgency: findKey(['Urgencia', 'Urgency']),
        reopen: findKey(['Reapertura', 'Reopen', 'Reopened'])
      }
    };
  }, [data]);

  const filteredData = useMemo(() => {
    if (!keysInfo) return [];
    return cleanData.filter(row => {
      const rowPriority = String(row[keysInfo.priority] || 'Media').toLowerCase();
      const pMatch = priorityFilter === 'all' || rowPriority === priorityFilter;
      const rowAssignee = String(row[keysInfo.assignee] || 'Sin Asignar');
      const aMatch = assigneeFilter === 'all' || rowAssignee === assigneeFilter;
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
    
    const THEORETICAL_CAPACITY_PER_MEMBER = 20; // Enterprise standard benchmark

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
    
    // Enterprise Capacity Metrics
    const totalCapacity = activeTeamSize * THEORETICAL_CAPACITY_PER_MEMBER;
    const saturationRate = Math.round((total / totalCapacity) * 100);

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
      saturationRate,
      totalCapacity,
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
      name: 'ADN Operativo TISAL',
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

  // if (!metrics) return null;

  return (
    <div id="full-audit-board" className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-slate-900 animate-pulse shadow-[0_0_12px_rgba(15,23,42,0.5)]" />
             <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Auditoría Operativa & Análisis Estratégico</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tight leading-[0.8]">{title}<span className="text-tisal-gold">.</span></h2>
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

      {/* Advanced Navigation Tabs & Filters */}
      <div className="flex flex-col xl:flex-row items-center gap-6 export-exclude">
        <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-[2.5rem] w-fit shadow-inner border border-slate-200/50">
          {[
            { id: 'performance', icon: <Activity size={16} />, label: 'Resumen Operativo' },
            { id: 'vs_analytics', icon: <GitCompare size={16} />, label: 'VS Analytics' },
            { id: 'intelligence', icon: <Presentation size={16} />, label: 'Estrategia Operativa' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setCurrentTab(tab.id as TabType);
                if (tab.id === 'vs_analytics') {
                  setAssigneeFilter('all');
                }
              }}
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

        <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
           {currentTab === 'performance' && (
             <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 min-w-[200px]">
                <div className="p-1.5 bg-indigo-50 text-indigo-500 rounded-lg"><User size={14} /></div>
                <select 
                  value={assigneeFilter} 
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="border-0 bg-transparent text-[10px] font-black uppercase tracking-widest focus:ring-0 w-full"
                >
                  <option value="all">Filtro Responsable ({cleanData.length})</option>
                  {Array.from(new Set(cleanData.map(r => String(r[keysInfo?.assignee] || 'Sin Asignar')))).map(a => (
                    <option key={a} value={a}>{a} ({cleanData.filter(r => String(r[keysInfo?.assignee] || 'Sin Asignar') === a).length})</option>
                  ))}
                </select>
             </div>
           )}

           {currentTab !== 'vs_analytics' && (
             <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 min-w-[180px]">
                <div className="p-1.5 bg-rose-50 text-rose-500 rounded-lg"><ShieldAlert size={14} /></div>
                <select 
                  value={priorityFilter} 
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="border-0 bg-transparent text-[10px] font-black uppercase tracking-widest focus:ring-0 w-full"
                >
                  <option value="all">Criticidad ({cleanData.length})</option>
                  {Array.from(new Set(cleanData.map(r => String(r[keysInfo?.priority] || 'Media')))).map((p) => {
                    const pStr = String(p);
                    return (
                      <option key={pStr} value={pStr.toLowerCase()}>
                        {pStr} ({cleanData.filter(r => String(r[keysInfo?.priority] || 'Media').toLowerCase() === pStr.toLowerCase()).length})
                      </option>
                    );
                  })}
                </select>
             </div>
           )}
        </div>
      </div>

      {!metrics ? (
        <div className="py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
           <div className="p-4 bg-white rounded-2xl shadow-sm w-fit mx-auto mb-4 text-slate-400">
             <Activity size={32} />
           </div>
           <h3 className="text-xl font-bold text-slate-900 mb-2">No se encontraron datos</h3>
           <p className="text-slate-500">Ajusta los filtros para visualizar la auditoría.</p>
           <button 
             onClick={() => { setPriorityFilter('all'); setAssigneeFilter('all'); }}
             className="mt-6 text-[10px] font-black uppercase tracking-widest text-brand-600 hover:underline"
           >
             Limpiar Filtros
           </button>
        </div>
      ) : (
        <>
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
                <PremiumCard className="border-0 shadow-2xl rounded-[3.5rem] bg-white border border-slate-100 overflow-hidden h-full">
                   <CardHeader className="bg-slate-50/10 p-12 border-b border-slate-100/50 flex justify-between items-center bg-gradient-to-br from-white to-slate-50/30">
                      <div className="space-y-1 text-left">
                        <p className="text-[9px] font-black text-brand-500 uppercase tracking-[0.4em]">Métrica Maestra de Control</p>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-[1.1]">Gestión <br/>y <span className="text-brand-600">Auditoría</span> Ejecutiva</h4>
                      </div>
                      <div className="hidden md:flex items-center gap-4">
                         <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-2">
                           <ShieldAlert size={14} className="text-brand-500" />
                           <span className="text-[9px] font-black uppercase text-slate-900 tracking-widest">Validación de Datos</span>
                         </div>
                      </div>
                   </CardHeader>
                   <CardContent className="p-0">
                      <div className="overflow-x-auto text-left scrollbar-thin scrollbar-thumb-slate-200">
                         <table className="w-full border-separate border-spacing-y-4 px-6 md:px-10">
                            <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-30">
                               <tr>
                                  <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 text-left">Responsable Operativo</th>
                                  <th className="px-4 py-6 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 text-center">Volumen</th>
                                  <th className="px-4 py-6 text-[9px] font-black uppercase tracking-[0.25em] text-center text-slate-400">Eficiencia</th>
                                  <th className="px-4 py-6 text-[9px] font-black uppercase tracking-[0.25em] text-center text-indigo-500">MTTR (d)</th>
                                  <th className="px-4 py-6 text-[9px] font-black uppercase tracking-[0.25em] text-emerald-500 text-center">Resueltos</th>
                                  <th className="px-4 py-6 text-[9px] font-black uppercase tracking-[0.25em] text-brand-500 text-center">SLA %</th>
                                  <th className="px-6 py-6 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 text-right">Estatus</th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent">
                               {metrics.collabList.map((c, i) => {
                                  const isAverage = String(c.name).includes('Promedio');
                                  const score = c.efficiencyScore;
                                  
                                  const getPerfTheme = (s: number) => {
                                    if (s >= 85) return { gradient: 'from-emerald-500 to-teal-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
                                    if (s >= 70) return { gradient: 'from-brand-500 to-indigo-500', text: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' };
                                    if (s >= 50) return { gradient: 'from-amber-500 to-orange-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' };
                                    return { gradient: 'from-rose-500 to-pink-500', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' };
                                  };

                                  const theme = getPerfTheme(score);
                                  const avatarGradient = isAverage ? 'from-tisal-gold to-brand-500' : theme.gradient;

                                  return (
                                    <motion.tr 
                                       key={i} 
                                       initial={{ opacity: 0, y: 10 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ delay: i * 0.05 }}
                                       className="hover:scale-[1.01] transition-all cursor-pointer group bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] rounded-3xl"
                                       onClick={() => setSelectedMember(c)}
                                    >
                                       <td className="px-6 py-6 rounded-l-3xl border-y border-l border-slate-50 group-hover:border-brand-100 group-hover:bg-slate-50/30">
                                          <div className="flex items-center gap-5">
                                             <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGradient} p-[2px] shadow-lg group-hover:rotate-6 transition-transform duration-500`}>
                                                <div className="w-full h-full rounded-[0.9rem] bg-white flex items-center justify-center overflow-hidden">
                                                   <span className={`text-base font-black bg-gradient-to-br ${avatarGradient} bg-clip-text text-transparent`}>
                                                      {String(c.name).charAt(0)}
                                                   </span>
                                                </div>
                                             </div>
                                             <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-brand-600 transition-colors uppercase">{c.name}</span>
                                                {c.isBurnoutRisk && (
                                                  <span className="text-[8px] text-rose-500 font-black uppercase tracking-widest flex items-center gap-1 mt-1">
                                                     <div className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                                                     Riesgo de Fatiga
                                                  </span>
                                                )}
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-4 py-6 text-center border-y border-slate-50 group-hover:bg-slate-50/30">
                                          <span className="text-sm font-black text-slate-500 font-mono italic">{c.total}</span>
                                       </td>
                                       <td className="px-4 py-6 text-center border-y border-slate-50 group-hover:bg-slate-50/30">
                                          <div className="flex items-center justify-center">
                                             <div className={`w-10 h-10 rounded-full border-4 ${theme.border} flex items-center justify-center bg-white shadow-sm`}>
                                                <span className={`text-[11px] font-black ${theme.text}`}>{score}</span>
                                             </div>
                                          </div>
                                       </td>
                                       <td className="px-4 py-6 text-center border-y border-slate-50 group-hover:bg-slate-50/30">
                                          <span className="text-xs font-black text-slate-500 font-mono">{c.mttrDisplay}</span>
                                       </td>
                                       <td className="px-4 py-6 text-center border-y border-slate-50 group-hover:bg-slate-50/30">
                                          <span className="text-sm font-black text-emerald-600 font-mono">{c.resolved}</span>
                                       </td>
                                       <td className="px-4 py-6 text-center border-y border-slate-50 group-hover:bg-slate-50/30">
                                          <span className="text-sm font-black text-brand-600 font-mono">{c.compliance}%</span>
                                       </td>
                                       <td className="px-6 py-6 text-right rounded-r-3xl border-y border-r border-slate-50 group-hover:border-brand-100 group-hover:bg-slate-50/30">
            <div className="flex justify-end pr-2">
               <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 flex items-center gap-2.5 shadow-xl transition-all group-hover:scale-105 ${
                  c.estado.includes('Elite') ? 'bg-emerald-500/5 text-emerald-600 border-emerald-400/30' : 
                  c.estado.includes('Óptimo') ? 'bg-brand-500/5 text-brand-600 border-brand-400/30' : 
                  'bg-rose-500/5 text-rose-600 border-rose-400/30'
               }`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    c.estado.includes('Elite') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 
                    c.estado.includes('Óptimo') ? 'bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 
                    'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                  }`} />
                  {c.estado.split(' ').pop()}
               </div>
            </div>
                                       </td>
                                    </motion.tr>
                                  );
                                })}
                             </tbody>
                          </table>
                      </div>
                   </CardContent>
                </PremiumCard>
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
        <VSPerformanceAnalytics 
          key={currentTab} 
          metrics={metrics} 
          allData={filteredData} 
          keysInfo={keysInfo} 
          onShowMetric={(type) => setActiveMetric(type)}
        />
      )}

      {currentTab === 'intelligence' && (
        <TeamOperationalAnalytics metrics={metrics} />
      )}
        </>
      )}

      <AnalyticalBreakdownPanel 
        isOpen={!!activeMetric}
        onClose={() => setActiveMetric(null)}
        metricType={activeMetric}
        metrics={metrics}
        data={filteredData || []}
      />

      <IndividualDeepDiveModal 
        member={selectedMember} 
        onClose={() => setSelectedMember(null)} 
      />

      <DetailsModal isOpen={showDetails} onClose={() => setShowDetails(false)} data={filteredData || []} title={title} />
    </div>
  );
}
