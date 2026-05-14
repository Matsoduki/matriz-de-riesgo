import React from "react";
import { 
  ShieldAlert, Activity, Target, Clock, ShieldCheck, 
  Users, Layout, ExternalLink, Zap, List, FileSearch, Shield, Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  row: any;
  metrics: any;
  isCriticalPriority: (p: any) => boolean;
  displayDate: (d: any) => string;
}

export const CyberRowDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  row,
  metrics,
  isCriticalPriority,
  displayDate
}) => {
  if (!row) return null;

  const priorityKey = metrics.priorityKey || "CRITICIDAD";
  const statusKey = metrics.statusKey || "SEMAFORO";
  const isCritical = isCriticalPriority(row[priorityKey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] transition-all cursor-cross"
          />
          
          <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8 z-[101] pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-slate-100 pointer-events-auto"
            >
              {/* Header Visual Engine */}
              <div className="relative h-64 bg-slate-900 flex-shrink-0 overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.25),transparent)]" />
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3], x: [0, 20, 0] }}
                    transition={{ duration: 15, repeat: Infinity }}
                    className="absolute -top-20 -left-20 w-96 h-96 bg-brand-600/20 rounded-full blur-[100px]" 
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2], x: [0, -30, 0] }}
                    transition={{ duration: 12, repeat: Infinity, delay: 1 }}
                    className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[80px]" 
                  />
                </div>
                
                <div className="absolute top-10 left-10 right-10 flex justify-between items-start">
                   <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                         <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                            <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">
                               {row["Nro."] ? `FOLIO #${row["Nro."]}` : "REGISTRO MAC"}
                            </span>
                         </div>
                         {isCritical && (
                           <div className="px-3 py-1 bg-rose-500/20 backdrop-blur-md rounded-full border border-rose-500/30">
                              <span className="text-[9px] font-black text-rose-200 uppercase tracking-[0.3em]">
                                Alerta Crítica
                              </span>
                           </div>
                         )}
                      </div>
                   </div>
                   <button 
                     onClick={onClose}
                     className="h-12 w-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-95 group"
                   >
                     <Zap size={20} className="group-hover:rotate-12 transition-transform" />
                   </button>
                </div>

                <div className="absolute bottom-10 left-10 right-10">
                  <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-tight line-clamp-2 uppercase">
                    {row["GAPS"] || row["Vulnerabilidades"] || row["Proyecto o Tarea"] || "Registro de Mando & Control"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-6 mt-6">
                     <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)] ${
                          String(row[statusKey]).toLowerCase().includes('resuelto') ? 'bg-emerald-400 shadow-emerald-400/50' : 'bg-brand-400 shadow-brand-400/50'
                        }`} />
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em]">
                           {row[statusKey] || 'Estado Activo'}
                        </span>
                     </div>
                     <div className="h-4 w-px bg-white/10 hidden sm:block" />
                     <div className="flex items-center gap-2">
                        <ShieldAlert size={14} className={isCritical ? "text-rose-400" : "text-brand-400"} />
                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${isCritical ? "text-rose-300" : "text-slate-300"}`}>
                           Criticidad: {row[priorityKey] || 'Baja'}
                        </span>
                     </div>
                     <div className="h-4 w-px bg-white/10 hidden sm:block" />
                     <div className="flex items-center gap-2 text-slate-300">
                        <Clock size={14} />
                        <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                           {row["Dias de atraso"] || row["Dias de Atraso"] || "0"} Días de Atraso
                        </span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Main Insight Scroll Engine */}
              <div className="flex-1 overflow-y-auto p-10 space-y-12 bg-[#fafaff] scrollbar-hide">
                
                {/* Executive Intelligence Grid */}
                <section>
                   <div className="flex items-center gap-4 mb-8">
                      <div className="h-1 w-10 bg-brand-500 rounded-full" />
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Personal & Responsabilidad</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[
                        { label: 'Responsable', val: row["Responsable Seguridad"] || "S/A", desc: 'Control Interno', icon: Users, color: 'indigo' },
                        { label: 'Backup', val: row["Backup"] || "Sin Asignar", desc: 'Soporte', icon: Shield, color: 'brand' },
                        { label: 'Solicitante', val: row["Area Solicitante"] || "General", desc: 'Origen', icon: Target, color: 'slate' },
                        { label: 'Inicio', val: displayDate(row["FECHA INICIO (DD-MM-YYYY)"] || row["MES Inicio"]) || "S/D", desc: 'Apertura', icon: Clock, color: 'amber' }
                      ].map((stat, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all"
                        >
                           <div className="flex items-center justify-between">
                              <div className={`p-3 rounded-xl bg-slate-50 text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-all`}>
                                 <stat.icon size={16} />
                              </div>
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{stat.desc}</span>
                           </div>
                           <div>
                              <span className="text-[14px] font-black text-slate-800 leading-tight block mb-1 uppercase tracking-tight">{stat.val}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                           </div>
                        </motion.div>
                      ))}
                   </div>
                </section>

                {/* Narrative Engine */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                   <div className="lg:col-span-2 space-y-10">
                      <div>
                        <div className="flex items-center gap-3 mb-6">
                           <div className="p-2 rounded-xl bg-slate-900 text-white">
                              <Activity size={16} />
                           </div>
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Situación & Acciones</h4>
                        </div>
                        <div className="space-y-6">
                           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative group overflow-hidden">
                              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:rotate-12 transition-transform">
                                 <Activity size={100} />
                              </div>
                              <span className="text-[9px] font-black text-brand-600 uppercase tracking-[0.2em] block mb-4">Estado Situacional</span>
                              <p className="text-base font-bold text-slate-800 leading-relaxed italic">
                                 "{row["Sitación Actual"] || "Sin registro detallado de la situación actual."}"
                              </p>
                           </div>
                           <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                 <Shield size={100} className="text-white" />
                              </div>
                              <span className="text-[9px] font-black text-brand-400 uppercase tracking-[0.2em] block mb-4">Hoja de Ruta / Acciones</span>
                              <p className="text-base font-bold text-slate-200 leading-relaxed">
                                 {row["Acciones"] || "No se han documentado acciones preventivas o correctivas."}
                              </p>
                           </div>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                         <div className="flex items-center gap-3 mb-6">
                            <Cpu size={16} className="text-brand-500" />
                            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Parámetros MAC</h4>
                         </div>
                         <div className="space-y-6">
                            {[
                               { label: 'Categoría', val: row["CATEGORÍA"] || "N/A" },
                               { label: 'Ámbito', val: row["AMBITO"] || "Global" },
                               { label: 'Periodicidad', val: row["PERIODICIDAD"] || "Puntual" },
                               { label: 'Presupuesto hrs', val: `${row["Horas Totales"] || "0"} hrs` }
                            ].map((item, i) => (
                               <div key={i} className="flex flex-col border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</span>
                                  <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{item.val}</span>
                               </div>
                            ))}
                         </div>
                      </div>

                      {row["Plan de Mitigación"] && row["Plan de Mitigación"] !== "No Aplica" && (
                        <div className="bg-rose-50/50 p-8 rounded-[2.5rem] border border-rose-100/50">
                           <div className="flex items-center gap-2 mb-4">
                              <ShieldAlert size={16} className="text-rose-500" />
                              <span className="text-[10px] font-black text-rose-900/60 uppercase tracking-widest">Plan de Mitigación</span>
                           </div>
                           <p className="text-xs font-bold text-rose-900/80 leading-relaxed">
                              {row["Plan de Mitigación"]}
                           </p>
                        </div>
                      )}
                   </div>
                </section>
              </div>

              {/* Action Bar */}
              <div className="p-10 bg-white border-t border-slate-100 flex items-center justify-between bg-gradient-to-l from-white to-slate-50">
                 <div className="flex items-center gap-10">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center p-2 text-slate-400">
                          <FileSearch size={20} />
                       </div>
                       <div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block leading-none mb-1">Capa de Auditoria</span>
                          <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Registro de Mando & Control 2026</span>
                       </div>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={onClose}
                      className="px-12 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:shadow-2xl transition-all active:scale-95 flex items-center gap-3 group"
                    >
                       <List size={16} className="group-hover:-translate-x-1 transition-transform" />
                       Cerrar Vista
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
