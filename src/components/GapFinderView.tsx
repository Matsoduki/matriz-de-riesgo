import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Modal, Button } from './ui';
import { AlertCircle, FileSearch, CheckCircle2, ArrowRight, ShieldAlert, Zap, Info, ChevronRight, XCircle, Search, Activity, List, Target } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SCOPE_MAPPING, AMBITO_GROUPS, CYBER_SLA_POLICIES, PriorityLevel } from '../constants/cyberCatalog';
import { motion, AnimatePresence } from 'motion/react';
import { isCriticalPriority } from './CyberView';
import { DetailsModal } from './DetailsModal';

interface Props {
  data: any[];
}

export const GapFinderView: React.FC<Props> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFullDetails, setShowFullDetails] = useState(false);

  const analysis = useMemo(() => {
    const unmappedItems: any[] = [];
    const categories: Record<string, { total: number, critical: number, delayed: number, items: any[] }> = {};

    data.forEach(row => {
      const project = String(row['PROYECTO O TAREA'] || row['Proyecto'] || row['Tarea'] || '').trim().toLowerCase();
      const ambito = String(row['Ámbitos Relacionados'] || row['Ambito'] || row['AMBITO'] || '').trim().toLowerCase();
      
      // Better Mapping Logic (Substring matching)
      let strategicCategory = 'Otros/No Categorizados';
      
      for (const [key, category] of Object.entries(SCOPE_MAPPING)) {
        if (project.includes(key.toLowerCase())) {
          strategicCategory = category;
          break;
        }
      }

      if (strategicCategory === 'Otros/No Categorizados') {
        const priorityRaw = row['Criticidad'] || row['Prioridad'] || row['CRITICIDAD'] || '';
        const isCritical = isCriticalPriority(priorityRaw);
        const impactScore = isCritical ? 100 : 40;
        unmappedItems.push({ ...row, impactScore });
      }
      
      if (!categories[strategicCategory]) {
        categories[strategicCategory] = { total: 0, critical: 0, delayed: 0, items: [] };
      }
      
      const priorityRaw = row['Criticidad'] || row['Prioridad'] || row['CRITICIDAD'] || '';
      const isCritical = isCriticalPriority(priorityRaw);
      const delayDays = Number(row['Dias de atraso'] || row['Dias de Atraso'] || 0);
      
      // Simple SLA check
      const threshold = 15; // default
      const isDelayed = delayDays > threshold;

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
    const totalItems = data.length;
    const unmappedCount = analysis.unmappedItems.length;
    const mappedItems = totalItems - unmappedCount;
    const coverage = totalItems > 0 ? Math.round((mappedItems / totalItems) * 100) : 0;
    
    return {
      total: totalItems,
      mapped: mappedItems,
      unmapped: unmappedCount,
      coverage,
      unmappedProjectsCount: analysis.unmappedProjects.length,
      unmappedFieldsCount: analysis.unmappedItems.length
    };
  }, [data, analysis]);

  const coverageData = [
    { name: 'Mapeado', value: stats.mapped, color: '#6366f1' },
    { name: 'Sin Mapear', value: stats.unmapped, color: '#f43f5e' }
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center gap-3">
             <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Governance & Mitigation Control</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Gap Finder: Auditoría de Catálogo Cyber 2026</h2>
          
          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl mt-1">
                <Target size={20} />
              </div>
              <div>
                <p className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-1">Objetivo del Módulo</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  Identificar y regularizar activos operativos (Vulnerabilidades, Proyectos, Tareas) que no están mapeados a los dominios estratégicos de la compañía. Asegura que el 100% de la operación sea auditable bajo políticas de SLA y cumplimiento normativo GRC.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[2rem] p-8 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><ShieldAlert size={80} /></div>
           <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-2">Cobertura Catálogo</p>
           <h4 className="text-5xl font-black tracking-tighter mb-4">{stats.coverage}%</h4>
           <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: `${stats.coverage}%` }} className="h-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.5)]" />
              </div>
           </div>
        </Card>

        <Card className="border-0 shadow-lg bg-white border border-slate-100 rounded-[2rem] p-8">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Gaps de Proyecto</p>
           <h4 className="text-5xl font-black tracking-tighter text-slate-900 mb-4">{stats.unmappedProjectsCount}</h4>
           <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500">
             <AlertCircle size={12} /> Requiere Mapeo 2026
           </div>
        </Card>

        <Card className="border-0 shadow-lg bg-white border border-slate-100 rounded-[2rem] p-8">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Items Sin Categoría</p>
           <h4 className="text-5xl font-black tracking-tighter text-slate-900 mb-4">{stats.unmapped}</h4>
           <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500">
             <AlertCircle size={12} /> Fuera de Dominios 2026
           </div>
        </Card>

        <Card className="border-0 shadow-lg bg-slate-900 text-white rounded-[2rem] p-8">
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Activos Tácticos</p>
           <h4 className="text-5xl font-black tracking-tighter mb-4">{stats.total}</h4>
           <div className="flex items-center gap-2 text-[10px] font-bold text-brand-400">
             <Activity size={12} /> Flujo de Control Táctico
           </div>
        </Card>
      </div>

      {/* Governance Evolution Chart */}
      <Card className="border-0 shadow-xl rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
        <CardHeader className="p-10 border-b border-slate-50">
           <h3 className="text-xl font-black text-slate-900 tracking-tighter">Panorámica Gaps vs Criticidad por Dominio</h3>
        </CardHeader>
        <CardContent className="p-10 h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysis.categories}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: '700' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: '700' }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="top" align="right" />
              <Bar name="Total Items" dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              <Bar name="Críticos" dataKey="critical" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Bar name="Atrasados" dataKey="delayed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Compliance by Category - The New Section */}
        <Card className="lg:col-span-12 border-0 shadow-xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-100">
          <CardHeader className="p-10 border-b border-slate-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Gobernanza por Dominio</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Cumplimiento Normativo por Categoría</h3>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowFullDetails(true)} className="h-12 px-6 bg-brand-600 border border-brand-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:bg-brand-700 hover:scale-[1.02] transition-all whitespace-nowrap">
                   <List size={14} /> Ver Detalles Completo
                </button>
                <Activity className="text-slate-200 hidden md:block" size={32} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#fbfcff] border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría Estratégica</th>
                    <th className="px-10 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</th>
                    <th className="px-10 py-6 text-center text-[10px] font-black uppercase tracking-widest text-rose-500">Críticos</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado de Cumplimiento</th>
                    <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {analysis.categories.map((cat, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-10 py-6">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{cat.name}</span>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className="text-sm font-bold text-slate-500 font-mono">{cat.total}</span>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className={`text-sm font-black font-mono ${cat.critical > 0 ? 'text-rose-500' : 'text-slate-400'}`}>{cat.critical}</span>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${cat.compliance}%` }} transition={{ duration: 1 }} className={`h-full ${cat.compliance < 80 ? 'bg-rose-500' : 'bg-brand-500'}`} />
                          </div>
                          <span className="text-xs font-black text-slate-500 w-10">{cat.compliance}%</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button onClick={() => setSelectedCategory(cat.name)} className="px-5 py-2 bg-slate-900 border border-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-transparent hover:text-slate-900 transition-all flex items-center gap-2 ml-auto">
                          Ver Gaps <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing Gap Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <Card className="border-0 shadow-lg rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-50">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900 tracking-tighter">Inventario de Gaps (Donde están los no mapeados)</h3>
                <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-4 py-1.5 rounded-full uppercase tracking-widest">
                  Acción Requerida: Regularizar Catálogo
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analysis.unmappedProjects.slice(0, 15).map((p, i) => (
                  <div 
                    key={i} 
                    className="flex flex-col p-6 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-rose-300 hover:bg-white transition-all cursor-pointer shadow-sm hover:shadow-md"
                    onClick={() => {
                        setSelectedUnmapped(p.items);
                        setUnmappedTitle(p.name);
                    }}
                  >
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Gap Detectado</span>
                       <div className="p-1.5 bg-rose-50 rounded-lg text-rose-500"><ArrowRight size={12} /></div>
                    </div>
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2 line-clamp-2 min-h-[2.5em]">{p.name}</span>
                    <div className="flex items-center gap-2 mt-auto">
                       <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.count} registros vinculados</span>
                    </div>
                  </div>
                ))}
              </div>
              {analysis.unmappedProjects.length > 15 && (
                <div className="mt-10 text-center">
                   <p className="text-xs font-bold text-slate-400 mb-4 italic">Se muestran los 15 gaps más frecuentes de un total de {analysis.unmappedProjects.length} proyectos sin mapear.</p>
                   <Button variant="outline" className="rounded-2xl border-2 border-slate-100" onClick={() => setShowFullDetails(true)}>Ver Auditoría Completa</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DetailsModal 
         isOpen={showFullDetails} 
         onClose={() => setShowFullDetails(false)} 
         data={data} 
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

           <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {selectedUnmapped?.map((item, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                     <p className="text-xs font-black text-slate-800 uppercase leading-tight max-w-[80%]">
                        {item['Vulnerabilidades'] || item['GAP'] || item['PROYECTO O TAREA'] || 'Descriptor no hallado'}
                     </p>
                     <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${isCriticalPriority(item['Criticidad'] || item['Prioridad'] || '') ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                        {item['Criticidad'] || item['Prioridad'] || 'Media'}
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado</span>
                        <p className="text-[10px] font-bold text-slate-600 uppercase">{item['SEMAFORO'] || item['Estado'] || 'Activo'}</p>
                     </div>
                     <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Responsable</span>
                        <p className="text-[10px] font-bold text-slate-600">{item['Responsable Seguridad'] || '-'}</p>
                     </div>
                  </div>
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
      <Modal isOpen={!!selectedCategory} onClose={() => setSelectedCategory(null)} title={`Gaps detectados en: ${selectedCategory}`}>
         {selectedCategory && (
           <div className="space-y-6">
             <div className="bg-slate-900 p-8 rounded-3xl text-white">
                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2">Resumen Operativo</p>
                <h4 className="text-2xl font-black tracking-tighter uppercase">{selectedCategory}</h4>
                <div className="mt-4 flex gap-6">
                   <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Hallazgos</p>
                      <p className="text-2xl font-black">{selectedCategoryItems.length}</p>
                   </div>
                   <div className="h-10 w-px bg-white/10" />
                   <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Items Críticos</p>
                      <p className="text-2xl font-black text-rose-400">{selectedCategoryItems.filter(r => isCriticalPriority(r['Criticidad'] || r['Prioridad'] || '')).length}</p>
                   </div>
                </div>
             </div>
             
             <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-3">
                   {selectedCategoryItems.map((item, idx) => (
                     <div key={idx} className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                           <span className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight max-w-[80%]">
                             {item['Vulnerabilidades'] || item['GAP'] || item['Identificación'] || 'Activo No Definido'}
                           </span>
                           <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isCriticalPriority(item['Criticidad'] || item['Prioridad'] || '') ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'}`}>
                             {item['Criticidad'] || item['Prioridad'] || 'Media'}
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable</p>
                              <p className="text-[10px] font-bold text-slate-700">{item['Responsable Seguridad'] || '-'}</p>
                           </div>
                           <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Socio / Proveedor</p>
                              <p className="text-[10px] font-bold text-slate-700">{item['Prestador'] || 'Nucleo Interno'}</p>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           </div>
         )}
      </Modal>

      <Card className="bg-[#0F1115] rounded-[3rem] border-0 p-16 text-center overflow-hidden border border-white/5 relative group">
        <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000 rotate-12">
           <Zap size={250} className="text-white" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
           <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-white/5 border border-white/10 mb-2">
              <Info className="text-indigo-400" size={32} />
           </div>
           <h4 className="text-4xl font-black text-white tracking-tighter leading-none">Implicancias de Gobernanza Dynamic GRC</h4>
           <p className="text-slate-400 leading-relaxed text-sm font-medium">
             La gobernanza dinámica requiere que cada item en el reporte táctico esté vinculado a una categoría del Catálogo 2026. Los items listados arriba carecen de definiciones de cumplimiento o SLAs asignados en el motor de GRC.
           </p>
           <div className="flex flex-wrap justify-center gap-6 pt-4">
              <Button className="h-16 px-10 bg-white text-slate-900 rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-xl">Generar Auditoría Técnica</Button>
              <Button className="h-16 px-10 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-500 shadow-xl">Regularizar Catálogo</Button>
           </div>
        </div>
      </Card>
    </div>
  );
};
