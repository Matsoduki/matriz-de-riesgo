import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, User, Target, TrendingUp, Zap, Clock, Shield, Search, Filter, 
  ChevronRight, ArrowRight, Activity, Percent, BarChart, Maximize2,
  GitCompare, Trophy, AlertTriangle, Scale, BrainCircuit, ArrowDownRight, ArrowUpRight,
  Download, FileText, Network, Layers, Calendar, CheckCircle2, MoveRight, Cpu, PieChart
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from './ui';
import { PerformanceRadar } from './PerformanceRadar';
import { DetailsModal } from './DetailsModal';
import { exportMultiSheetExcel, exportStructuredPdf } from '../lib/utils';
import { 
  ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell,
  LineChart, Line, AreaChart, Area, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { parse, isValid, format, subDays, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  metrics: any;
  allData: any[];
  keysInfo?: any;
}

const AnimatedCounter: React.FC<{ value: number; duration?: number; decimals?: number; suffix?: string }> = ({ value, duration = 0.8, decimals = 0, suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    let start = performance.now();
    const endValue = value;
    const startValue = prevValue.current;
    
    const animate = (now: number) => {
      const elapsed = (now - start) / (duration * 1000);
      const progress = Math.min(elapsed, 1);
      
      // Power 2 Out easing
      const ease = 1 - Math.pow(1 - progress, 2);
      
      const current = startValue + (endValue - startValue) * ease;
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValue.current = endValue;
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{displayValue.toFixed(decimals)}{suffix}</>;
};

export const VSPerformanceAnalytics: React.FC<Props> = ({ metrics, allData, keysInfo }) => {
  const [selectedA, setSelectedA] = useState<string>('all');
  const [selectedB, setSelectedB] = useState<string>('all');
  const [radarViewType, setRadarViewType] = useState<'individual' | 'team'>('individual');
  const [barChartViewType, setBarChartViewType] = useState<'individual' | 'team'>('individual');
  const [portfolioViewType, setPortfolioViewType] = useState<'individual' | 'team'>('individual');
  const [auditStage, setAuditStage] = useState<'velocity' | 'compliance' | 'ecosystem'>('velocity');
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '15d' | '30d' | '90d' | '365d'>('30d');
  const [selectedMatrices, setSelectedMatrices] = useState<string[]>(['portfolio', 'specialization']);
  const [heatmapView, setHeatmapView] = useState<'A' | 'B'>('A');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any[]>([]);

  const collaborators = metrics.collabList;

  const compareData = useMemo(() => {
    // ... helper for data range
    const parseDateResilient = (val: any): Date | null => {
      if (!val) return null;
      if (val instanceof Date) return isValid(val) ? val : null;
      
      if (typeof val === 'number') { // Excel serial date
        const d = new Date((val - 25569) * 86400 * 1000);
        return isValid(d) ? d : null;
      }
      
      const str = String(val).trim();
      if (!str) return null;

      // Try native first
      const native = new Date(str);
      if (isValid(native)) return native;

      // Try formats
      const formats = ['dd/MM/yyyy', 'dd-MM-yyyy', 'dd.MM.yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
      for (const f of formats) {
        const p = parse(str, f, new Date());
        if (isValid(p)) return p;
      }

      const sanitized = str.replace(/[.-]/g, '/');
      const p2 = new Date(sanitized);
      if (isValid(p2)) return p2;

      return null;
    };

    const dates = allData.map(r => parseDateResilient(r[keysInfo?.dateKey])).filter(d => d !== null) as Date[];
    const maxDataDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
    const isDataStale = maxDataDate ? subDays(new Date(), 30) > maxDataDate : false;

    const memberA = collaborators.find((c: any) => c.name === selectedA) || { 
      name: 'Equipo (Promedio)', 
      efficiencyScore: metrics.avgEfficiency,
      total: metrics.total / metrics.teamSize,
      resolved: metrics.resolved / metrics.teamSize,
      compliance: metrics.timeCompliance,
      rawMttr: metrics.avgMTTR || 0,
      estado: 'Squad',
      radarData: metrics.radarData.map((r: any) => ({ subject: r.subject, A: r.A }))
    };

    const memberB = collaborators.find((c: any) => c.name === selectedB) || { 
      name: 'Equipo (Promedio)', 
      efficiencyScore: metrics.avgEfficiency,
      total: metrics.total / metrics.teamSize,
      resolved: metrics.resolved / metrics.teamSize,
      compliance: metrics.timeCompliance,
      rawMttr: metrics.avgMTTR || 0,
      estado: 'Squad',
      radarData: metrics.radarData.map((r: any) => ({ subject: r.subject, A: r.A }))
    };

    const squadAvg = {
      name: 'Squad Average',
      efficiencyScore: metrics.avgEfficiency,
      total: metrics.total / metrics.teamSize,
      resolved: metrics.resolved / metrics.teamSize,
      compliance: metrics.timeCompliance,
      rawMttr: metrics.avgMTTR || 0,
      radarData: metrics.radarData
    };

    const chartData = [
      { name: 'Productividad', A: memberA.total, B: memberB.total, squad: squadAvg.total },
      { name: 'Eficiencia', A: memberA.efficiencyScore, B: memberB.efficiencyScore, squad: squadAvg.efficiencyScore },
      { name: 'SLA', A: memberA.compliance, B: memberB.compliance, squad: squadAvg.compliance },
      { name: 'Resueltos', A: memberA.resolved, B: memberB.resolved, squad: squadAvg.resolved }
    ];

    const radarA = memberA.radarData || chartData.map(d => ({ subject: d.name, A: d.A }));
    const radarCombined = radarA.map((r: any, idx: number) => {
      const subjectMap: Record<string, string> = {
        'Throughput': 'Productividad',
        'Efficiency': 'Eficiencia',
        'Compliance': 'SLA',
        'Velocity': 'Velocidad',
        'Quality': 'Calidad',
        'Reliability': 'Confiabilidad'
      };
      
      return {
        subject: subjectMap[r.subject] || r.subject,
        A: r.A,
        B: (memberB.radarData ? memberB.radarData[idx]?.A : chartData[idx]?.B) || 0,
        squad: (squadAvg.radarData ? squadAvg.radarData[idx]?.A : (chartData[idx] as any).squad) || 0
      };
    });

    // auditMetrics were calculated above
    const auditA = memberA;
    const auditB = memberB;

    // --- Trend Data Generation (Date-based) ---
    const getTrendData = () => {
      const now = startOfDay(new Date());
      let daysToLookBack = 30;
      let stepSize = 1; // 1 for daily, 7 for weekly
      let labelFormat = 'dd MMM';

      if (timeRange === '7d') daysToLookBack = 7;
      else if (timeRange === '15d') daysToLookBack = 15;
      else if (timeRange === '30d') daysToLookBack = 30;
      else if (timeRange === '90d') {
        daysToLookBack = 90;
        stepSize = 7;
        labelFormat = "'Sem' w";
      } else if (timeRange === '365d') {
        daysToLookBack = 365;
        stepSize = 30; // Monthly
        labelFormat = 'MMM yy';
      }

      const points = [];
      const statusKey = keysInfo?.statusKey || keysInfo?.status;
      const delayKey = keysInfo?.delay;

      // Check if we have data in the standard "Now" window
      const hasRecentData = allData.some(r => {
        const d = parseDateResilient(r[keysInfo?.dateKey]);
        return d && d >= subDays(now, daysToLookBack);
      });

      // If no recent data but we have old data, pivot to the latest data window
      const anchorDate = (!hasRecentData && maxDataDate) ? startOfDay(maxDataDate) : now;

      for (let i = daysToLookBack; i >= 0; i -= stepSize) {
        const periodEndDate = startOfDay(subDays(anchorDate, i));
        const periodStartDate = startOfDay(subDays(periodEndDate, stepSize - 1));
        
        // Entrada: Tickets creados en este periodo
        const entries = allData.filter(r => {
          const d = parseDateResilient(r[keysInfo?.dateKey]);
          return d && d >= periodStartDate && d <= periodEndDate;
        });

        // Salida: Tickets cerrados en este periodo (usando closingDateKey)
        const outputs = allData.filter(r => {
          const d = parseDateResilient(r[keysInfo?.closingDateKey] || r[keysInfo?.dateKey]);
          const status = String(r[statusKey] || '').toLowerCase();
          return d && d >= periodStartDate && d <= periodEndDate && status.includes('cerrado');
        });

        // Compromisos: Tickets que debían cerrarse en este periodo
        const commitments = allData.filter(r => {
          const d = parseDateResilient(r[keysInfo?.commitmentDateKey]);
          return d && d >= periodStartDate && d <= periodEndDate;
        });

        const ticketsA_Entry = entries.filter(r => selectedA === 'all' || String(r[keysInfo?.assignee]) === selectedA);
        const ticketsB_Entry = entries.filter(r => selectedB === 'all' || String(r[keysInfo?.assignee]) === selectedB);

        const ticketsA_Out = outputs.filter(r => selectedA === 'all' || String(r[keysInfo?.assignee]) === selectedA);
        const ticketsB_Out = outputs.filter(r => selectedB === 'all' || String(r[keysInfo?.assignee]) === selectedB);

        const ticketsA_Commit = commitments.filter(r => selectedA === 'all' || String(r[keysInfo?.assignee]) === selectedA);
        const ticketsB_Commit = commitments.filter(r => selectedB === 'all' || String(r[keysInfo?.assignee]) === selectedB);

        points.push({
          name: stepSize >= 7 
            ? `${format(periodStartDate, 'dd/MM')} - ${format(periodEndDate, 'dd/MM')}`
            : format(periodEndDate, labelFormat, { locale: es }),
          entryA: ticketsA_Entry.length,
          entryB: ticketsB_Entry.length,
          outA: ticketsA_Out.length,
          outB: ticketsB_Out.length,
          commitA: ticketsA_Commit.length,
          commitB: ticketsB_Commit.length,
          // Legacy keys for safety
          A: ticketsA_Entry.length,
          B: ticketsB_Entry.length,
          resolvedA: ticketsA_Out.length,
          resolvedB: ticketsB_Out.length
        });
      }
      return points;
    };

    // --- Ambitos / Category Distribution ---
    const getCategoryData = () => {
      const catKey = keysInfo?.category || 'ÁMBITO';
      const now = startOfDay(new Date());
      const rangeDays = timeRange === '7d' ? 7 : timeRange === '15d' ? 15 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const startDate = subDays(now, rangeDays);

      // Filter data by time range first
      const hasRecentData = allData.some(r => {
        const d = parseDateResilient(r[keysInfo?.dateKey]);
        return d && d >= subDays(now, rangeDays);
      });
      const anchorDate = (!hasRecentData && maxDataDate) ? startOfDay(maxDataDate) : now;
      const periodStart = subDays(anchorDate, rangeDays);

      const filteredData = allData.filter(r => {
        const d = parseDateResilient(r[keysInfo?.dateKey]);
        return d && d >= periodStart && d <= anchorDate;
      });

      const categories = Array.from(new Set(filteredData.map(r => String(r[catKey] || 'General'))));
      return categories.map(cat => ({
        name: cat,
        A: filteredData.filter(r => (selectedA === 'all' || String(r[keysInfo?.assignee]) === selectedA) && String(r[catKey] || 'General') === cat).length,
        B: filteredData.filter(r => (selectedB === 'all' || String(r[keysInfo?.assignee]) === selectedB) && String(r[catKey] || 'General') === cat).length,
        squad: filteredData.filter(r => String(r[catKey] || 'General') === cat).length / (metrics.teamSize || 1),
      })).filter(c => c.A > 0 || c.B > 0).sort((a, b) => (b.A + b.B) - (a.A + a.B)).slice(0, 10);
    };

    const trendData = getTrendData();
    const categoryData = getCategoryData();

    // --- NEW: Aging Heatmap Data (Refined for Comparison) ---
    const getAgingHeatmap = () => {
      const catKey = keysInfo?.category || 'ÁMBITO';
      const delayKey = keysInfo?.delay;
      const assigneeKey = keysInfo?.assignee;
      
      const brackets = [
        { label: '0-2d', min: 0, max: 2, color: 'bg-emerald-100 text-emerald-700' },
        { label: '3-5d', min: 3, max: 5, color: 'bg-amber-100 text-amber-700' },
        { label: '6-10d', min: 6, max: 10, color: 'bg-orange-100 text-orange-700' },
        { label: '+10d', min: 11, max: 1000, color: 'bg-rose-100 text-rose-700' }
      ];

      const cats = categoryData.map(c => c.name);
      const processFor = (name: string) => {
         const tickets = name === 'all' ? allData : allData.filter(r => String(r[assigneeKey]) === name);
         return cats.map(cat => {
            const catTickets = tickets.filter(r => String(r[catKey] || 'General') === cat);
            const row: any = { category: cat };
            brackets.forEach(b => {
              row[b.label] = catTickets.filter(r => {
                const age = Number(r['AGING'] || r[delayKey] || 0);
                return age >= b.min && age <= b.max;
              }).length;
            });
            return row;
         });
      };

      return { A: processFor(selectedA), B: processFor(selectedB), brackets };
    };

    // --- NEW: Specialization Comparison (Enhanced) ---
    const getSpecRadar = () => {
      const topDomains = categoryData.map(c => ({
        subject: c.name,
        A: c.A,
        B: c.B,
        squad: c.squad,
        total: c.A + c.B
      })).sort((a, b) => b.total - a.total).slice(0, 8);

      const processStats = (dataKey: 'A' | 'B' | 'squad') => {
        const isSquad = dataKey === 'squad';
        const totalItems = isSquad 
          ? categoryData.reduce((acc, c) => acc + (c.squad as number), 0)
          : categoryData.reduce((acc, c) => acc + (c[dataKey] as number), 0);
        
        const sorted = [...categoryData].sort((a, b) => {
          const valB = isSquad ? b.squad : b[dataKey];
          const valA = isSquad ? a.squad : a[dataKey];
          return (valB as number) - (valA as number);
        });
        
        const topCat = sorted[0] || null;
        
        const affinity = categoryData.length > 0 
          ? (categoryData.reduce((acc: number, c) => {
              const val = isSquad ? c.squad : c[dataKey];
              return acc + Math.pow(((val as number) / (totalItems || 1)) * 100, 2);
            }, 0) / 1000)
          : 0;

        return {
          topDomain: topCat?.name || 'N/A',
          share: totalItems > 0 ? (( (isSquad ? topCat?.squad : topCat?.[dataKey]) as number) / totalItems * 100).toFixed(1) : 0,
          affinity: affinity.toFixed(1),
          top3: sorted.slice(0, 3).map(s => ({ name: s.name, count: isSquad ? s.squad.toFixed(1) : s[dataKey] }))
        };
      };

      return {
        data: topDomains,
        statsA: processStats('A'),
        statsB: processStats('B'),
        statsTeam: processStats('squad')
      };
    };

    // --- NEW: Concentration Index (Refined) ---
    const getConcIndex = () => {
      const process = (name: string) => {
        const catKey = keysInfo?.category || 'ÁMBITO';
        const assigneeKey = keysInfo?.assignee;
        const tickets = name === 'all' ? allData : allData.filter(r => String(r[assigneeKey || '']) === name);
        if (tickets.length === 0) return { score: 0, dependencyRisk: 'N/A', siloEffect: 0 };
        
        const counts: any = {};
        tickets.forEach(r => {
          const c = String(r[catKey] || 'General');
          counts[c] = (counts[c] || 0) + 1;
        });
        
        const sumSquares = (Object.values(counts) as number[]).reduce((acc: number, count: number) => acc + Math.pow((count / tickets.length) * 100, 2), 0);
        const score = Math.sqrt(sumSquares) / 10; 
        
        return {
          score,
          dependencyRisk: score > 7 ? 'Crítica' : score > 4 ? 'Moderada' : 'Baja',
          siloEffect: score * 10 // 0-100
        };
      };
      return { A: process(selectedA), B: process(selectedB) };
    };

    return { 
      memberA, memberB, squadAvg, chartData, radarCombined, 
      auditA, auditB, trendData, categoryData,
      agingHeatmap: getAgingHeatmap(),
      specRadar: getSpecRadar(),
      concIndex: getConcIndex(),
      maxDataDate, isDataStale
    };
  }, [selectedA, selectedB, collaborators, metrics, allData, keysInfo, timeRange]);

  const handleExportAudit = async () => {
    if (!keysInfo) return;

    const sheets = [];

    // Summary Sheet
    const summaryData = [
      { SECCIÓN: 'IDENTIFICACIÓN', [compareData.memberA.name]: 'Métrica A', [compareData.memberB.name]: 'Métrica B', DIFERENCIA: 'Delta' },
      { SECCIÓN: 'Core Metrics', [compareData.memberA.name]: `Score: ${Math.round(compareData.memberA.efficiencyScore)}`, [compareData.memberB.name]: `Score: ${Math.round(compareData.memberB.efficiencyScore)}`, DIFERENCIA: (compareData.memberA.efficiencyScore - compareData.memberB.efficiencyScore).toFixed(1) },
      { SECCIÓN: 'Volumen Total', [compareData.memberA.name]: Math.round(compareData.memberA.total), [compareData.memberB.name]: Math.round(compareData.memberB.total), DIFERENCIA: Math.round(compareData.memberA.total - compareData.memberB.total) },
      { SECCIÓN: 'Resueltos', [compareData.memberA.name]: Math.round(compareData.memberA.resolved), [compareData.memberB.name]: Math.round(compareData.memberB.resolved), DIFERENCIA: Math.round(compareData.memberA.resolved - compareData.memberB.resolved) },
      { SECCIÓN: 'Cumplimiento SLA %', [compareData.memberA.name]: `${Math.round(compareData.memberA.compliance)}%`, [compareData.memberB.name]: `${Math.round(compareData.memberB.compliance)}%`, DIFERENCIA: `${Math.round(compareData.memberA.compliance - compareData.memberB.compliance)}%` },
      { SECCIÓN: 'MTTR (Horas)', [compareData.memberA.name]: compareData.memberA.rawMttr.toFixed(2), [compareData.memberB.name]: compareData.memberB.rawMttr.toFixed(2), DIFERENCIA: (compareData.memberA.rawMttr - compareData.memberB.rawMttr).toFixed(2) },
      { SECCIÓN: '---', [compareData.memberA.name]: '---', [compareData.memberB.name]: '---', DIFERENCIA: '---' },
      { SECCIÓN: 'CAPACIDADES (RADAR)', [compareData.memberA.name]: '', [compareData.memberB.name]: '', DIFERENCIA: '' },
    ];

    // Add Radar Metrics
    compareData.radarCombined.forEach((r: any) => {
      summaryData.push({
        SECCIÓN: r.subject,
        [compareData.memberA.name]: r.A,
        [compareData.memberB.name]: r.B,
        DIFERENCIA: (r.A - r.B).toFixed(1)
      });
    });

    summaryData.push(
      { SECCIÓN: '---', [compareData.memberA.name]: '---', [compareData.memberB.name]: '---', DIFERENCIA: '---' },
      { SECCIÓN: 'STATUS AUDITORÍA', [compareData.memberA.name]: compareData.memberA.estado, [compareData.memberB.name]: compareData.memberB.estado, DIFERENCIA: 'N/A' }
    );

    sheets.push({ 
      name: 'Resumen Ejecutivo', 
      data: summaryData, 
      title: `MATRIZ DE AUDITORÍA: ${compareData.memberA.name} VS ${compareData.memberB.name}` 
    });

    // Detail A
    if (selectedA !== 'all') {
      const detailA = allData.filter(row => String(row[keysInfo.assignee]) === selectedA);
      if (detailA.length > 0) {
        sheets.push({ name: `Detalle ${selectedA.substring(0, 15)}`, data: detailA, title: `Tickets Asignados a ${selectedA}` });
      }
    }

    // Detail B
    if (selectedB !== 'all') {
      const detailB = allData.filter(row => String(row[keysInfo.assignee]) === selectedB);
      if (detailB.length > 0) {
        sheets.push({ name: `Detalle ${selectedB.substring(0, 15)}`, data: detailB, title: `Tickets Asignados a ${selectedB}` });
      }
    }

    await exportMultiSheetExcel(sheets, `VS_Audit_${compareData.memberA.name}_vs_${compareData.memberB.name}.xlsx`);
  };
 
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const handlePdfExport = async () => {
    if (!keysInfo) return;
    setIsExporting(true);
    try {
      const sheets = [];

      // Summary
      const summaryData = [
        { SECCIÓN: 'Métrica', [compareData.memberA.name]: 'Métrica A', [compareData.memberB.name]: 'Métrica B', DIFERENCIA: 'Delta' },
        { SECCIÓN: 'Efficiency Score', [compareData.memberA.name]: Math.round(compareData.memberA.efficiencyScore), [compareData.memberB.name]: Math.round(compareData.memberB.efficiencyScore), DIFERENCIA: (compareData.memberA.efficiencyScore - compareData.memberB.efficiencyScore).toFixed(1) },
        { SECCIÓN: 'Total Items', [compareData.memberA.name]: Math.round(compareData.memberA.total), [compareData.memberB.name]: Math.round(compareData.memberB.total), DIFERENCIA: Math.round(compareData.memberA.total - compareData.memberB.total) },
        { SECCIÓN: 'SLA Compliance %', [compareData.memberA.name]: `${Math.round(compareData.memberA.compliance)}%`, [compareData.memberB.name]: `${Math.round(compareData.memberB.compliance)}%`, DIFERENCIA: `${Math.round(compareData.memberA.compliance - compareData.memberB.compliance)}%` },
        { SECCIÓN: 'MTTR (Hours)', [compareData.memberA.name]: compareData.memberA.rawMttr.toFixed(2), [compareData.memberB.name]: compareData.memberB.rawMttr.toFixed(2), DIFERENCIA: (compareData.memberA.rawMttr - compareData.memberB.rawMttr).toFixed(2) },
      ];

      compareData.radarCombined.forEach((r: any) => {
        summaryData.push({
          SECCIÓN: r.subject,
          [compareData.memberA.name]: r.A,
          [compareData.memberB.name]: r.B,
          DIFERENCIA: (r.A - r.B).toFixed(1)
        });
      });

      sheets.push({
        name: 'Reporte Comparativo',
        data: summaryData,
        title: `AUDITORÍA COMPARATIVA: ${compareData.memberA.name} VS ${compareData.memberB.name}`,
        appliedFilters: {
          Entidad_A: compareData.memberA.name,
          Entidad_B: compareData.memberB.name
        }
      });

      await exportStructuredPdf(
        sheets,
        `Comparativa_Audit_${compareData.memberA.name}_vs_${compareData.memberB.name}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-10"
      id="vs-analytics-report"
    >
      <div className="bg-white border-b border-slate-100 flex flex-col gap-6 p-8 rounded-[3rem] shadow-xl export-exclude mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col md:flex-row gap-4 flex-1 w-full items-stretch">
             <div className="flex-1 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-4">Audit A</span>
                  <select 
                    value={selectedA}
                    onChange={(e) => setSelectedA(e.target.value)}
                    className="w-full h-14 px-6 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-700 hover:bg-white transition-all outline-none"
                  >
                    <option value="all">Promedio de Equipo</option>
                    {collaborators.map((c: any) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
               </div>

               <div className="flex-1 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 pl-4 text-brand-600">Audit B</span>
                  <select 
                    value={selectedB}
                    onChange={(e) => setSelectedB(e.target.value)}
                    className="w-full h-14 px-6 bg-brand-50/30 border border-brand-100 rounded-2xl text-[11px] font-bold text-slate-700 hover:bg-white transition-all outline-none"
                  >
                    <option value="all">Promedio de Equipo</option>
                    {collaborators.map((c: any) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
               </div>
          </div>

          <div className="flex flex-wrap gap-3">
             <button onClick={handleExportAudit} className="h-14 px-6 flex items-center gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all">
                <Download size={14} /> Excel
             </button>
             <button onClick={handlePdfExport} disabled={isExporting} className="h-14 px-6 flex items-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all">
                {isExporting ? <div className="h-3 w-3 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> : <FileText size={14} />}
                Resumen PDF
             </button>
          </div>
        </div>

        <div className="h-[1px] w-full bg-slate-100" />

        <div className="flex flex-col lg:flex-row justify-between items-start md:items-center gap-6">
           <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-4 whitespace-nowrap">Vistas Activas:</span>
              <div className="flex gap-2">
                 {[
                   { id: 'portfolio', label: 'Portafolio', icon: <Layers size={14} /> },
                   { id: 'aging_heatmap', label: 'Calor Aging', icon: <Activity size={14} /> },
                   { id: 'specialization', label: 'Especialización', icon: <Cpu size={14} /> },
                   { id: 'concentration', label: 'Concentración', icon: <PieChart size={14} /> }
                 ].map(m => (
                   <button
                     key={m.id}
                     onClick={() => setSelectedMatrices(prev => 
                       prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id]
                     )}
                     className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${selectedMatrices.includes(m.id) ? 'bg-brand-600 border-brand-500 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'}`}
                   >
                     {m.icon} {m.label}
                   </button>
                 ))}
              </div>
           </div>

           <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              {[
                { id: '1d', label: '1D' }, { id: '7d', label: '7D' }, { id: '15d', label: '15D' },
                { id: '30d', label: 'MES' }, { id: '90d', label: '3M' }, { id: '365d', label: '1A' }
              ].map(range => (
                <button key={range.id} onClick={() => setTimeRange(range.id as any)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${timeRange === range.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                   {range.label}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-12 xl:col-span-5">
          <PerformanceRadar 
            data={compareData.radarCombined} 
            dataKeyA="A"
            dataKeyB="B"
            dataKeyC={radarViewType === 'team' ? "squad" : undefined}
            nameA={compareData.memberA.name}
            nameB={compareData.memberB.name}
            nameC="Squad Benchmark"
            title={radarViewType === 'team' ? "Balance de Capacidades vs Squad" : "Balance de Capacidades Directo"}
            headerActions={
              <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                <button 
                  onClick={() => setRadarViewType('individual')} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${radarViewType === 'individual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   Directo
                </button>
                <button 
                  onClick={() => setRadarViewType('team')} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${radarViewType === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Vs Squad
                </button>
              </div>
            }
          />
        </div>

        <div className="lg:col-span-12 xl:col-span-7 flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Entity A Overview */}
            <AnimatePresence mode="wait">
              <motion.div
                key={compareData.memberA.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <Card className="border-0 shadow-xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden flex flex-col justify-center h-full group hover:shadow-2xl transition-all">
                  <CardContent className="p-10">
                    <div className="flex justify-between items-start mb-8">
                       <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Performance Audit A</p>
                          <h3 className="text-3xl font-black text-slate-950 tracking-tighter group-hover:text-brand-600 transition-colors">{compareData.memberA.name}</h3>
                       </div>
                       <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                          <span className="text-xl font-black text-white">
                             <AnimatedCounter value={Math.round(compareData.memberA.efficiencyScore)} />
                          </span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-2">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Cierres Totales</p>
                          <p className="text-3xl font-black text-slate-950">
                             <AnimatedCounter value={Math.round(compareData.memberA.total)} />
                          </p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">MTTR Avg</p>
                          <p className="text-3xl font-black text-slate-950">
                             <AnimatedCounter value={compareData.memberA.rawMttr} decimals={1} suffix="h" />
                          </p>
                       </div>
                       <div className="col-span-2 pt-6 border-t border-slate-100">
                          <div className="flex justify-between items-end">
                             <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Compliance SLA</p>
                             <p className="text-3xl font-black text-indigo-900">
                                <AnimatedCounter value={Math.round(compareData.memberA.compliance)} suffix="%" />
                             </p>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${compareData.memberA.compliance}%` }}
                               transition={{ duration: 1, ease: "easeOut" }}
                               className="h-full bg-indigo-600" 
                             />
                          </div>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Entity B Overview */}
            <AnimatePresence mode="wait">
              <motion.div
                key={compareData.memberB.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <Card className="border-0 shadow-xl rounded-[3rem] bg-emerald-50/30 border border-emerald-100/50 overflow-hidden flex flex-col justify-center h-full group hover:shadow-2xl transition-all">
                  <CardContent className="p-10">
                    <div className="flex justify-between items-start mb-8">
                       <div>
                          <p className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-2">Performance Audit B</p>
                          <h3 className="text-3xl font-black text-slate-950 tracking-tighter group-hover:text-emerald-600 transition-colors">{compareData.memberB.name}</h3>
                       </div>
                       <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:-rotate-6 transition-transform">
                          <span className="text-xl font-black text-white">
                            <AnimatedCounter value={Math.round(compareData.memberB.efficiencyScore)} />
                          </span>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-2">
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Cierres Totales</p>
                          <p className="text-3xl font-black text-slate-950">
                            <AnimatedCounter value={Math.round(compareData.memberB.total)} />
                          </p>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">MTTR Avg</p>
                          <p className="text-3xl font-black text-slate-950">
                            <AnimatedCounter value={compareData.memberB.rawMttr} decimals={1} suffix="h" />
                          </p>
                       </div>
                       <div className="col-span-2 pt-6 border-t border-emerald-200/50">
                          <div className="flex justify-between items-end">
                             <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Compliance SLA</p>
                             <p className="text-3xl font-black text-emerald-900">
                                <AnimatedCounter value={Math.round(compareData.memberB.compliance)} suffix="%" />
                             </p>
                          </div>
                          <div className="w-full h-1 bg-white rounded-full mt-3 overflow-hidden border border-emerald-100">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${compareData.memberB.compliance}%` }}
                               transition={{ duration: 1, ease: "easeOut" }}
                               className="h-full bg-emerald-500" 
                             />
                          </div>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Advanced Charting */}
      <Card className="border-0 shadow-2xl rounded-[3.5rem] bg-white border border-slate-100 overflow-hidden">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-50/30">
           <div>
              <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest mb-1">Gap Analysis</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Diferencial de Rendimiento Operativo</h3>
           </div>
           <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
              <button 
                onClick={() => setBarChartViewType('individual')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${barChartViewType === 'individual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Individual
              </button>
              <button 
                onClick={() => setBarChartViewType('team')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${barChartViewType === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Vs Squad
              </button>
           </div>
        </CardHeader>
        <CardContent className="p-10">
           <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                 <ReBarChart data={compareData.chartData} barGap={12}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b', textTransform: 'uppercase' }} 
                    />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1.5rem' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                    <Bar name={compareData.memberA.name} dataKey="A" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={34} />
                    <Bar name={compareData.memberB.name} dataKey="B" fill="#10b981" radius={[4, 4, 0, 0]} barSize={34} />
                    {barChartViewType === 'team' && (
                      <Bar name="Promedio Squad" dataKey="squad" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} opacity={0.6} strokeDasharray="4 4" />
                    )}
                 </ReBarChart>
              </ResponsiveContainer>
           </div>
        </CardContent>
      </Card>

      {(compareData.memberA.name !== 'Squad Average' || compareData.memberB.name !== 'Squad Average') && (
        <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center gap-6 px-4">
             <div className="h-[1px] w-12 bg-slate-100" />
             <div className="flex items-center gap-4 bg-white px-8 py-3 rounded-full border border-slate-100 shadow-lg">
                <TrendingUp size={18} className="text-brand-500" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-900">Evolución Histórica y Matrices</h3>
             </div>
             <div className="h-[1px] flex-1 bg-slate-100" />
          </div>

          {compareData.isDataStale && (
            <div className="mx-4 flex items-center gap-4 bg-amber-50 border border-amber-100 p-4 rounded-2xl">
               <AlertTriangle className="text-amber-500" size={18} />
               <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                  Nota: El conjunto de datos es antiguo (Último registro: {format(compareData.maxDataDate!, 'dd/MM/yyyy')}). 
                  Los gráficos se han ajustado automáticamente al periodo de datos disponible. 
               </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-12">
            {/* Conditional Matrix Rendering */}
            
            {selectedMatrices.includes('portfolio') && (
              <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden animate-in zoom-in-95 duration-500">
                <CardHeader className="p-10 pb-2 flex flex-row justify-between items-center bg-slate-50/30">
                  <div>
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Portfolio Focus</p>
                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter">Dispersión de Portafolio por Ámbito</CardTitle>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner">
                      <button 
                        onClick={() => setPortfolioViewType('individual')} 
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${portfolioViewType === 'individual' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Individual
                      </button>
                      <button 
                        onClick={() => setPortfolioViewType('team')} 
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${portfolioViewType === 'team' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        Vs Squad
                      </button>
                    </div>
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-500"><Layers size={20} /></div>
                  </div>
                </CardHeader>
                <CardContent className="p-10 pt-8">
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={compareData.categoryData} layout="vertical" margin={{ left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} axisLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '1rem', border: 'none' }} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                        <Bar dataKey="A" name={compareData.memberA.name} fill="#6366f1" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="B" name={compareData.memberB.name} fill="#10b981" radius={[0, 4, 4, 0]} />
                        {portfolioViewType === 'team' && (
                          <Bar dataKey="squad" name="Promedio Squad" fill="#94a3b8" radius={[0, 4, 4, 0]} opacity={0.6} strokeDasharray="4 4" />
                        )}
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedMatrices.includes('aging_heatmap') && (
              <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden animate-in zoom-in-95 duration-500">
                <CardHeader className="p-10 pb-4 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Stock Volatility Map</p>
                    <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter">Matriz de Calor: Tiempo de Vida (Aging)</CardTitle>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Distribución de tickets por antigüedad y ámbito operativo</p>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                     <button
                        onClick={() => setHeatmapView('A')}
                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${heatmapView === 'A' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        Auditor A: {compareData.memberA.name}
                     </button>
                     <button
                        onClick={() => setHeatmapView('B')}
                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${heatmapView === 'B' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                        Auditor B: {compareData.memberB.name}
                     </button>
                  </div>
                </CardHeader>
                <CardContent className="p-10 overflow-x-auto">
                   <table className="w-full border-collapse">
                      <thead>
                         <tr>
                            <th className="text-left p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ámbito de Gestión</th>
                            {['0-2d', '3-5d', '6-10d', '+10d'].map(b => (
                               <th key={b} className="p-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">{b}</th>
                            ))}
                         </tr>
                      </thead>
                      <tbody>
                         {(heatmapView === 'A' ? compareData.agingHeatmap.A : compareData.agingHeatmap.B).map((row, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                               <td className="p-4 text-xs font-bold text-slate-700 whitespace-nowrap">{row.category}</td>
                               {compareData.agingHeatmap.brackets.map(b => {
                                  const val = row[b.label] || 0;
                                  const maxVal = 15; // Benchmark for scale
                                  const intensity = Math.min(100, (val / maxVal) * 100);
                                  
                                  // Dynamic background based on bracket and intensity
                                  const getBgColor = () => {
                                     if (val === 0) return 'rgba(241, 245, 249, 0.5)';
                                     if (b.label === '0-2d') return `rgba(16, 185, 129, ${0.1 + (intensity/100)*0.4})`;
                                     if (b.label === '3-5d') return `rgba(245, 158, 11, ${0.1 + (intensity/100)*0.4})`;
                                     if (b.label === '6-10d') return `rgba(249, 115, 22, ${0.1 + (intensity/100)*0.4})`;
                                     return `rgba(225, 29, 72, ${0.1 + (intensity/100)*0.5})`;
                                  };

                                  return (
                                     <td key={b.label} className="p-2">
                                        <div 
                                          onClick={() => {
                                            const name = heatmapView === 'A' ? selectedA : selectedB;
                                            const catKey = keysInfo?.category || 'ÁMBITO';
                                            const delayKey = keysInfo?.delay;
                                            const assigneeKey = keysInfo?.assignee;
                                            
                                            const tickets = name === 'all' ? allData : allData.filter(r => String(r[assigneeKey]) === name);
                                            const filtered = tickets.filter(r => {
                                              const age = Number(r['AGING'] || r[delayKey] || 0);
                                              const inCat = String(r[catKey] || 'General') === row.category;
                                              const inBracket = age >= b.min && age <= b.max;
                                              return inCat && inBracket;
                                            });

                                            if (filtered.length > 0) {
                                              setModalTitle(`Tickets: ${row.category} (${b.label}) - ${name === 'all' ? 'Equipo' : name}`);
                                              setModalData(filtered);
                                              setModalOpen(true);
                                            }
                                          }}
                                          className={`h-12 w-full rounded-xl flex items-center justify-center font-black text-xs transition-all hover:scale-105 border border-transparent hover:border-slate-200 cursor-pointer group-hover:shadow-md ${val === 0 ? 'text-slate-200 opacity-50 cursor-default grayscale' : 'text-slate-900 shadow-sm'}`}
                                          style={{ backgroundColor: getBgColor() }}
                                        >
                                           {val}
                                        </div>
                                     </td>
                                  );
                               })}
                            </tr>
                         ))}
                      </tbody>
                   </table>
                   <div className="mt-8 flex items-center justify-center gap-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-100" /> Fluidez Alta</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-100" /> Atención Sugerida</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-100" /> Riesgo de Estancamiento</div>
                   </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
               {selectedMatrices.includes('specialization') && (
                  <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden animate-in zoom-in-95 duration-500 xl:col-span-2">
                    <CardHeader className="p-10 pb-4 bg-slate-50/30 flex flex-row justify-between items-center">
                       <div>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Advanced Domain Analytics</p>
                          <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter">Matriz de Especialización Técnica</CardTitle>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="px-4 py-1.5 bg-slate-900 text-[9px] font-black text-white uppercase tracking-[0.2em] rounded-full shadow-lg">Tipo C / Equipo</div>
                          <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-500"><Cpu size={20} /></div>
                       </div>
                    </CardHeader>
                    <CardContent className="p-10">
                       <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                          {/* Radar Section */}
                          <div className="lg:col-span-6 h-[450px]">
                              <ResponsiveContainer width="100%" height="100%">
                                 <RadarChart cx="50%" cy="50%" outerRadius="80%" data={compareData.specRadar.data}>
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                                    <Radar name={compareData.memberA.name} dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                                    <Radar name={compareData.memberB.name} dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                                    {radarViewType === 'team' && (
                                      <Radar name="Benchmark Squad" dataKey="squad" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} strokeDasharray="4 4" />
                                    )}
                                    <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px' }} />
                                 </RadarChart>
                              </ResponsiveContainer>
                           </div>

                           {/* Stats Section */}
                           <div className="lg:col-span-6 space-y-10">
                              <div className="grid grid-cols-2 gap-6">
                                 <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-slate-500 text-[10px]">A</div>
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dominio Principal</span>
                                    </div>
                                    <div>
                                       <p className="text-[11px] font-black text-slate-900 line-clamp-1">{compareData.specRadar.statsA.topDomain}</p>
                                       <p className="text-2xl font-black text-brand-600">{compareData.specRadar.statsA.share}%</p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200/50">
                                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Índice Afinidad: {compareData.specRadar.statsA.affinity}/10</p>
                                    </div>
                                 </div>

                                 <div className="p-6 bg-brand-50/20 rounded-[2rem] border border-brand-100/50 flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 bg-white rounded-xl shadow-sm border border-brand-100 flex items-center justify-center font-black text-brand-500 text-[10px]">B</div>
                                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-brand-600">Dominio Principal</span>
                                    </div>
                                    <div>
                                       <p className="text-[11px] font-black text-slate-900 line-clamp-1">{compareData.specRadar.statsB.topDomain}</p>
                                       <p className="text-2xl font-black text-emerald-600">{compareData.specRadar.statsB.share}%</p>
                                    </div>
                                    <div className="pt-2 border-t border-brand-200/30">
                                       <p className="text-[8px] font-bold text-brand-400 uppercase tracking-wider">Índice Afinidad: {compareData.specRadar.statsB.affinity}/10</p>
                                    </div>
                                 </div>
                              </div>

                              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white">
                                <div className="flex items-center gap-4 mb-6">
                                   <div className="p-2.5 bg-brand-500 rounded-xl"><Trophy size={16} /></div>
                                   <div>
                                      <h5 className="text-xs font-black uppercase tracking-widest">Brecha de Expertise</h5>
                                      <p className="text-[10px] text-slate-400 mt-1">Comparativa de balance entre dominios operativos</p>
                                   </div>
                                </div>
                                <div className="space-y-5">
                                   {compareData.specRadar.data.slice(0, 3).map((item, idx) => {
                                      const diff = Math.abs(item.A - item.B);
                                      const winner = item.A > item.B ? 'A' : 'B';
                                      return (
                                        <div key={idx} className="flex items-center justify-between gap-6 p-4 bg-white/5 rounded-2xl">
                                           <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex-1 truncate">{item.subject}</span>
                                           <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${winner === 'A' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                              +{diff.toFixed(0)} TKTS (Liderado {winner})
                                           </div>
                                        </div>
                                      );
                                   })}
                                </div>
                             </div>
                          </div>
                       </div>
                    </CardContent>
                  </Card>
               )}

               {selectedMatrices.includes('concentration') && (
                  <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden animate-in zoom-in-95 duration-500 xl:col-span-2">
                    <CardHeader className="p-10 pb-4 bg-slate-50/30 flex flex-row justify-between items-center">
                       <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Concentration Fingerprint</p>
                          <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter">Índice de Concentración y Silos</CardTitle>
                          <p className="text-[10px] text-slate-400 mt-1 font-bold">Análisis de dependencia operativa por especialista</p>
                       </div>
                       <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-500"><PieChart size={20} /></div>
                    </CardHeader>
                    <CardContent className="p-10">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                          {[
                            { 
                               name: compareData.memberA.name, 
                               stats: compareData.concIndex.A, 
                               spec: compareData.specRadar.statsA,
                               color: 'indigo'
                            },
                            { 
                               name: compareData.memberB.name, 
                               stats: compareData.concIndex.B, 
                               spec: compareData.specRadar.statsB,
                               color: 'emerald'
                            }
                          ].map((item, i) => (
                             <div key={i} className="space-y-8 p-8 rounded-[2.5rem] bg-slate-50/50 border border-slate-100">
                                <div className="flex justify-between items-start">
                                   <div>
                                      <h4 className="text-lg font-black text-slate-900 tracking-tighter">{item.name}</h4>
                                      <div className={`mt-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase inline-block ${item.stats.score > 7 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                         Riesgo de Silo: {item.stats.dependencyRisk}
                                      </div>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Índice HHI</p>
                                      <p className="text-3xl font-black text-slate-900">{(item.stats.score).toFixed(1)}</p>
                                   </div>
                                </div>

                                <div className="space-y-3">
                                   <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                      <span>Diversificación</span>
                                      <span>{100 - Math.round(item.stats.siloEffect)}%</span>
                                   </div>
                                   <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-1000 ${i === 0 ? 'bg-indigo-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${100 - item.stats.siloEffect}%` }}
                                      />
                                   </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 pt-4 border-t border-slate-200/50">
                                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top 3 Categorías de Enfoque</p>
                                   <div className="flex flex-wrap gap-2">
                                      {item.spec.top3.map((cat: any, idx: number) => (
                                         <div key={idx} className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-slate-700">{cat.name}</span>
                                            <span className="text-[10px] font-black text-slate-400">{cat.count}</span>
                                         </div>
                                      ))}
                                   </div>
                                </div>

                                <div className="p-4 bg-white rounded-2xl border border-slate-100 italic text-[10px] text-slate-500 leading-relaxed">
                                   {item.stats.score > 7 
                                     ? "Este perfil presenta una alta concentración. Existe un riesgo crítico de pérdida de conocimiento si el especialista no está disponible." 
                                     : item.stats.score > 4 
                                     ? "Perfil con especialización moderada. Buen balance entre foco y polifuncionalidad." 
                                     : "Perfil altamente versátil. Capaz de pivotar entre múltiples áreas sin degradación de servicio."}
                                </div>
                             </div>
                          ))}
                       </div>
                    </CardContent>
                  </Card>
               )}
            </div>
          </div>
        </section>
      )}

      {/* Strategic Audit Matrix */}
      <AnimatePresence mode="wait">
        <motion.div
          key={compareData.memberA.name + compareData.memberB.name}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
        >
          <Card className="border-0 shadow-2xl rounded-[3.5rem] bg-white border border-slate-100 overflow-hidden">
             <CardHeader className="p-12 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-50/20">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Business Audit Matrix</p>
                   <h3 className="text-3xl font-black text-slate-950 tracking-tighter">Matriz de Veredicto Estratégico</h3>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-2xl shadow-xl">
                   <Shield size={16} className="text-brand-400" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Diferencial Validado</span>
                </div>
             </CardHeader>
             <CardContent className="p-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                   {/* Analysis A */}
                   <div className="space-y-10 group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black group-hover:rotate-12 transition-transform">A</div>
                         <h4 className="text-xl font-black text-slate-900">{compareData.memberA.name}</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-8">
                         <div className="space-y-4">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                               <TrendingUp size={12} /> Fortalezas Operativas
                            </p>
                            <ul className="space-y-3">
                               {[
                                  compareData.memberA.efficiencyScore > 80 ? "Alta consistencia en el cumplimiento de procesos críticos." : "Capacidad de respuesta estándar en flujos de trabajo.",
                                  compareData.memberA.total > compareData.squadAvg.total ? "Volumen de resolución competitivo frente al benchmark del equipo." : "Focalización en nichos específicos de gestión operativa.",
                                  "Gestión de tiempos alineada a objetivos corporativos de SLA."
                               ].map((item, i) => (
                                  <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="text-sm font-medium text-slate-600 flex items-start gap-3"
                                  >
                                     <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" /> {item}
                                  </motion.li>
                               ))}
                            </ul>
                         </div>
                         <div className="space-y-4">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                               <AlertTriangle size={12} /> Puntos de Mejora (Gaps)
                            </p>
                            <ul className="space-y-3">
                               {[
                                  compareData.memberA.rawMttr > compareData.squadAvg.rawMttr ? "Potencial de optimización en el tiempo medio de resolución." : "Mantenimiento de cadencia operativa durante picos de demanda.",
                                  "Diversificación de habilidades en nuevas categorías de tickets."
                               ].map((item, i) => (
                                  <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (i * 0.1) }}
                                    className="text-sm font-medium text-slate-600 flex items-start gap-3"
                                  >
                                     <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" /> {item}
                                  </motion.li>
                               ))}
                            </ul>
                         </div>
                      </div>
                   </div>

                   {/* Analysis B */}
                   <div className="space-y-10 group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-indigo-900 text-white flex items-center justify-center font-black group-hover:-rotate-12 transition-transform">B</div>
                         <h4 className="text-xl font-black text-slate-900">{compareData.memberB.name}</h4>
                      </div>
                      <div className="grid grid-cols-1 gap-8">
                         <div className="space-y-4">
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                               <TrendingUp size={12} /> Fortalezas Operativas
                            </p>
                            <ul className="space-y-3">
                               {[
                                  compareData.memberB.efficiencyScore > 80 ? "Liderazgo en calidad y precisión de resolución final." : "Ejecución disciplinada de tareas dentro del backlog asignado.",
                                  compareData.memberB.total > compareData.squadAvg.total ? "Alto rendimiento sostenido durante el periodo de auditoría." : "Contribución regular y estable al rendimiento colectivo.",
                                  "Balance óptimo entre velocidad operativa y rigor técnico."
                               ].map((item, i) => (
                                  <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + (i * 0.1) }}
                                    className="text-sm font-medium text-slate-600 flex items-start gap-3"
                                  >
                                     <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" /> {item}
                                  </motion.li>
                               ))}
                            </ul>
                         </div>
                         <div className="space-y-4">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                               <AlertTriangle size={12} /> Puntos de Mejora (Gaps)
                            </p>
                            <ul className="space-y-3">
                               {[
                                  compareData.memberB.compliance < 85 ? "Priorización necesaria en items con vencimiento próximo." : "Refinamiento de tiempos de respuesta en flujos no estándar.",
                                  "Uniformidad de resultados en tareas de alta complejidad."
                               ].map((item, i) => (
                                  <motion.li 
                                    key={i} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + (i * 0.1) }}
                                    className="text-sm font-medium text-slate-600 flex items-start gap-3"
                                  >
                                     <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" /> {item}
                                  </motion.li>
                               ))}
                            </ul>
                         </div>
                      </div>
                   </div>
                </div>
             </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { 
            label: 'Brecha de Eficiencia', 
            val: Math.abs(compareData.memberA.efficiencyScore - compareData.memberB.efficiencyScore).toFixed(1), 
            icon: <Zap size={18} />, 
            color: 'slate', 
            unit: 'Pts',
            trend: 'closing',
            status: Math.abs(compareData.memberA.efficiencyScore - compareData.memberB.efficiencyScore) > 15 ? 'Crítico' : 'Estable'
          },
          { 
            label: 'Diferencial de Velocidad', 
            val: Math.abs(compareData.memberA.rawMttr - compareData.memberB.rawMttr).toFixed(1), 
            icon: <Clock size={18} />, 
            color: 'indigo', 
            unit: 'Hrs',
            trend: 'widening',
            status: Math.abs(compareData.memberA.rawMttr - compareData.memberB.rawMttr) > 2 ? 'Alto' : 'Normal'
          },
          { 
            label: 'Gap de Productividad', 
            val: Math.abs(compareData.memberA.total - compareData.memberB.total).toFixed(0), 
            icon: <Target size={18} />, 
            color: 'brand', 
            unit: 'Tks',
            trend: 'stable',
            status: 'Consistente'
          }
        ].map((delta, i) => (
          <Card key={i} className="border-0 shadow-lg bg-white rounded-3xl p-10 group hover:ring-2 hover:ring-slate-900 transition-all overflow-hidden relative">
             <div className="absolute top-0 right-0 p-6">
                <span className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  delta.status === 'Crítico' ? 'bg-rose-50 text-rose-600' : 
                  delta.status === 'Consistente' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'
                }`}>
                   {delta.status}
                </span>
             </div>
             <div className="flex items-center gap-6">
                <div className={`p-4 ${delta.color === 'slate' ? 'bg-slate-950 text-white' : delta.color === 'indigo' ? 'bg-indigo-600 text-white' : 'bg-brand-500 text-white'} rounded-2xl group-hover:rotate-6 transition-transform`}>
                   {delta.icon}
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{delta.label}</p>
                   <div className="flex items-baseline gap-2">
                       <h4 className="text-4xl font-black text-slate-900 tracking-tighter">
                          <AnimatedCounter value={Number(delta.val)} decimals={delta.unit === 'Tks' ? 0 : 1} />
                       </h4>
                       <span className="text-[10px] font-bold text-slate-300 uppercase">{delta.unit}</span>
                   </div>
                </div>
             </div>
             <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   {delta.trend === 'closing' ? <ArrowDownRight size={14} className="text-emerald-600" /> : <ArrowUpRight size={14} className="text-rose-600" />}
                   <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Tendencia Histórica</span>
                </div>
                <div className="flex gap-1">
                   {[1, 2, 3].map(dot => <div key={dot} className={`w-1.5 h-1.5 rounded-full ${dot === 3 ? 'bg-slate-200' : 'bg-slate-900'}`} />)}
                </div>
             </div>
          </Card>
        ))}
      </div>

      <DetailsModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        data={modalData}
        keysInfo={keysInfo}
      />
    </motion.div>
  );
};
