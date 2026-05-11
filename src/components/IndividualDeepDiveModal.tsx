import React from 'react';
import { Modal, Button } from './ui';
import { Activity, Clock, AlertCircle, XCircle, ShieldAlert, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  member: any | null;
  onClose: () => void;
}

export const IndividualDeepDiveModal: React.FC<Props> = ({ member, onClose }) => {
  if (!member) return null;

  return (
    <Modal
      isOpen={!!member}
      onClose={onClose}
      title={`Operational DNA: ${member.name}`}
    >
      <AnimatePresence mode="wait">
        <motion.div 
          key="member-modal-content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="space-y-8"
        >
          <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><Activity size={180} /></div>
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                     member.isBurnoutRisk ? 'bg-rose-500 text-white' : 'bg-brand-500 text-white'
                   }`}>
                     {member.estado}
                   </span>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Index: {member.efficiencyScore}</span>
                </div>
                <h3 className="text-4xl font-black tracking-tighter mb-8">{member.name}</h3>
                
                 <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volumen Total</p>
                       <p className="text-3xl font-black">{member.total}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">SLA Accuracy</p>
                       <p className="text-3xl font-black text-emerald-400">{member.compliance}%</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Backlog</p>
                       <p className="text-3xl font-black text-rose-400">{member.open}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead Time</p>
                       <p className="text-3xl font-black text-indigo-400">{member.mttrDisplay}</p>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Efficiency Index</p>
                       <p className="text-3xl font-black text-brand-400">{member.efficiencyScore}</p>
                    </div>
                 </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {[
               { label: "En Tiempo", val: member.onTime, icon: Clock, color: "text-emerald-500" },
               { label: "Con Riesgo", val: member.atRisk, icon: AlertCircle, color: "text-amber-500" },
               { label: "Fuera Fecha", val: member.outOfDate, icon: XCircle, color: "text-blue-500" },
               { label: "Atraso Crítico", val: member.late, icon: ShieldAlert, color: "text-rose-500" }
             ].map((stat, i) => (
               <div key={i} className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                  <div className={`p-3 rounded-xl bg-slate-50 ${stat.color}`}>
                     <stat.icon size={20} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                     <p className="text-xl font-black text-slate-800">{stat.val}</p>
                  </div>
               </div>
             ))}
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
             <div className="flex items-center gap-2 mb-4">
                <BrainCircuit size={16} className="text-brand-500" />
                <span className="text-[11px] font-black uppercase text-slate-800 underline decoration-brand-200 decoration-2 underline-offset-4">Diagnóstico Gemini Copilot</span>
             </div>
             <p className="text-[12px] text-slate-600 font-medium leading-relaxed">
                {member.compliance > 90 
                  ? `Análisis de Capacidad: Perfil de alta eficiencia con dominio avanzado de SLAs. Recomendación: Promover como mentor o backup estratégico en incidentes críticos.`
                  : member.isBurnoutRisk 
                  ? "ALERTA CRÍTICA: Se detectan signos de saturación operativa (Burnout Risk). La acumulación de backlog sugiere una necesidad inmediata de reasignar al menos un 30% de la carga actual."
                  : "Estado Operativo Nominal: Desempeño balanceado. Se sugiere monitorear los items en riesgo para evitar degradación de métricas al cierre de semana."}
             </p>
          </div>

          <Button 
             className="w-full h-14 bg-slate-900 text-white rounded-3xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl"
             onClick={onClose}
          >
            Finalizar Auditoría Individual
          </Button>
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
};
