import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Modal, Button } from './ui';
import { AlertCircle, FileSearch, CheckCircle2, ArrowRight, ShieldAlert, Zap, Info, ChevronRight, XCircle, Search, Activity } from 'lucide-react';
import { SCOPE_MAPPING, AMBITO_GROUPS, CYBER_SLA_POLICIES, PriorityLevel } from '../constants/cyberCatalog';
import { motion, AnimatePresence } from 'motion/react';
import { isCriticalPriority } from './CyberView';

interface Props {
  data: any[];
}

export const GapFinderView: React.FC<Props> = ({ data }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const analysis = useMemo(() => {
    const unmappedProjects: any[] = [];
    const unmappedAmbitos: any[] = [];
    const categories: Record<string, { total: number, critical: number, delayed: number, items: any[] }> = {};

    data.forEach(row => {
      const project = String(row['PROYECTO O TAREA'] || row['Proyecto'] || row['Tarea'] || '').trim();
      const ambito = String(row['Ámbitos Relacionados'] || row['Ambito'] || '').trim();
      
      // Category Mapping
      const strategicCategory = SCOPE_MAPPING[project] || 'Otros/No Categorizados';
      if (!categories[strategicCategory]) {
        categories[strategicCategory] = { total: 0, critical: 0, delayed: 0, items: [] };
      }
      
      const priorityRaw = row['Criticidad'] || row['Prioridad'] || '';
      const isCritical = isCriticalPriority(priorityRaw);
      const delayDays = Number(row['Dias de atraso'] || 0);
      
      // Simple SLA check
      const threshold = 15; // default
      const isDelayed = delayDays > threshold;

      categories[strategicCategory].total++;
      if (isCritical) categories[strategicCategory].critical++;
      if (isDelayed) categories[strategicCategory].delayed++;
      categories[strategicCategory].items.push(row);

      // Gap Mapping
      if (project && !SCOPE_MAPPING[project] && !unmappedProjects.find(p => p.name === project)) {
        unmappedProjects.push({ name: project, items: [row] });
      }

      if (ambito && !AMBITO_GROUPS[ambito] && !unmappedAmbitos.find(a => a.name === ambito)) {
        unmappedAmbitos.push({ name: ambito, items: [row] });
      }
    });

    const categoryList = Object.entries(categories).map(([name, stats]) => ({
      name,
      ...stats,
      compliance: Math.round(((stats.total - stats.delayed) / stats.total) * 100)
    })).sort((a, b) => b.critical - a.critical);

    return { projects: unmappedProjects, ambitos: unmappedAmbitos, categories: categoryList };
  }, [data]);

  const selectedCategoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = analysis.categories.find(c => c.name === selectedCategory);
    return cat ? cat.items : [];
  }, [selectedCategory, analysis]);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Governance & Mitigation Control</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Gestión de Gaps & Mitigación</h2>
          <p className="text-slate-500 font-medium text-sm">Auditoría de cumplimiento normativo y regularización de activos fuera de catálogo.</p>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Compliance by Category - The New Section */}
        <Card className="lg:col-span-12 border-0 shadow-xl rounded-[2.5rem] bg-white overflow-hidden border border-slate-100">
          <CardHeader className="p-10 border-b border-slate-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Gobernanza por Dominio</p>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Cumplimiento Normativo por Categoría</h3>
              </div>
              <Activity className="text-slate-200" size={32} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Categoría Estratégica</th>
                    <th className="px-10 py-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</th>
                    <th className="px-10 py-6 text-center text-[10px] font-black uppercase tracking-widest text-rose-500">Críticos</th>
                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado de Cumplimiento</th>
                    <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
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

        {/* Existing Gap Summaries */}
        <div className="lg:col-span-6">
          <Card className="border-0 shadow-lg rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-900 tracking-tighter">Gaps de Proyecto (Sin Mapeo)</h3>
            </CardHeader>
            <CardContent className="p-10">
              <div className="space-y-3">
                {analysis.projects.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-rose-200 transition-all">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{p.name}</span>
                    <AlertCircle size={14} className="text-rose-400" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-6">
          <Card className="border-0 shadow-lg rounded-[2.5rem] bg-white border border-slate-100 overflow-hidden">
            <CardHeader className="p-10 border-b border-slate-50">
              <h3 className="text-xl font-black text-slate-900 tracking-tighter">Ámbitos Sin Regularizar</h3>
            </CardHeader>
            <CardContent className="p-10">
              <div className="space-y-3">
                {analysis.ambitos.map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-indigo-200 transition-all">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{a.name}</span>
                    <ShieldAlert size={14} className="text-indigo-400" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
