import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Users, User, Target, TrendingUp, Zap, Clock, Shield, Search, Filter, 
  ChevronRight, ArrowRight, Activity, Percent, BarChart, Maximize2,
  GitCompare, Trophy, AlertTriangle, Scale, BrainCircuit, ArrowDownRight, ArrowUpRight,
  Download, FileText
} from 'lucide-react';
import { Card, CardHeader, CardContent } from './ui';
import { PerformanceRadar } from './PerformanceRadar';
import { exportMultiSheetExcel, exportStructuredPdf } from '../lib/utils';
import { 
  ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell,
  LineChart, Line
} from 'recharts';

interface Props {
  metrics: any;
  allData: any[];
  keysInfo?: any;
}

export const VSPerformanceAnalytics: React.FC<Props> = ({ metrics, allData, keysInfo }) => {
  const [selectedA, setSelectedA] = useState<string>('all');
  const [selectedB, setSelectedB] = useState<string>('all');
  const [radarViewType, setRadarViewType] = useState<'individual' | 'team'>('individual');
  const [barChartViewType, setBarChartViewType] = useState<'individual' | 'team'>('individual');

  const collaborators = metrics.collabList;

  const compareData = useMemo(() => {
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

    return { memberA, memberB, squadAvg, chartData, radarCombined };
  }, [selectedA, selectedB, collaborators, metrics]);

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
   <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4 export-exclude">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 w-full items-end">
           <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><User size={16} /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entidad de Comparación A</span>
              </div>
              <select 
                value={selectedA}
                onChange={(e) => setSelectedA(e.target.value)}
                className="w-full h-16 px-6 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 transition-all outline-none shadow-sm"
              >
                <option value="all">Promedio de Equipo</option>
                {collaborators.map((c: any) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
           </div>

           <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-brand-50 text-brand-600 rounded-xl"><GitCompare size={16} /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Entidad de Comparación B</span>
              </div>
              <select 
                value={selectedB}
                onChange={(e) => setSelectedB(e.target.value)}
                className="w-full h-16 px-6 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 transition-all outline-none shadow-sm"
              >
                <option value="all">Promedio de Equipo</option>
                {collaborators.map((c: any) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
           </div>

           <div className="md:col-span-2 lg:col-span-2 grid grid-cols-2 gap-3">
              <button 
                onClick={handleExportAudit}
                className="flex-1 h-16 flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl group border border-slate-800"
              >
                 <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                 Excel Data
              </button>
              <button 
                onClick={handlePdfExport}
                disabled={isExporting}
                className={`flex-1 h-16 flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl group border border-slate-200 ${isExporting ? 'opacity-50' : ''}`}
              >
                 {isExporting ? (
                   <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                 ) : (
                   <FileText size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                 )}
                 {isExporting ? 'Generando...' : 'Resumen PDF'}
              </button>
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
            <Card className="border-0 shadow-xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden flex flex-col justify-center">
               <CardContent className="p-10">
                  <div className="flex justify-between items-start mb-8">
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Performance Audit A</p>
                        <h3 className="text-3xl font-black text-slate-950 tracking-tighter">{compareData.memberA.name}</h3>
                     </div>
                     <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-xl font-black text-white">{Math.round(compareData.memberA.efficiencyScore)}</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-2">
                     <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Cierres Totales</p>
                        <p className="text-3xl font-black text-slate-950">{Math.round(compareData.memberA.total)}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">MTTR Avg</p>
                        <p className="text-3xl font-black text-slate-950">{compareData.memberA.rawMttr.toFixed(1)}h</p>
                     </div>
                     <div className="col-span-2 pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-end">
                           <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Compliance SLA</p>
                           <p className="text-3xl font-black text-indigo-900">{Math.round(compareData.memberA.compliance)}%</p>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full mt-3 overflow-hidden">
                           <div className="h-full bg-indigo-600" style={{ width: `${compareData.memberA.compliance}%` }} />
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>

            {/* Entity B Overview */}
            <Card className="border-0 shadow-xl rounded-[3rem] bg-slate-50 border border-slate-200/50 overflow-hidden flex flex-col justify-center">
               <CardContent className="p-10">
                  <div className="flex justify-between items-start mb-8">
                     <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">Performance Audit B</p>
                        <h3 className="text-3xl font-black text-slate-950 tracking-tighter">{compareData.memberB.name}</h3>
                     </div>
                     <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-xl font-black text-white">{Math.round(compareData.memberB.efficiencyScore)}</span>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 lg:grid-cols-2">
                     <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Cierres Totales</p>
                        <p className="text-3xl font-black text-slate-950">{Math.round(compareData.memberB.total)}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">MTTR Avg</p>
                        <p className="text-3xl font-black text-slate-950">{compareData.memberB.rawMttr.toFixed(1)}h</p>
                     </div>
                     <div className="col-span-2 pt-6 border-t border-slate-200/50">
                        <div className="flex justify-between items-end">
                           <p className="text-[10px] font-black uppercase text-brand-600 tracking-widest">Compliance SLA</p>
                           <p className="text-3xl font-black text-brand-900">{Math.round(compareData.memberB.compliance)}%</p>
                        </div>
                        <div className="w-full h-1 bg-slate-200/50 rounded-full mt-3 overflow-hidden">
                           <div className="h-full bg-brand-500" style={{ width: `${compareData.memberB.compliance}%` }} />
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>
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
                    <Bar name={compareData.memberB.name} dataKey="B" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={34} />
                    {barChartViewType === 'team' && (
                      <Bar name="Promedio Squad" dataKey="squad" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={20} opacity={0.6} strokeDasharray="4 4" />
                    )}
                 </ReBarChart>
              </ResponsiveContainer>
           </div>
        </CardContent>
      </Card>
      
      {/* Strategic Audit Matrix */}
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
               <div className="space-y-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black">A</div>
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
                              <li key={i} className="text-sm font-medium text-slate-600 flex items-start gap-3">
                                 <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" /> {item}
                              </li>
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
                              <li key={i} className="text-sm font-medium text-slate-600 flex items-start gap-3">
                                 <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" /> {item}
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>
               </div>

               {/* Analysis B */}
               <div className="space-y-10">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-indigo-900 text-white flex items-center justify-center font-black">B</div>
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
                              <li key={i} className="text-sm font-medium text-slate-600 flex items-start gap-3">
                                 <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" /> {item}
                              </li>
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
                              <li key={i} className="text-sm font-medium text-slate-600 flex items-start gap-3">
                                 <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" /> {item}
                              </li>
                           ))}
                        </ul>
                     </div>
                  </div>
               </div>
            </div>
         </CardContent>
      </Card>

      {/* Gap Analysis Section */}
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
                      <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{delta.val}</h4>
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
    </motion.div>
  );
};
