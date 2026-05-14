import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Modal, Button } from './ui';
import { AlertCircle, FileSearch, CheckCircle2, ArrowRight, ShieldAlert, Zap, Info, ChevronRight, XCircle, Search, Activity, List, Target, Download, FileSpreadsheet, ExternalLink, RefreshCcw } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell as RechartsCell } from 'recharts';
import { SCOPE_MAPPING, AMBITO_GROUPS, AMBITO_REVERSE_MAPPING, CYBER_SLA_POLICIES, PriorityLevel } from '../constants/cyberCatalog';
import { motion, AnimatePresence } from 'motion/react';
import { isCriticalPriority } from './CyberView';
import { DetailsModal } from './DetailsModal';
import { CyberRowDetailModal } from './CyberRowDetailModal';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface Props {
  data: any[];
}

export const GapFinderView: React.FC<Props> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [selectedGap, setSelectedGap] = useState<any | null>(null);

  // Filter out ghost rows (empty or just placeholder dashes)
  const cleanData = useMemo(() => {
    return data.filter(row => {
      const project = String(row['PROYECTO O TAREA'] || row['Proyecto'] || row['Tarea'] || '').trim();
      const id = String(row['Vulnerabilidades'] || row['GAP'] || row['Identificación'] || row['Numero'] || '').trim();
      const activity = String(row['Actividad'] || row['Acciones'] || row['Sitación Actual'] || '').trim();
      
      // A valid row MUST have at least one substantial field with real words
      // Filtering rows that are just placeholders ("-", "N/A", etc.)
      const isPlaceholder = (val: string) => {
        const v = val.toLowerCase();
        return v === "" || v === "-" || v === "n/a" || v === "no aplica" || v === ".";
      };

      const hasMainContent = (!isPlaceholder(project) && project.length > 2) || 
                            (!isPlaceholder(id) && id.length > 2) ||
                            (!isPlaceholder(activity) && activity.length > 4);
      
      return hasMainContent;
    });
  }, [data]);

  const analysis = useMemo(() => {
    const unmappedItems: any[] = [];
    const categories: Record<string, { total: number, critical: number, delayed: number, items: any[] }> = {};

    cleanData.forEach(row => {
      const projectRaw = String(row['PROYECTO O TAREA'] || row['Proyecto'] || row['Tarea'] || '').trim();
      const projectLower = projectRaw.toLowerCase();
      
      // Better Mapping Logic (Substring matching)
      let strategicCategory = 'Anomalía de Clasificación MAC';
      
      // Use the expanded SCOPE_MAPPING
      const mappingKeys = Object.keys(SCOPE_MAPPING).sort((a, b) => b.length - a.length); // Match longest keys first
      for (const key of mappingKeys) {
        if (projectLower.includes(key.toLowerCase())) {
          strategicCategory = SCOPE_MAPPING[key];
          break;
        }
      }

      const priorityRaw = row['Criticidad'] || row['Prioridad'] || row['CRITICIDAD'] || row['Nivel de Riesgo'] || '';
      const isCritical = isCriticalPriority(priorityRaw);
      const delayDays = Number(row['Dias de atraso'] || row['Dias de Atraso'] || 0);
      const statusRaw = String(row['SEMAFORO'] || row['Estado'] || row['Status'] || '').toLowerCase();
      
      if (strategicCategory === 'Anomalía de Clasificación MAC') {
        const impactScore = isCritical ? 100 : (priorityRaw.toLowerCase().includes('media') ? 60 : 25);
        
        let suggestedMapping = null;
        const lookupString = (projectRaw + " " + String(row['Ámbitos Relacionados'] || row['Ambitos'] || '')).toLowerCase();
        
        // Reverse exact match
        for (const [key, val] of Object.entries(AMBITO_REVERSE_MAPPING)) {
          if (lookupString.includes(key.toLowerCase())) {
             suggestedMapping = val;
             break;
          }
        }
        
        // Fallback scope mapping
        if (!suggestedMapping) {
          for (const [key, val] of Object.entries(SCOPE_MAPPING)) {
            if (lookupString.includes(key.toLowerCase())) {
               suggestedMapping = val;
               break;
            }
          }
        }

        unmappedItems.push({ 
          ...row, 
          strategicCategory, 
          impactScore,
          suggestedMapping,
          projectName: projectRaw || 'Ítem sin Título'
        });
      }
      
      if (!categories[strategicCategory]) {
        categories[strategicCategory] = { total: 0, critical: 0, delayed: 0, items: [] };
      }
      
      // SLA threshold based on priority
      let threshold = 15;
      if (isCritical) threshold = 5;
      else if (priorityRaw.toLowerCase().includes('media')) threshold = 30;
      
      const isDelayed = delayDays > threshold || statusRaw.includes('atrasado') || statusRaw.includes('atrasada');

      categories[strategicCategory].total++;
      if (isCritical) categories[strategicCategory].critical++;
      if (isDelayed) categories[strategicCategory].delayed++;
      categories[strategicCategory].items.push(row);
    });

    const categoryList = Object.entries(categories).map(([name, stats]) => ({
      name,
      ...stats,
      compliance: Math.round(((stats.total - stats.delayed) / (stats.total || 1)) * 100)
    })).sort((a, b) => b.critical - a.critical);

    // Extract unique unmapped project names for the "Where" section
    const unmappedProjectNames = Array.from(new Set(unmappedItems.map(item => 
      String(item['PROYECTO O TAREA'] || item['Proyecto'] || 'Sin Nombre').trim()
    ))).map(name => ({
      name,
      count: unmappedItems.filter(item => String(item['PROYECTO O TAREA'] || item['Proyecto'] || '').trim() === name).length,
      items: unmappedItems.filter(item => String(item['PROYECTO O TAREA'] || item['Proyecto'] || '').trim() === name)
    }));

    return { 
      unmappedItems, 
      unmappedProjects: unmappedProjectNames, 
      categories: categoryList 
    };
  }, [data]);

  const [selectedUnmapped, setSelectedUnmapped] = useState<any[] | null>(null);
  const [unmappedTitle, setUnmappedTitle] = useState("");

  const selectedCategoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = analysis.categories.find(c => c.name === selectedCategory);
    return cat ? cat.items : [];
  }, [selectedCategory, analysis]);

  const stats = useMemo(() => {
    const totalItems = cleanData.length;
    const unmappedCount = analysis.unmappedItems.length;
    const mappedItems = totalItems - unmappedCount;
    const coverage = totalItems > 0 ? Math.round((mappedItems / totalItems) * 100) : 0;
    
    const unmappedCritical = analysis.unmappedItems.filter(item => {
      const priorityRaw = item['Criticidad'] || item['Prioridad'] || item['CRITICIDAD'] || '';
      return isCriticalPriority(priorityRaw);
    }).length;

    return {
      total: totalItems,
      mapped: mappedItems,
      unmapped: unmappedCount,
      coverage,
      unmappedProjectsCount: analysis.unmappedProjects.length,
      unmappedFieldsCount: analysis.unmappedItems.length,
      unmappedCritical
    };
  }, [cleanData, analysis]);

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // 1. Executive Summary Sheet
    const summaryData = [
      { Concepto: 'Fecha de Auditoría', Valor: new Date().toLocaleDateString() },
      { Concepto: 'Total Activos Analizados', Valor: stats.total },
      { Concepto: 'Cobertura Estratégica (%)', Valor: `${stats.coverage}%` },
      { Concepto: 'Items Mapeados Correctamente', Valor: stats.mapped },
      { Concepto: 'Gaps Detectados (Sin Dominio)', Valor: stats.unmapped },
      { Concepto: 'Hallazgos de Alta Criticidad', Valor: stats.unmappedCritical },
      { Concepto: 'Proyectos Sin Tracking 2026', Valor: stats.unmappedProjectsCount },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen Ejecutivo");

    // 2. Gaps Detail Sheet
    const gapsData = analysis.unmappedItems.map(item => ({
      Proyecto: item.projectName || '-',
      Identificacion: item['Vulnerabilidades'] || item['GAP'] || item['Identificación'] || '-',
      Criticidad: item['Criticidad'] || item['Prioridad'] || '-',
      Estado: item['SEMAFORO'] || item['Estado'] || '-',
      Responsable: item['Responsable Seguridad'] || item['Responsable'] || '-',
      'Impacto Gobernanza (0-100)': item.impactScore,
      'Rating Riesgo': item.impactScore > 80 ? 'CRÍTICO' : (item.impactScore > 50 ? 'ALTO' : 'MEDIO'),
      'Sugerencia': 'Mapear a Dominio Estratégico en Catálogo 2026'
    }));
    const worksheet = XLSX.utils.json_to_sheet(gapsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gaps Detectados");

    // 3. Compliance by Category Sheet
    const complianceData = analysis.categories.map(cat => ({
      Categoria: cat.name,
      'Volumen Total': cat.total,
      'Items Críticos': cat.critical,
      'Items Atrasados': cat.delayed,
      'Cumplimiento SLA (%)': `${cat.compliance}%`,
      'Estado SLA': cat.compliance < 80 ? 'FUERA DE RANGO' : (cat.compliance < 100 ? 'ALERTA' : 'OPTIMO'),
      'Riesgo del Dominio': cat.critical > (cat.total * 0.3) ? 'CRÍTICO' : 'CONTROLADO'
    }));
    const complianceSheet = XLSX.utils.json_to_sheet(complianceData);
    XLSX.utils.book_append_sheet(workbook, complianceSheet, "Cumplimiento por Dominio");

    // 4. Team Focus Sheet (Detailed items)
    const teamData = cleanData.map(item => ({
      Proyecto: item['PROYECTO O TAREA'] || item['Proyecto'] || '-',
      Responsable: item['Responsable Seguridad'] || item['Responsable'] || 'SIN ASIGNAR',
      Criticidad: item['Criticidad'] || item['Prioridad'] || '-',
      Estado: item['SEMAFORO'] || item['Estado'] || '-',
      'Días de Atraso': item['Dias de atraso'] || item['Dias de Atraso'] || 0
    }));
    const teamSheet = XLSX.utils.json_to_sheet(teamData);
    XLSX.utils.book_append_sheet(workbook, teamSheet, "Detalle por Responsable");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `Cyber_Audit_Gaps_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const coverageData = [
    { name: 'Mapeado', value: stats.mapped, color: '#6366f1' },
    { name: 'Gaps Visibilidad', value: stats.unmapped, color: '#f43f5e' }
  ];
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans pb-32">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-slate-50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="space-y-6 max-w-4xl relative z-10">
          <div className="flex items-center gap-4">
             <div className="h-2 w-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
             <span className="text-[11px] font-black text-brand-500 uppercase tracking-[0.5em]">Análisis de Riesgos MAC & Resiliencia</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[0.9]">Gap Finder<span className="text-brand-600">.</span></h2>
          <p className="text-lg font-bold text-slate-500 max-w-2xl leading-relaxed">
            Auditoría de correspondencia estratégica. Identificamos puntos ciegos entre la operación y los dominios de la matriz MAC.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
             <div className="flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
               <Activity size={18} className="text-brand-500" />
               <span className="text-sm font-black text-slate-700">{stats.total} Activos Auditados</span>
             </div>
             <div className="flex items-center gap-3 px-6 py-3 bg-rose-50 border border-rose-100 rounded-2xl">
               <AlertCircle size={18} className="text-rose-500" />
               <span className="text-sm font-black text-rose-700">{stats.unmapped} Hallazgos Críticos</span>
             </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-3 px-8 py-5 bg-white border-2 border-slate-900 text-slate-900 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xl hover:shadow-2xl active:scale-95"
          >
            <FileSpreadsheet size={16} /> Exportar Auditoría
          </button>
          <button className="flex items-center gap-3 px-8 py-5 bg-brand-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-brand-700 transition-all shadow-xl shadow-brand-500/20 hover:shadow-2xl active:scale-95">
            <RefreshCcw size={16} /> Re-Evaluar Gaps
          </button>
        </div>
      </div>

      {/* Metric Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="border-0 shadow-2xl bg-slate-900 text-white rounded-[3rem] p-10 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
             <ShieldAlert size={120} />
           </div>
           <div className="relative z-10 text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-400 mb-6 underline underline-offset-8 decoration-indigo-500/30">Cobertura Catálogo</p>
              <h4 className="text-6xl font-black tracking-tighter mb-8 leading-none">{stats.coverage}%</h4>
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <span>Mapeado Ok</span>
                    <span>{stats.coverage}%</span>
                 </div>
                 <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${stats.coverage}%` }} 
                      className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                    />
                 </div>
              </div>
           </div>
        </Card>

        <Card className="border-0 shadow-2xl bg-white border border-slate-100 rounded-[3rem] p-10 group hover:border-rose-200 transition-colors">
           <div className="flex items-start justify-between mb-8">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 underline underline-offset-8 decoration-slate-100">Gaps de Proyecto</p>
              <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl group-hover:scale-110 transition-transform"><FileSearch size={20} /></div>
           </div>
           <h4 className="text-6xl font-black tracking-tighter text-slate-900 mb-6 leading-none text-left">{stats.unmappedProjectsCount}</h4>
           <p className="text-[10px] font-bold text-rose-500 leading-relaxed uppercase tracking-widest flex items-center gap-2">
             <AlertCircle size={12} /> Iniciativas sin tracking estratégico
           </p>
        </Card>

        <Card className="border-0 shadow-2xl bg-white border border-slate-100 rounded-[3rem] p-10 group hover:border-amber-200 transition-colors">
           <div className="flex items-start justify-between mb-8">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 underline underline-offset-8 decoration-slate-100">Críticos Sin Mapeo</p>
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform"><Zap size={20} /></div>
           </div>
           <h4 className="text-6xl font-black tracking-tighter text-amber-600 mb-6 leading-none text-left">{stats.unmappedCritical}</h4>
           <div className="flex items-center gap-2 text-[10px] font-black text-amber-700 uppercase tracking-widest bg-amber-50 px-4 py-2 rounded-xl">
             <ShieldAlert size={12} /> High Priority Risk Hall
           </div>
        </Card>

        <Card className="border-0 shadow-2xl bg-white border border-slate-100 rounded-[3rem] p-10 overflow-hidden relative">
           <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16" />
           <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-6 underline underline-offset-8 decoration-slate-100 relative z-10">Total Items Fuera</p>
           <h4 className="text-6xl font-black tracking-tighter text-slate-900 mb-6 leading-none relative z-10 text-left">{stats.unmapped}</h4>
           <div className="relative z-10 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
             <List size={12} className="text-brand-500" /> Registros Huérfanos
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Governance Evolution Chart */}
        <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden flex flex-col h-[600px]">
          <CardHeader className="p-12 border-b border-slate-50 shrink-0">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500 mb-2">Dominio Risk Profile</p>
             <h3 className="text-3xl font-black text-slate-900 tracking-tight">Panorámica Gaps vs Criticidad</h3>
          </CardHeader>
          <CardContent className="p-12 pb-6 flex-1 min-h-0 bg-slate-50/30">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analysis.categories} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: '800' }} 
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  dy={10}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '700' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                  contentStyle={{ 
                    borderRadius: '1.5rem', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                    padding: '20px',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="left" 
                  wrapperStyle={{ paddingBottom: '30px' }}
                  content={({ payload }: any) => (
                    <div className="flex gap-6">
                       {payload.map((entry: any, index: number) => (
                         <div key={index} className="flex items-center gap-2">
                           <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.value}</span>
                         </div>
                       ))}
                    </div>
                  )}
                />
                <Bar name="Total Items" dataKey="total" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar name="Críticos" dataKey="critical" fill="#f43f5e" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar name="Atrasados" dataKey="delayed" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Coverage Pie/Radar Alternative */}
        <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden flex flex-col h-[600px]">
          <CardHeader className="p-12 border-b border-slate-50 shrink-0">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-2">Relación de Cobertura</p>
             <h3 className="text-3xl font-black text-slate-900 tracking-tight">Distribución de Gaps</h3>
          </CardHeader>
          <CardContent className="p-12 flex-1 min-h-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coverageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={140}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {coverageData.map((entry, index) => (
                    <RechartsCell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-slate-900">{stats.coverage}%</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">SLA Coverage</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Section */}
      <div className="space-y-8">
        <Card className="border-0 shadow-2xl rounded-[3rem] bg-white overflow-hidden border border-slate-100">
          <CardHeader className="p-12 border-b border-slate-50 bg-[#fbfcff]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em] mb-3">Governance Framework</p>
                <h3 className="text-4xl font-black text-slate-900 tracking-tight">Compliance by Category</h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowFullDetails(true)} 
                  className="group relative flex items-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest overflow-hidden hover:scale-105 transition-all shadow-xl shadow-slate-900/10"
                >
                   <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                   <List size={16} className="relative z-10" /> 
                   <span className="relative z-10">Full Audit Log</span>
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-12 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Dominio Estratégico</th>
                    <th className="px-12 py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Volumen</th>
                    <th className="px-12 py-8 text-center text-[10px] font-black uppercase tracking-widest text-rose-500">Críticos</th>
                    <th className="px-12 py-8 text-[10px] font-black uppercase tracking-widest text-slate-400">SLA Health Status</th>
                    <th className="px-12 py-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {analysis.categories.map((cat, i) => (
                    <tr key={i} className="hover:bg-slate-50/80 transition-all group">
                      <td className="px-12 py-8">
                        <div className="flex items-center gap-4">
                           <div className={`w-2.5 h-10 rounded-full ${cat.compliance < 80 ? 'bg-rose-500' : 'bg-brand-500'}`} />
                           <span className="text-base font-black text-slate-800 uppercase tracking-tight">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-12 py-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 font-mono font-black text-sm border border-slate-100">
                          {cat.total}
                        </div>
                      </td>
                      <td className="px-12 py-8 text-center">
                        <span className={`text-sm font-black font-mono px-4 py-2 rounded-xl ${cat.critical > 0 ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-slate-50 text-slate-300'}`}>
                          {cat.critical}
                        </span>
                      </td>
                      <td className="px-12 py-8">
                        <div className="flex items-center gap-6">
                          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${cat.compliance}%` }} 
                              transition={{ duration: 1.5, ease: "easeOut" }} 
                              className={`h-full relative overflow-hidden ${cat.compliance < 80 ? 'bg-gradient-to-r from-rose-600 to-rose-400' : 'bg-gradient-to-r from-brand-600 to-brand-400'}`}
                            >
                               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')] opacity-20" />
                            </motion.div>
                          </div>
                          <span className={`text-xs font-black w-12 ${cat.compliance < 80 ? 'text-rose-600' : 'text-brand-600'}`}>{cat.compliance}%</span>
                        </div>
                      </td>
                      <td className="px-12 py-8 text-right">
                        <button 
                          onClick={() => setSelectedCategory(cat.name)} 
                          className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                        >
                          Explorar Gaps
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-2xl rounded-[3rem] bg-white border border-slate-100 overflow-hidden">
          <CardHeader className="p-12 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-brand-500 uppercase tracking-[0.3em]">Cyber Bestiary Mapping</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Perfiles de Hallazgos MAC</h3>
            </div>
            <div className="px-6 py-3 bg-brand-50 rounded-2xl border border-brand-100">
               <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Analítica de Riesgos</span>
            </div>
          </CardHeader>
          <CardContent className="p-12">
      {/* Animals / Beast Section Improvement */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {[
          { label: 'Tigres', icon: '🐯', color: 'bg-rose-50 border-rose-100 text-rose-600', sub: 'Peligro Crítico', desc: 'Actividades de alto riesgo con aging > 30 días.', filter: (r: any) => isCriticalPriority(r['Criticidad'] || '') && Number(r['Dias de atraso'] || 0) > 30 },
          { label: 'Águilas', icon: '🦅', color: 'bg-indigo-50 border-indigo-100 text-indigo-600', sub: 'Enfoque MAC', desc: 'Activos mapeados correctamente con alta prioridad.', filter: (r: any) => !analysis.unmappedItems.includes(r) && isCriticalPriority(r['Criticidad'] || '') },
          { label: 'Tiburones', icon: '🦈', color: 'bg-brand-50 border-brand-100 text-brand-600', sub: 'Cazadores SLA', desc: 'Items próximos a vencer o en límite de tolerancia.', filter: (r: any) => Number(r['Dias de atraso'] || 0) > 0 && Number(r['Dias de atraso'] || 0) <= 5 },
          { label: 'Búhos', icon: '🦉', color: 'bg-slate-100 border-slate-200 text-slate-600', sub: 'Gobernanza', desc: 'Gaps de visibilidad con bajo impacto operativo.', filter: (r: any) => analysis.unmappedItems.includes(r) && !isCriticalPriority(r['Criticidad'] || '') },
          { label: 'Hormigas', icon: '🐜', color: 'bg-emerald-50 border-emerald-100 text-emerald-600', sub: 'Operativo', desc: 'Tareas de mantenimiento y cumplimiento periódico.', filter: (r: any) => (r['Estado'] || '').toLowerCase().includes('completo') || (r['SEMAFORO'] || '').toLowerCase().includes('verde') }
        ].map((beast, idx) => {
          const beastCount = cleanData.filter(beast.filter).length;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              onClick={() => {
                setSelectedUnmapped(cleanData.filter(beast.filter));
                setUnmappedTitle(`${beast.label}: ${beast.sub}`);
              }}
              className={`p-8 rounded-[3rem] border cursor-pointer transition-all hover:shadow-2xl relative overflow-hidden group ${beast.color}`}
            >
              <div className="absolute -right-6 -bottom-6 text-8xl opacity-[0.07] grayscale group-hover:grayscale-0 group-hover:scale-125 group-hover:rotate-12 transition-all duration-700">
                {beast.icon}
              </div>
              <div className="flex flex-col relative z-10 text-left">
                <div className="w-14 h-14 bg-white/50 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm">
                  {beast.icon}
                </div>
                <h4 className="text-2xl font-black tracking-tighter leading-none">{beast.label}</h4>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">{beast.sub}</p>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-4xl font-black tracking-tighter leading-none">{beastCount}</span>
                  <div className="h-px flex-1 bg-current opacity-10" />
                </div>
                <p className="text-[11px] font-bold opacity-60 leading-relaxed">
                  {beast.desc}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
          </CardContent>
        </Card>
      </div>

      <DetailsModal 
         isOpen={showFullDetails} 
         onClose={() => setShowFullDetails(false)} 
         data={cleanData} 
         title="Gaps & Mitigación: Detalle Completo" 
         filename="Gaps_Mitigacion_Full.xlsx" 
      />

      <Modal 
        isOpen={!!selectedUnmapped} 
        onClose={() => setSelectedUnmapped(null)} 
        title={`Registros en Gap: ${unmappedTitle}`}
      >
        <div className="space-y-6">
           <div className="bg-rose-600 p-8 rounded-[2rem] text-white overflow-hidden relative shadow-lg">
              <AlertCircle className="absolute -right-4 -bottom-4 opacity-10 w-32 h-32 rotate-12" />
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-200 mb-2">Auditoría de Inconsistencia</p>
              <h4 className="text-2xl font-black tracking-tighter uppercase leading-tight mb-4">{unmappedTitle}</h4>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-100">
                 <ShieldAlert size={14} /> Este activo no existe en el Catálogo Cyber 2026 y no tiene SLAs auditables.
              </div>
           </div>

           <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {selectedUnmapped?.map((item, i) => (
                <div key={i} className="p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all flex flex-col gap-3 group relative overflow-hidden">
                  <div className="flex justify-between items-start z-10 relative">
                     <p className="text-xs font-black text-slate-800 uppercase leading-tight max-w-[75%]">
                        {item['Vulnerabilidades'] || item['GAP'] || item['PROYECTO O TAREA'] || 'Descriptor no hallado'}
                     </p>
                     <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${isCriticalPriority(item['Criticidad'] || item['Prioridad'] || '') ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200'} border`}>
                        {item['Criticidad'] || item['Prioridad'] || 'Media'}
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 z-10 relative bg-slate-50 p-3 rounded-xl border border-slate-100">
                     <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado</span>
                        <p className="text-[10px] font-bold text-slate-600 uppercase">{item['SEMAFORO'] || item['Estado'] || 'Activo'}</p>
                     </div>
                     <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Responsable</span>
                        <p className="text-[10px] font-bold text-slate-600">{item['Responsable Seguridad'] || '-'}</p>
                     </div>
                  </div>

                  {item.suggestedMapping ? (
                     <div className="mt-2 bg-brand-50/50 p-4 rounded-xl border border-brand-100 z-10 relative">
                        <div className="flex items-center gap-2 mb-2">
                           <Zap size={14} className="text-brand-500" />
                           <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Smart Action Plan</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700">
                           Se detectó coincidencia de ámbitos. Acción recomendada: 
                           <span className="block mt-1 font-black text-brand-700 bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-200 inline-block">
                             Re-asignar a: {item.suggestedMapping}
                           </span>
                        </p>
                     </div>
                  ) : (
                     <div className="mt-2 bg-amber-50/50 p-4 rounded-xl border border-amber-100 z-10 relative">
                        <div className="flex items-center gap-2 mb-2">
                           <AlertCircle size={14} className="text-amber-500" />
                           <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Revisión Manual Requerida</span>
                        </div>
                        <p className="text-xs font-bold text-slate-600">
                           No se detectaron correlaciones obvias en los ámbitos para la categoría estratégica. Solicitar revisión al responsable de gobernanza.
                        </p>
                     </div>
                  )}
                  {item.suggestedMapping && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-100/50 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
                  )}
                </div>
              ))}
           </div>
           
           <Button 
            className="w-full h-14 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800"
            onClick={() => setSelectedUnmapped(null)}
           >
             Cerrar Auditoría Local
           </Button>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedCategory} onClose={() => setSelectedCategory(null)} title={`Trazabilidad Estratégica: ${selectedCategory}`}>
         {selectedCategory && (
           <div className="space-y-6">
             <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 text-white relative overflow-hidden shadow-2xl">
                <ShieldAlert className="absolute -right-4 -bottom-4 opacity-5 w-48 h-48 rotate-12" />
                <div className="relative z-10">
                  <p className="text-brand-400 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Auditoría de Dominio MAC</p>
                  <h4 className="text-4xl font-black tracking-tighter uppercase leading-none">{selectedCategory}</h4>
                  <div className="mt-8 flex items-center gap-8">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Muestra Táctica</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black">{selectedCategoryItems.length}</span>
                          <span className="text-[10px] font-bold text-slate-500">Items</span>
                        </div>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Impacto Crítico</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-rose-400">{selectedCategoryItems.filter(r => isCriticalPriority(r['Criticidad'] || r['Prioridad'] || '')).length}</span>
                          <span className="text-[10px] font-bold text-rose-500/50">High Risk</span>
                        </div>
                    </div>
                  </div>
                </div>
             </div>
             
             <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.05 } }
                  }}
                  className="space-y-3"
                >
                   {selectedCategoryItems.map((item, idx) => (
                     <motion.div 
                        key={idx} 
                        variants={{
                          hidden: { opacity: 0, x: -10 },
                          visible: { opacity: 1, x: 0 }
                        }}
                        onClick={() => setSelectedGap(item)}
                        className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-brand-100 transition-all group cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex flex-col gap-1">
                             <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest">{item['Vulnerabilidades'] || item['GAP'] || item['Identificación'] || 'Activo No Definido'}</span>
                             <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-brand-600 transition-colors">
                               {item['PROYECTO O TAREA'] || item['Proyecto'] || 'Ítem sin Título'}
                             </h5>
                           </div>
                           <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isCriticalPriority(item['Criticidad'] || item['Prioridad'] || '') ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                             {item['Criticidad'] || item['Prioridad'] || 'Media'}
                           </div>
                        </div>
                        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-50">
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable</p>
                              <p className="text-[10px] font-bold text-slate-700 truncate">{item['Responsable Seguridad'] || item['Responsable'] || 'SIN ASIGNAR'}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado Operativo</p>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${String(item['SEMAFORO'] || '').toLowerCase().includes('verde') ? 'bg-emerald-500' : String(item['SEMAFORO'] || '').toLowerCase().includes('rojo') ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                <p className="text-[10px] font-bold text-slate-700 uppercase">{item['SEMAFORO'] || item['Estado'] || 'Activo'}</p>
                              </div>
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">SLA Atraso</p>
                              <p className={`text-[10px] font-black ${Number(item['Dias de atraso'] || 0) > 30 ? 'text-rose-600' : 'text-slate-700'}`}>
                                {item['Dias de atraso'] || item['Dias de Atraso'] || 0} Días
                              </p>
                           </div>
                        </div>
                     </motion.div>
                   ))}
                </motion.div>
             </div>
           </div>
         )}
      </Modal>

      <CyberRowDetailModal
        isOpen={!!selectedGap}
        onClose={() => setSelectedGap(null)}
        row={selectedGap}
        metrics={{ priorityKey: 'Criticidad', statusKey: 'SEMAFORO' }}
        isCriticalPriority={isCriticalPriority}
        displayDate={(d) => d || 'S/D'}
      />

      </div>
  );
};
